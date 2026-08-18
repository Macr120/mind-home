/**
 * Orquestador de la construcción de la casa demo. Corre con `esDemo()` desde
 * la PantallaDemo, SIEMPRE sobre una BD virgen con los stores hidratados de
 * ella (lo garantiza el DemoGate: si la BD trae restos, la borra y recarga):
 *
 *   1. localStorage `demo:*` a cero (flags de una construcción anterior).
 *   2. Estructura de la casa: `public/demo/casa.json` si existe; si no, el
 *      builder programático `construirCasaPep()`.
 *   3. Seeds de catálogo, solo de las apps que van a construirse (el resto se
 *      siembra junto a su año en la construcción perezosa).
 *   4. Builders del año de Pep@ — TODOS: la demo es una plantilla llena.
 *   5. Foto del original + versión (los tiempos vivos del snapshot se corren
 *      por delta al restaurarlo).
 *
 * Quien llama recarga la página al terminar: los stores de la casa deben
 * releer TODO lo construido.
 */
import { db } from '../core/data/db'
import {
  desapuntarTablas,
  empezarColectaPerezosa,
  setConstruyendoDemo,
  tablasSucias,
  terminarColectaPerezosa,
} from '../core/data/demoGuard'
import { FUENTES } from '../core/gamificacion/actividad'
import { XP_POR_LISTA } from '../core/gamificacion/listas'
import { fechaLocalISO } from '../core/fechaLocal'
import { marcarEscrituraSilenciosa, setSinOutbox } from '../core/data/sync/middleware'
import { claveLS, esDemo, esDemoAutor } from '../core/edicion'
import { BUILDERS_DEMO, crearCtxDemo } from './builders'
import { restaurarSnapshot, type SnapshotCasa } from './casaSnapshot'
import { appsConstruidas, leerIntent, marcarAppConstruida, marcarDemoConstruido } from './modo'
import { fotografiarDemo, fotografiarTablasDemo } from './sandbox'
import { guardarSpawnDemo } from './spawn'

/** `clave` es de i18n (`demo.paso.*`) o `app:<plantillaId>` para los builders. */
export type ProgresoDemo = (clave: string, paso: number, total: number) => void

// Single-flight que DEVUELVE la promesa en marcha: StrictMode monta el efecto
// de PantallaDemo dos veces y la segunda llamada debe esperar la misma
// construcción (resolver de inmediato recargaría la página a medio construir).
let enMarcha: Promise<void> | null = null

export function construirDemo(onProgreso?: ProgresoDemo, apps?: string[]): Promise<void> {
  if (!esDemo()) return Promise.resolve()
  if (!enMarcha) {
    // Lock multi-pestaña: dos pestañas del demo no deben construir a la vez.
    enMarcha = (
      navigator.locks
        ? navigator.locks.request('mh-demo-build', () => construir(onProgreso, apps))
        : construir(onProgreso, apps)
    ).finally(() => {
      enMarcha = null
    })
  }
  return enMarcha
}

/**
 * Tours del NÚCLEO cuyo intent no es el id de ninguna app (`hoy`, `progreso`):
 * qué años hace falta tener construidos para que su demo tenga contenido.
 * `progreso` es el agregado del año entero (Sísifo/Wrapped leen de todas).
 */
const APPS_DE_TOUR: Record<string, string[]> = {
  hoy: ['cocina', 'calendario'],
  progreso: Object.keys(BUILDERS_DEMO),
}

/**
 * Catálogos de fábrica por app: se siembran junto a su año (al entrar o en la
 * construcción perezosa), así entran en la foto del original y el auto-seed del
 * App component encuentra su bandera puesta.
 */
const CATALOGOS_APP: Record<string, () => Promise<() => Promise<void>>> = {
  cocina: () => import('../rooms/cocina/seed').then((m) => m.sembrarCocina),
  ejercicio: () => import('../rooms/ejercicio/seed').then((m) => m.sembrarEjercicio),
  garage: () => import('../rooms/garage/seed').then((m) => m.sembrarGarage),
}

/**
 * Apps cuyo año se construye AL ENTRAR: si el visitante viene a un tutorial,
 * solo la de ese tour —las demás se construyen al abrirlas (`construirAppDemo`)
 * y así el tour empieza en segundos—; si viene a explorar, todas.
 */
export function appsIniciales(): string[] {
  const intent = leerIntent()
  if (!intent) return Object.keys(BUILDERS_DEMO)
  if (APPS_DE_TOUR[intent.app]) return APPS_DE_TOUR[intent.app]
  // La infraestructura no tiene builder: su año lo levanta el mapa.
  return BUILDERS_DEMO[intent.app] ? [intent.app] : []
}

async function construir(onProgreso?: ProgresoDemo, apps?: string[]): Promise<void> {
  const conBuilder = apps ?? appsIniciales()
  const total = 4 + conBuilder.length
  let paso = 0
  const empezar = (clave: string) => onProgreso?.(clave, paso++, total)

  setConstruyendoDemo(true)
  // El año entero llenaba `_outbox` para tirarlo al final: en demo no hay sync.
  setSinOutbox(true)
  try {
    empezar('demo.paso.limpiar')
    // Flags demo de una construcción anterior (seeds, reparaciones, récords)
    // mentirían sobre la BD recién vaciada.
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('demo:')) localStorage.removeItem(k)
    }

    empezar('demo.paso.casa')
    const snap = await cargarSnapshot()
    if (snap) {
      await restaurarSnapshot(snap)
      // Los tiempos vivos del snapshot quedaron congelados al exportar: se
      // corren por el delta (el camino casaPep no lo necesita: nacen vivos).
      await correrTiemposVivos(Date.now() - (snap.exportadoEn ?? Date.now()))
      // El snapshot es de la fecha en que se exportó: las apps añadidas después
      // no tienen cuarto en él y sus tours no tendrían dónde entrar.
      const { completarCuartosDeApps } = await import('./mapa/casa')
      await completarCuartosDeApps()
    } else {
      // Sin snapshot commiteado: la casa de Pep@ se construye por código.
      const { construirCasaPep } = await import('./casaPep')
      await construirCasaPep()
    }
    // El punto de aparición depende del tamaño del mapa: se fija explícito
    // (el andador del patio) para no nacer dentro de la casa ni en un muro.
    const { mundo } = await import('./mapa/cuadrantes')
    const { x, z } = mundo(4, 2)
    guardarSpawnDemo(x, z)

    empezar('demo.paso.catalogos')
    for (const app of conBuilder) {
      const catalogo = await CATALOGOS_APP[app]?.()
      if (catalogo) await catalogo()
    }

    const ctx = crearCtxDemo()
    for (const app of conBuilder) {
      empezar(`app:${app}`)
      const builder = await BUILDERS_DEMO[app]()
      await builder(ctx)
      marcarAppConstruida(app)
    }
    // Las listas cumplidas del año (la moneda del XP de las cards del menú).
    await sembrarListasDemo(conBuilder)

    empezar('demo.paso.final')
    // El año de paintball vive solo en localStorage (su único almacén): el
    // balance de batallas de Pep@ contra los asistentes.
    localStorage.setItem(claveLS('mh.paintballMarcador'), JSON.stringify({ victorias: 47, derrotas: 23 }))
    // Lo último: la foto del original contra la que se repone todo lo que el
    // visitante toque (ver demo/sandbox.ts).
    await fotografiarDemo()
    marcarDemoConstruido()
  } finally {
    setConstruyendoDemo(false)
    setSinOutbox(false)
  }
}

// Single-flight por app: el gate de la UI y el intent del tutorial piden la
// misma construcción a la vez, y StrictMode monta el efecto dos veces.
const enMarchaApp = new Map<string, Promise<void>>()

/**
 * Construye el año de UNA app la primera vez que se abre (las que no entraron en
 * `appsIniciales`). Idempotente.
 */
export function construirAppDemo(app: string): Promise<void> {
  if (!esDemo() || esDemoAutor()) return Promise.resolve()
  if (!BUILDERS_DEMO[app] || appsConstruidas().has(app)) return Promise.resolve()
  let p = enMarchaApp.get(app)
  if (!p) {
    const trabajo = () => construirApp(app)
    p = (
      navigator.locks ? navigator.locks.request('mh-demo-build:' + app, trabajo) : trabajo()
    ).finally(() => {
      enMarchaApp.delete(app)
    })
    enMarchaApp.set(app, p)
  }
  return p
}

async function construirApp(app: string): Promise<void> {
  // Dentro del lock: otra pestaña pudo construirla mientras esperábamos.
  if (appsConstruidas().has(app)) return
  const antes = new Set(tablasSucias())
  // Aquí NO va `setConstruyendoDemo`: el marcador tiene que apuntar lo escrito,
  // tanto para saber qué fotografiar como para limpiarlo si esto se corta.
  empezarColectaPerezosa()
  setSinOutbox(true)
  let fallo: unknown = null
  try {
    // El catálogo de fábrica va antes que el builder y DENTRO de la colecta: sus
    // tablas entran en la foto parcial y el auto-seed de la app ve su bandera puesta.
    const catalogo = await CATALOGOS_APP[app]?.()
    if (catalogo) await catalogo()
    const builder = await BUILDERS_DEMO[app]()
    await builder(crearCtxDemo())
    // Dentro de la colecta: `listasCumplidas` debe entrar en la foto parcial.
    await sembrarListasDemo([app])
  } catch (e) {
    // Se cierra la colecta pase lo que pase: abierta, dejaría el aviso del demo
    // mudo para siempre. El fallo se relanza tras cerrarla.
    fallo = e
  }
  const tocadas = terminarColectaPerezosa()
  setSinOutbox(false)
  if (fallo) throw fallo
  await fotografiarTablasDemo(tocadas)
  // Lo que el visitante ya había ensuciado sigue siendo suyo (y se repondrá).
  desapuntarTablas(tocadas.filter((t) => !antes.has(t)))
  // Lo ÚLTIMO: marcar antes daría por buena una construcción a medias, y al
  // reabrir la app saldría con la mitad de su año y sin manera de rehacerlo.
  marcarAppConstruida(app)
}

/** Hash determinista: la misma app y fecha dan lo mismo en toda reconstrucción. */
function hashDemo(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * El año de listas cumplidas de Pep@: ~2 de cada 3 días con actividad de cada
 * app cuentan como lista completa. Sin esto, las cards del menú dirían
 * «Nv 1 · 0 XP» con un año entero de registros detrás. Solo días pasados: el de
 * hoy queda por ganar, que es donde viven las celebraciones.
 */
async function sembrarListasDemo(apps: string[]): Promise<void> {
  const hoy = fechaLocalISO()
  for (const app of apps) {
    const fuente = FUENTES[app]
    if (!fuente) continue
    const filas = [...new Set(await fuente())]
      .filter((f) => f && f < hoy && hashDemo(`${app}|${f}`) % 3 !== 0)
      .map((fecha) => ({ plantillaId: app, fecha, xp: XP_POR_LISTA }))
    if (filas.length) await db.listasCumplidas.bulkAdd(filas)
  }
}

async function cargarSnapshot(): Promise<SnapshotCasa | null> {
  try {
    // Tope: un fetch colgado dejaría la construcción entera esperando sin error.
    const resp = await fetch('/demo/casa.json', { signal: AbortSignal.timeout(10_000) })
    // El dev server responde index.html con 200 a rutas inexistentes: sin la
    // guarda de content-type, la ausencia del snapshot parecería JSON corrupto.
    if (!resp.ok || !resp.headers.get('content-type')?.includes('json')) {
      console.info('[MPH demo] Sin public/demo/casa.json: la casa se construye por código.')
      return null
    }
    return (await resp.json()) as SnapshotCasa
  } catch (e) {
    console.warn('[MPH demo] No se pudo leer casa.json:', e)
    return null
  }
}

/**
 * El snapshot congeló las épocas de huerto/granja al exportarse: SUMAR el
 * delta (ahora − exportadoEn) a todo campo `*En` conserva las etapas de los
 * cultivos y el hambre/limpieza tal cual estaban al exportar.
 */
async function correrTiemposVivos(delta: number): Promise<void> {
  if (delta <= 0) return
  const nombres = ['cultivos', 'corrales', 'animales']
  await db.transaction(
    'rw',
    nombres.map((n) => db.table(n)),
    async () => {
      marcarEscrituraSilenciosa()
      for (const nombre of nombres) {
        const tabla = db.table(nombre)
        const filas = (await tabla.toArray()) as Record<string, unknown>[]
        for (const f of filas) {
          let cambio = false
          for (const [k, v] of Object.entries(f)) {
            if (k.endsWith('En') && typeof v === 'number') {
              f[k] = v + delta
              cambio = true
            }
          }
          if (cambio) await tabla.put(f)
        }
      }
    },
  )
}

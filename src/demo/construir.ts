/**
 * Orquestador de la construcción de la casa demo. Corre con `esDemo()` desde
 * la PantallaDemo, SIEMPRE sobre una BD virgen con los stores hidratados de
 * ella (lo garantiza el DemoGate: si la BD trae restos, la borra y recarga):
 *
 *   1. localStorage `demo:*` a cero (flags de una construcción anterior).
 *   2. Estructura de la casa: `public/demo/casa.json` si existe; si no, el
 *      builder programático `construirCasaPep()`.
 *   3. Seeds de catálogo (cocina/ejercicio/garage).
 *   4. Builders del año de Pep@ — TODOS: la demo es una plantilla llena.
 *   5. Foto del original + versión (los tiempos vivos del snapshot se corren
 *      por delta al restaurarlo).
 *
 * Quien llama recarga la página al terminar: los stores de la casa deben
 * releer TODO lo construido.
 */
import { db } from '../core/data/db'
import { setConstruyendoDemo } from '../core/data/demoGuard'
import { marcarEscrituraSilenciosa } from '../core/data/sync/middleware'
import { claveLS, esDemo } from '../core/edicion'
import { BUILDERS_DEMO, crearCtxDemo } from './builders'
import { restaurarSnapshot, type SnapshotCasa } from './casaSnapshot'
import { marcarDemoConstruido } from './modo'
import { fotografiarDemo } from './sandbox'
import { guardarSpawnDemo } from './spawn'

/** `clave` es de i18n (`demo.paso.*`) o `app:<plantillaId>` para los builders. */
export type ProgresoDemo = (clave: string, paso: number, total: number) => void

// Single-flight que DEVUELVE la promesa en marcha: StrictMode monta el efecto
// de PantallaDemo dos veces y la segunda llamada debe esperar la misma
// construcción (resolver de inmediato recargaría la página a medio construir).
let enMarcha: Promise<void> | null = null

export function construirDemo(onProgreso?: ProgresoDemo): Promise<void> {
  if (!esDemo()) return Promise.resolve()
  if (!enMarcha) {
    // Lock multi-pestaña: dos pestañas del demo no deben construir a la vez.
    enMarcha = (
      navigator.locks
        ? navigator.locks.request('mh-demo-build', () => construir(onProgreso))
        : construir(onProgreso)
    ).finally(() => {
      enMarcha = null
    })
  }
  return enMarcha
}

async function construir(onProgreso?: ProgresoDemo): Promise<void> {
  const conBuilder = Object.keys(BUILDERS_DEMO)
  const total = 4 + conBuilder.length
  let paso = 0
  const empezar = (clave: string) => onProgreso?.(clave, paso++, total)

  setConstruyendoDemo(true)
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
    const [cocina, ejercicio, garage] = await Promise.all([
      import('../rooms/cocina/seed'),
      import('../rooms/ejercicio/seed'),
      import('../rooms/garage/seed'),
    ])
    await cocina.sembrarCocina()
    await ejercicio.sembrarEjercicio()
    await garage.sembrarGarage()

    const ctx = crearCtxDemo()
    for (const app of conBuilder) {
      empezar(`app:${app}`)
      const builder = await BUILDERS_DEMO[app]()
      await builder(ctx)
    }

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
  }
}

async function cargarSnapshot(): Promise<SnapshotCasa | null> {
  try {
    const resp = await fetch('/demo/casa.json')
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

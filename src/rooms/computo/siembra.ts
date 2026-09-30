/**
 * Siembra inicial de la sala de cómputo: el formulario de Matemáticas, Física y
 * Química, y tres hojas para empezar.
 *
 * Esto NO es un «catálogo de fábrica» aparte: las filas que crea son datos del
 * usuario como cualquier otro, editables y borrables una a una. Por eso tampoco
 * llevan `ejemploDe` — esa marca las escondería en bloque desde el interruptor
 * de ejemplos, que es justo la división que aquí no se quiere.
 *
 * EXCEPCIÓN A LA REGLA 1 DE CLAUDE.md (las apps no importan `db`): se escribe
 * con `db` directo y no por repo porque `repository.add` sella
 * `updatedAt: Date.now()` y pisaría el `updatedAt: 1` de `filaSeed`. Ese 1 es lo
 * que hace que (a) la edición real de otro dispositivo gane siempre por LWW y
 * (b) `sync/motor.ts` pueda borrar las seeds vírgenes que el servidor no
 * conoce — que es lo único que evita que un segundo dispositivo resucite lo que
 * el usuario borró aquí. Mismo motivo y mismo patrón que `rooms/cocina/seed.ts`.
 */
import { db, type CarpetaFormula, type Formula, type HojaCalculo } from '../../core/data/db'
import { hojasRepo } from '../../core/data/repository'
import { claveLS, esDemo } from '../../core/edicion'
import { filaSeed } from '../../core/data/sync/syncables'
import { fechaLocalISO } from '../../core/fechaLocal'
import { idiomaActual, tGlobal } from '../../core/i18n/useT'
import type { Idioma } from '../../core/i18n/idiomas'
import { porIdioma } from '../../core/i18n/porIdioma'
import { retraducido, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { CATALOGO, catalogoActual, idCatalogo, traducir, type AreaCatalogo } from './catalogo'
import { CARGADORES_CATALOGO } from './catalogoI18n'
import { PLANTILLAS_HOJA } from './plantillasHoja'
import { ROTULOS_HOJA, type RotulosHoja } from './rotulosHoja'

let sembrando: Promise<void> | null = null

/** Banderas versionadas: subir la versión añade lo nuevo sin repetir lo viejo. */
const LS_FORMULAS = claveLS('computo.catalogoSembrado')
const VERSION_FORMULAS = '1'
const LS_HOJAS = claveLS('computo.hojasSembradas')
const VERSION_HOJAS = '1'

// Mismo idioma que `rooms/biblioteca/arbol.ts` para quitar acentos tras NFD.
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')

/** Clave estable para el uid (la misma en todo dispositivo). */
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Siembra el formulario y las hojas de arranque. Idempotente por tres vías: la
 * guardia de módulo, la bandera de localStorage (que es lo que impide resucitar
 * lo que el usuario borró a propósito) y la comprobación de identidad fila a
 * fila (que cubre el caso «restauré un respaldo en un navegador nuevo»).
 */
export function sembrarComputo(): Promise<void> {
  // La promesa y no un booleano: quien llegue después (la retraducción) espera
  // a que la siembra termine en vez de correr sobre la BD a medio escribir.
  sembrando ??= sembrar()
  return sembrando
}

async function sembrar(): Promise<void> {
  // La casa de Pep@ trae su propio formulario curado (ver `demo.ts`): 54
  // fórmulas encima lo volverían ilegible.
  if (esDemo()) return

  if (localStorage.getItem(LS_FORMULAS) !== VERSION_FORMULAS) {
    await sembrarFormulario()
    localStorage.setItem(LS_FORMULAS, VERSION_FORMULAS)
  }
  if (localStorage.getItem(LS_HOJAS) !== VERSION_HOJAS) {
    await sembrarHojas(false)
    localStorage.setItem(LS_HOJAS, VERSION_HOJAS)
  }
}

/** Las tres áreas, cada una con sus grupos como subcarpetas. */
async function sembrarFormulario(): Promise<void> {
  const carpetas = await db.carpetasFormula.toArray()
  const formulas = await db.formulas.toArray()
  const yaCarpeta = new Set(carpetas.map((c) => c.carpetaId))
  const yaFormula = new Set(formulas.map((f) => f.formulaId))
  const ahora = new Date().toISOString()
  const hoy = fechaLocalISO()

  const nuevasCarpetas: CarpetaFormula[] = []
  const nuevasFormulas: Formula[] = []

  for (const [iArea, area] of (await catalogoActual()).entries()) {
    // Quien ya hubiera copiado del catálogo tiene una carpeta raíz con el
    // nombre del área y un `carpetaId` aleatorio: se reusa en vez de crear una
    // segunda «Física» al lado.
    const previa = carpetas.find((c) => c.padreId == null && c.nombre === area.nombre)
    const raizId = previa?.carpetaId ?? `cat-${area.id}`
    if (!previa && !yaCarpeta.has(raizId)) {
      nuevasCarpetas.push(
        filaSeed(`carpetasFormula-${raizId}`, {
          carpetaId: raizId,
          padreId: null,
          nombre: area.nombre,
          emoji: area.emoji,
          color: area.color,
          orden: iArea,
          creadoEn: ahora,
        }),
      )
      yaCarpeta.add(raizId)
    }

    const grupos = [...new Set(area.formulas.map((f) => f.grupo))]
    for (const [iGrupo, grupo] of grupos.entries()) {
      const grupoId = `cat-${area.id}-${slug(grupo)}`
      if (!yaCarpeta.has(grupoId)) {
        nuevasCarpetas.push(
          filaSeed(`carpetasFormula-${grupoId}`, {
            carpetaId: grupoId,
            padreId: raizId,
            nombre: grupo,
            orden: iGrupo,
            creadoEn: ahora,
          }),
        )
        yaCarpeta.add(grupoId)
      }

      for (const [iF, f] of area.formulas.filter((x) => x.grupo === grupo).entries()) {
        const formulaId = idCatalogo(area.id, f.slug)
        if (yaFormula.has(formulaId)) continue
        nuevasFormulas.push(
          filaSeed(`formulas-${formulaId}`, {
            formulaId,
            carpetaId: grupoId,
            nombre: f.nombre,
            expresion: f.expresion,
            resultado: f.resultado,
            tex: f.tex,
            variables: f.variables.map((v) => ({ ...v })),
            orden: iF,
            fecha: hoy,
            creadoEn: ahora,
          }),
        )
        yaFormula.add(formulaId)
      }
    }
  }

  if (nuevasCarpetas.length) await db.carpetasFormula.bulkAdd(nuevasCarpetas)
  if (nuevasFormulas.length) await db.formulas.bulkAdd(nuevasFormulas)
}

/**
 * Las hojas de arranque, ya rellenas y con sus fórmulas puestas. La plantilla
 * `blanco` no se siembra: una hoja vacía no enseña nada y es el botón «Hoja
 * nueva» de `HojasTab`. `restaurar`: el usuario las pidió de vuelta desde la
 * barra del ejemplo (ver `filaSeed`).
 */
async function sembrarHojas(restaurar: boolean): Promise<void> {
  const hojas = (await db.hojasCalculo.toArray()) as (HojaCalculo & { uid?: string })[]
  const ya = new Set(hojas.map((h) => h.uid).filter(Boolean))
  const ahora = new Date().toISOString()

  const nuevas: HojaCalculo[] = []
  for (const p of PLANTILLAS_HOJA) {
    if (p.id === 'blanco') continue
    const uid = `seed-hojasCalculo-${p.id}`
    if (ya.has(uid)) continue
    const { celdas, graficas } = p.crear()
    nuevas.push(
      filaSeed(
        `hojasCalculo-${p.id}`,
        {
          nombre: p.rotuloNombre ? porIdioma(ROTULOS_HOJA)[p.rotuloNombre] : tGlobal(p.claveNombre, p.nombreEs),
          celdas,
          ...(graficas ? { graficas } : {}),
          filas: p.filas,
          cols: p.cols,
          creadoEn: ahora,
          actualizadoEn: ahora,
        },
        restaurar,
      ),
    )
  }
  if (nuevas.length) await db.hojasCalculo.bulkAdd(nuevas)
}

/** ¿Es una de las hojas de arranque? Por uid: el nombre puede estar traducido o editado. */
const esHojaSembrada = (h: HojaCalculo) => {
  const uid = (h as HojaCalculo & { uid?: string }).uid
  return PLANTILLAS_HOJA.some((p) => p.id !== 'blanco' && uid === `seed-hojasCalculo-${p.id}`)
}

/**
 * Cada rótulo escrito con su propia clave: armar una plantilla con esto dice
 * qué rótulo de fábrica lleva cada celda y cada gráfica (en español «Nota» son
 * dos rótulos distintos, así que no basta con buscar por el texto).
 */
const CLAVES_ROTULO = Object.fromEntries(Object.keys(ROTULOS_HOJA.es).map((k) => [k, k])) as RotulosHoja
const esClaveRotulo = (s: string): s is keyof RotulosHoja => Object.hasOwn(CLAVES_ROTULO, s)

/**
 * Reescribe al idioma activo el nombre, los rótulos y los títulos de gráfica de
 * las hojas de arranque que sigan siendo el texto de fábrica en ALGÚN idioma
 * (`retraducido`); lo que el usuario escribió encima se queda. Mira campo a
 * campo y no la fila entera (`esSeedIntacta`): quien retocó una cifra del
 * presupuesto también quiere los rótulos en su idioma. `db.hojasCalculo.update`
 * crudo, igual que `retraducirArte`: el middleware conserva el `updatedAt` de
 * los uids `seed-…`, así una semilla intacta sigue sellada con 1.
 */
async function retraducirHojas(): Promise<void> {
  const hojas = (await db.hojasCalculo.toArray()) as (HojaCalculo & { uid?: string })[]
  for (const h of hojas) {
    const p = PLANTILLAS_HOJA.find((x) => x.id !== 'blanco' && h.uid === `seed-hojasCalculo-${x.id}`)
    if (!p || h.id == null) continue
    const molde = p.crear(CLAVES_ROTULO)
    const cambios: Partial<HojaCalculo> = {}

    const nombre = p.rotuloNombre ? retraducido(ROTULOS_HOJA, h.nombre, p.rotuloNombre) : null
    if (nombre) cambios.nombre = nombre

    const celdas = { ...h.celdas }
    for (const [ref, { crudo: clave }] of Object.entries(molde.celdas)) {
      const actual = h.celdas[ref]
      const nuevo = actual && esClaveRotulo(clave) ? retraducido(ROTULOS_HOJA, actual.crudo, clave) : null
      if (!nuevo || !actual) continue
      // Sin el `valor` en caché: la hoja lo recalcula al abrirse.
      const { valor: _, ...resto } = actual
      celdas[ref] = { ...resto, crudo: nuevo }
      cambios.celdas = celdas
    }

    const graficas = h.graficas?.map((g) => {
      const clave = molde.graficas?.find((m) => m.id === g.id)?.titulo
      const titulo = clave && esClaveRotulo(clave) ? retraducido(ROTULOS_HOJA, g.titulo, clave) : null
      return titulo ? { ...g, titulo } : g
    })
    if (graficas?.some((g, i) => g !== h.graficas?.[i])) cambios.graficas = graficas

    if (Object.keys(cambios).length) await db.hojasCalculo.update(h.id, cambios)
  }
}

/**
 * Las hojas de arranque como ejemplo de la lista de hojas. Las siembra la
 * propia app (`sembrarComputo`): la barra solo las borra y las restaura. El
 * formulario no entra: es el catálogo de la app y se borra fórmula a fórmula.
 */
export const ejemploHojas: PaqueteEjemplo = {
  id: 'computo.hojas',
  tablas: [],
  auto: false,
  hayEjemplo: () => hojasRepo.alguna(esHojaSembrada),
  async borrar() {
    for (const h of await hojasRepo.list()) {
      if (h.id != null && esHojaSembrada(h)) await hojasRepo.remove(h.id)
    }
  },
  materializar: sembrarHojas,
  retraducir: retraducirHojas,
}

/** Los `carpetaId` de las áreas: el árbol nace plegado por ellas. Los ids no
 *  dependen del idioma, así que basta el catálogo base (síncrono). */
export function carpetasSembradas(): string[] {
  return CATALOGO.map((a) => `cat-${a.id}`)
}

/** Sitio de una fórmula en el catálogo: el traducido conserva el orden del base. */
interface PosFormula {
  a: number
  f: number
}

const POS_FORMULA = new Map(
  CATALOGO.flatMap((area, a) => area.formulas.map((f, i) => [idCatalogo(area.id, f.slug), { a, f: i }] as const)),
)

/** Cada grupo de fábrica, por la primera fórmula que lo lleva. */
const GRUPOS_FABRICA: PosFormula[] = CATALOGO.flatMap((area, a) =>
  [...new Set(area.formulas.map((f) => f.grupo))].map((g) => ({
    a,
    f: area.formulas.findIndex((x) => x.grupo === g),
  })),
)

const formulaDe = (cat: AreaCatalogo[], p: PosFormula) => cat[p.a].formulas[p.f]
const grupoDe = (cat: AreaCatalogo[], p: PosFormula) => formulaDe(cat, p).grupo
const areaDe = (c: CarpetaFormula) => CATALOGO.findIndex((x) => c.carpetaId === `cat-${x.id}`)
/** Índice de la variable de fábrica con ese símbolo (el usuario pudo añadir o quitar). */
const varDe = (p: PosFormula, simbolo: string) =>
  formulaDe(CATALOGO, p).variables.findIndex((x) => x.simbolo === simbolo)

/** `destino` si `valor` es el texto de fábrica de algún idioma y aún no es el activo. */
const cambio = (valor: string | undefined, versiones: string[], destino: string) =>
  valor && valor !== destino && versiones.includes(valor) ? destino : null

/** Idioma al que ya se retradujo el formulario en esta sesión: no se repite. */
let formularioEn: Idioma | null = null

/**
 * Reescribe al idioma activo las áreas, grupos y fórmulas (nombre y variables)
 * del formulario sembrado que sigan diciendo el texto de fábrica de ALGÚN
 * idioma; lo que el usuario renombró se queda. Las filas se identifican por su
 * uid de siembra y su sitio en el catálogo, nunca por el nombre.
 *
 * Los 15 catálogos traducidos bajan con import() y solo cuando hace falta: si
 * todo ya casa con el idioma activo (lo normal), basta con el suyo, que es el
 * mismo que usa la siembra. Escribe con `db` crudo por lo mismo que
 * `retraducirHojas`: el middleware conserva el `updatedAt: 1` de las semillas.
 */
export async function retraducirFormulario(): Promise<void> {
  const idioma = idiomaActual()
  if (esDemo() || formularioEn === idioma) return
  formularioEn = idioma

  const carpetas = ((await db.carpetasFormula.toArray()) as (CarpetaFormula & { uid?: string })[]).filter(
    (c) => c.id != null && c.uid?.startsWith('seed-carpetasFormula-cat-'),
  )
  const formulas = ((await db.formulas.toArray()) as (Formula & { uid?: string })[]).filter(
    (f) => f.id != null && f.uid?.startsWith('seed-formulas-cat-'),
  )
  if (!carpetas.length && !formulas.length) return

  const activo = await catalogoActual()
  const alDia =
    carpetas.every((c) => {
      if (c.padreId != null) return GRUPOS_FABRICA.some((p) => grupoDe(activo, p) === c.nombre)
      const a = areaDe(c)
      return a < 0 || c.nombre === activo[a].nombre
    }) &&
    formulas.every((f) => {
      const p = POS_FORMULA.get(f.formulaId)
      if (!p) return true
      const fa = formulaDe(activo, p)
      return (
        f.nombre === fa.nombre &&
        f.variables.every((v) => {
          const j = varDe(p, v.simbolo)
          return j < 0 || (v.nombre === fa.variables[j].nombre && (v.unidad ?? '') === (fa.variables[j].unidad ?? ''))
        })
      )
    })
  if (alDia) return

  const versiones = [
    CATALOGO,
    ...(await Promise.all(Object.values(CARGADORES_CATALOGO).flatMap((c) => (c ? [c().then(traducir)] : [])))),
  ]

  for (const c of carpetas) {
    let nombre: string | null = null
    if (c.padreId == null) {
      const a = areaDe(c)
      if (a >= 0) nombre = cambio(c.nombre, versiones.map((v) => v[a].nombre), activo[a].nombre)
    } else {
      const p = GRUPOS_FABRICA.find((g) => versiones.some((v) => grupoDe(v, g) === c.nombre))
      if (p) nombre = cambio(c.nombre, versiones.map((v) => grupoDe(v, p)), grupoDe(activo, p))
    }
    if (nombre) await db.carpetasFormula.update(c.id!, { nombre })
  }

  for (const f of formulas) {
    const p = POS_FORMULA.get(f.formulaId)
    if (!p) continue
    const fab = versiones.map((v) => formulaDe(v, p))
    const fa = formulaDe(activo, p)
    const cambios: Partial<Formula> = {}
    const nombre = cambio(f.nombre, fab.map((x) => x.nombre), fa.nombre)
    if (nombre) cambios.nombre = nombre
    const variables = f.variables.map((v) => {
      const j = varDe(p, v.simbolo)
      if (j < 0) return v
      const n = cambio(v.nombre, fab.map((x) => x.variables[j].nombre), fa.variables[j].nombre)
      const u = cambio(v.unidad, fab.map((x) => x.variables[j].unidad ?? ''), fa.variables[j].unidad ?? '')
      return n || u ? { ...v, ...(n ? { nombre: n } : {}), ...(u ? { unidad: u } : {}) } : v
    })
    if (variables.some((v, i) => v !== f.variables[i])) cambios.variables = variables
    if (Object.keys(cambios).length) await db.formulas.update(f.id!, cambios)
  }
}

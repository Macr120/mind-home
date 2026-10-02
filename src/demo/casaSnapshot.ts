/**
 * Des/serialización del snapshot de la casa demo (`public/demo/casa.json`).
 *
 * Solo tablas de ESTRUCTURA (plano, diseño, personaje, infraestructura): los
 * datos de las apps los materializan los builders con fechas relativas.
 *
 * `respaldo.ts` no sirve aquí: `JSON.stringify(Blob)` produce `{}` — los blobs
 * se serializan explícitos a dataURL (marca `__mhBlob`), como hace el sync con
 * Storage pero inline.
 */
import { db, type ObjetoCuarto } from '../core/data/db'
import { marcarEscrituraSilenciosa } from '../core/data/sync/middleware'
import { esObjetoLibreria } from '../core/state/disenoStore'
import { nombreAnimalEn } from '../core/house/nombresAnimales'
import { idiomaActual, localeActual, tGlobal } from '../core/i18n/useT'
import { textoDemo, type ClaveDemo } from './textosDemo'

/** Tablas que definen la casa (hidratan los stores de casa + infra viva). */
const TABLAS_CASA = [
  // Identidad y plano
  'cuartos',
  'layout',
  'mapaConfig',
  'accesos',
  'zonas',
  'pisosExterior',
  'murosLibres',
  'formasLibres',
  // Diseño y objetos
  'disenoRooms',
  'disenoAvatar',
  'objetosCuarto',
  'fondosImagen',
  'pisosImagenCuarto',
  'techosImagenCuarto',
  'murosImagenCuarto',
  'grafitis',
  // Personaje y compañía
  'asistentes',
  'prendasCustom',
  'carpetasRopa',
  'atuendosGuardados',
  // Plantillas custom
  'plantillasCustom',
  'gruposPlantilla',
  'objetosPlantilla',
  'itemsPlantilla',
  // Infraestructura viva (los tiempos se re-estampan al restaurar)
  'caminos',
  'pistasLibres',
  'cultivos',
  'corrales',
  'animales',
  'cesta',
  // El año jugado de la infraestructura: sin esto, la tabla de tiempos del
  // circuito y los marcadores de las canchas salen vacíos en el demo
  // publicado (los siembra `casaPep`, que no corre cuando hay snapshot).
  'carreras',
  'marcadores',
] as const

export interface SnapshotCasa {
  version: number
  /** Época (ms) del momento de exportar: al restaurar, los tiempos vivos de
   * huerto/granja se corren por el delta contra ahora (etapas intactas). */
  exportadoEn?: number
  tablas: Record<string, Record<string, unknown>[]>
}

const MARCA_BLOB = '__mhBlob'

async function blobADataUrl(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let bin = ''
  // En trozos: String.fromCharCode(...bytes) revienta la pila con blobs grandes.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:${b.type};base64,${btoa(bin)}`
}

function dataUrlABlob(u: string): Blob {
  const coma = u.indexOf(',')
  const tipo = u.slice(5, u.indexOf(';'))
  const bin = atob(u.slice(coma + 1))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: tipo })
}

async function serializarFila(fila: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fila)) {
    out[k] = v instanceof Blob ? { [MARCA_BLOB]: await blobADataUrl(v) } : v
  }
  return out
}

function rehidratarFila(fila: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fila)) {
    const marca = v as { [MARCA_BLOB]?: string } | null
    out[k] =
      marca && typeof marca === 'object' && typeof marca[MARCA_BLOB] === 'string'
        ? dataUrlABlob(marca[MARCA_BLOB])
        : v
  }
  return out
}

/** Exporta la casa ACTUAL (la BD abierta, real o demo) como snapshot. */
export async function exportarSnapshot(): Promise<SnapshotCasa> {
  const tablas: SnapshotCasa['tablas'] = {}
  for (const nombre of TABLAS_CASA) {
    let filas = (await db.table(nombre).toArray()) as Record<string, unknown>[]
    // La biblioteca de objetos NO viaja: la siembra `fotografiarDemo` en cada
    // construcción (con uids deterministas), y su guard lee el store — que tras
    // restaurar un snapshot está desfasado. Incluirla duplicaba los uids.
    if (nombre === 'objetosCuarto') {
      filas = filas.filter((f) => !esObjetoLibreria(f as unknown as ObjetoCuarto))
    }
    tablas[nombre] = await Promise.all(filas.map(serializarFila))
  }
  return { version: 1, exportadoEn: Date.now(), tablas }
}

/** Zona del croquis → su nombre en `textosDemo`. */
const ZONAS: Record<string, ClaveDemo> = {
  'zona-casa': 'casa.zona.casa',
  'zona-canchas': 'casa.zona.canchas',
  'zona-santuario': 'casa.zona.santuario',
  'zona-pista': 'casa.zona.pista',
  'zona-mindfulness': 'casa.zona.mindfulness',
  'zona-feria': 'casa.zona.feria',
}

/**
 * El snapshot guarda la casa de Pep@ en español (se exporta así y así se queda):
 * al restaurarla, los textos que la casa trae escritos —zonas, Laika, el coche,
 * los letreros, la alberca, el nombre del avatar y los de los animales— pasan al
 * idioma activo. Y la
 * carpeta «Memorias y salud mental» se llama «Salud mental», como hizo la
 * migración v140 con las BD reales: el snapshot no pasa por migraciones.
 */
export function localizarSnapshot(snap: SnapshotCasa): void {
  const idioma = idiomaActual()
  const nombre = tGlobal('demo.pep.nombre', 'Pep@')
  const tx = (clave: ClaveDemo) => textoDemo(idioma, clave, { nombre })
  const filas = (tabla: string) => snap.tablas[tabla] ?? []
  for (const m of filas('mapaConfig')) {
    for (const z of (m.cuadrantes as { id: string; nombre: string }[] | undefined) ?? []) {
      if (ZONAS[z.id]) z.nombre = tx(ZONAS[z.id])
    }
  }
  for (const c of filas('cuartos')) if (c.nombre === 'Alberca') c.nombre = tx('casa.alberca')
  for (const o of filas('objetosCuarto')) {
    if (o.nombre === 'Coche viejo') o.nombre = tx('casa.coche')
    if (o.texto === 'CASA DE PEP@') o.texto = tx('casa.letrero').toLocaleUpperCase(localeActual())
    if (o.texto === 'FERIA') o.texto = tx('casa.feria')
  }
  for (const a of filas('asistentes')) {
    if (a.asistenteId !== 'custom-laika') continue
    a.nombre = tx('casa.laika.nombre')
    a.historia = tx('casa.laika.historia')
    a.personalidad = tx('casa.laika.personalidad')
    a.saludo = tx('casa.laika.saludo')
  }
  for (const a of filas('disenoAvatar')) a.nombre = nombre
  for (const a of filas('animales')) if (typeof a.nombre === 'string') a.nombre = nombreAnimalEn(a.nombre, idioma)
  for (const g of filas('gruposPlantilla')) if (g.nombre === 'Memorias y salud mental') g.nombre = 'Salud mental'
}

/** Restaura el snapshot en la BD abierta (ids originales, sin outbox). */
export async function restaurarSnapshot(snap: SnapshotCasa): Promise<void> {
  const nombres = Object.keys(snap.tablas).filter((n) => {
    const existe = db.tables.some((t) => t.name === n)
    if (!existe) console.warn(`[MPH demo] El snapshot trae una tabla desconocida: ${n}`)
    return existe
  })
  await db.transaction(
    'rw',
    nombres.map((n) => db.table(n)),
    async () => {
      marcarEscrituraSilenciosa()
      for (const n of nombres) {
        const tabla = db.table(n)
        await tabla.clear()
        const filas = snap.tablas[n].map(rehidratarFila)
        if (filas.length) await tabla.bulkAdd(filas)
      }
    },
  )
}

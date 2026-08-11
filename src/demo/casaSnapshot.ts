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
import { db } from '../core/data/db'
import { marcarEscrituraSilenciosa } from '../core/data/sync/middleware'

/** Tablas que definen la casa (hidratan los stores de casa + infra viva). */
export const TABLAS_CASA = [
  // Identidad y plano
  'cuartos',
  'layout',
  'mapaConfig',
  'accesos',
  'zonas',
  'pisosExterior',
  'murosLibres',
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
    const filas = (await db.table(nombre).toArray()) as Record<string, unknown>[]
    tablas[nombre] = await Promise.all(filas.map(serializarFila))
  }
  return { version: 1, exportadoEn: Date.now(), tablas }
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

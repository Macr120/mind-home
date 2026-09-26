/**
 * Blobs del sync: en push, cada `Blob` dentro de un registro se sube al
 * almacén (Cloudflare R2, `core/cuenta/almacen.ts`) y se sustituye por un
 * marcador `{__mhBlob: {path, size, mime, hash, r2}}`; en pull, el marcador se
 * descarga y vuelve a ser `Blob` antes de escribir en Dexie. El hash SHA-256
 * evita re-subir lo que no cambió (caché en `_syncMeta`).
 *
 * Transición desde Supabase Storage (bucket `sync-blobs`):
 * - Marcador con `r2`: `path` es la clave relativa `sync/<tabla>/<uid>/<campo>`.
 * - Marcador viejo (sin `r2`): `path` es `<user>/<tabla>/<uid>/<campo>`. El
 *   script `scripts/almacen/migrar-sync-blobs.mjs` lo copió a R2 como
 *   `sync/<tabla>/<uid>/<campo>`; se lee de ahí y, si aún no está, de Storage
 *   (solo lectura: desde sep 2026 ya no se sube ni se borra nada ahí).
 */
import { obtenerSupabase } from '../../cuenta/supabase'
import { bajarDeUrl, borrarArchivos, subirArchivo, urlsDeBajada } from '../../cuenta/almacen'
import { db } from '../db'

const BUCKET_VIEJO = 'sync-blobs'

interface MarcadorBlob {
  __mhBlob: { path: string; size: number; mime: string; hash: string; r2?: true }
}

function esMarcador(v: unknown): v is MarcadorBlob {
  return typeof v === 'object' && v !== null && '__mhBlob' in v
}

async function sha256(blob: Blob): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('')
}

const claveHash = (path: string) => `blob:${path}`
const sanear = (ruta: string) => ruta.replace(/[^\w.-]/g, '_')

/** Clave en R2 de un marcador (el viejo pierde su primer segmento, el usuario). */
const claveR2 = (m: MarcadorBlob['__mhBlob']) => (m.r2 ? m.path : `sync/${m.path.split('/').slice(1).join('/')}`)

async function subirBlob(relativa: string, blob: Blob): Promise<MarcadorBlob> {
  const mime = blob.type || 'application/octet-stream'
  const hash = await sha256(blob)
  const clave = `sync/${relativa}`
  const previo = (await db._syncMeta.get(claveHash(clave)))?.valor as { hash?: string } | undefined
  if (previo?.hash === hash) return { __mhBlob: { path: clave, size: blob.size, mime, hash, r2: true } }
  await subirArchivo(clave, blob)
  await db._syncMeta.put({ clave: claveHash(clave), valor: { hash } })
  return { __mhBlob: { path: clave, size: blob.size, mime, hash, r2: true } }
}

async function transformar(
  valor: unknown,
  ruta: string,
  subir: (ruta: string, b: Blob) => Promise<MarcadorBlob>,
): Promise<unknown> {
  if (valor instanceof Blob) return subir(ruta, valor)
  if (Array.isArray(valor)) {
    const out: unknown[] = []
    for (let i = 0; i < valor.length; i++) out.push(await transformar(valor[i], `${ruta}_${i}`, subir))
    return out
  }
  if (valor && typeof valor === 'object' && !esMarcador(valor)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(valor)) out[k] = await transformar(v, `${ruta}.${k}`, subir)
    return out
  }
  return valor
}

/** Copia del registro con sus Blobs subidos y sustituidos por marcadores. */
export async function extraerBlobs(
  tabla: string,
  uid: string,
  datos: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const subir = (ruta: string, b: Blob) => subirBlob(`${tabla}/${uid}/${sanear(ruta)}`, b)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(datos)) out[k] = await transformar(v, k, subir)
  return out
}

/** URLs firmadas de la página de pull en curso (clave R2 → url). */
let firmadas = new Map<string, string>()

function marcadoresDe(valor: unknown, out: MarcadorBlob['__mhBlob'][]): void {
  if (esMarcador(valor)) out.push(valor.__mhBlob)
  else if (Array.isArray(valor)) for (const v of valor) marcadoresDe(v, out)
  else if (valor && typeof valor === 'object') for (const v of Object.values(valor)) marcadoresDe(v, out)
}

/**
 * Firma de una vez todas las bajadas de una página de pull (un viaje a la
 * Edge Function en vez de uno por blob). A mejor esfuerzo: lo que no quede
 * firmado se firma suelto en `rehidratarBlobs`.
 */
export async function prepararBajadas(valores: unknown[]): Promise<void> {
  const ms: MarcadorBlob['__mhBlob'][] = []
  for (const v of valores) marcadoresDe(v, ms)
  firmadas = new Map()
  if (!ms.length) return
  try {
    firmadas = new Map(Object.entries(await urlsDeBajada([...new Set(ms.map(claveR2))])))
  } catch {
    // Sin R2 aún: cada marcador cae a Storage.
  }
}

async function bajarViejo(path: string, mime: string): Promise<Blob> {
  const sb = await obtenerSupabase()
  if (!sb) throw new Error('Storage (bajar): sin backend')
  const { data, error } = await sb.storage.from(BUCKET_VIEJO).download(path)
  if (error || !data) throw new Error(`Storage (bajar): ${error?.message ?? 'sin datos'}`)
  return new Blob([data], { type: mime })
}

async function bajarMarcador(m: MarcadorBlob['__mhBlob']): Promise<Blob | undefined> {
  const clave = claveR2(m)
  let blob: Blob | null = null
  try {
    const url = firmadas.get(clave) ?? (await urlsDeBajada([clave]))[clave]
    blob = await bajarDeUrl(url, m.mime)
  } catch (e) {
    if (m.r2) throw e
  }
  if (blob) {
    // El hash queda cacheado: el próximo push de este registro no re-sube.
    await db._syncMeta.put({ clave: claveHash(clave), valor: { hash: m.hash } })
    return blob
  }
  // Objeto que ya no existe (purga a los 90 días de cancelar, borrado a mano):
  // el campo se queda vacío. Lanzar aquí congelaría el pull para siempre.
  if (m.r2) {
    console.warn(`[sync] falta en el almacén: ${clave}`)
    return undefined
  }
  // Aún en el Storage viejo: sin caché, así el próximo push lo muda a R2.
  return bajarViejo(m.path, m.mime)
}

/** Copia del registro remoto con sus marcadores descargados como Blob. */
export async function rehidratarBlobs(valor: unknown): Promise<unknown> {
  if (esMarcador(valor)) return bajarMarcador(valor.__mhBlob)
  if (Array.isArray(valor)) {
    const out: unknown[] = []
    for (const v of valor) out.push(await rehidratarBlobs(v))
    return out
  }
  if (valor && typeof valor === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(valor)) out[k] = await rehidratarBlobs(v)
    return out
  }
  return valor
}

/**
 * Borra en el almacén los blobs de un registro eliminado (best-effort). El
 * Storage viejo ya no se toca: su `list` por cada tombstone era la llamada más
 * cara del sync, y lo que quede ahí se vacía de una vez con el bucket.
 */
export async function borrarBlobsDeRegistro(tabla: string, uid: string): Promise<void> {
  try {
    await borrarArchivos([], `sync/${tabla}/${uid}`)
  } catch {
    // Sin R2 o sin red: huérfanos aceptados como deuda conocida.
  }
}

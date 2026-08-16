/**
 * Blobs del sync: en push, cada `Blob` dentro de un registro se sube a Storage
 * y se sustituye por un marcador `{__mhBlob: {path, size, mime, hash}}`; en
 * pull, el marcador se descarga y vuelve a ser `Blob` antes de escribir en
 * Dexie. El hash SHA-256 evita re-subir lo que no cambió (caché en `_syncMeta`).
 */
import { obtenerSupabase } from '../../cuenta/supabase'
import { db } from '../db'

const BUCKET = 'sync-blobs'

interface MarcadorBlob {
  __mhBlob: { path: string; size: number; mime: string; hash: string }
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

async function subirBlob(path: string, blob: Blob): Promise<MarcadorBlob> {
  const mime = blob.type || 'application/octet-stream'
  const hash = await sha256(blob)
  const previo = (await db._syncMeta.get(claveHash(path)))?.valor as { hash?: string } | undefined
  if (previo?.hash !== hash) {
    const sb = await obtenerSupabase()
    if (!sb) throw new Error('Storage (subir): sin backend')
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(path, blob, { upsert: true, contentType: mime })
    if (error) throw new Error(`Storage (subir): ${error.message}`)
    await db._syncMeta.put({ clave: claveHash(path), valor: { hash } })
  }
  return { __mhBlob: { path, size: blob.size, mime, hash } }
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
  userId: string,
  tabla: string,
  uid: string,
  datos: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const base = `${userId}/${tabla}/${uid}`
  const subir = (ruta: string, b: Blob) => subirBlob(`${base}/${sanear(ruta)}`, b)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(datos)) out[k] = await transformar(v, k, subir)
  return out
}

/** Copia del registro remoto con sus marcadores descargados como Blob. */
export async function rehidratarBlobs(valor: unknown): Promise<unknown> {
  if (esMarcador(valor)) {
    const { path, mime, hash } = valor.__mhBlob
    const sb = await obtenerSupabase()
    if (!sb) throw new Error('Storage (bajar): sin backend')
    const { data, error } = await sb.storage.from(BUCKET).download(path)
    if (error || !data) throw new Error(`Storage (bajar): ${error?.message ?? 'sin datos'}`)
    // El hash queda cacheado: el próximo push de este registro no re-sube.
    await db._syncMeta.put({ clave: claveHash(path), valor: { hash } })
    return new Blob([data], { type: mime })
  }
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

/** Borra en Storage la carpeta de un registro eliminado (best-effort). */
export async function borrarBlobsDeRegistro(userId: string, tabla: string, uid: string): Promise<void> {
  const sb = await obtenerSupabase()
  if (!sb) return
  try {
    const carpeta = `${userId}/${tabla}/${uid}`
    const { data } = await sb.storage.from(BUCKET).list(carpeta)
    const nombres = (data ?? []).map((f) => `${carpeta}/${f.name}`)
    if (nombres.length) await sb.storage.from(BUCKET).remove(nombres)
  } catch {
    // Huérfanos aceptados como deuda conocida.
  }
}

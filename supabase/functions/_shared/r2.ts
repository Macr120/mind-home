/**
 * Cliente de Cloudflare R2 por su API S3 (firma SigV4 con aws4fetch).
 *
 * Secretos: `R2_ACCOUNT_ID` (cae a `CLOUDFLARE_ACCOUNT_ID`, que ya existe para
 * Workers AI), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y `R2_BUCKET`. El
 * token de R2 debe tener permiso de lectura/escritura SOLO sobre ese bucket.
 *
 * Las claves que llegan aquí ya son ABSOLUTAS (`<user_id>/<relativa>`): quien
 * antepone el usuario es la Edge Function, nunca el cliente.
 */
import { AwsClient } from 'npm:aws4fetch@1.0.20'

const CUENTA = Deno.env.get('R2_ACCOUNT_ID') ?? Deno.env.get('CLOUDFLARE_ACCOUNT_ID') ?? ''
const BUCKET = Deno.env.get('R2_BUCKET') ?? 'mindhaos-archivos'
const BASE = `https://${CUENTA}.r2.cloudflarestorage.com/${BUCKET}`

let cliente: AwsClient | null = null
function aws(): AwsClient {
  cliente ??= new AwsClient({
    accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID') ?? '',
    secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '',
    service: 's3',
    region: 'auto',
  })
  return cliente
}

export const r2Configurado = (): boolean =>
  !!CUENTA && !!Deno.env.get('R2_ACCESS_KEY_ID') && !!Deno.env.get('R2_SECRET_ACCESS_KEY')

const urlDe = (clave: string) => `${BASE}/${clave.split('/').map(encodeURIComponent).join('/')}`

async function firmar(clave: string, method: string, seg: number, extra?: Record<string, string>): Promise<string> {
  const u = new URL(urlDe(clave))
  u.searchParams.set('X-Amz-Expires', String(seg))
  for (const [k, v] of Object.entries(extra ?? {})) u.searchParams.set(k, v)
  const firmada = await aws().sign(u.toString(), { method, aws: { signQuery: true } })
  return firmada.url
}

/** URL para que el navegador suba el objeto con un PUT directo. */
export const firmarPut = (clave: string, seg = 900) => firmar(clave, 'PUT', seg)

/** URL de lectura; `nombre` fuerza la descarga con ese nombre de archivo. */
export const firmarGet = (clave: string, seg = 900, nombre?: string) =>
  firmar(
    clave,
    'GET',
    seg,
    nombre ? { 'response-content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(nombre)}` } : undefined,
  )

/**
 * Tamaño real del objeto, o null si no existe. Con un GET del primer byte y no
 * con HEAD: el fetch de Deno no entrega `Content-Length` en las respuestas a
 * HEAD (medía 0 y la cuota no contaba nada); `Content-Range` trae el total.
 */
export async function tamanoDe(clave: string): Promise<number | null> {
  const r = await aws().fetch(urlDe(clave), { headers: { Range: 'bytes=0-0' } })
  await r.body?.cancel()
  if (r.status === 404) return null
  // Objeto vacío: no hay byte 0 que pedir.
  if (r.status === 416) return 0
  if (!r.ok) throw new Error(`R2 GET ${r.status}`)
  const total = /\/(\d+)$/.exec(r.headers.get('content-range') ?? '')?.[1]
  return Number(total ?? r.headers.get('content-length') ?? 0)
}

/** Sube un objeto desde la propia función (la mudanza desde Storage). */
export async function subirObjeto(clave: string, blob: Blob): Promise<void> {
  const r = await aws().fetch(urlDe(clave), {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
  })
  if (!r.ok) throw new Error(`R2 PUT ${r.status}`)
}

export async function borrarObjeto(clave: string): Promise<void> {
  const r = await aws().fetch(urlDe(clave), { method: 'DELETE' })
  // 204 aunque no exista; cualquier otro fallo se propaga.
  if (!r.ok && r.status !== 404) throw new Error(`R2 DELETE ${r.status}`)
}

/** Borra varias claves, de 8 en 8. */
export async function borrarObjetos(claves: string[]): Promise<void> {
  for (let i = 0; i < claves.length; i += 8) await Promise.all(claves.slice(i, i + 8).map(borrarObjeto))
}

/** Todas las claves bajo un prefijo (ListObjectsV2, paginado). */
export async function listarPrefijo(prefijo: string): Promise<string[]> {
  const claves: string[] = []
  let token: string | null = null
  do {
    const u = new URL(BASE)
    u.searchParams.set('list-type', '2')
    u.searchParams.set('prefix', prefijo)
    if (token) u.searchParams.set('continuation-token', token)
    const r = await aws().fetch(u.toString())
    if (!r.ok) throw new Error(`R2 LIST ${r.status}`)
    const xml = await r.text()
    for (const m of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) claves.push(desescapar(m[1]))
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? desescapar(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/.exec(xml)?.[1] ?? '') || null
      : null
  } while (token)
  return claves
}

const desescapar = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

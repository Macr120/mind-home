/**
 * Meta (Facebook + Instagram) con una sola app y Facebook Login: el token de
 * usuario long-lived (60 días, sin refresh) da los tokens de PÁGINA, y con el de
 * la Página se publica en Facebook y en la cuenta profesional de Instagram que
 * tenga vinculada. Solo Páginas: los perfiles personales no admiten publicar
 * por API desde 2018.
 *
 * Subidas: Reels (FB e IG) por `rupload.facebook.com` con `offset`/`file_size`;
 * video normal de FB (16:9) por la Resumable Upload API (`/{app}/uploads` +
 * `file_offset`) y `fbuploader_video_file_chunk` al publicar. Las tres aceptan
 * reanudar por offset, así que los trozos van en POST sucesivos.
 */
import { ErrorRedes, jsonDe, mensajeProveedor } from './errores.ts'

const V = 'v25.0'
const GRAPH = `https://graph.facebook.com/${V}`
export const SCOPES_META = 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish'

function credenciales() {
  const id = Deno.env.get('META_APP_ID') ?? ''
  const secreto = Deno.env.get('META_APP_SECRET') ?? ''
  if (!id || !secreto) throw new ErrorRedes('configuracion', 'Facebook e Instagram no están configurados en el servidor.')
  return { id, secreto }
}

export function urlAutorizacionMeta(state: string, redirect: string): string {
  const { id } = credenciales()
  const q = new URLSearchParams({ client_id: id, redirect_uri: redirect, state, response_type: 'code' })
  // Facebook Login for Business usa una configuración en vez de scopes sueltos.
  const config = Deno.env.get('META_CONFIG_ID')
  if (config) q.set('config_id', config)
  else q.set('scope', SCOPES_META)
  return `https://www.facebook.com/${V}/dialog/oauth?${q}`
}

/** `appsecret_proof` obligatorio si la app exige «Require App Secret»; gratis de añadir siempre. */
async function prueba(token: string): Promise<string> {
  const { secreto } = credenciales()
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const firma = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(token))
  return Array.from(new Uint8Array(firma), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Llamada a la Graph API con el token y su prueba; lanza errores tipados. */
export async function graph(ruta: string, token: string, init: { method?: string; form?: Record<string, string> } = {}): Promise<Record<string, unknown>> {
  const url = new URL(`${GRAPH}${ruta}`)
  url.searchParams.set('access_token', token)
  url.searchParams.set('appsecret_proof', await prueba(token))
  const resp = await fetch(url, {
    method: init.method ?? 'GET',
    headers: init.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
    body: init.form ? new URLSearchParams(init.form) : undefined,
  })
  const datos = await jsonDe(resp)
  const error = datos.error as { code?: number; message?: string; error_subcode?: number } | undefined
  if (!resp.ok || error) {
    // 190 = token inválido/caducado; 10/200/294 = permisos.
    if (error?.code === 190) throw new ErrorRedes('caducada', 'El acceso a Facebook caducó: vuelve a conectar la cuenta.')
    if (error?.code === 10 || error?.code === 200 || error?.code === 294) {
      throw new ErrorRedes('permisos', 'Faltan permisos en Facebook: vuelve a conectar la cuenta y acepta todos.')
    }
    if (error?.code === 4 || error?.code === 17 || error?.code === 32 || error?.code === 613) {
      throw new ErrorRedes('limite', 'Facebook pide esperar antes de publicar más.')
    }
    throw new ErrorRedes('proveedor', `Meta: ${error?.message ?? mensajeProveedor(datos, resp.status)}`)
  }
  return datos
}

export interface PaginaMeta {
  id: string
  nombre: string
  avatar: string | null
  token: string
  instagram: { id: string; username: string; avatar: string | null } | null
}

/** Código → token corto → long-lived (≈60 días). */
export async function canjearMeta(code: string, redirect: string): Promise<{ token: string; expira_en: string | null }> {
  const { id, secreto } = credenciales()
  const q1 = new URLSearchParams({ client_id: id, client_secret: secreto, redirect_uri: redirect, code })
  const r1 = await fetch(`${GRAPH}/oauth/access_token?${q1}`)
  const d1 = await jsonDe(r1)
  if (!r1.ok || typeof d1.access_token !== 'string') throw new ErrorRedes('proveedor', `Meta: ${mensajeProveedor(d1, r1.status)}`)
  const q2 = new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: id, client_secret: secreto, fb_exchange_token: d1.access_token })
  const r2 = await fetch(`${GRAPH}/oauth/access_token?${q2}`)
  const d2 = await jsonDe(r2)
  const token = typeof d2.access_token === 'string' ? d2.access_token : d1.access_token
  const seg = Number((r2.ok ? d2.expires_in : d1.expires_in) ?? 0)
  return { token, expira_en: seg > 0 ? new Date(Date.now() + seg * 1000).toISOString() : null }
}

/** Las Páginas que administra el usuario, con su token y su cuenta de Instagram vinculada. */
export async function paginasMeta(tokenUsuario: string): Promise<PaginaMeta[]> {
  const d = await graph(
    '/me/accounts?limit=100&fields=id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}',
    tokenUsuario,
  )
  const filas = Array.isArray(d.data) ? (d.data as Record<string, unknown>[]) : []
  return filas
    .filter((p) => typeof p.id === 'string' && typeof p.access_token === 'string')
    .map((p) => {
      const ig = p.instagram_business_account as Record<string, unknown> | undefined
      const foto = (p.picture as { data?: { url?: string } } | undefined)?.data?.url
      return {
        id: String(p.id),
        nombre: String(p.name ?? ''),
        avatar: typeof foto === 'string' ? foto : null,
        token: String(p.access_token),
        instagram:
          ig && typeof ig.id === 'string'
            ? { id: ig.id, username: String(ig.username ?? ''), avatar: typeof ig.profile_picture_url === 'string' ? ig.profile_picture_url : null }
            : null,
      }
    })
}

/** Un trozo a `rupload.facebook.com` (Reels de FB e IG): `offset` = bytes ya recibidos. */
export async function subirTrozoRupload(uploadUrl: string, token: string, bytes: Uint8Array<ArrayBuffer>, offset: number, total: number): Promise<void> {
  const resp = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: `OAuth ${token}`, offset: String(offset), file_size: String(total), 'Content-Type': 'application/octet-stream' },
    body: bytes,
  })
  const datos = await jsonDe(resp)
  if (!resp.ok || datos.success === false) {
    throw new ErrorRedes('proveedor', `Meta rechazó un trozo del video: ${mensajeProveedor(datos, resp.status)}`)
  }
}

/** Offset real que Meta tiene de una subida (para reanudar tras un trozo perdido). */
export async function offsetRupload(uploadUrl: string, token: string): Promise<number | null> {
  const resp = await fetch(uploadUrl, { headers: { Authorization: `OAuth ${token}` } })
  const datos = await jsonDe(resp)
  const n = Number(datos.offset ?? datos.file_offset)
  return Number.isFinite(n) ? n : null
}

// ─── Reel en la Página ───────────────────────────────────────────────────────

export async function iniciarReelFB(pageId: string, tokenPagina: string): Promise<{ video_id: string; upload_url: string }> {
  const d = await graph(`/${pageId}/video_reels`, tokenPagina, { method: 'POST', form: { upload_phase: 'start' } })
  if (typeof d.video_id !== 'string' || typeof d.upload_url !== 'string') throw new ErrorRedes('proveedor', 'Facebook no devolvió la sesión del Reel.')
  return { video_id: d.video_id, upload_url: d.upload_url }
}

export async function finalizarReelFB(pageId: string, tokenPagina: string, videoId: string, titulo: string, descripcion: string): Promise<void> {
  await graph(`/${pageId}/video_reels`, tokenPagina, {
    method: 'POST',
    form: { upload_phase: 'finish', video_id: videoId, video_state: 'PUBLISHED', title: titulo, description: descripcion },
  })
}

// ─── Video normal en la Página (Resumable Upload API) ─────────────────────────

export async function iniciarSubidaFB(tokenUsuario: string, tamano: number, mime: string, nombre: string): Promise<string> {
  const { id } = credenciales()
  const q = new URLSearchParams({ file_name: nombre, file_length: String(tamano), file_type: mime })
  const d = await graph(`/${id}/uploads?${q}`, tokenUsuario, { method: 'POST' })
  if (typeof d.id !== 'string') throw new ErrorRedes('proveedor', 'Facebook no devolvió la sesión de subida.')
  return d.id // 'upload:…'
}

/** Devuelve el handle del archivo cuando Meta lo da (al completar). */
export async function subirTrozoFB(sesion: string, tokenUsuario: string, bytes: Uint8Array<ArrayBuffer>, offset: number): Promise<string | null> {
  const resp = await fetch(`${GRAPH}/${sesion}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${tokenUsuario}`, file_offset: String(offset), 'Content-Type': 'application/octet-stream' },
    body: bytes,
  })
  const datos = await jsonDe(resp)
  if (!resp.ok) throw new ErrorRedes('proveedor', `Facebook rechazó un trozo del video: ${mensajeProveedor(datos, resp.status)}`)
  return typeof datos.h === 'string' ? datos.h : null
}

export async function offsetSubidaFB(sesion: string, tokenUsuario: string): Promise<number | null> {
  const resp = await fetch(`${GRAPH}/${sesion}`, { headers: { Authorization: `OAuth ${tokenUsuario}` } })
  const datos = await jsonDe(resp)
  const n = Number(datos.file_offset)
  return Number.isFinite(n) ? n : null
}

export async function publicarVideoFB(pageId: string, tokenPagina: string, handle: string, titulo: string, descripcion: string): Promise<string> {
  const d = await graph(`/${pageId}/videos`, tokenPagina, {
    method: 'POST',
    form: { fbuploader_video_file_chunk: handle, title: titulo, description: descripcion },
  })
  if (typeof d.id !== 'string') throw new ErrorRedes('proveedor', 'Facebook no devolvió el id del video.')
  return d.id
}

export interface EstadoMeta {
  estado: 'procesando' | 'publicado' | 'fallo'
  url?: string
  motivo?: string
}

export async function estadoVideoFB(videoId: string, tokenPagina: string): Promise<EstadoMeta> {
  const d = await graph(`/${videoId}?fields=status,permalink_url`, tokenPagina)
  const s = (d.status as { video_status?: string } | undefined)?.video_status
  const permalink = typeof d.permalink_url === 'string' ? `https://www.facebook.com${d.permalink_url}` : undefined
  if (s === 'ready') return { estado: 'publicado', url: permalink }
  if (s === 'error') return { estado: 'fallo', motivo: 'Facebook no pudo procesar el video.' }
  return { estado: 'procesando', url: permalink }
}

// ─── Reel en Instagram ───────────────────────────────────────────────────────

export async function iniciarReelIG(igId: string, token: string, caption: string, alFeed: boolean): Promise<{ id: string; uri: string }> {
  const d = await graph(`/${igId}/media`, token, {
    method: 'POST',
    form: { media_type: 'REELS', upload_type: 'resumable', caption, share_to_feed: alFeed ? 'true' : 'false' },
  })
  if (typeof d.id !== 'string' || typeof d.uri !== 'string') throw new ErrorRedes('proveedor', 'Instagram no devolvió el contenedor del Reel.')
  return { id: d.id, uri: d.uri }
}

export async function estadoContenedorIG(contenedor: string, token: string): Promise<'procesando' | 'listo' | 'fallo'> {
  const d = await graph(`/${contenedor}?fields=status_code,status`, token)
  const s = String(d.status_code ?? '')
  if (s === 'FINISHED') return 'listo'
  if (s === 'ERROR' || s === 'EXPIRED') return 'fallo'
  return 'procesando'
}

export async function publicarIG(igId: string, token: string, contenedor: string): Promise<{ id: string; url?: string }> {
  const d = await graph(`/${igId}/media_publish`, token, { method: 'POST', form: { creation_id: contenedor } })
  if (typeof d.id !== 'string') throw new ErrorRedes('proveedor', 'Instagram no devolvió el id de la publicación.')
  const p = await graph(`/${d.id}?fields=permalink`, token).catch(() => ({}) as Record<string, unknown>)
  return { id: d.id, url: typeof p.permalink === 'string' ? p.permalink : undefined }
}

/**
 * TikTok: Login Kit (PKCE) y Content Posting API en modo Direct Post con
 * FILE_UPLOAD por trozos. Sin el audit del cliente, TikTok fuerza los posts a
 * SELF_ONLY y `creator_info` solo devuelve esa opción: la UI enseña lo que
 * llega y nada más (requisito del propio audit).
 */
import { ErrorRedes, jsonDe, mensajeProveedor } from './errores.ts'

const API = 'https://open.tiktokapis.com/v2'
const SCOPES = 'user.info.basic,video.publish'

function credenciales() {
  const key = Deno.env.get('TIKTOK_CLIENT_KEY') ?? ''
  const secreto = Deno.env.get('TIKTOK_CLIENT_SECRET') ?? ''
  if (!key || !secreto) throw new ErrorRedes('configuracion', 'TikTok no está configurado en el servidor.')
  return { key, secreto }
}

export function urlAutorizacionTikTok(state: string, redirect: string, reto: string): string {
  const { key } = credenciales()
  const q = new URLSearchParams({
    client_key: key,
    scope: SCOPES,
    response_type: 'code',
    redirect_uri: redirect,
    state,
    code_challenge: reto,
    code_challenge_method: 'S256',
  })
  return `https://www.tiktok.com/v2/auth/authorize/?${q}`
}

export interface TokensTikTok {
  access_token: string
  expires_in: number
  refresh_token: string
  refresh_expires_in: number
  open_id: string
  scope: string
}

async function pedirToken(cuerpo: Record<string, string>): Promise<TokensTikTok> {
  const { key, secreto } = credenciales()
  const resp = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: key, client_secret: secreto, ...cuerpo }),
  })
  const datos = await jsonDe(resp)
  if (!resp.ok || typeof datos.access_token !== 'string') {
    if (datos.error === 'invalid_grant') throw new ErrorRedes('caducada', 'El acceso a TikTok caducó: vuelve a conectar la cuenta.')
    throw new ErrorRedes('proveedor', `TikTok: ${String(datos.error_description ?? datos.error ?? resp.status).slice(0, 200)}`)
  }
  return datos as unknown as TokensTikTok
}

export async function canjearTikTok(code: string, redirect: string, verifier: string): Promise<TokensTikTok> {
  const t = await pedirToken({ code, grant_type: 'authorization_code', redirect_uri: redirect, code_verifier: verifier })
  if (!t.scope.split(',').includes('video.publish')) throw new ErrorRedes('permisos', 'Hace falta el permiso para publicar videos en TikTok.')
  return t
}

export function refrescarTikTok(refreshToken: string): Promise<TokensTikTok> {
  return pedirToken({ grant_type: 'refresh_token', refresh_token: refreshToken })
}

export async function revocarTikTok(token: string): Promise<void> {
  const { key, secreto } = credenciales()
  await fetch(`${API}/oauth/revoke/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: key, client_secret: secreto, token }),
  }).catch(() => {})
}

/** Las respuestas de TikTok llevan `error.code === 'ok'` cuando todo fue bien. */
async function llamar(token: string, ruta: string, cuerpo?: unknown, metodo = 'POST'): Promise<Record<string, unknown>> {
  const resp = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  const datos = await jsonDe(resp)
  const error = datos.error as { code?: string; message?: string } | undefined
  if (!resp.ok || (error && error.code && error.code !== 'ok')) {
    if (resp.status === 401 || error?.code === 'access_token_invalid') {
      throw new ErrorRedes('caducada', 'El acceso a TikTok caducó: vuelve a conectar la cuenta.')
    }
    if (error?.code === 'rate_limit_exceeded' || resp.status === 429) {
      throw new ErrorRedes('limite', 'TikTok pide esperar un momento antes de volver a intentarlo.')
    }
    if (error?.code === 'scope_not_authorized') throw new ErrorRedes('permisos', 'Hace falta el permiso para publicar videos en TikTok.')
    throw new ErrorRedes('proveedor', `TikTok: ${error?.message ?? mensajeProveedor(datos, resp.status)}`)
  }
  return (datos.data as Record<string, unknown>) ?? {}
}

export async function perfilTikTok(token: string): Promise<{ open_id: string; nombre: string; avatar: string | null }> {
  const d = await llamar(token, '/user/info/?fields=open_id,display_name,avatar_url', undefined, 'GET')
  const u = (d.user as Record<string, unknown>) ?? {}
  return {
    open_id: String(u.open_id ?? ''),
    nombre: String(u.display_name ?? ''),
    avatar: typeof u.avatar_url === 'string' ? u.avatar_url : null,
  }
}

export interface InfoCreador {
  nickname: string
  avatar: string | null
  privacidad: string[]
  comentarios: boolean
  duet: boolean
  stitch: boolean
  max_duracion_seg: number
}

/** Obligatorio antes de cada post (y lo que la UI DEBE enseñar). */
export async function infoCreador(token: string): Promise<InfoCreador> {
  const d = await llamar(token, '/post/publish/creator_info/query/', {})
  return {
    nickname: String(d.creator_nickname ?? d.creator_username ?? ''),
    avatar: typeof d.creator_avatar_url === 'string' ? d.creator_avatar_url : null,
    privacidad: Array.isArray(d.privacy_level_options) ? d.privacy_level_options.map(String) : [],
    comentarios: d.comment_disabled !== true,
    duet: d.duet_disabled !== true,
    stitch: d.stitch_disabled !== true,
    max_duracion_seg: Number(d.max_video_post_duration_sec ?? 600),
  }
}

export interface PostTikTok {
  title: string
  privacy_level: string
  disable_comment: boolean
  disable_duet: boolean
  disable_stitch: boolean
  brand_content_toggle: boolean
  brand_organic_toggle: boolean
  is_aigc: boolean
}

export async function iniciarPostTikTok(
  token: string,
  post: PostTikTok,
  tamano: number,
  trozo: number,
): Promise<{ publish_id: string; upload_url: string }> {
  const d = await llamar(token, '/post/publish/video/init/', {
    post_info: post,
    source_info: {
      source: 'FILE_UPLOAD',
      video_size: tamano,
      chunk_size: trozo,
      // TikTok: floor(tamaño / trozo); el último trozo se lleva el resto.
      total_chunk_count: Math.max(1, Math.floor(tamano / trozo)),
    },
  })
  if (typeof d.publish_id !== 'string' || typeof d.upload_url !== 'string') throw new ErrorRedes('proveedor', 'TikTok no devolvió la sesión de subida.')
  return { publish_id: d.publish_id, upload_url: d.upload_url }
}

/** `PUT` de un trozo al `upload_url`; 206 = faltan más, 201 = completo. */
export async function subirTrozoTikTok(uploadUrl: string, bytes: Uint8Array<ArrayBuffer>, offset: number, total: number, mime: string): Promise<void> {
  const resp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mime,
      'Content-Length': String(bytes.byteLength),
      'Content-Range': `bytes ${offset}-${offset + bytes.byteLength - 1}/${total}`,
    },
    body: bytes,
  })
  if (resp.status !== 206 && resp.status !== 201 && resp.status !== 200) {
    throw new ErrorRedes('proveedor', `TikTok rechazó un trozo del video (HTTP ${resp.status}).`)
  }
}

export interface EstadoTikTok {
  estado: 'procesando' | 'publicado' | 'fallo'
  id?: string
  motivo?: string
}

export async function estadoPostTikTok(token: string, publishId: string): Promise<EstadoTikTok> {
  const d = await llamar(token, '/post/publish/status/fetch/', { publish_id: publishId })
  const s = String(d.status ?? '')
  if (s === 'PUBLISH_COMPLETE') {
    const ids = Array.isArray(d.publicaly_available_post_id) ? d.publicaly_available_post_id : []
    return { estado: 'publicado', id: ids.length ? String(ids[0]) : undefined }
  }
  if (s === 'FAILED') return { estado: 'fallo', motivo: String(d.fail_reason ?? 'unknown') }
  return { estado: 'procesando' }
}

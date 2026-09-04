/**
 * Google: OAuth (scope `youtube.upload` + perfil básico) y la sesión resumable
 * de `videos.insert`. La subida en sí la hace el CLIENTE directo a Google (los
 * `PUT` no gastan cuota y googleapis da CORS); aquí solo se inicia, porque es
 * la llamada que cuesta 1600 unidades y hay que contarla antes de gastarla.
 */
import { ErrorRedes, jsonDe, mensajeProveedor } from './errores.ts'

const SCOPE_UPLOAD = 'https://www.googleapis.com/auth/youtube.upload'

function credenciales() {
  const id = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
  const secreto = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
  if (!id || !secreto) throw new ErrorRedes('configuracion', 'YouTube no está configurado en el servidor.')
  return { id, secreto }
}

export function urlAutorizacionGoogle(state: string, redirect: string): string {
  const { id } = credenciales()
  const q = new URLSearchParams({
    client_id: id,
    redirect_uri: redirect,
    response_type: 'code',
    scope: `openid email profile ${SCOPE_UPLOAD}`,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`
}

export interface TokensGoogle {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
}

async function pedirToken(cuerpo: Record<string, string>): Promise<TokensGoogle> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(cuerpo),
  })
  const datos = await jsonDe(resp)
  if (!resp.ok || typeof datos.access_token !== 'string') {
    // `invalid_grant` = refresh token revocado o caducado: hay que reconectar.
    if (datos.error === 'invalid_grant') throw new ErrorRedes('caducada', 'El acceso a YouTube caducó: vuelve a conectar la cuenta.')
    throw new ErrorRedes('proveedor', `Google: ${mensajeProveedor(datos, resp.status)}`)
  }
  return datos as unknown as TokensGoogle
}

export async function canjearGoogle(code: string, redirect: string): Promise<TokensGoogle> {
  const { id, secreto } = credenciales()
  const t = await pedirToken({ code, client_id: id, client_secret: secreto, redirect_uri: redirect, grant_type: 'authorization_code' })
  if (!t.scope.split(' ').includes(SCOPE_UPLOAD)) {
    throw new ErrorRedes('permisos', 'Hace falta el permiso para subir videos a YouTube.')
  }
  return t
}

export async function refrescarGoogle(refreshToken: string): Promise<TokensGoogle> {
  const { id, secreto } = credenciales()
  return pedirToken({ refresh_token: refreshToken, client_id: id, client_secret: secreto, grant_type: 'refresh_token' })
}

export async function perfilGoogle(token: string): Promise<{ sub: string; nombre: string; avatar: string | null }> {
  const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } })
  const datos = await jsonDe(resp)
  if (!resp.ok || typeof datos.sub !== 'string') throw new ErrorRedes('proveedor', `Google: ${mensajeProveedor(datos, resp.status)}`)
  return { sub: datos.sub, nombre: String(datos.name ?? datos.email ?? ''), avatar: typeof datos.picture === 'string' ? datos.picture : null }
}

/** Best-effort: si falla, la fila se borra igual. */
export async function revocarGoogle(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {})
}

export interface MetaYouTube {
  titulo: string
  descripcion: string
  privacidad: 'public' | 'unlisted' | 'private'
  paraNinos: boolean
  categoryId: string
}

/**
 * `videos.insert` resumable: devuelve la `upload_url` a la que el cliente hará los PUT.
 * Cuesta 1600 unidades.
 *
 * `origen` es el del NAVEGADOR que va a subir, y no es opcional de verdad: Google ata
 * la sesión resumable al `Origin` con el que se abrió y solo a ese le devuelve
 * cabeceras CORS en los PUT. Sin mandarlo aquí, el `fetch` del navegador ni siquiera
 * llega a recibir respuesta —falla en el preflight— y la app lo ve como «se perdió la
 * conexión durante la subida».
 */
export async function iniciarSubidaYouTube(token: string, meta: MetaYouTube, tamano: number, mime: string, origen?: string | null): Promise<string> {
  const resp = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mime,
      'X-Upload-Content-Length': String(tamano),
      ...(origen ? { Origin: origen } : {}),
    },
    body: JSON.stringify({
      snippet: { title: meta.titulo, description: meta.descripcion, categoryId: meta.categoryId },
      status: { privacyStatus: meta.privacidad, selfDeclaredMadeForKids: meta.paraNinos },
    }),
  })
  const location = resp.headers.get('Location')
  if (!resp.ok || !location) {
    const datos = await jsonDe(resp)
    if (resp.status === 401) throw new ErrorRedes('caducada', 'El acceso a YouTube caducó: vuelve a conectar la cuenta.')
    if (resp.status === 403 && JSON.stringify(datos).includes('quota')) {
      throw new ErrorRedes('cuota-youtube', 'YouTube agotó la cuota diaria de subidas de la app. Inténtalo mañana o descarga el video.')
    }
    throw new ErrorRedes('proveedor', `YouTube: ${mensajeProveedor(datos, resp.status)}`)
  }
  return location
}

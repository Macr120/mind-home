/**
 * Llamadas a las Edge Functions de redes (`redes-oauth` y `redes-publicar`).
 *
 * No reutiliza `llamarFuncion` de `cuenta/api.ts`: aquel mapea los errores de
 * la IA y abre los modales de cuota; aquí los códigos son otros. Sí comparte
 * `tokenSesion()`.
 *
 * `publicar` orquesta la subida entera: YouTube directo a Google por trozos
 * (los PUT no gastan cuota y googleapis da CORS), el resto por trozos a la
 * función, que los reenvía; luego `finalizar` y el poll del estado.
 *
 * Gancho de pruebas (solo DEV): `localStorage.mh.redesStub = '1'` desvía todo a
 * `api.stub.ts` para ejercitar la UI sin cuentas ni consolas.
 */
import { hayBackend } from '../cuenta/supabase'
import { haySesionProbable } from '../cuenta/sesionStore'
import { ErrorIA, tokenSesion } from '../cuenta/api'
import {
  ErrorRedes,
  type CodigoErrorRedes,
  type EstadoRedes,
  type MetaPublicacion,
  type OpcionesTikTok,
  type Plataforma,
  type ResultadoPublicacion,
} from './tipos'

export type Retorno = { tipo: 'app' } | { tipo: 'popup' | 'pestana'; origen: string }

export type OpcionesPublicacion =
  | OpcionesTikTok
  | { privacidad: string[]; auditado: boolean }
  | { paginas: { id: string; nombre: string; avatar: string | null; instagram: { id: string; username: string } | null }[]; page_id: string; live: boolean }
  | { requiere: { mime: string; aspecto: string }; username: string; live: boolean }

export interface OpcionesPublicar {
  plataforma: Plataforma
  blob: Blob
  mime: string
  meta: MetaPublicacion
  onProgreso?: (fraccion: number, fase: 'subiendo' | 'procesando') => void
  senal?: AbortSignal
}

type Inicio =
  | { modo: 'directo'; upload_url: string; access_token: string; expira_en: string | null; trozo: number }
  | { modo: 'trozos'; sesion: string; trozo: number; total_trozos: number; poll_ms: number }

interface EstadoSesion {
  estado: 'subiendo' | 'procesando' | 'publicado' | 'fallo'
  id?: string
  url?: string
  motivo?: string
  privado: boolean
}

const LS_STUB = 'mh.redesStub'

async function stub() {
  return import.meta.env.DEV && localStorage.getItem(LS_STUB) === '1' ? await import('./api.stub') : null
}

const base = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

/** ¿Tiene sentido ofrecer las redes? Backend y sesión (probable: el espejo síncrono vale durante el arranque). */
export function redesDisponibles(): boolean {
  if (import.meta.env.DEV && localStorage.getItem(LS_STUB) === '1') return true
  return hayBackend() && haySesionProbable()
}

async function token(): Promise<string> {
  try {
    return await tokenSesion()
  } catch (e) {
    throw new ErrorRedes('sin-sesion', e instanceof ErrorIA ? e.message : 'Inicia sesión para publicar.')
  }
}

async function respuesta<T>(resp: Response): Promise<T> {
  const json: unknown = await resp.json().catch(() => null)
  if (!resp.ok) {
    const e = (json ?? {}) as { error?: CodigoErrorRedes; mensaje?: string; recibido?: number }
    throw new ErrorRedes(e.error ?? 'proveedor', e.mensaje ?? 'El servidor de MindHaOS no respondió.', {
      recibido: e.recibido,
    })
  }
  return json as T
}

async function llamarRedes<T>(fn: 'redes-oauth' | 'redes-publicar', cuerpo: unknown, senal?: AbortSignal): Promise<T> {
  const t = await token()
  let resp: Response
  try {
    resp = await fetch(`${base()}/${fn}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: senal,
    })
  } catch (e) {
    if (senal?.aborted) throw new ErrorRedes('cancelado', 'Cancelado.')
    throw new ErrorRedes('proveedor', e instanceof Error && e.message ? e.message : 'No hay conexión con el servidor.')
  }
  return respuesta<T>(resp)
}

/** Un trozo binario a `redes-publicar`; los metadatos van en la query (la función no acepta cabeceras extra por CORS). */
async function enviarTrozo(sesion: string, offset: number, bytes: Blob, senal?: AbortSignal): Promise<{ recibido: number; completo: boolean }> {
  const t = await token()
  const q = new URLSearchParams({ accion: 'trozo', sesion, offset: String(offset) })
  let resp: Response
  try {
    resp = await fetch(`${base()}/redes-publicar?${q}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/octet-stream' },
      body: bytes,
      signal: senal,
    })
  } catch (e) {
    if (senal?.aborted) throw new ErrorRedes('cancelado', 'Cancelado.')
    throw new ErrorRedes('proveedor', e instanceof Error && e.message ? e.message : 'Se perdió la conexión durante la subida.')
  }
  return respuesta(resp)
}

// ─── cuentas ─────────────────────────────────────────────────────────────────

export async function iniciarConexion(plataforma: Plataforma, retorno: Retorno): Promise<{ url: string }> {
  const s = await stub()
  if (s) return s.iniciarConexion(plataforma, retorno)
  return llamarRedes('redes-oauth', { accion: 'iniciar', plataforma, retorno })
}

export async function estadoRedes(): Promise<EstadoRedes> {
  const s = await stub()
  if (s) return s.estadoRedes()
  return llamarRedes('redes-oauth', { accion: 'estado' })
}

export async function elegirPagina(plataforma: 'facebook' | 'instagram', pageId: string): Promise<void> {
  const s = await stub()
  if (s) return s.elegirPagina(plataforma, pageId)
  await llamarRedes('redes-oauth', { accion: 'elegir', plataforma, page_id: pageId })
}

export async function desconectarRed(plataforma: Plataforma): Promise<void> {
  const s = await stub()
  if (s) return s.desconectarRed(plataforma)
  await llamarRedes('redes-oauth', { accion: 'desconectar', plataforma })
}

export async function opcionesPublicacion(plataforma: Plataforma): Promise<OpcionesPublicacion> {
  const s = await stub()
  if (s) return s.opcionesPublicacion(plataforma)
  return llamarRedes('redes-publicar', { accion: 'opciones', plataforma })
}

// ─── publicar ────────────────────────────────────────────────────────────────

const espera = (ms: number, senal?: AbortSignal) =>
  new Promise<void>((resolver, rechazar) => {
    const id = window.setTimeout(resolver, ms)
    senal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(id)
        rechazar(new ErrorRedes('cancelado', 'Cancelado.'))
      },
      { once: true },
    )
  })

function comprobarCancelado(senal?: AbortSignal) {
  if (senal?.aborted) throw new ErrorRedes('cancelado', 'Cancelado.')
}

/** Solo los fallos de transporte/proveedor se reintentan; los demás son definitivos. */
function reintentable(e: unknown): boolean {
  return e instanceof ErrorRedes && (e.codigo === 'proveedor' || e.codigo === 'limite')
}

export async function publicar(o: OpcionesPublicar): Promise<ResultadoPublicacion> {
  const s = await stub()
  if (s) return s.publicar(o)
  const { plataforma, blob, mime, meta, onProgreso, senal } = o
  const inicio = await llamarRedes<Inicio>(
    'redes-publicar',
    { accion: 'iniciar-publicacion', plataforma, tamano: blob.size, mime, meta },
    senal,
  )
  if (inicio.modo === 'directo') return subidaDirectaYouTube(blob, mime, inicio, onProgreso, senal)

  // Trozos a la función. El último se lleva el resto (< 2 trozos): TikTok exige
  // `floor(tamaño / trozo)` trozos exactos, y a Meta le da igual.
  let offset = 0
  let intentos = 0
  while (offset < blob.size) {
    comprobarCancelado(senal)
    const fin = Math.min(blob.size, offset + inicio.trozo)
    const finReal = blob.size - fin < inicio.trozo ? blob.size : fin
    try {
      const r = await enviarTrozo(inicio.sesion, offset, blob.slice(offset, finReal), senal)
      offset = r.recibido
      intentos = 0
    } catch (e) {
      if (e instanceof ErrorRedes && e.codigo === 'orden' && typeof e.extra.recibido === 'number') {
        offset = e.extra.recibido
        continue
      }
      if (!reintentable(e) || ++intentos > 3) throw e
      await espera(1500 * intentos, senal)
      continue
    }
    onProgreso?.(offset / blob.size, 'subiendo')
  }
  await llamarRedes('redes-publicar', { accion: 'finalizar', sesion: inicio.sesion }, senal)
  onProgreso?.(1, 'procesando')

  const tope = Date.now() + 10 * 60_000
  while (Date.now() < tope) {
    await espera(inicio.poll_ms, senal)
    const e = await llamarRedes<EstadoSesion>('redes-publicar', { accion: 'estado-publicacion', sesion: inicio.sesion }, senal)
    if (e.estado === 'publicado') return { plataforma, id: e.id ?? '', url: e.url, privado: e.privado }
    if (e.estado === 'fallo') throw new ErrorRedes('proveedor', e.motivo || 'La red no pudo procesar el video.')
  }
  throw new ErrorRedes('proveedor', 'La red tarda demasiado en procesar el video; revísalo en la propia app dentro de un rato.')
}

/** `PUT` resumable a Google: 308 = sigue (con `Range` de lo recibido), 200/201 = listo, 401 = renovar el token. */
async function subidaDirectaYouTube(
  blob: Blob,
  mime: string,
  inicio: Extract<Inicio, { modo: 'directo' }>,
  onProgreso: OpcionesPublicar['onProgreso'],
  senal?: AbortSignal,
): Promise<ResultadoPublicacion> {
  let token = inicio.access_token
  let offset = 0
  let intentos = 0
  const cabeceras = (rango: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': mime, 'Content-Range': rango })
  const recibidoDe = (resp: Response) => {
    const rango = resp.headers.get('Range')
    const fin = rango ? Number(rango.split('-')[1]) : NaN
    return Number.isFinite(fin) ? fin + 1 : null
  }
  while (offset < blob.size) {
    comprobarCancelado(senal)
    const fin = Math.min(blob.size, offset + inicio.trozo)
    let resp: Response
    try {
      resp = await fetch(inicio.upload_url, {
        method: 'PUT',
        headers: cabeceras(`bytes ${offset}-${fin - 1}/${blob.size}`),
        body: blob.slice(offset, fin),
        signal: senal,
      })
    } catch {
      comprobarCancelado(senal)
      if (++intentos > 3) throw new ErrorRedes('proveedor', 'Se perdió la conexión con YouTube durante la subida.')
      await espera(1500 * intentos, senal)
      // Preguntar por dónde va: `bytes */total` sin cuerpo.
      const q = await fetch(inicio.upload_url, { method: 'PUT', headers: cabeceras(`bytes */${blob.size}`), signal: senal }).catch(() => null)
      if (q?.status === 308) offset = recibidoDe(q) ?? offset
      else if (q?.ok) return await resultadoYouTube(q)
      continue
    }
    if (resp.status === 308) {
      offset = recibidoDe(resp) ?? fin
      intentos = 0
    } else if (resp.ok) {
      onProgreso?.(1, 'procesando')
      return await resultadoYouTube(resp)
    } else if (resp.status === 401) {
      const r = await llamarRedes<{ access_token: string }>('redes-publicar', { accion: 'token-youtube' }, senal)
      token = r.access_token
    } else if (resp.status >= 500 || resp.status === 429) {
      if (++intentos > 3) throw new ErrorRedes('proveedor', `YouTube no aceptó la subida (HTTP ${resp.status}).`)
      await espera(1500 * intentos, senal)
    } else {
      const json = (await resp.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new ErrorRedes('proveedor', `YouTube: ${json.error?.message ?? `HTTP ${resp.status}`}`)
    }
    onProgreso?.(offset / blob.size, 'subiendo')
  }
  throw new ErrorRedes('proveedor', 'YouTube no confirmó el video.')
}

async function resultadoYouTube(resp: Response): Promise<ResultadoPublicacion> {
  const json = (await resp.json().catch(() => ({}))) as { id?: string; status?: { privacyStatus?: string } }
  if (!json.id) throw new ErrorRedes('proveedor', 'YouTube no devolvió el id del video.')
  return { plataforma: 'youtube', id: json.id, url: `https://youtu.be/${json.id}`, privado: json.status?.privacyStatus !== 'public' }
}

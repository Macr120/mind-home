/**
 * Publicar un video del Studio en la cuenta conectada del usuario.
 *
 * YouTube sube DIRECTO desde el cliente (los PUT no gastan cuota): aquí solo se
 * inicia la sesión resumable, que es la llamada que cuesta 1600 unidades, tras
 * contarla en el tope global de la app y en el del usuario. Googleapis da CORS,
 * pero SOLO al origen con el que se abrió la sesión: por eso el `Origin` del
 * navegador se reenvía a Google al iniciarla. TikTok y Meta no dan CORS a sus
 * hosts de subida, así que el cliente manda el archivo POR TROZOS a esta
 * función y ella lo reenvía con el
 * token del servidor (puro I/O: la CPU de 2 s no se toca).
 *
 * Acciones (POST con Bearer; JWT verificado por el gateway):
 *   {accion:'opciones', plataforma}                       → lo que la UI enseña antes de publicar
 *   {accion:'iniciar-publicacion', plataforma, tamano, mime, meta}
 *       → youtube: {modo:'directo', upload_url, access_token, expira_en, trozo}
 *       → resto:   {modo:'trozos', sesion, trozo, total_trozos, poll_ms}
 *   POST ?accion=trozo&sesion=&offset=  (cuerpo binario)  → {recibido, completo} | 409 {error:'orden', recibido}
 *   {accion:'finalizar', sesion}                          → {estado}
 *   {accion:'estado-publicacion', sesion}                 → {estado, id, url, motivo, privado}
 *   {accion:'token-youtube'}                              → {access_token, expira_en}
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { clienteAdmin, clienteUsuario, usuarioDe } from '../_shared/auth.ts'
import { corsDe, json, preflight } from '../_shared/cors.ts'
import { dentroDeLimite } from '../_shared/limite.ts'
import { ErrorRedes, respuestaError } from '../_shared/redes/errores.ts'
import { iniciarSubidaYouTube, type MetaYouTube } from '../_shared/redes/google.ts'
import {
  estadoContenedorIG,
  estadoVideoFB,
  finalizarReelFB,
  iniciarReelFB,
  iniciarReelIG,
  iniciarSubidaFB,
  offsetRupload,
  offsetSubidaFB,
  publicarIG,
  publicarVideoFB,
  subirTrozoFB,
  subirTrozoRupload,
} from '../_shared/redes/meta.ts'
import { esPlataforma, mimeNormalizado, type Plataforma } from '../_shared/redes/plataformas.ts'
import { estadoPostTikTok, infoCreador, iniciarPostTikTok, subirTrozoTikTok, type PostTikTok } from '../_shared/redes/tiktok.ts'
import { cuentaVigente, type Cuenta } from '../_shared/redes/tokens.ts'

/** Trozo que dicta el servidor: ≥ 5 MB (mínimo de TikTok), múltiplo de 256 KiB (YouTube), < 150 s a 1 Mb/s. */
const TROZO_BYTES = 8 * 1024 * 1024
/** El último trozo se lleva el resto (< 2 × trozo); nada mayor se lee siquiera. */
const TROZO_MAX = 2 * TROZO_BYTES + 65_536
const MIN_TROZO_TIKTOK = 5 * 1024 * 1024
const TOPE_TAMANO: Record<Plataforma, number> = {
  youtube: 2 * 1024 ** 3,
  tiktok: 2 * 1024 ** 3,
  facebook: 1024 ** 3,
  instagram: 1024 ** 3,
}
/** Una sesión de subida vive 2 h (el upload_url de TikTok caduca a la hora, pero se reanuda dentro). */
const VIDA_SESION_MS = 2 * 3_600_000
const UID_GLOBAL = '00000000-0000-0000-0000-000000000000'
/**
 * Techos de subidas a YouTube, con el de la app por encima del de cada usuario.
 * Sep 2026: YouTube cambió el cálculo de cuota —antes `videos.insert` costaba
 * 1600 de 10 000 al día, o sea 6 subidas; ahora son 100 llamadas al día y cada
 * una cuesta 1—, así que el 5 global se quedó absurdamente bajo. Se sube a 60,
 * que deja 40 de colchón bajo el techo del proyecto.
 */
const MAX_YT_DIA = Number(Deno.env.get('REDES_YT_MAX_DIA') ?? 60)
const MAX_YT_DIA_USUARIO = Number(Deno.env.get('REDES_YT_MAX_DIA_USUARIO') ?? 5)
const bandera = (nombre: string) => (Deno.env.get(nombre) ?? '0') === '1'

const PRIVACIDAD_YT = new Set(['public', 'unlisted', 'private'])

interface Sesion {
  id: string
  user_id: string
  plataforma: 'tiktok' | 'facebook' | 'instagram'
  estado: 'subiendo' | 'procesando' | 'publicado' | 'fallo'
  tamano: number
  trozo: number
  recibido: number
  mime: string
  meta: Record<string, unknown>
  remoto: Record<string, unknown>
  creado_en: string
}

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  const cors = corsDe(req)
  if (req.method !== 'POST') return json({ error: 'peticion-invalida', mensaje: 'Método no soportado.' }, 400, cors)
  try {
    const usuario = await usuarioDe(clienteUsuario(req))
    if (!usuario) throw new ErrorRedes('sin-sesion', 'Inicia sesión para publicar.')
    const admin = clienteAdmin()
    const url = new URL(req.url)
    // El trozo viaja binario: sus metadatos van en la query (sin ampliar las cabeceras CORS).
    if (url.searchParams.get('accion') === 'trozo') return json(await trozo(admin, usuario.id, url, req), 200, cors)

    let cuerpo: Record<string, unknown> = {}
    try {
      cuerpo = (await req.json()) as Record<string, unknown>
    } catch {
      /* cae en 'peticion-invalida' */
    }
    switch (cuerpo.accion) {
      case 'opciones':
        return json(await opciones(admin, usuario.id, cuerpo), 200, cors)
      case 'iniciar-publicacion':
        return json(await iniciarPublicacion(admin, usuario.id, cuerpo, req.headers.get('Origin')), 200, cors)
      case 'finalizar':
        return json(await finalizar(admin, usuario.id, cuerpo), 200, cors)
      case 'estado-publicacion':
        return json(await estadoPublicacion(admin, usuario.id, cuerpo), 200, cors)
      case 'token-youtube': {
        // Margen casi igual a la vida del token (1 h): fuerza el refresh a mitad de una subida larga.
        const c = await cuentaVigente(admin, usuario.id, 'youtube', 3300)
        return json({ access_token: c.access_token, expira_en: c.expira_en }, 200, cors)
      }
      default:
        throw new ErrorRedes('peticion-invalida', 'Acción desconocida.')
    }
  } catch (e) {
    return respuestaError(e, cors)
  }
})

// ─── opciones ────────────────────────────────────────────────────────────────

async function opciones(admin: SupabaseClient, uid: string, cuerpo: Record<string, unknown>): Promise<Record<string, unknown>> {
  const plataforma = cuerpo.plataforma
  if (!esPlataforma(plataforma)) throw new ErrorRedes('plataforma', 'Red desconocida.')
  const cuenta = await cuentaVigente(admin, uid, plataforma)
  switch (plataforma) {
    case 'youtube':
      return { privacidad: ['public', 'unlisted', 'private'], auditado: bandera('REDES_YT_AUDITADO') }
    case 'tiktok':
      return { ...(await infoCreador(cuenta.access_token)), auditado: bandera('REDES_TIKTOK_AUDITADO') }
    case 'facebook':
      return { paginas: cuenta.extra.paginas ?? [], page_id: cuenta.cuenta_id, live: bandera('REDES_META_LIVE') }
    case 'instagram':
      return { requiere: { mime: 'video/mp4', aspecto: '9:16' }, username: cuenta.nombre, live: bandera('REDES_META_LIVE') }
  }
}

// ─── iniciar-publicacion ─────────────────────────────────────────────────────

function texto(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

async function iniciarPublicacion(admin: SupabaseClient, uid: string, cuerpo: Record<string, unknown>, origen?: string | null): Promise<Record<string, unknown>> {
  const plataforma = cuerpo.plataforma
  if (!esPlataforma(plataforma)) throw new ErrorRedes('plataforma', 'Red desconocida.')
  const tamano = Number(cuerpo.tamano)
  if (!Number.isInteger(tamano) || tamano <= 0) throw new ErrorRedes('peticion-invalida', 'Tamaño del video inválido.')
  if (tamano > TOPE_TAMANO[plataforma]) throw new ErrorRedes('demasiado-grande', 'El video pesa más de lo que admite esa red.')
  const mime = mimeNormalizado(cuerpo.mime)
  if (!mime) throw new ErrorRedes('formato', 'Solo se publican archivos MP4 o WebM.')
  const meta = (cuerpo.meta ?? {}) as Record<string, unknown>
  const aspecto = meta.aspecto === '9:16' ? '9:16' : meta.aspecto === '1:1' ? '1:1' : '16:9'
  const duracion = Number(meta.duracion_seg ?? 0)
  const titulo = texto(meta.titulo, 2200)
  const descripcion = texto(meta.descripcion, 5000)

  if (!(await dentroDeLimite(admin, uid, `redes-pub-${plataforma}`, plataforma === 'youtube' ? MAX_YT_DIA_USUARIO : 10, 86_400))) {
    throw new ErrorRedes('limite', 'Ya publicaste varias veces hoy en esa red; inténtalo mañana.')
  }
  // Limpieza oportunista de sesiones viejas del propio usuario.
  await admin
    .from('redes_publicaciones')
    .delete()
    .eq('user_id', uid)
    .lt('creado_en', new Date(Date.now() - 86_400_000).toISOString())

  if (plataforma === 'youtube') {
    const cuenta = await cuentaVigente(admin, uid, 'youtube', 1800)
    if (!(await dentroDeLimite(admin, UID_GLOBAL, 'youtube-global', MAX_YT_DIA, 86_400, false))) {
      throw new ErrorRedes('cuota-youtube', 'Hoy ya no quedan subidas a YouTube en la app; inténtalo mañana o descarga el video.')
    }
    const yt = (meta.youtube ?? {}) as Record<string, unknown>
    const pedida = String(meta.privacidad ?? 'private')
    const m: MetaYouTube = {
      titulo: texto(meta.titulo, 100).replace(/[<>]/g, '') || 'Video',
      descripcion,
      // Sin la auditoría de Google todo sube privado de todos modos: se deja explícito.
      privacidad: bandera('REDES_YT_AUDITADO') && PRIVACIDAD_YT.has(pedida) ? (pedida as MetaYouTube['privacidad']) : 'private',
      paraNinos: yt.madeForKids === true,
      categoryId: /^\d{1,3}$/.test(String(yt.categoryId ?? '')) ? String(yt.categoryId) : '22',
    }
    const upload_url = await iniciarSubidaYouTube(cuenta.access_token, m, tamano, mime, origen)
    return { modo: 'directo', upload_url, access_token: cuenta.access_token, expira_en: cuenta.expira_en, trozo: TROZO_BYTES }
  }

  const cuenta = await cuentaVigente(admin, uid, plataforma)
  let trozo = TROZO_BYTES
  let remoto: Record<string, unknown>
  let poll_ms = 5000
  let metaGuardada: Record<string, unknown> = { titulo, descripcion, aspecto }

  if (plataforma === 'tiktok') {
    const info = await infoCreador(cuenta.access_token)
    const tt = (meta.tiktok ?? {}) as Record<string, unknown>
    const privacidad = String(meta.privacidad ?? '')
    if (!info.privacidad.includes(privacidad)) throw new ErrorRedes('peticion-invalida', 'Elige una privacidad válida para TikTok.')
    if (duracion > info.max_duracion_seg) {
      throw new ErrorRedes('formato', `TikTok admite hasta ${info.max_duracion_seg} s en esta cuenta.`)
    }
    if (!titulo) throw new ErrorRedes('peticion-invalida', 'TikTok necesita un título.')
    const post: PostTikTok = {
      title: titulo,
      privacy_level: privacidad,
      // Lo que el creador tiene apagado en TikTok se respeta aunque la UI mande otra cosa.
      disable_comment: !info.comentarios || tt.disable_comment === true,
      disable_duet: !info.duet || tt.disable_duet === true,
      disable_stitch: !info.stitch || tt.disable_stitch === true,
      brand_content_toggle: tt.brand_content_toggle === true,
      brand_organic_toggle: tt.brand_organic_toggle === true,
      is_aigc: tt.is_aigc === true,
    }
    trozo = tamano < MIN_TROZO_TIKTOK ? tamano : TROZO_BYTES
    const s = await iniciarPostTikTok(cuenta.access_token, post, tamano, trozo)
    remoto = { publish_id: s.publish_id, upload_url: s.upload_url }
    poll_ms = 15_000 // 6 peticiones/min por token, y creator_info + init ya gastaron dos
  } else if (plataforma === 'facebook') {
    const fb = (meta.facebook ?? {}) as Record<string, unknown>
    if (typeof fb.page_id === 'string' && fb.page_id !== cuenta.cuenta_id) {
      throw new ErrorRedes('peticion-invalida', 'Elige esa Página en Cuentas conectadas antes de publicar.')
    }
    if (aspecto === '9:16' && mime === 'video/mp4') {
      const s = await iniciarReelFB(cuenta.cuenta_id, cuenta.access_token)
      remoto = { modo: 'reel', video_id: s.video_id, upload_url: s.upload_url }
    } else {
      if (!cuenta.token_padre) throw new ErrorRedes('caducada', 'Vuelve a conectar Facebook.')
      const sesionFb = await iniciarSubidaFB(cuenta.token_padre, tamano, mime, `video.${mime === 'video/mp4' ? 'mp4' : 'webm'}`)
      remoto = { modo: 'video', sesion_fb: sesionFb }
    }
  } else {
    if (mime !== 'video/mp4' || aspecto !== '9:16') {
      throw new ErrorRedes('formato', 'Instagram solo admite Reels en MP4 y formato 9:16.')
    }
    const ig = (meta.instagram ?? {}) as Record<string, unknown>
    const s = await iniciarReelIG(cuenta.cuenta_id, cuenta.access_token, texto(meta.titulo, 2200), ig.share_to_feed !== false)
    remoto = { contenedor: s.id, uri: s.uri }
    metaGuardada = { ...metaGuardada, caption: texto(meta.titulo, 2200) }
  }

  const { data, error } = await admin
    .from('redes_publicaciones')
    .insert({ user_id: uid, plataforma, tamano, trozo, mime, meta: metaGuardada, remoto })
    .select('id')
    .single()
  if (error || !data) throw new Error(`redes_publicaciones: ${error?.message}`)
  return { modo: 'trozos', sesion: data.id, trozo, total_trozos: Math.ceil(tamano / trozo), poll_ms }
}

// ─── trozo ───────────────────────────────────────────────────────────────────

async function leerSesion(admin: SupabaseClient, uid: string, id: unknown): Promise<Sesion> {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) throw new ErrorRedes('peticion-invalida', 'Sesión inválida.')
  const { data } = await admin.from('redes_publicaciones').select('*').eq('id', id).eq('user_id', uid).maybeSingle()
  if (!data) throw new ErrorRedes('sesion-caducada', 'La subida caducó: vuelve a publicar.')
  const s = data as Sesion
  if (Date.now() - new Date(s.creado_en).getTime() > VIDA_SESION_MS) throw new ErrorRedes('sesion-caducada', 'La subida caducó: vuelve a publicar.')
  return s
}

async function trozo(admin: SupabaseClient, uid: string, url: URL, req: Request): Promise<{ recibido: number; completo: boolean }> {
  const declarado = Number(req.headers.get('Content-Length') ?? 0)
  if (declarado > TROZO_MAX) throw new ErrorRedes('demasiado-grande', 'Trozo demasiado grande.')
  if (!(await dentroDeLimite(admin, uid, 'redes-trozo', 200, 600))) throw new ErrorRedes('limite', 'Demasiados trozos seguidos.')
  const sesion = await leerSesion(admin, uid, url.searchParams.get('sesion'))
  if (sesion.estado !== 'subiendo') throw new ErrorRedes('sesion-caducada', 'Esa subida ya terminó.')
  const offset = Number(url.searchParams.get('offset'))
  if (!Number.isInteger(offset) || offset < 0) throw new ErrorRedes('peticion-invalida', 'Offset inválido.')
  if (offset !== Number(sesion.recibido)) {
    throw new ErrorRedes('orden', 'Ese trozo no es el que toca.', { recibido: Number(sesion.recibido) })
  }
  const bytes = new Uint8Array(await req.arrayBuffer())
  if (bytes.byteLength === 0 || bytes.byteLength > TROZO_MAX) throw new ErrorRedes('demasiado-grande', 'Trozo demasiado grande.')
  const tamano = Number(sesion.tamano)
  if (offset + bytes.byteLength > tamano) throw new ErrorRedes('peticion-invalida', 'El trozo se pasa del tamaño declarado.')

  const cuenta = await cuentaVigente(admin, uid, sesion.plataforma)
  const patchRemoto: Record<string, unknown> = {}
  try {
    if (sesion.plataforma === 'tiktok') {
      await subirTrozoTikTok(String(sesion.remoto.upload_url), bytes, offset, tamano, sesion.mime)
    } else if (sesion.plataforma === 'facebook' && sesion.remoto.modo === 'video') {
      const handle = await subirTrozoFB(String(sesion.remoto.sesion_fb), tokenPadre(cuenta), bytes, offset)
      if (handle) patchRemoto.handle = handle
    } else {
      const uploadUrl = String(sesion.plataforma === 'instagram' ? sesion.remoto.uri : sesion.remoto.upload_url)
      await subirTrozoRupload(uploadUrl, cuenta.access_token, bytes, offset, tamano)
    }
  } catch (e) {
    // Meta sabe cuánto tiene de verdad: se le devuelve al cliente para que reanude desde ahí.
    if (sesion.plataforma !== 'tiktok') {
      const real =
        sesion.remoto.modo === 'video'
          ? await offsetSubidaFB(String(sesion.remoto.sesion_fb), tokenPadre(cuenta)).catch(() => null)
          : await offsetRupload(String(sesion.plataforma === 'instagram' ? sesion.remoto.uri : sesion.remoto.upload_url), cuenta.access_token).catch(
              () => null,
            )
      if (real != null && real !== offset) {
        await admin.from('redes_publicaciones').update({ recibido: real, actualizado_en: new Date().toISOString() }).eq('id', sesion.id)
        throw new ErrorRedes('orden', 'La subida se reanuda desde otro punto.', { recibido: real })
      }
    }
    throw e
  }

  const recibido = offset + bytes.byteLength
  // Update optimista: si otro trozo entró antes (doble envío), este no pisa nada.
  await admin
    .from('redes_publicaciones')
    .update({ recibido, remoto: { ...sesion.remoto, ...patchRemoto }, actualizado_en: new Date().toISOString() })
    .eq('id', sesion.id)
    .eq('recibido', offset)
  return { recibido, completo: recibido === tamano }
}

function tokenPadre(cuenta: Cuenta): string {
  if (!cuenta.token_padre) throw new ErrorRedes('caducada', 'Vuelve a conectar Facebook.')
  return cuenta.token_padre
}

// ─── finalizar / estado ──────────────────────────────────────────────────────

async function finalizar(admin: SupabaseClient, uid: string, cuerpo: Record<string, unknown>): Promise<{ estado: string }> {
  const sesion = await leerSesion(admin, uid, cuerpo.sesion)
  if (sesion.estado !== 'subiendo') return { estado: sesion.estado }
  if (Number(sesion.recibido) !== Number(sesion.tamano)) throw new ErrorRedes('peticion-invalida', 'Aún faltan trozos por subir.')
  const cuenta = await cuentaVigente(admin, uid, sesion.plataforma)
  const titulo = String(sesion.meta.titulo ?? '')
  const descripcion = String(sesion.meta.descripcion ?? '')
  const patch: Record<string, unknown> = {}
  if (sesion.plataforma === 'facebook') {
    if (sesion.remoto.modo === 'reel') {
      await finalizarReelFB(cuenta.cuenta_id, cuenta.access_token, String(sesion.remoto.video_id), titulo, descripcion)
    } else {
      const handle = typeof sesion.remoto.handle === 'string' ? sesion.remoto.handle : null
      if (!handle) throw new ErrorRedes('proveedor', 'Facebook no confirmó la subida del archivo.')
      patch.video_id = await publicarVideoFB(cuenta.cuenta_id, cuenta.access_token, handle, titulo, descripcion)
    }
  }
  // TikTok procesa solo al recibir el último trozo; Instagram publica cuando el contenedor está listo (ver estado).
  await admin
    .from('redes_publicaciones')
    .update({ estado: 'procesando', remoto: { ...sesion.remoto, ...patch }, actualizado_en: new Date().toISOString() })
    .eq('id', sesion.id)
  return { estado: 'procesando' }
}

async function estadoPublicacion(admin: SupabaseClient, uid: string, cuerpo: Record<string, unknown>): Promise<Record<string, unknown>> {
  const sesion = await leerSesion(admin, uid, cuerpo.sesion)
  const privado =
    sesion.plataforma === 'tiktok' ? !bandera('REDES_TIKTOK_AUDITADO') || sesion.meta.privacidad === 'SELF_ONLY' : !bandera('REDES_META_LIVE')
  if (sesion.estado === 'publicado' || sesion.estado === 'fallo') {
    return { estado: sesion.estado, id: sesion.remoto.id, url: sesion.remoto.url, motivo: sesion.remoto.fail_reason, privado }
  }
  if (sesion.estado !== 'procesando') return { estado: sesion.estado, privado }

  const cuenta = await cuentaVigente(admin, uid, sesion.plataforma)
  let resultado: { estado: 'procesando' | 'publicado' | 'fallo'; id?: string; url?: string; motivo?: string }
  if (sesion.plataforma === 'tiktok') {
    const r = await estadoPostTikTok(cuenta.access_token, String(sesion.remoto.publish_id))
    const usuario = typeof cuenta.extra.username === 'string' && cuenta.extra.username ? cuenta.extra.username : '_'
    resultado = { ...r, url: r.id ? `https://www.tiktok.com/@${usuario}/video/${r.id}` : undefined }
  } else if (sesion.plataforma === 'facebook') {
    const videoId = String(sesion.remoto.video_id)
    const r = await estadoVideoFB(videoId, cuenta.access_token)
    resultado = { ...r, id: videoId }
  } else {
    const contenedor = String(sesion.remoto.contenedor)
    const s = await estadoContenedorIG(contenedor, cuenta.access_token)
    if (s === 'listo') {
      const p = await publicarIG(cuenta.cuenta_id, cuenta.access_token, contenedor)
      resultado = { estado: 'publicado', id: p.id, url: p.url }
    } else if (s === 'fallo') resultado = { estado: 'fallo', motivo: 'Instagram no pudo procesar el video.' }
    else resultado = { estado: 'procesando' }
  }

  if (resultado.estado !== 'procesando') {
    await admin
      .from('redes_publicaciones')
      .update({
        estado: resultado.estado,
        remoto: { ...sesion.remoto, id: resultado.id, url: resultado.url, fail_reason: resultado.motivo },
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', sesion.id)
  }
  return { ...resultado, privado }
}

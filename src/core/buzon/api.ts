import { obtenerSupabase } from '../cuenta/supabase'
import { ErrorAlmacen } from '../cuenta/almacen'
import { bajarCompartido, borrarCompartidos, subirCompartido } from '../cuenta/compartidos'
import { useSesion } from '../cuenta/sesionStore'
import { esDemo } from '../edicion'
import type { TFunc } from '../i18n/useT'
import {
  ErrorBuzon,
  TOPE_MEDIA,
  type AdjuntoRemoto,
  type CodigoErrorBuzon,
  type Contacto,
  type ContenidoMensaje,
  type ResultadoBusqueda,
  type TipoMensaje,
} from './tipos'

/**
 * Llamadas del buzón: RPCs `buzon_*` (security definer con auth.uid(), como
 * `sync_push`) y el bucket `buzon-adjuntos`. Sin Edge Function: no hay cold
 * start ni deploy de funciones, y los adjuntos van directo a Storage con
 * policies por pertenencia al hilo.
 *
 * El contrato de error del servidor es `{error: '<codigo>'}` en el JSON (nunca
 * `raise`): aquí se convierte en `ErrorBuzon` para que la UI lo traduzca.
 */


const CODIGOS = new Set<CodigoErrorBuzon>([
  'sin-sesion',
  'sin-alias',
  'alias-ocupado',
  'alias-invalido',
  'no-encontrado',
  'ya-contacto',
  'no-contacto',
  'bloqueado',
  'limite',
  'adjunto-grande',
  'contenido-grande',
])

const codigoDe = (v: string): CodigoErrorBuzon => (CODIGOS.has(v as CodigoErrorBuzon) ? (v as CodigoErrorBuzon) : 'servidor')

async function rpc<T>(nombre: string, args: Record<string, unknown> = {}): Promise<T> {
  const sb = await obtenerSupabase()
  if (!sb) throw new ErrorBuzon('sin-backend')
  const { data, error } = await sb.rpc(nombre, args)
  if (error) {
    // supabase-js envuelve el fallo de fetch en un PostgrestError sin código.
    if (!error.code || /fetch|network|conexi/i.test(error.message)) throw new ErrorBuzon('red', error.message)
    if (error.code === 'PGRST301' || error.code === '401') throw new ErrorBuzon('sin-sesion', error.message)
    throw new ErrorBuzon('servidor', error.message)
  }
  const d = data as { error?: unknown } | null
  if (d && typeof d === 'object' && typeof d.error === 'string') throw new ErrorBuzon(codigoDe(d.error))
  return data as T
}

// ─── alias ───────────────────────────────────────────────────────────────────

export async function fijarAlias(alias: string, nombre: string, emoji: string): Promise<void> {
  const r = await rpc<{ alias: string; nombre: string; emoji: string }>('buzon_fijar_alias', {
    p_alias: alias,
    p_nombre: nombre,
    p_emoji: emoji,
  })
  useSesion.setState({ alias: r.alias, nombre: r.nombre, emoji: r.emoji })
}

export async function buscarAlias(alias: string): Promise<ResultadoBusqueda | null> {
  const r = await rpc<{
    resultado: {
      alias: string
      nombre: string
      emoji: string
      retrato: string | null
      estado: ResultadoBusqueda['estado']
      contacto_id: string | null
      hilo_id: string | null
    } | null
  }>('buzon_buscar_alias', { p_alias: alias })
  const x = r.resultado
  return x
    ? { alias: x.alias, nombre: x.nombre, emoji: x.emoji, retrato: x.retrato, estado: x.estado, contactoId: x.contacto_id, hiloId: x.hilo_id }
    : null
}

/** Sube (o borra, con null) el busto del personaje; se refleja en el store de sesión. */
export async function fijarRetrato(dataUrl: string | null): Promise<void> {
  await rpc('buzon_fijar_retrato', { p_retrato: dataUrl })
  useSesion.setState({ retrato: dataUrl })
}

// ─── contactos ───────────────────────────────────────────────────────────────

export async function solicitar(alias: string): Promise<{ estado: 'pendiente-enviada' | 'aceptado'; hiloId: string | null }> {
  const r = await rpc<{ estado: 'pendiente-enviada' | 'aceptado'; contacto_id: string; hilo_id?: string }>('buzon_solicitar', {
    p_alias: alias,
  })
  return { estado: r.estado, hiloId: r.hilo_id ?? null }
}

/** Devuelve el id del hilo creado al aceptar (null al rechazar). */
export async function responder(contactoId: string, aceptar: boolean): Promise<string | null> {
  const r = await rpc<{ hilo_id: string | null }>('buzon_responder', { p_contacto: contactoId, p_aceptar: aceptar })
  return r.hilo_id ?? null
}

export async function bloquear(contactoId: string, bloquear: boolean): Promise<void> {
  await rpc('buzon_bloquear', { p_contacto: contactoId, p_bloquear: bloquear })
}

export type MotivoReporte = 'acoso' | 'odio' | 'sexual' | 'violencia' | 'spam' | 'otro'

/** Reporta a un contacto o, con `uid`, uno de los mensajes que te mandó. */
export async function reportar(contactoId: string, uid: string | null, motivo: MotivoReporte, detalle = ''): Promise<void> {
  // Los amigos del demo son de mentira: no hay a quién reportar en el servidor.
  if (esDemo()) return
  await rpc('buzon_reportar', { p_contacto: contactoId, p_uid: uid, p_motivo: motivo, p_detalle: detalle })
}

// ─── normas de la comunidad ──────────────────────────────────────────────────

export async function normasAceptadas(): Promise<boolean> {
  const r = await rpc<{ aceptadas: string | null }>('buzon_normas')
  return !!r.aceptadas
}

export async function aceptarNormas(): Promise<void> {
  await rpc('buzon_aceptar_normas')
}

/**
 * Los adjuntos se borran ANTES de la RPC: al caer el hilo (cascade) la policy
 * de Storage ya no reconoce al usuario como miembro y denegaría el borrado.
 */
export async function eliminarContacto(contactoId: string, hiloId: string | null): Promise<void> {
  if (hiloId) await borrarCarpetaHilo(hiloId)
  await rpc('buzon_eliminar', { p_contacto: contactoId })
}

interface ContactoRemoto {
  contacto_id: string
  hilo_id: string | null
  alias: string | null
  nombre: string | null
  emoji: string | null
  retrato: string | null
  /** Huella del retrato: el retrato en sí solo viaja cuando cambia. */
  retrato_v?: string | null
  estado: Contacto['estado']
  direccion: Contacto['direccion']
  bloqueado_por_mi: boolean | null
  actualizado_en: string
}

/**
 * La lista llega SIN retratos (hasta 64 KB cada uno, y se relee cada pocos
 * minutos): se reutiliza el de `previos` (la caché) si su huella no cambió, y
 * solo los nuevos o cambiados se piden aparte con `buzon_retratos`.
 */
export async function listarContactos(previos: Contacto[] = []): Promise<Contacto[]> {
  const r = await rpc<{ contactos: ContactoRemoto[] }>('buzon_listar_contactos', { p_sin_retrato: true })
  const antes = new Map(previos.map((c) => [c.contactoId, c]))
  const lista: Contacto[] = (r.contactos ?? []).map((c) => {
    const previo = antes.get(c.contacto_id)
    const v = c.retrato_v ?? null
    return {
      contactoId: c.contacto_id,
      hiloId: c.hilo_id,
      alias: c.alias ?? '',
      nombre: c.nombre ?? '',
      emoji: c.emoji ?? '🙂',
      retrato: c.retrato ?? (v && previo?.retratoV === v ? (previo.retrato ?? null) : null),
      retratoV: v,
      estado: c.estado,
      direccion: c.direccion,
      bloqueadoPorMi: c.bloqueado_por_mi === true,
      actualizadoEn: c.actualizado_en,
    }
  })
  const faltan = lista.filter((c) => c.retratoV && !c.retrato).map((c) => c.contactoId)
  if (faltan.length) {
    const rr = await rpc<{ retratos: Record<string, string> }>('buzon_retratos', { p_contactos: faltan.slice(0, 50) })
    for (const c of lista) c.retrato = c.retrato ?? rr.retratos?.[c.contactoId] ?? null
  }
  return lista
}

// ─── mensajes ────────────────────────────────────────────────────────────────

/** «Borrar para todos»: el servidor lo deja como tipo 'borrado' para los dos. */
export async function borrarMensajeRpc(hiloId: string, uid: string): Promise<void> {
  await rpc('buzon_borrar_mensaje', { p_hilo: hiloId, p_uid: uid })
}

export async function enviarRpc(
  hiloId: string,
  uid: string,
  tipo: TipoMensaje,
  texto: string,
  adjunto?: AdjuntoRemoto,
  contenido?: ContenidoMensaje,
): Promise<{ serverSeq: number; creadoEn: string }> {
  const r = await rpc<{ uid: string; server_seq: number; creado_en: string }>('buzon_enviar', {
    p_hilo: hiloId,
    p_uid: uid,
    p_tipo: tipo,
    p_texto: texto,
    p_adjunto: adjunto ?? null,
    p_contenido: contenido ?? null,
  })
  return { serverSeq: r.server_seq, creadoEn: r.creado_en }
}

export interface MensajeRemoto {
  uid: string
  hilo_id: string
  mio: boolean
  tipo: TipoMensaje
  texto: string
  adjunto: AdjuntoRemoto | null
  contenido: ContenidoMensaje | null
  server_seq: number
  creado_en: string
  leido_en: string | null
}

export async function pullRpc(desde: number): Promise<{ mensajes: MensajeRemoto[]; maxSeq: number; mas: boolean }> {
  const r = await rpc<{ mensajes: MensajeRemoto[]; max_seq: number; mas: boolean }>('buzon_pull', { p_desde: desde })
  return { mensajes: r.mensajes ?? [], maxSeq: r.max_seq ?? desde, mas: r.mas === true }
}

export async function marcarLeidoRpc(hiloId: string, hasta: number): Promise<void> {
  await rpc('buzon_leido', { p_hilo: hiloId, p_hasta: hasta })
}

// ─── Medios (R2) ─────────────────────────────────────────────────────────────
//
// Desde sep 2026 los adjuntos viven en R2 (función `compartidos`) con la misma
// ruta que tenían en el bucket `buzon-adjuntos`: `<hilo>/<uid>/<archivo>`. Lo
// viejo se muda solo al primer acceso.

/** Sube un binario bajo la carpeta del mensaje (`<hilo>/<uid>/<archivo>`). */
export async function subirAdjunto(hiloId: string, uid: string, archivo: string, blob: Blob): Promise<AdjuntoRemoto> {
  // El tope fino por tipo lo aplica `enviar`; aquí solo el general.
  if (blob.size > TOPE_MEDIA) throw new ErrorBuzon('adjunto-grande')
  const mime = blob.type || 'application/octet-stream'
  const path = `${hiloId}/${uid}/${archivo}`
  try {
    await subirCompartido('buzon', path, blob)
  } catch (e) {
    throw new ErrorBuzon(e instanceof ErrorAlmacen && e.motivo === 'grande' ? 'adjunto-grande' : 'red', String(e))
  }
  return { path, size: blob.size, mime, nombre: archivo }
}

export async function descargarAdjunto(a: AdjuntoRemoto): Promise<Blob> {
  try {
    return await bajarCompartido('buzon', a.path, a.mime)
  } catch (e) {
    throw new ErrorBuzon('red', String(e))
  }
}

/** Borra todo lo que cuelga de un hilo (best-effort). */
export async function borrarCarpetaHilo(hiloId: string): Promise<void> {
  await borrarBajo(hiloId)
}

/** Los binarios de UN mensaje (`<hilo>/<uid>/…`), antes de borrarlo para todos. */
export async function borrarAdjuntosMensaje(hiloId: string, uid: string): Promise<void> {
  await borrarBajo(`${hiloId}/${uid}`)
}

async function borrarBajo(raiz: string): Promise<void> {
  try {
    await borrarCompartidos('buzon', { prefijo: raiz })
  } catch {
    // Huérfanos aceptados como deuda conocida.
  }
}

// ─── errores ─────────────────────────────────────────────────────────────────

/** El mensaje traducido de un fallo del buzón (cualquier otro error cae en «servidor»). */
export function mensajeErrorBuzon(e: unknown, t: TFunc): string {
  const codigo: CodigoErrorBuzon = e instanceof ErrorBuzon ? e.codigo : 'servidor'
  switch (codigo) {
    case 'sin-sesion':
      return t('buzon.err.sin-sesion', 'Inicia sesión para usar el buzón')
    case 'sin-backend':
      return t('buzon.err.sin-backend', 'Esta versión no tiene buzón')
    case 'sin-alias':
      return t('buzon.err.sin-alias', 'Primero elige un alias')
    case 'alias-ocupado':
      return t('buzon.err.alias-ocupado', 'Ese alias ya está en uso')
    case 'alias-invalido':
      return t('buzon.err.alias-invalido', 'Alias no válido: 3-20 letras minúsculas, números o _')
    case 'no-encontrado':
      return t('buzon.err.no-encontrado', 'No hay nadie con ese alias')
    case 'ya-contacto':
      return t('buzon.err.ya-contacto', 'Ya es tu contacto')
    case 'no-contacto':
      return t('buzon.err.no-contacto', 'Solo puedes escribir a contactos aceptados')
    case 'bloqueado':
      return t('buzon.err.bloqueado', 'No puedes escribir a este contacto')
    case 'limite':
      return t('buzon.err.limite', 'Demasiados envíos seguidos. Espera un momento.')
    case 'adjunto-grande':
      return t('buzon.err.adjunto-grande', 'El archivo supera los 8 MB')
    case 'contenido-grande':
      return t('buzon.err.contenido-grande', 'Este contenido es demasiado grande para enviarlo')
    case 'normas':
      return t('buzon.err.normas', 'Para escribir a otras personas acepta antes las normas de la comunidad')
    case 'red':
      return t('buzon.err.red', 'Sin conexión con el servidor')
    default:
      return t('buzon.err.servidor', 'No se pudo completar. Intenta de nuevo.')
  }
}

import { obtenerSupabase } from '../cuenta/supabase'
import { useSesion } from '../cuenta/sesionStore'
import type { TFunc } from '../i18n/useT'
import {
  ErrorBuzon,
  TOPE_ADJUNTO,
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

const BUCKET = 'buzon-adjuntos'

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
  estado: Contacto['estado']
  direccion: Contacto['direccion']
  bloqueado_por_mi: boolean | null
  actualizado_en: string
}

export async function listarContactos(): Promise<Contacto[]> {
  const r = await rpc<{ contactos: ContactoRemoto[] }>('buzon_listar_contactos')
  return (r.contactos ?? []).map((c) => ({
    contactoId: c.contacto_id,
    hiloId: c.hilo_id,
    alias: c.alias ?? '',
    nombre: c.nombre ?? '',
    emoji: c.emoji ?? '🙂',
    retrato: c.retrato ?? null,
    estado: c.estado,
    direccion: c.direccion,
    bloqueadoPorMi: c.bloqueado_por_mi === true,
    actualizadoEn: c.actualizado_en,
  }))
}

// ─── mensajes ────────────────────────────────────────────────────────────────

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

// ─── Storage ─────────────────────────────────────────────────────────────────

/** Sube un binario bajo la carpeta del mensaje (`<hilo>/<uid>/<archivo>`). */
export async function subirAdjunto(hiloId: string, uid: string, archivo: string, blob: Blob): Promise<AdjuntoRemoto> {
  if (blob.size > TOPE_ADJUNTO) throw new ErrorBuzon('adjunto-grande')
  const sb = await obtenerSupabase()
  if (!sb) throw new ErrorBuzon('sin-backend')
  const mime = blob.type || 'application/octet-stream'
  const path = `${hiloId}/${uid}/${archivo}`
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { upsert: false, contentType: mime })
  // Un reintento del mismo mensaje encuentra el objeto ya subido: no es error.
  if (error && !/exists|duplicate/i.test(error.message)) {
    throw new ErrorBuzon(/fetch|network/i.test(error.message) ? 'red' : 'servidor', error.message)
  }
  return { path, size: blob.size, mime, nombre: archivo }
}

export async function descargarAdjunto(a: AdjuntoRemoto): Promise<Blob> {
  const sb = await obtenerSupabase()
  if (!sb) throw new ErrorBuzon('sin-backend')
  const { data, error } = await sb.storage.from(BUCKET).download(a.path)
  if (error || !data) throw new ErrorBuzon('red', error?.message)
  return new Blob([data], { type: a.mime })
}

/**
 * Borra todo lo que cuelga de un hilo (best-effort). `list` no es recursivo:
 * las carpetas de cada mensaje (y su `contenido/`) se recorren a mano.
 */
export async function borrarCarpetaHilo(hiloId: string): Promise<void> {
  const sb = await obtenerSupabase()
  if (!sb) return
  try {
    const archivos: string[] = []
    const recorrer = async (prefijo: string, nivel: number) => {
      const { data } = await sb.storage.from(BUCKET).list(prefijo, { limit: 1000 })
      for (const f of data ?? []) {
        const ruta = `${prefijo}/${f.name}`
        // Las carpetas vienen sin `id`; los archivos sí lo traen.
        if (f.id) archivos.push(ruta)
        else if (nivel < 3) await recorrer(ruta, nivel + 1)
      }
    }
    await recorrer(hiloId, 0)
    if (archivos.length) await sb.storage.from(BUCKET).remove(archivos)
  } catch {
    // Huérfanos aceptados como deuda conocida (purga por cron en fase 2).
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
    case 'red':
      return t('buzon.err.red', 'Sin conexión con el servidor')
    default:
      return t('buzon.err.servidor', 'No se pudo completar. Intenta de nuevo.')
  }
}

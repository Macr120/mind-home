/**
 * Tipos del buzón (mensajería entre usuarios). La verdad vive en Supabase
 * (tablas `buzon_*`); en el dispositivo solo hay una caché (`_buzonContactos`,
 * `_buzonMensajes`) que el motor rellena por pull. Ningún uuid ajeno llega al
 * cliente: las personas se identifican por `contactoId`/`hiloId`.
 */

export type EstadoContacto = 'pendiente' | 'aceptado' | 'bloqueado'

export interface Contacto {
  /** Id del vínculo (fila de `buzon_contactos`). Clave primaria de la caché. */
  contactoId: string
  /** Id del hilo de conversación; null mientras la solicitud no se acepte. */
  hiloId: string | null
  alias: string
  nombre: string
  emoji: string
  /** Busto del personaje 3D de la persona (data URL pequeña); sin él se pinta su emoji. */
  retrato?: string | null
  estado: EstadoContacto
  /** Quién pidió el contacto: yo ('enviada') o la otra persona ('recibida'). */
  direccion: 'enviada' | 'recibida'
  bloqueadoPorMi: boolean
  actualizadoEn: string
}

export type TipoMensaje = 'texto' | 'imagen' | 'pdf' | 'contenido'

/** Un objeto en Storage (bucket `buzon-adjuntos`), tal cual viaja en el mensaje. */
export interface AdjuntoRemoto {
  path: string
  size: number
  mime: string
  nombre: string
  ancho?: number
  alto?: number
}

/** Lo que viaja en `contenido`: el Paquete de un cuarto sin sus blobs (marcadores en su lugar). */
export interface ContenidoMensaje {
  app: string
  tipo: string
  version: 1
  nombre: string
  resumen?: string
  emoji?: string
  datos: unknown
  blobs?: Record<string, AdjuntoRemoto>
}

export interface MensajeBuzon {
  id?: number
  /** Id que generó el remitente (idempotencia en el servidor). Único. */
  uid: string
  hiloId: string
  mio: boolean
  tipo: TipoMensaje
  texto: string
  adjunto?: AdjuntoRemoto
  contenido?: ContenidoMensaje
  /** 0 mientras el servidor no lo confirma. */
  serverSeq: number
  creadoEn: string
  leidoEn?: string
  // ----- solo local -----
  /** El adjunto (o la miniatura del contenido) ya descargado. */
  blob?: Blob
  /** Envío en curso o fallido (los confirmados no llevan estado). */
  estado?: 'enviando' | 'error'
  /** Cuándo se guardó el contenido en su app (ya no se ofrece «Guardar»). */
  guardadoEn?: string
}

export type CodigoErrorBuzon =
  | 'sin-sesion'
  | 'sin-backend'
  | 'sin-alias'
  | 'alias-ocupado'
  | 'alias-invalido'
  | 'no-encontrado'
  | 'ya-contacto'
  | 'no-contacto'
  | 'bloqueado'
  | 'limite'
  | 'adjunto-grande'
  | 'contenido-grande'
  | 'red'
  | 'servidor'

export class ErrorBuzon extends Error {
  codigo: CodigoErrorBuzon
  constructor(codigo: CodigoErrorBuzon, mensaje?: string) {
    super(mensaje ?? codigo)
    this.name = 'ErrorBuzon'
    this.codigo = codigo
  }
}

/** Resultado de buscar un alias exacto. */
export interface ResultadoBusqueda {
  alias: string
  nombre: string
  emoji: string
  retrato?: string | null
  estado: 'yo' | 'ninguno' | 'pendiente-enviada' | 'pendiente-recibida' | 'aceptado' | 'bloqueado'
  contactoId: string | null
  hiloId: string | null
}

/** Mismos topes que el servidor (`buzon_enviar` y el bucket). */
export const TOPE_ADJUNTO = 8 * 1024 * 1024
export const TOPE_CONTENIDO = 64 * 1024
export const TOPE_TEXTO = 4000

export const ALIAS_REGEX = /^[a-z0-9_]{3,20}$/

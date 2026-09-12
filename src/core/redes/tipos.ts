/** Tipos del lado cliente de «publicar en redes» (espejo del contrato de `redes-oauth` y `redes-publicar`). */

export type Plataforma = 'youtube' | 'tiktok' | 'facebook' | 'instagram'

export const PLATAFORMAS: readonly Plataforma[] = ['youtube', 'tiktok', 'facebook', 'instagram']

/** Nombres de marca: no se traducen. */
export const NOMBRE_RED: Record<Plataforma, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
}

/** Una cuenta conectada tal como la enseña el servidor (nunca trae tokens). */
export interface CuentaRed {
  plataforma: Plataforma
  cuenta_id: string
  nombre: string
  avatar: string | null
  expira_en: string | null
  estado: 'ok' | 'caducada'
  extra: {
    page_id?: string
    username?: string
    paginas?: { id: string; nombre: string; avatar: string | null; instagram: { id: string; username: string } | null }[]
  }
}

/** Banderas del servidor mientras las apps no pasan las auditorías. */
export interface AvisosRedes {
  youtube?: 'privado'
  tiktok?: 'solo-yo'
  meta?: 'modo-desarrollo'
  /** Se conectó Facebook pero su listado de Páginas vino vacío: hay que indicarla a mano. */
  falta_pagina?: 'facebook'
}

export interface EstadoRedes {
  cuentas: CuentaRed[]
  avisos: AvisosRedes
  youtube_restantes_hoy: number
}

/** `creator_info` de TikTok: lo que la UI DEBE enseñar antes de publicar. */
export interface OpcionesTikTok {
  nickname: string
  avatar: string | null
  privacidad: string[]
  comentarios: boolean
  duet: boolean
  stitch: boolean
  max_duracion_seg: number
  auditado: boolean
}

/** Metadatos de la publicación en valores nativos de cada red. */
export interface MetaPublicacion {
  titulo: string
  descripcion?: string
  privacidad?: string
  aspecto: '16:9' | '9:16' | '1:1'
  duracion_seg: number
  youtube?: { categoryId?: string; madeForKids: boolean }
  tiktok?: {
    disable_comment: boolean
    disable_duet: boolean
    disable_stitch: boolean
    brand_content_toggle: boolean
    brand_organic_toggle: boolean
    is_aigc: boolean
  }
  facebook?: { page_id?: string }
  instagram?: { share_to_feed?: boolean }
}

export interface ResultadoPublicacion {
  plataforma: Plataforma
  id: string
  url?: string
  /** Quedó visible solo para el dueño (auditoría pendiente o privacidad elegida). */
  privado: boolean
}

type FaseTrabajo = 'subiendo' | 'publicando'

/** La subida en curso (una a la vez); vive en el store para sobrevivir al diálogo y al cuarto. */
export interface TrabajoPublicacion {
  id: string
  proyectoId: number
  proyectoNombre: string
  plataforma: Plataforma
  titulo: string
  fase: FaseTrabajo
  fraccion: number
  estado: 'activo' | 'listo' | 'error' | 'cancelado'
  resultado?: ResultadoPublicacion
  error?: string
  /** El diálogo ya enseñó el resultado: la píldora no lo repite. */
  visto: boolean
}

export type CodigoErrorRedes =
  | 'sin-sesion'
  | 'limite'
  | 'peticion-invalida'
  | 'proveedor'
  | 'configuracion'
  | 'plataforma'
  | 'sin-cuenta'
  | 'caducada'
  | 'permisos'
  | 'formato'
  | 'demasiado-grande'
  | 'cuota-youtube'
  | 'orden'
  | 'sesion-caducada'
  | 'cancelado'

/** Error tipado de la vía redes; `message` ya viene listo para mostrarse. */
export class ErrorRedes extends Error {
  codigo: CodigoErrorRedes
  /** Campos extra de la respuesta (p. ej. `recibido` en 'orden'). */
  extra: { recibido?: number }
  constructor(codigo: CodigoErrorRedes, mensaje: string, extra: { recibido?: number } = {}) {
    super(mensaje)
    this.name = 'ErrorRedes'
    this.codigo = codigo
    this.extra = extra
  }
}

/** Motivos con los que puede volver el OAuth (literal del servidor). */
export type MotivoVuelta = 'denegado' | 'caducado' | 'permisos' | 'sin-pagina' | 'sin-instagram' | 'proveedor' | 'configuracion'

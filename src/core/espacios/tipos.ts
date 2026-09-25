/**
 * Tipos del «espacio» compartido: el cimiento común de los calendarios
 * cooperativos y de los cuatro Studio compartidos por enlace. La verdad vive en
 * Supabase (tablas `espacios`, `espacio_miembros`, `espacio_cambios`); en el
 * dispositivo solo hay una caché (`_espacios`) que el motor rellena.
 *
 * Módulo HOJA a propósito: en runtime no importa NADA del repo (ni `db`, que a
 * su vez importa de aquí el tipo de la caché). Solo tipos y constantes.
 */

import type { NombreIcono } from '../ui/iconos/catalogo'

/** Qué clase de contenido comparte el espacio; decide quién lo abre y cómo. */
export type TipoEspacio = 'calendario' | 'documento' | 'dibujo' | 'audio' | 'video'

/** Icono con el que se reconoce cada tipo en las listas y en las tarjetas. */
export const ICONO_TIPO: Record<TipoEspacio, NombreIcono> = {
  calendario: 'calendario',
  documento: 'libro',
  dibujo: 'pincel',
  audio: 'musica',
  video: 'fotogramas',
}

export type RolEspacio = 'dueno' | 'editor' | 'lector'

export type EstadoMiembro = 'activo' | 'fuera'

/** Una persona dentro del espacio. Ningún uuid ajeno llega aquí: `miembroId` es opaco. */
export interface MiembroEspacio {
  miembroId: string
  rol: RolEspacio
  estado: EstadoMiembro
  alias: string
  nombre: string
  emoji: string
  /** Busto del personaje 3D (data URL pequeña); sin él se pinta su emoji. */
  retrato?: string | null
  /** true si este miembro soy yo. */
  yo: boolean
}

/** Arriendo del turno de edición (audio/video). */
export interface BloqueoEspacio {
  /** `miembroId` de quien tiene el turno. */
  por: string
  /** ISO en que caduca el arriendo. */
  hasta: string
}

/** Los dos enlaces del espacio. Solo viajan al DUEÑO. */
export interface TokensEspacio {
  ver: string | null
  editar: string | null
  enlaceVer: boolean
  enlaceEditar: boolean
}

export interface Espacio {
  espacioId: string
  tipo: TipoEspacio
  titulo: string
  /** Ajustes del tipo (color del calendario, etc.). ≤ 2 KB en el servidor. */
  meta: Record<string, unknown>
  /** Versión del protocolo con la que se creó (ver `VERSION_PROTO_ESPACIO`). */
  proto: number
  /** Mi papel aquí. */
  rol: RolEspacio
  /** Mi `miembroId` dentro de este espacio. */
  yo: string
  duenoAlias: string
  /** Último `seq` del log de cambios. */
  seq: number
  /** Hasta dónde llega el snapshot compactado. */
  snapshotSeq: number
  bloqueo: BloqueoEspacio | null
  nMiembros: number
  creadoEn: string
  actualizadoEn: string
  /** Solo si soy el dueño. */
  tokens?: TokensEspacio
}

/** Lo que se guarda en `db._espacios` (los tokens NO se persisten en el dispositivo). */
export type EspacioCache = Omit<Espacio, 'tokens'>

/** Una operación del log del espacio. `datos` lo interpreta cada tipo. */
export interface CambioEspacio {
  seq: number
  /** Id que generó el emisor: idempotencia en el servidor. */
  uid: string
  /** `miembroId` del autor. */
  autor: string
  tipo: string
  datos: unknown
  creadoEn: string
}

/**
 * Eventos del topic `espacio:<id>`. Los cinco primeros los emite la BD; los
 * demás los publican los clientes con permiso de edición.
 */
export type EventoEspacio =
  | 'cambio'
  | 'miembros'
  | 'meta'
  | 'bloqueo'
  | 'borrado'
  | 'yjs'
  | 'aw'
  | 'sv'
  | 'trazo'
  | 'presencia'

export type CodigoErrorEspacio =
  | 'sin-sesion'
  | 'sin-backend'
  | 'peticion-invalida'
  | 'limite'
  | 'no-encontrado'
  | 'no-contacto'
  | 'sin-permiso'
  | 'expulsado'
  | 'enlace-inactivo'
  | 'bloqueado'
  | 'es-dueno'
  | 'cambio-grande'
  | 'snapshot-grande'
  | 'version'
  | 'normas'
  | 'red'
  | 'servidor'

export class ErrorEspacio extends Error {
  codigo: CodigoErrorEspacio
  constructor(codigo: CodigoErrorEspacio, mensaje?: string) {
    super(mensaje ?? codigo)
    this.name = 'ErrorEspacio'
    this.codigo = codigo
  }
}

// ─── topes (los mismos que el servidor) ──────────────────────────────────────

/** `datos` de un cambio. */
export const TOPE_CAMBIO = 64 * 1024
/** Estado completo de un snapshot. */
export const TOPE_SNAPSHOT = 2 * 1024 * 1024
/** Operaciones por lote de `espacio_push`. */
export const LOTE_PUSH = 50
/** Bytes por lote de `espacio_push`. */
export const LOTE_PUSH_BYTES = 256 * 1024
/** Espera antes de mandar el lote acumulado. */
export const PUSH_MS = 2000
/** Duración del arriendo del turno. */
export const ARRIENDO_MS = 5 * 60_000
/** Cada cuánto se renueva el turno mientras se edita. */
export const RENOVAR_MS = 2 * 60_000

/** Protocolo del cliente: el servidor rechaza a quien traiga otro. */
export const VERSION_PROTO_ESPACIO = 1

/**
 * Con qué se antepone el id de un calendario compartido para usarlo como clave
 * del filtro del calendario (`cal:<espacioId>`). Vive en este módulo hoja
 * porque lo comparten `core/espacios/calendario.ts` y `ui/calendario/apps.ts`,
 * y ninguno de los dos debe arrastrar al otro para leer una cadena.
 */
export const PREFIJO_CAL = 'cal:'

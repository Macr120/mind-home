import type {
  TipoMantenimiento,
  TipoTaller,
  TipoTramite,
  TipoVehiculo,
} from '../../core/data/db'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

export const COLOR = '#fbbf24'

export const TIPOS_VEHICULO: { id: TipoVehiculo; label: string; icon: string }[] = [
  { id: 'bicicleta', label: 'Bicicleta', icon: '🚲' },
  { id: 'auto', label: 'Auto', icon: '🚗' },
  { id: 'moto', label: 'Moto', icon: '🏍️' },
  { id: 'scooter', label: 'Scooter', icon: '🛵' },
  { id: 'camioneta', label: 'Camioneta', icon: '🛻' },
  { id: 'otro', label: 'Otro', icon: '🔧' },
]

export const TIPOS_MANTENIMIENTO: { id: TipoMantenimiento; label: string }[] = [
  { id: 'aceite', label: 'Aceite / lubricante' },
  { id: 'filtros', label: 'Filtros' },
  { id: 'frenos', label: 'Frenos' },
  { id: 'llantas', label: 'Llantas / neumáticos' },
  { id: 'cadena', label: 'Cadena / transmisión bici' },
  { id: 'transmision', label: 'Transmisión' },
  { id: 'bateria', label: 'Batería' },
  { id: 'revision', label: 'Revisión general' },
  { id: 'lavado', label: 'Lavado / detallado' },
  { id: 'seguro', label: 'Seguro' },
  { id: 'licencia', label: 'Licencia / tenencia' },
  { id: 'otro', label: 'Otro' },
]

export function getTipoVehiculo(id: TipoVehiculo) {
  return TIPOS_VEHICULO.find((t) => t.id === id) ?? TIPOS_VEHICULO[5]
}

export function getTipoMantenimiento(id: TipoMantenimiento) {
  return TIPOS_MANTENIMIENTO.find((t) => t.id === id) ?? TIPOS_MANTENIMIENTO[11]
}

/** Plantillas rápidas al registrar servicio. */
export const PLANTILLAS_SERVICIO: {
  tipo: TipoMantenimiento
  titulo: string
  sugerirKm?: number
  sugerirDias?: number
}[] = [
  { tipo: 'aceite', titulo: 'Cambio de aceite', sugerirKm: 5000, sugerirDias: 180 },
  { tipo: 'llantas', titulo: 'Rotación de llantas', sugerirKm: 10000 },
  { tipo: 'frenos', titulo: 'Revisión de frenos', sugerirKm: 15000 },
  { tipo: 'cadena', titulo: 'Lubricar cadena', sugerirKm: 300, sugerirDias: 14 },
  { tipo: 'revision', titulo: 'Servicio mayor', sugerirKm: 20000, sugerirDias: 365 },
  { tipo: 'bateria', titulo: 'Revisión de batería', sugerirDias: 365 },
  { tipo: 'seguro', titulo: 'Renovación de seguro', sugerirDias: 365 },
]

// ----- Trámites y documentos -----

/** Hora del recordatorio cuando el trámite no fija una. */
export const HORA_TRAMITE = '09:00'

/**
 * Catálogo de trámites. `requierePlaca` es la regla del cuarto: un vehículo sin
 * matrícula (una bici, una patineta) no paga tenencia ni verifica, así que solo
 * ve los trámites libres. `emoji` es un DATO de la rutina que se proyecta en el
 * calendario, no un icono de UI.
 */
export const TIPOS_TRAMITE: {
  id: TipoTramite
  label: string
  emoji: string
  icono: NombreIcono
  requierePlaca: boolean
  /** Periodicidad sugerida al elegir el tipo (meses; 0 = una sola vez). */
  cadaMeses: number
}[] = [
  { id: 'mantenimiento', label: 'Mantenimiento periódico', emoji: '🔧', icono: 'herramienta', requierePlaca: false, cadaMeses: 6 },
  { id: 'tenencia', label: 'Pago de tenencia', emoji: '🏛️', icono: 'gobierno', requierePlaca: true, cadaMeses: 12 },
  { id: 'verificacion', label: 'Verificación', emoji: '✅', icono: 'hecho', requierePlaca: true, cadaMeses: 6 },
  { id: 'circulacion', label: 'Tarjeta de circulación', emoji: '🪪', icono: 'tarjeta', requierePlaca: true, cadaMeses: 36 },
  { id: 'seguro', label: 'Seguro', emoji: '🛡️', icono: 'escudo', requierePlaca: true, cadaMeses: 12 },
  { id: 'otro', label: 'Otro trámite', emoji: '📋', icono: 'lista', requierePlaca: false, cadaMeses: 0 },
]

export function getTipoTramite(id: TipoTramite) {
  return TIPOS_TRAMITE.find((t) => t.id === id) ?? TIPOS_TRAMITE[5]
}

/** Trámites que puede tener el vehículo (los de placa solo si la tiene). */
export function tramitesDisponibles(matricula?: string) {
  return matricula?.trim() ? TIPOS_TRAMITE : TIPOS_TRAMITE.filter((t) => !t.requierePlaca)
}

/** Cada cuánto se repite (meses). El 0 es un trámite de una sola vez. */
export const PERIODICIDADES: { meses: number; label: string }[] = [
  { meses: 0, label: 'Solo una vez' },
  { meses: 1, label: 'Cada mes' },
  { meses: 3, label: 'Cada 3 meses' },
  { meses: 6, label: 'Cada 6 meses' },
  { meses: 12, label: 'Cada año' },
  { meses: 24, label: 'Cada 2 años' },
  { meses: 36, label: 'Cada 3 años' },
]

/** Días de anticipación del aviso previo (0 = avisar solo el día). */
export const ANTICIPACIONES: { dias: number; label: string }[] = [
  { dias: 0, label: 'Solo el día' },
  { dias: 7, label: 'Una semana antes' },
  { dias: 15, label: 'Quince días antes' },
  { dias: 30, label: 'Un mes antes' },
]

// ----- Libreta de contactos -----

export const TIPOS_TALLER: { id: TipoTaller; label: string; icono: NombreIcono }[] = [
  { id: 'taller', label: 'Taller / mecánico', icono: 'herramienta' },
  { id: 'aseguradora', label: 'Aseguradora', icono: 'escudo' },
  { id: 'verificentro', label: 'Verificentro', icono: 'hecho' },
  { id: 'refaccionaria', label: 'Refaccionaria', icono: 'caja' },
  { id: 'grua', label: 'Grúa / asistencia', icono: 'camioneta' },
  { id: 'otro', label: 'Otro contacto', icono: 'telefono' },
]

export function getTipoTaller(id: TipoTaller) {
  return TIPOS_TALLER.find((t) => t.id === id) ?? TIPOS_TALLER[5]
}

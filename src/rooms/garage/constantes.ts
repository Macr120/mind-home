import type { TipoMantenimiento, TipoVehiculo } from '../../core/data/db'

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

import type { CategoriaChecklist, CategoriaGastoViaje, EstadoViaje, TipoViaje } from '../../core/data/db'

export const COLOR = '#2dd4bf'

export const ESTADOS: { id: EstadoViaje; label: string; icon: string }[] = [
  { id: 'wishlist', label: 'Lista de deseos', icon: '✨' },
  { id: 'planificado', label: 'Planificando', icon: '📋' },
  { id: 'proximo', label: 'Próximo viaje', icon: '🛫' },
  { id: 'completado', label: 'Completado', icon: '✅' },
]

export const TIPOS_VIAJE: { id: TipoViaje; label: string; icon: string }[] = [
  { id: 'playa', label: 'Playa', icon: '🏖️' },
  { id: 'ciudad', label: 'Ciudad', icon: '🏙️' },
  { id: 'aventura', label: 'Aventura', icon: '🥾' },
  { id: 'negocios', label: 'Negocios', icon: '💼' },
  { id: 'ruta', label: 'Road trip', icon: '🚗' },
  { id: 'otro', label: 'Otro', icon: '🌍' },
]

export const CATEGORIAS_GASTO: { id: CategoriaGastoViaje; label: string; icon: string }[] = [
  { id: 'vuelo', label: 'Vuelo', icon: '✈️' },
  { id: 'hotel', label: 'Hotel', icon: '🏨' },
  { id: 'comida', label: 'Comida', icon: '🍽️' },
  { id: 'transporte', label: 'Transporte', icon: '🚕' },
  { id: 'actividad', label: 'Actividad', icon: '🎫' },
  { id: 'otro', label: 'Otro', icon: '📦' },
]

export const CATEGORIAS_CHECK: { id: CategoriaChecklist; label: string }[] = [
  { id: 'documentos', label: 'Documentos' },
  { id: 'equipaje', label: 'Equipaje' },
  { id: 'reservas', label: 'Reservas' },
  { id: 'otro', label: 'Otro' },
]

export const PAISES_SUGERIDOS = [
  'México',
  'España',
  'Estados Unidos',
  'Francia',
  'Italia',
  'Japón',
  'Colombia',
  'Argentina',
  'Perú',
  'Canadá',
]

export const CHECKLIST_PLANTILLA: { categoria: CategoriaChecklist; items: string[] }[] = [
  {
    categoria: 'documentos',
    items: ['Pasaporte vigente', 'Visa / permisos', 'Seguro de viaje', 'Identificación'],
  },
  {
    categoria: 'reservas',
    items: ['Vuelos confirmados', 'Hotel / Airbnb', 'Transporte local'],
  },
  {
    categoria: 'equipaje',
    items: ['Equipaje de mano', 'Cargadores y adaptadores', 'Botiquín básico'],
  },
]

export function getEstado(id: EstadoViaje) {
  return ESTADOS.find((e) => e.id === id) ?? ESTADOS[0]
}

export function getTipo(id: TipoViaje) {
  return TIPOS_VIAJE.find((t) => t.id === id) ?? TIPOS_VIAJE[0]
}

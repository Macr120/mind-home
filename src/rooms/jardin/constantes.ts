import type { TipoPractica } from '../../core/data/db'

export const COLOR = '#4ade80'

export const TIPOS: { id: TipoPractica; label: string; icon: string }[] = [
  { id: 'meditacion', label: 'Meditación', icon: '🧘' },
  { id: 'respiracion', label: 'Respiración', icon: '🌬️' },
  { id: 'sueno', label: 'Sueño', icon: '🌙' },
  { id: 'gratitud', label: 'Gratitud', icon: '🙏' },
  { id: 'sonido', label: 'Sonido', icon: '🎧' },
  { id: 'movimiento', label: 'Movimiento', icon: '🌿' },
]

export const EMOCIONES = ['😌', '🙂', '😐', '😔', '😰', '🤩', '😴', '😤']

export interface PresetPractica {
  id: string
  tipo: TipoPractica
  titulo: string
  duracionMin: number
  descripcion: string
}

export const PRESETS: PresetPractica[] = [
  {
    id: 'sos_3',
    tipo: 'meditacion',
    titulo: 'SOS · Calma rápida',
    duracionMin: 3,
    descripcion: 'Respiración y anclaje para momentos de estrés.',
  },
  {
    id: 'focus_10',
    tipo: 'meditacion',
    titulo: 'Enfoque 10 min',
    duracionMin: 10,
    descripcion: 'Atención plena para concentrarte.',
  },
  {
    id: 'body_15',
    tipo: 'meditacion',
    titulo: 'Escaneo corporal',
    duracionMin: 15,
    descripcion: 'Recorre el cuerpo con gentileza.',
  },
  {
    id: 'box_5',
    tipo: 'respiracion',
    titulo: 'Respiración caja 4-4-4-4',
    duracionMin: 5,
    descripcion: 'Inhala, sostén, exhala, sostén (4 s cada fase).',
  },
  {
    id: '478_5',
    tipo: 'respiracion',
    titulo: 'Respiración 4-7-8',
    duracionMin: 5,
    descripcion: 'Ideal para relajar el sistema nervioso.',
  },
  {
    id: 'sleep_20',
    tipo: 'sueno',
    titulo: 'Wind-down para dormir',
    duracionMin: 20,
    descripcion: 'Transición suave hacia el descanso.',
  },
  {
    id: 'rain_15',
    tipo: 'sonido',
    titulo: 'Paisaje sonoro · Lluvia',
    duracionMin: 15,
    descripcion: 'Ambiente para desconectar.',
  },
  {
    id: 'stretch_10',
    tipo: 'movimiento',
    titulo: 'Estiramientos suaves',
    duracionMin: 10,
    descripcion: 'Movimiento consciente y amable.',
  },
]

export const PERFIL_DEFECTO = { minutosDiariosObjetivo: 10 }

export function getTipo(id: TipoPractica) {
  return TIPOS.find((t) => t.id === id) ?? TIPOS[0]
}

export function getPreset(id: string) {
  return PRESETS.find((p) => p.id === id)
}

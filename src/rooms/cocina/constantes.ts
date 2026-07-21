import type { MomentoComida, PerfilNutricion } from '../../core/data/db'

export const COLOR = '#f59e0b'

export const PERFIL_DEFECTO: Omit<PerfilNutricion, 'id'> = {
  calorias: 2200,
  proteinas: 150,
  carbohidratos: 220,
  grasas: 65,
  aguaMl: 2500,
}

export const MOMENTOS: {
  id: MomentoComida
  label: string
  icon: string
}[] = [
  { id: 'desayuno', label: 'Desayuno', icon: '🌅' },
  { id: 'comida', label: 'Comida', icon: '🍽️' },
  { id: 'cena', label: 'Cena', icon: '🌙' },
  { id: 'snack', label: 'Snack', icon: '🥤' },
]

/** Con qué hora nace cada momento al agendarlo (el usuario la cambia luego). */
export const HORA_SUGERIDA: Record<MomentoComida, string> = {
  desayuno: '08:00',
  comida: '14:00',
  cena: '21:00',
  snack: '17:00',
}

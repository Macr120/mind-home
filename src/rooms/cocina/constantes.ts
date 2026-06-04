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

export const FAVORITOS_INICIALES: Omit<
  import('../../core/data/db').AlimentoFavorito,
  'id'
>[] = [
  {
    nombre: 'Huevos revueltos',
    porcion: '2 huevos',
    calorias: 180,
    proteinas: 14,
    carbohidratos: 2,
    grasas: 12,
  },
  {
    nombre: 'Avena con plátano',
    porcion: '1 taza',
    calorias: 320,
    proteinas: 12,
    carbohidratos: 54,
    grasas: 6,
  },
  {
    nombre: 'Pechuga de pollo',
    porcion: '150 g',
    calorias: 248,
    proteinas: 46,
    carbohidratos: 0,
    grasas: 5,
  },
  {
    nombre: 'Arroz integral',
    porcion: '1 taza cocida',
    calorias: 216,
    proteinas: 5,
    carbohidratos: 45,
    grasas: 2,
  },
  {
    nombre: 'Ensalada mixta',
    porcion: 'bowl grande',
    calorias: 120,
    proteinas: 4,
    carbohidratos: 12,
    grasas: 7,
  },
  {
    nombre: 'Yogurt griego',
    porcion: '170 g',
    calorias: 100,
    proteinas: 17,
    carbohidratos: 6,
    grasas: 0,
  },
  {
    nombre: 'Salmón al horno',
    porcion: '120 g',
    calorias: 248,
    proteinas: 34,
    carbohidratos: 0,
    grasas: 11,
  },
  {
    nombre: 'Batido proteína',
    porcion: '1 scoop',
    calorias: 120,
    proteinas: 24,
    carbohidratos: 3,
    grasas: 1,
  },
]

import type { MomentoComida, PerfilNutricion } from '../../core/data/db'

export const COLOR = '#f59e0b'

export const PERFIL_DEFECTO: Omit<PerfilNutricion, 'id'> = {
  calorias: 2200,
  proteinas: 150,
  carbohidratos: 220,
  grasas: 65,
  aguaMl: 2500,
}

/**
 * Preset de dieta. El objetivo ya no se elige a mano: lo deriva el peso objetivo
 * (`derivarObjetivo` en balance.ts) y el porcentaje sale del ritmo pactado. El
 * `factor` se queda como respaldo para cuando aún no hay peso objetivo ni plazo.
 */
export const OBJETIVOS: {
  id: NonNullable<PerfilNutricion['objetivo']>
  icon: string
  label: string
  factor: number
}[] = [
  { id: 'deficit', icon: '🔻', label: 'Bajar', factor: 0.85 },
  { id: 'mantener', icon: '⚖️', label: 'Mantener', factor: 1 },
  { id: 'superavit', icon: '📈', label: 'Subir', factor: 1.1 },
]

/**
 * Margen dentro del cual el peso ya cuenta como alcanzado. Lo comparten el
 * «ya llegaste» de `progresoMeta` y el «tu objetivo es mantener» de
 * `derivarObjetivo`: con dos números distintos podrían contradecirse.
 */
export const TOLERANCIA_PESO_KG = 0.3

/** Signo que la meta de peso espera del avance semanal según el preset de dieta. */
export const SIGNO_OBJETIVO: Record<NonNullable<PerfilNutricion['objetivo']>, number> = {
  deficit: -1,
  mantener: 0,
  superavit: 1,
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

/** Un vaso: lo que escribe el botón de un toque del objetivo de hidratación. */
export const ML_VASO = 250

/** Con qué hora nace cada momento al agendarlo (el usuario la cambia luego). */
export const HORA_SUGERIDA: Record<MomentoComida, string> = {
  desayuno: '08:00',
  comida: '14:00',
  cena: '21:00',
  snack: '17:00',
}

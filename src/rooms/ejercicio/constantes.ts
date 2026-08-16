import type { PerfilEjercicio, TipoEntrenamiento } from '../../core/data/db'

export const PERFIL_DEFECTO: Omit<PerfilEjercicio, 'id'> = {
  sesionesFuerzaSemana: 3,
  minutosResistenciaSemana: 90,
  minutosFlexibilidadSemana: 60,
  diasActivosSemana: 5,
}

export const TIPOS: {
  id: TipoEntrenamiento
  label: string
  icon: string
  color: string
}[] = [
  { id: 'fuerza', label: 'Fuerza', icon: '🏋️', color: '#f97316' },
  { id: 'resistencia', label: 'Resistencia', icon: '🏃', color: '#38bdf8' },
  { id: 'flexibilidad', label: 'Flexibilidad', icon: '🧘', color: '#a78bfa' },
]

/** El rosa del cuarto (mismo hex que el `color` de rooms/ejercicio/index.tsx). */
export const COLOR = '#fb7185'

// Acento POR MODALIDAD de los CTA (`ui-accent-bg` + acento()): cada pestaña pinta el suyo.
export const C_FUERZA = '#ea580c' // orange-600
export const C_CARDIO = '#0284c7' // sky-600
export const C_FLEX = '#7c3aed' // violet-600

// Los catálogos de ejercicios por modalidad viven en catalogo.ts

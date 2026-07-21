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

// Los catálogos de ejercicios por modalidad viven en catalogo.ts

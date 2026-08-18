import type { CategoriaTitular, TipoEfemeride } from '../../core/data/db'

export const COLOR_FABRICA = '#f472b6'
/**
 * Con el que se pinta la app: el color del CUARTO abierto (lo baja `RoomOverlay` en
 * `--ui-app`) y, fuera de él, el de fábrica. Es una variable CSS, no un hex: para
 * mezclarlo usa `color-mix`, no interpolación de alfa.
 */
export const COLOR = `var(--ui-app, ${COLOR_FABRICA})`

export const CATEGORIAS: {
  id: CategoriaTitular
  label: string
  emoji: string
  color: string
}[] = [
  { id: 'mundo', label: 'Mundo', emoji: '🌍', color: '#60a5fa' },
  { id: 'economia', label: 'Economía', emoji: '💼', color: '#34d399' },
  { id: 'tecnologia', label: 'Tecnología', emoji: '💻', color: '#a78bfa' },
  { id: 'salud', label: 'Salud', emoji: '🩺', color: '#f87171' },
  { id: 'deportes', label: 'Deportes', emoji: '⚽', color: '#fbbf24' },
  { id: 'entretenimiento', label: 'Entretenimiento', emoji: '🎬', color: '#f472b6' },
]

export function getCategoria(id: CategoriaTitular) {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[0]
}

export const TIPOS_EFEMERIDE: {
  id: TipoEfemeride
  label: string
  emoji: string
  color: string
}[] = [
  { id: 'historia', label: 'Un día en la historia', emoji: '📜', color: '#fbbf24' },
  { id: 'arte', label: 'La obra de arte del día', emoji: '🎨', color: '#f472b6' },
  { id: 'libro', label: 'El libro del día', emoji: '📖', color: '#34d399' },
  { id: 'personalidad', label: 'La personalidad del día', emoji: '🌟', color: '#60a5fa' },
  { id: 'especie', label: 'La especie del día', emoji: '🐾', color: '#fb923c' },
  { id: 'palabra', label: 'La palabra del día', emoji: '✍️', color: '#a78bfa' },
  { id: 'frase', label: 'La frase del día', emoji: '💬', color: '#22d3ee' },
]

export function getTipoEfemeride(id: TipoEfemeride) {
  return TIPOS_EFEMERIDE.find((e) => e.id === id) ?? TIPOS_EFEMERIDE[0]
}

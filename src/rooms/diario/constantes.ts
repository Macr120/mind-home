import type { CategoriaNoticia } from '../../core/data/db'

export const COLOR = '#f472b6'

export const CATEGORIAS: {
  id: CategoriaNoticia
  label: string
  icon: string
}[] = [
  { id: 'mundo', label: 'Mundo', icon: '🌐' },
  { id: 'nacional', label: 'Nacional', icon: '🏛️' },
  { id: 'politica', label: 'Política', icon: '🗳️' },
  { id: 'economia', label: 'Economía', icon: '📈' },
  { id: 'tecnologia', label: 'Tecnología', icon: '💻' },
  { id: 'ciencia', label: 'Ciencia', icon: '🔬' },
  { id: 'salud', label: 'Salud', icon: '🏥' },
  { id: 'deportes', label: 'Deportes', icon: '⚽' },
  { id: 'cultura', label: 'Cultura', icon: '🎭' },
  { id: 'entretenimiento', label: 'Entretenimiento', icon: '🎬' },
  { id: 'local', label: 'Local', icon: '📍' },
  { id: 'otro', label: 'Otro', icon: '📰' },
]

export function getCategoria(id: CategoriaNoticia) {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[11]
}

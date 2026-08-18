import type { EstadoMedia, TipoMedia } from '../../core/data/db'

export const COLOR_FABRICA = '#34d399'
/**
 * Con el que se pinta la app: el color del CUARTO abierto (lo baja `RoomOverlay` en
 * `--ui-app`) y, fuera de él, el de fábrica. Es una variable CSS, no un hex: para
 * mezclarlo usa `color-mix`, no interpolación de alfa.
 */
export const COLOR = `var(--ui-app, ${COLOR_FABRICA})`

export const TIPOS_MEDIA: {
  id: TipoMedia
  label: string
  icon: string
}[] = [
  { id: 'pelicula', label: 'Película', icon: '🎬' },
  { id: 'serie', label: 'Serie', icon: '📺' },
  { id: 'libro', label: 'Libro', icon: '📖' },
  { id: 'videojuego', label: 'Videojuego', icon: '🎮' },
]

export const ESTADOS_MEDIA: { id: EstadoMedia; label: string }[] = [
  { id: 'pendiente', label: 'Por ver/leer' },
  { id: 'en_curso', label: 'En curso' },
  { id: 'completado', label: 'Completado' },
]

export function getTipoMedia(id: TipoMedia) {
  return TIPOS_MEDIA.find((t) => t.id === id) ?? TIPOS_MEDIA[0]
}

export function getEstadoMedia(id: EstadoMedia) {
  return ESTADOS_MEDIA.find((e) => e.id === id) ?? ESTADOS_MEDIA[0]
}

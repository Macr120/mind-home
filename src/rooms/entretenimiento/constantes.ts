import type { CategoriaJuegoMesa, EstadoJuegoMesa, EstadoMedia, TipoMedia } from '../../core/data/db'

export const COLOR = '#34d399'

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

export const GENEROS_SUGERIDOS: Record<TipoMedia, string[]> = {
  pelicula: [
    'Acción',
    'Comedia',
    'Drama',
    'Ciencia ficción',
    'Terror',
    'Romance',
    'Documental',
    'Animación',
    'Thriller',
  ],
  serie: [
    'Drama',
    'Comedia',
    'Ciencia ficción',
    'Crimen',
    'Fantasía',
    'Reality',
    'Anime',
    'Mini-serie',
  ],
  libro: [
    'Ficción',
    'No ficción',
    'Fantasía',
    'Misterio',
    'Romance',
    'Ciencia ficción',
    'Biografía',
    'Historia',
    'Autoayuda',
  ],
  videojuego: [
    'RPG',
    'Acción',
    'Aventura',
    'Estrategia',
    'Indie',
    'Shooter',
    'Simulación',
    'Deportes',
    'Puzzle',
  ],
}

export function getTipoMedia(id: TipoMedia) {
  return TIPOS_MEDIA.find((t) => t.id === id) ?? TIPOS_MEDIA[0]
}

export function getEstadoMedia(id: EstadoMedia) {
  return ESTADOS_MEDIA.find((e) => e.id === id) ?? ESTADOS_MEDIA[0]
}

export const CATEGORIAS_MESA: {
  id: CategoriaJuegoMesa
  label: string
  icon: string
}[] = [
  { id: 'estrategia', label: 'Estrategia', icon: '♟️' },
  { id: 'familiar', label: 'Familiar', icon: '👨‍👩‍👧' },
  { id: 'party', label: 'Party', icon: '🎉' },
  { id: 'cooperativo', label: 'Cooperativo', icon: '🤝' },
  { id: 'rol', label: 'Rol / narrativo', icon: '📜' },
  { id: 'cartas', label: 'Cartas', icon: '🃏' },
  { id: 'otro', label: 'Otro', icon: '🎲' },
]

export const ESTADOS_MESA: { id: EstadoJuegoMesa; label: string }[] = [
  { id: 'coleccion', label: 'En mi colección' },
  { id: 'wishlist', label: 'Lista de deseos' },
  { id: 'prestado', label: 'Prestado' },
]

export function getCategoriaMesa(id: CategoriaJuegoMesa) {
  return CATEGORIAS_MESA.find((c) => c.id === id) ?? CATEGORIAS_MESA[6]
}

export function getEstadoMesa(id: EstadoJuegoMesa) {
  return ESTADOS_MESA.find((e) => e.id === id) ?? ESTADOS_MESA[0]
}

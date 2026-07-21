import type { TemaId } from './temas'

/** Identificador de un tipo de piso de la casa. */
export type PisoTipoId =
  | 'pasto'
  | 'cemento'
  | 'madera'
  | 'arena'
  | 'nieve'
  | 'mosaico'
  | 'luna'
  | 'desierto'
  | 'adoquin'
  | 'grid_neon'
  | 'cesped_rosa'
  | 'niebla'
  | 'parquet'
  | 'ajedrez'

export interface PisoTipo {
  id: PisoTipoId
  nombre: string
  emoji: string
  /** Color base (fallback cuando no hay textura o mientras carga). */
  color: string
  roughness: number
  metalness: number
  emissive?: string
  emissiveIntensity?: number
  /** Tema que sugiere este piso automáticamente. */
  tema?: TemaId
  /**
   * Prefijo de archivo en /textures/floors/{textura}_{color|normal|roughness}.jpg
   * Si está definido se usan texturas PBR fotorrealistas.
   */
  textura?: string
  /** Tamaño de un tile en unidades Three.js (por defecto 2.5). Controla el repeat del tiling. */
  tileSize?: number
}

export const PISOS: PisoTipo[] = [
  {
    id: 'pasto',
    nombre: 'Pasto',
    emoji: '🌿',
    color: '#1e6b0a',
    roughness: 0.95,
    metalness: 0,
    textura: 'pasto',
    tileSize: 2.5,
  },
  {
    id: 'cemento',
    nombre: 'Cemento',
    emoji: '🪨',
    color: '#7e7e7e',
    roughness: 0.9,
    metalness: 0,
    textura: 'cemento',
    tileSize: 3,
  },
  {
    id: 'madera',
    nombre: 'Madera',
    emoji: '🪵',
    color: '#7a4e25',
    roughness: 0.75,
    metalness: 0,
    textura: 'madera',
    tileSize: 2,
  },
  {
    id: 'parquet',
    nombre: 'Parquet',
    emoji: '🏡',
    color: '#9c6030',
    roughness: 0.5,
    metalness: 0.05,
    textura: 'parquet',
    tileSize: 1.5,
  },
  {
    id: 'mosaico',
    nombre: 'Mosaico',
    emoji: '🔲',
    color: '#b0aec0',
    roughness: 0.3,
    metalness: 0.08,
    // Sin textura: se renderiza con geometría procedural en DecosPiso
  },
  {
    id: 'ajedrez',
    nombre: 'Ajedrez',
    emoji: '♟️',
    color: '#888888',
    roughness: 0.25,
    metalness: 0.1,
    // Sin textura: damero blanco/negro procedural con baldosas grandes
  },
  {
    id: 'arena',
    nombre: 'Arena',
    emoji: '🏖️',
    color: '#cca766',
    roughness: 0.9,
    metalness: 0,
    textura: 'arena',
    tileSize: 3,
  },
  {
    id: 'nieve',
    nombre: 'Nieve',
    emoji: '❄️',
    color: '#d8e8f2',
    roughness: 0.65,
    metalness: 0,
    emissive: '#a8c8e0',
    emissiveIntensity: 0.04,
    tema: 'navidad',
    textura: 'nieve',
    tileSize: 3,
  },
  {
    id: 'luna',
    nombre: 'Luna',
    emoji: '🌑',
    color: '#cccccc',
    roughness: 0.92,
    metalness: 0,
    emissive: '#d8d8d8',
    emissiveIntensity: 0.45,
    tema: 'espacio',
    textura: 'luna',
    tileSize: 2.5,
  },
  {
    id: 'desierto',
    nombre: 'Desierto',
    emoji: '🌵',
    color: '#b8923a',
    roughness: 0.92,
    metalness: 0,
    tema: 'vaquero',
    textura: 'desierto',
    tileSize: 3,
  },
  {
    id: 'adoquin',
    nombre: 'Adoquín',
    emoji: '🏰',
    color: '#6e6050',
    roughness: 0.88,
    metalness: 0,
    tema: 'medieval',
    textura: 'adoquin',
    tileSize: 1.5,
  },
  {
    id: 'grid_neon',
    nombre: 'Grid Neón',
    emoji: '⚡',
    color: '#050a18',
    roughness: 0.2,
    metalness: 0.35,
    emissive: '#0033dd',
    emissiveIntensity: 0.22,
    tema: 'cyberpunk',
    // Sin textura: se renderiza con geometría de líneas neón en DecosPiso
  },
  {
    id: 'cesped_rosa',
    nombre: 'Pasto Rosa',
    emoji: '🌸',
    color: '#e060a0',
    roughness: 0.88,
    metalness: 0,
    tema: 'barbie',
    // Sin textura: el color rosa saturado es el aspecto deseado
  },
  {
    id: 'niebla',
    nombre: 'Niebla',
    emoji: '🕸️',
    color: '#181020',
    roughness: 0.7,
    metalness: 0,
    emissive: '#3a0018',
    emissiveIntensity: 0.14,
    tema: 'terror',
    // Sin textura: oscuro atmosférico
  },
]

/** Marca explícita de celda/cuarto sin loseta de piso (hueco visible). */
export const PISO_SIN_PISO = '__sin_piso__' as const

export function esSinPiso(tipo: string | null | undefined): boolean {
  return tipo === PISO_SIN_PISO
}

export const getPisoTipo = (id: PisoTipoId | null) =>
  id ? PISOS.find((p) => p.id === id) ?? null : null

import type { TemaId } from './temas'

/** Fondo de cielo / «wallpaper» de la escena 3D. `auto` = ciclo día/noche. */
export type FondoId =
  | 'auto'
  | 'color_fijo'
  | 'cielo_claro'
  | 'cielo_oscuro'
  | 'aurora'
  | 'nebulosa'
  | 'medieval_atardecer'
  | 'bosque_bruma'
  | 'desierto'
  | 'neon_ciudad'
  | 'nieve'
  | 'atardecer_dorado'

/** Familias de microanimaciones del cielo (`FondoAnimaciones`). */
export type FamiliaAnimId =
  | 'cometas'
  | 'dragones'
  | 'murcielagos'
  | 'bruma'
  | 'corazones'
  | 'aves'
  | 'rayas'
  | 'copos'
  | 'nubes'
  | 'polvo'
  | 'fugaz'

export interface AnimacionDef {
  id: FamiliaAnimId
  nombre: string
  icon: string
}

/** Microanimaciones que se pueden elegir a mano (paso aparte del fondo). */
export const ANIMACIONES: AnimacionDef[] = [
  { id: 'nubes', nombre: 'Nubes', icon: '☁️' },
  { id: 'aves', nombre: 'Aves', icon: '🦅' },
  { id: 'copos', nombre: 'Nieve', icon: '❄️' },
  { id: 'cometas', nombre: 'Cometas', icon: '🌌' },
  { id: 'fugaz', nombre: 'Estrellas fugaces', icon: '⭐' },
  { id: 'polvo', nombre: 'Polvo brillante', icon: '✨' },
  { id: 'dragones', nombre: 'Dragones', icon: '🏰' },
  { id: 'murcielagos', nombre: 'Murciélagos', icon: '🕸️' },
  { id: 'bruma', nombre: 'Bruma', icon: '🌫️' },
  { id: 'corazones', nombre: 'Corazones', icon: '💖' },
  { id: 'rayas', nombre: 'Rayas neón', icon: '🌈' },
]

/** Ids válidos al leer la selección guardada. */
export const esFamiliaAnim = (id: string): id is FamiliaAnimId =>
  ANIMACIONES.some((a) => a.id === id)

export interface FondoDef {
  id: FondoId
  nombre: string
  icon: string
  /** Degradado del cielo: color superior → inferior. */
  gradiente: [string, string]
  /** Tema al que se asocia (sugerencia al elegir tema). */
  tema?: TemaId
  /** Campo de estrellas estáticas de fondo. */
  estrellas?: boolean
  /** Microanimaciones sugeridas por este fondo (solo en modo automático). */
  anim?: FamiliaAnimId[]
}

export const FONDOS: FondoDef[] = [
  {
    id: 'auto',
    nombre: 'Automático',
    icon: '🔄',
    gradiente: ['#9cc3f0', '#161e36'],
  },
  {
    id: 'cielo_claro',
    nombre: 'Cielo claro',
    icon: '☀️',
    gradiente: ['#87ceeb', '#e0f4ff'],
    anim: ['nubes', 'aves'],
  },
  {
    id: 'cielo_oscuro',
    nombre: 'Cielo oscuro',
    icon: '🌑',
    gradiente: ['#0f172a', '#1e1b4b'],
    estrellas: true,
    anim: ['fugaz'],
  },
  {
    id: 'aurora',
    nombre: 'Aurora',
    icon: '🌌',
    gradiente: ['#0c1445', '#1a5f4a'],
    tema: 'espacio',
    estrellas: true,
    anim: ['fugaz', 'polvo'],
  },
  {
    id: 'nebulosa',
    nombre: 'Nebulosa',
    icon: '🪐',
    gradiente: ['#1a0a2e', '#3d1a6e'],
    tema: 'espacio',
    estrellas: true,
    anim: ['cometas', 'polvo'],
  },
  {
    id: 'medieval_atardecer',
    nombre: 'Castillo al atardecer',
    icon: '🏰',
    gradiente: ['#4a3728', '#c97b4a'],
    tema: 'medieval',
    anim: ['dragones', 'aves'],
  },
  {
    id: 'bosque_bruma',
    nombre: 'Bosque brumoso',
    icon: '🌲',
    gradiente: ['#1a2e1a', '#3d4a3d'],
    tema: 'terror',
    anim: ['murcielagos', 'bruma'],
  },
  {
    id: 'desierto',
    nombre: 'Desierto',
    icon: '🏜️',
    gradiente: ['#c9a227', '#e8d4a8'],
    tema: 'vaquero',
    anim: ['aves', 'polvo'],
  },
  {
    id: 'neon_ciudad',
    nombre: 'Ciudad neón',
    icon: '🌃',
    gradiente: ['#0a0015', '#1a0030'],
    tema: 'cyberpunk',
    estrellas: true,
    anim: ['rayas'],
  },
  {
    id: 'nieve',
    nombre: 'Nieve',
    icon: '❄️',
    gradiente: ['#b8d4e8', '#e8f4fc'],
    tema: 'navidad',
    anim: ['copos'],
  },
  {
    id: 'atardecer_dorado',
    nombre: 'Atardecer dorado',
    icon: '🌇',
    gradiente: ['#ff6b35', '#ffd89b'],
    tema: 'barbie',
    anim: ['nubes', 'corazones'],
  },
]

export function getFondo(id: FondoId | null | undefined): FondoDef {
  return FONDOS.find((f) => f.id === id) ?? FONDOS[0]
}

/** Microanimaciones que le tocan a un fondo en modo automático. */
export function animacionesDeFondo(fondo: FondoDef, deNoche: boolean): FamiliaAnimId[] {
  return fondo.anim ?? (deNoche ? ['fugaz'] : ['nubes', 'aves'])
}

/** Fondo de cielo que corresponde a cada tema (uno por tema). */
const FONDO_POR_TEMA: Record<TemaId, FondoId> = {
  medieval: 'medieval_atardecer',
  espacio: 'nebulosa',
  terror: 'bosque_bruma',
  barbie: 'atardecer_dorado',
  vaquero: 'desierto',
  cyberpunk: 'neon_ciudad',
  navidad: 'nieve',
}

/** Fondo al activar un tema; sin tema → ciclo día/noche. */
export function fondoSugeridoPorTema(tema: TemaId | null): FondoId {
  if (!tema) return 'auto'
  return FONDO_POR_TEMA[tema]
}

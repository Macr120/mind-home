import type { EscenarioId, TemaId, TemaNiebla } from './temas'

/** Paisaje 3D alrededor de la casa: los de los temas dinámicos más los que solo existen quietos. */
export type PaisajeId = EscenarioId | 'playa' | 'nevado' | 'otonal' | 'ciudad' | 'volcan' | 'luna' | 'marino' | 'dunas'

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
  | 'espacio_profundo'
  | 'sobre_nubes'
  | 'yermo'
  | 'pradera'
  | 'mar_abierto'
  | 'campo'
  | 'playa_tropical'
  | 'montanas_nevadas'
  | 'bosque_otonal'
  | 'ciudad_noche'
  | 'volcan'
  | 'superficie_lunar'
  | 'fondo_marino'
  | 'dunas'
  | 'viaje_nave'
  | 'viaje_avion'
  | 'viaje_rodante'
  | 'viaje_tortuga'
  | 'viaje_barco'
  | 'viaje_tren'

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
  /** Paisaje 3D completo alrededor de la casa (el de un tema dinámico quieto, o uno propio). */
  escena?: PaisajeId
  /** Color del suelo del paisaje (miniatura del menú). */
  suelo?: string
  /** Niebla propia del paisaje (sin tema dinámico); esconde el borde del suelo. */
  niebla?: TemaNiebla
  /**
   * Fondo en movimiento: la casa viaja en este vehículo con el paisaje corriendo, pero
   * muros, pisos y lo demás siguen siendo los del tema activo (solo cambia el fondo).
   */
  viaje?: EscenarioId
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
  // Paisajes completos: el suelo, el agua o el cielo alrededor de la casa (los de los
  // temas dinámicos, quietos). La casa conserva su piso.
  {
    id: 'espacio_profundo',
    nombre: 'Espacio profundo',
    icon: '🪐',
    gradiente: ['#02030a', '#0b1026'],
    tema: 'nave',
    estrellas: true,
    anim: ['fugaz'],
    escena: 'nave',
    suelo: '#0b1026',
  },
  {
    id: 'sobre_nubes',
    nombre: 'Sobre las nubes',
    icon: '☁️',
    gradiente: ['#6fb1e8', '#cfe6f7'],
    tema: 'avion',
    anim: ['aves'],
    escena: 'avion',
    suelo: '#f4f8fc',
  },
  {
    id: 'yermo',
    nombre: 'Tierra baldía',
    icon: '☢️',
    gradiente: ['#b7793f', '#e0b07a'],
    tema: 'apocalipsis',
    anim: ['polvo'],
    escena: 'rodante',
    suelo: '#8a6a45',
  },
  {
    id: 'pradera',
    nombre: 'Pradera',
    icon: '🌿',
    gradiente: ['#8ccbee', '#dff1e0'],
    tema: 'tortuga',
    anim: ['aves', 'nubes'],
    escena: 'tortuga',
    suelo: '#6a9a3c',
  },
  {
    id: 'mar_abierto',
    nombre: 'Mar abierto',
    icon: '🌊',
    gradiente: ['#6fb3e0', '#cfe8f5'],
    tema: 'pirata',
    anim: ['aves', 'nubes'],
    escena: 'barco',
    suelo: '#2f6f9e',
  },
  {
    id: 'campo',
    nombre: 'Campiña',
    icon: '🌾',
    gradiente: ['#8cc4ec', '#e6f2df'],
    tema: 'tren',
    anim: ['nubes', 'aves'],
    escena: 'tren',
    suelo: '#7fa452',
  },
  // Paisajes que solo existen quietos (no tienen vehículo).
  {
    id: 'playa_tropical',
    nombre: 'Playa tropical',
    icon: '🏝️',
    gradiente: ['#4fb3f0', '#bfe8fb'],
    anim: ['aves', 'nubes'],
    escena: 'playa',
    suelo: '#ecd9a8',
    niebla: { color: '#cdebf7', near: 90, far: 260 },
  },
  {
    id: 'montanas_nevadas',
    nombre: 'Montañas nevadas',
    icon: '🏔️',
    gradiente: ['#9ec6e6', '#eef6fc'],
    tema: 'navidad',
    anim: ['copos'],
    escena: 'nevado',
    suelo: '#f1f5f9',
    niebla: { color: '#e4eef6', near: 80, far: 240 },
  },
  {
    id: 'bosque_otonal',
    nombre: 'Bosque otoñal',
    icon: '🍁',
    gradiente: ['#f0b77a', '#f8e2c0'],
    anim: ['aves'],
    escena: 'otonal',
    suelo: '#b8652a',
    niebla: { color: '#f1d7b4', near: 70, far: 220 },
  },
  {
    id: 'ciudad_noche',
    nombre: 'Ciudad de noche',
    icon: '🏙️',
    gradiente: ['#0b1030', '#2b2354'],
    tema: 'cyberpunk',
    estrellas: true,
    anim: ['fugaz'],
    escena: 'ciudad',
    suelo: '#2a2d36',
    niebla: { color: '#1b1b36', near: 80, far: 240 },
  },
  {
    id: 'volcan',
    nombre: 'Volcán',
    icon: '🌋',
    gradiente: ['#3a1410', '#c2451e'],
    anim: ['polvo'],
    escena: 'volcan',
    suelo: '#26201e',
    niebla: { color: '#4a2016', near: 70, far: 220 },
  },
  {
    id: 'superficie_lunar',
    nombre: 'Superficie lunar',
    icon: '🌕',
    gradiente: ['#000000', '#0b0d16'],
    tema: 'espacio',
    estrellas: true,
    anim: ['fugaz'],
    escena: 'luna',
    suelo: '#9a9a9e',
  },
  {
    id: 'fondo_marino',
    nombre: 'Fondo marino',
    icon: '🐠',
    gradiente: ['#0b5f8a', '#063a57'],
    anim: ['polvo'],
    escena: 'marino',
    suelo: '#d8c894',
    niebla: { color: '#0d5a80', near: 30, far: 130 },
  },
  {
    id: 'dunas',
    nombre: 'Dunas',
    icon: '🏜️',
    gradiente: ['#f0a95a', '#fde3b0'],
    tema: 'vaquero',
    anim: ['polvo'],
    escena: 'dunas',
    suelo: '#e7b774',
    niebla: { color: '#f6d9a6', near: 80, far: 250 },
  },
  // En movimiento: el vehículo y su paisaje corriendo, sin las propiedades del tema dinámico.
  {
    id: 'viaje_nave',
    nombre: 'Viaje en nave',
    icon: '🛸',
    gradiente: ['#02030a', '#0b1026'],
    estrellas: true,
    anim: ['fugaz'],
    viaje: 'nave',
    suelo: '#0b1026',
  },
  {
    id: 'viaje_avion',
    nombre: 'Vuelo en avión',
    icon: '✈️',
    gradiente: ['#6fb1e8', '#cfe6f7'],
    anim: ['aves'],
    viaje: 'avion',
    suelo: '#f4f8fc',
    niebla: { color: '#bcd9f5', near: 60, far: 170 },
  },
  {
    id: 'viaje_rodante',
    nombre: 'Casa rodante',
    icon: '☢️',
    gradiente: ['#b7793f', '#e0b07a'],
    anim: ['polvo'],
    viaje: 'rodante',
    suelo: '#8a6a45',
    niebla: { color: '#b07a48', near: 60, far: 160 },
  },
  {
    id: 'viaje_tortuga',
    nombre: 'Lomo de tortuga',
    icon: '🐢',
    gradiente: ['#8ccbee', '#dff1e0'],
    anim: ['aves', 'nubes'],
    viaje: 'tortuga',
    suelo: '#6a9a3c',
    niebla: { color: '#cfe8d6', near: 55, far: 150 },
  },
  {
    id: 'viaje_barco',
    nombre: 'Travesía pirata',
    icon: '🏴‍☠️',
    gradiente: ['#6fb3e0', '#cfe8f5'],
    anim: ['aves', 'nubes'],
    viaje: 'barco',
    suelo: '#2f6f9e',
    niebla: { color: '#c4e0f2', near: 60, far: 170 },
  },
  {
    id: 'viaje_tren',
    nombre: 'Viaje en tren',
    icon: '🚂',
    gradiente: ['#8cc4ec', '#e6f2df'],
    anim: ['nubes', 'aves'],
    viaje: 'tren',
    suelo: '#7fa452',
    niebla: { color: '#cfe3f0', near: 60, far: 170 },
  },
]

/** Tema dinámico de fábrica de cada vehículo: viste el vehículo y guarda su velocidad. */
export const TEMA_DE_VIAJE: Record<EscenarioId, TemaId> = {
  nave: 'nave',
  avion: 'avion',
  rodante: 'apocalipsis',
  tortuga: 'tortuga',
  barco: 'pirata',
  tren: 'tren',
}

export function getFondo(id: FondoId | null | undefined): FondoDef {
  return FONDOS.find((f) => f.id === id) ?? FONDOS[0]
}

/** Microanimaciones que le tocan a un fondo en modo automático. */
export function animacionesDeFondo(fondo: FondoDef, deNoche: boolean): FamiliaAnimId[] {
  return fondo.anim ?? (deNoche ? ['fugaz'] : ['nubes', 'aves'])
}

/** Fondo de cielo que corresponde a cada tema (uno por tema). */
const FONDO_POR_TEMA: Record<TemaId, FondoId> = {
  // Los temas estáticos también traen un paisaje completo alrededor de la casa.
  medieval: 'pradera',
  espacio: 'superficie_lunar',
  terror: 'bosque_otonal',
  barbie: 'playa_tropical',
  vaquero: 'dunas',
  cyberpunk: 'ciudad_noche',
  navidad: 'montanas_nevadas',
  // Los temas con escenario en movimiento: el cielo acompaña al viaje.
  nave: 'espacio_profundo',
  avion: 'sobre_nubes',
  apocalipsis: 'yermo',
  tortuga: 'pradera',
  pirata: 'mar_abierto',
  tren: 'campo',
}

/** Fondo al activar un tema; sin tema → ciclo día/noche. */
export function fondoSugeridoPorTema(tema: TemaId | null): FondoId {
  if (!tema) return 'auto'
  return FONDO_POR_TEMA[tema]
}

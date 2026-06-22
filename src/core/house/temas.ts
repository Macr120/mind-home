/**
 * Sistema de temas estacionales (global a toda la casa).
 * El modelo base no cambia: el tema "re-viste" los materiales primitivos
 * mezclando un tinte sobre el color base y ajustando el acabado (roughness,
 * metalness, brillo) y el fondo de la escena.
 *
 * El tema activo se controla desde el editor de mapa (estado global en
 * `disenoStore.temaGlobal`). `null` = sin tema, la casa se ve normal.
 *
 * Más adelante, cada recurso 3D (ver `recursos.ts`) podrá añadir overlays
 * y efectos propios según el tema; esta capa cubre el "re-vestido" base.
 */

export type TemaId =
  | 'medieval'
  | 'espacio'
  | 'terror'
  | 'barbie'
  | 'vaquero'
  | 'cyberpunk'
  | 'navidad'

export interface Tema {
  id: TemaId
  nombre: string
  icon: string
  /** Colores representativos para la UI del selector. */
  paleta: string[]
  /** Color que se mezcla sobre el color base de cada superficie. */
  tinte: string
  /** Cuánto se mezcla el tinte sobre el color base (0..1). */
  fuerza: number
  roughness: number
  metalness: number
  /** Brillo/glow del material; '#000000' = sin brillo. */
  emissive: string
  emissiveIntensity: number
  /** Color de fondo de la escena con este tema. */
  fondo: string
  /** Texturas del "shell" (muros, piso, techo) por tema — hoja 4 del Excel. */
  shell: TemaShell
}

/** Colores del cascarón (muros/piso/techo) que reemplaza el tema (hoja 4). */
export interface TemaShell {
  /** Muro interior (divisorio entre cuartos). */
  muroInt: string
  /** Muro exterior (fachada). */
  muroExt: string
  piso: string
  techo: string
}

export const TEMAS: Tema[] = [
  {
    id: 'medieval',
    nombre: 'Medieval',
    icon: '🏰',
    paleta: ['#6b5640', '#8a6d3b', '#3f3a33', '#a67c52'],
    tinte: '#6b5640',
    fuerza: 0.45,
    roughness: 0.95,
    metalness: 0.0,
    emissive: '#000000',
    emissiveIntensity: 0,
    fondo: '#1a1410',
    shell: { muroInt: '#8c8073', muroExt: '#6d665c', piso: '#7c746a', techo: '#5b4326' },
  },
  {
    id: 'espacio',
    nombre: 'Espacio',
    icon: '🚀',
    paleta: ['#aab8d6', '#22d3ee', '#1e293b', '#e2e8f0'],
    tinte: '#aab8d6',
    fuerza: 0.4,
    roughness: 0.25,
    metalness: 0.7,
    emissive: '#22d3ee',
    emissiveIntensity: 0.15,
    fondo: '#0a0f1f',
    shell: { muroInt: '#e2e8f2', muroExt: '#aab6c6', piso: '#e8eef6', techo: '#cdd6e2' },
  },
  {
    id: 'terror',
    nombre: 'Terror',
    icon: '🕸️',
    paleta: ['#3b2330', '#7f1d1d', '#1f2937', '#581c87'],
    tinte: '#3b2330',
    fuerza: 0.55,
    roughness: 0.95,
    metalness: 0.05,
    emissive: '#7f1d1d',
    emissiveIntensity: 0.06,
    fondo: '#0a0608',
    shell: { muroInt: '#574f4a', muroExt: '#2e2724', piso: '#3a322c', techo: '#322b29' },
  },
  {
    id: 'barbie',
    nombre: 'Barbie',
    icon: '💖',
    paleta: ['#ff5fa2', '#ff7ab8', '#c084fc', '#fde68a'],
    tinte: '#ff5fa2',
    fuerza: 0.5,
    roughness: 0.2,
    metalness: 0.1,
    emissive: '#ff7ab8',
    emissiveIntensity: 0.08,
    fondo: '#2a0f1f',
    shell: { muroInt: '#ffb3d4', muroExt: '#ff9ec9', piso: '#ffd4e6', techo: '#ffc1dc' },
  },
  {
    id: 'vaquero',
    nombre: 'Vaquero',
    icon: '🤠',
    paleta: ['#9c5a2c', '#c2853f', '#7c2d12', '#a16207'],
    tinte: '#9c5a2c',
    fuerza: 0.5,
    roughness: 0.9,
    metalness: 0.05,
    emissive: '#000000',
    emissiveIntensity: 0,
    fondo: '#1c130b',
    shell: { muroInt: '#b59169', muroExt: '#a07c4c', piso: '#8a5a30', techo: '#6b4a28' },
  },
  {
    id: 'cyberpunk',
    nombre: 'Cyberpunk',
    icon: '🌃',
    paleta: ['#1a1030', '#d946ef', '#22d3ee', '#7c3aed'],
    tinte: '#1a1030',
    fuerza: 0.5,
    roughness: 0.4,
    metalness: 0.6,
    emissive: '#d946ef',
    emissiveIntensity: 0.25,
    fondo: '#080312',
    shell: { muroInt: '#1d1a2e', muroExt: '#14111e', piso: '#0f0c18', techo: '#1a1726' },
  },
  {
    id: 'navidad',
    nombre: 'Navidad',
    icon: '🎄',
    paleta: ['#2e7d32', '#dc2626', '#fbbf24', '#f8fafc'],
    tinte: '#2e7d32',
    fuerza: 0.35,
    roughness: 0.5,
    metalness: 0.1,
    emissive: '#dc2626',
    emissiveIntensity: 0.1,
    fondo: '#0c1a10',
    shell: { muroInt: '#caa78c', muroExt: '#2f5e3a', piso: '#7a5230', techo: '#5b4326' },
  },
]

export function getTema(id: TemaId | null | undefined): Tema | null {
  if (!id) return null
  return TEMAS.find((t) => t.id === id) ?? null
}

/** Fondo de escena según el tema (default oscuro de la app si no hay tema). */
export const FONDO_DEFAULT = '#0f1115'

/** Mezcla lineal de dos colores hex (#rrggbb). `t` = 0 → a, 1 → b. */
export function mezclar(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ar = (pa >> 16) & 255
  const ag = (pa >> 8) & 255
  const ab = pa & 255
  const br = (pb >> 16) & 255
  const bg = (pb >> 8) & 255
  const bb = pb & 255
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return '#' + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')
}

/** Color base "re-vestido" por el tema (o el color tal cual si no hay tema). */
export function colorConTema(base: string, tema: Tema | null): string {
  return tema ? mezclar(base, tema.tinte, tema.fuerza) : base
}

/** Props de `meshStandardMaterial` para una superficie, re-vestidas por el tema. */
export interface MatTema {
  color: string
  roughness: number
  metalness: number
  emissive?: string
  emissiveIntensity?: number
}

/**
 * Material temático para un objeto: mezcla el tinte sobre `base` y aplica el
 * acabado del tema. Sin tema, devuelve el color tal cual con el acabado base.
 * El brillo del tema se atenúa en objetos para no saturar la escena.
 */
export function matTema(base: string, tema: Tema | null, roughBase = 0.7): MatTema {
  if (!tema) return { color: base, roughness: roughBase, metalness: 0 }
  return {
    color: mezclar(base, tema.tinte, tema.fuerza),
    roughness: tema.roughness,
    metalness: tema.metalness,
    emissive: tema.emissive,
    emissiveIntensity: tema.emissiveIntensity * 0.6,
  }
}

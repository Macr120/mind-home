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

import type { EstiloVisualId, EfectosConfig } from './estilos'

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
  /** Modulación de la iluminación del ciclo día/noche (opcional; sin esto la luz es la de siempre). */
  luz?: TemaLuz
  /** Niebla de la escena (opcional; near/far en profundidad de vista, la escena vive entre ~25 y ~60). */
  niebla?: TemaNiebla
  /** Estilo de render sugerido al activar este tema por primera vez (default 'normal'). */
  estilo?: EstiloVisualId
}

/**
 * Ajustes de luz por tema. El ciclo día/noche sigue mandando: el tema solo
 * TIÑE los colores de las luces (mezcla) y ESCALA sus intensidades.
 */
export interface TemaLuz {
  /** Tinte que se mezcla sobre el color de la luz direccional (sol/luna de escena). */
  sol?: string
  /** Cuánto tiñe el sol (0..1). */
  fuerzaSol?: number
  /** Multiplicador de intensidad de la luz direccional. */
  intensidadSol?: number
  /** Tinte que se mezcla sobre el color de la luz ambiental. */
  ambiente?: string
  /** Cuánto tiñe el ambiente (0..1). */
  fuerzaAmbiente?: number
  /** Color de los focos nocturnos de los cuartos (default cálido '#ffd9a0'). */
  focos?: string
  /** Intensidad del entorno IBL (reflejos; default 0.25). */
  ibl?: number
  /** Exposición del tone mapping (default 1). */
  exposicion?: number
}

export interface TemaNiebla {
  color: string
  near: number
  far: number
}

/** Fuerza por defecto con la que el tema tiñe las luces. */
export const FUERZA_LUZ_DEFAULT = 0.35

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
    estilo: 'normal',
    shell: { muroInt: '#8c8073', muroExt: '#6d665c', piso: '#7c746a', techo: '#5b4326' },
    luz: { sol: '#ffd9a8', intensidadSol: 0.95, ambiente: '#e8d5b8', focos: '#ffb066', ibl: 0.2, exposicion: 0.95 },
    niebla: { color: '#2a2018', near: 40, far: 110 },
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
    estilo: 'normal',
    shell: { muroInt: '#e2e8f2', muroExt: '#aab6c6', piso: '#e8eef6', techo: '#cdd6e2' },
    luz: { sol: '#cfe0ff', intensidadSol: 1.05, ambiente: '#dce6ff', focos: '#cfe8ff', ibl: 0.5 },
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
    estilo: 'comic',
    shell: { muroInt: '#574f4a', muroExt: '#2e2724', piso: '#3a322c', techo: '#322b29' },
    luz: { sol: '#a8c0b0', fuerzaSol: 0.5, intensidadSol: 0.7, ambiente: '#8fa598', focos: '#9fe3a8', ibl: 0.15, exposicion: 0.85 },
    niebla: { color: '#1a2420', near: 26, far: 62 },
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
    estilo: 'miniatura',
    shell: { muroInt: '#ffb3d4', muroExt: '#ff9ec9', piso: '#ffd4e6', techo: '#ffc1dc' },
    luz: { sol: '#ffe0ef', intensidadSol: 1.1, ambiente: '#ffe8f2', focos: '#ff9ec9', ibl: 0.3, exposicion: 1.05 },
    niebla: { color: '#ffd4e6', near: 45, far: 120 },
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
    estilo: 'retro',
    shell: { muroInt: '#b59169', muroExt: '#a07c4c', piso: '#8a5a30', techo: '#6b4a28' },
    luz: { sol: '#ffc98a', fuerzaSol: 0.45, ambiente: '#f0d0a8', focos: '#ffb066', ibl: 0.2 },
    niebla: { color: '#c9a67a', near: 38, far: 100 },
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
    estilo: 'neon',
    shell: { muroInt: '#1d1a2e', muroExt: '#14111e', piso: '#0f0c18', techo: '#1a1726' },
    luz: { sol: '#b8a8ff', fuerzaSol: 0.45, intensidadSol: 0.85, ambiente: '#9fb0e8', focos: '#22d3ee', ibl: 0.5 },
    niebla: { color: '#14102a', near: 30, far: 80 },
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
    estilo: 'neon',
    shell: { muroInt: '#caa78c', muroExt: '#2f5e3a', piso: '#7a5230', techo: '#5b4326' },
    luz: { sol: '#dceaff', ambiente: '#e8f0ff', focos: '#ffb066', ibl: 0.25 },
    niebla: { color: '#dce8f4', near: 36, far: 95 },
  },
]

/**
 * Personalización del usuario sobre un tema: cualquier campo del tema puede
 * sobreescribirse (solo se guardan los que difieren del default). Los objetos
 * anidados (shell/luz/niebla) se fusionan campo a campo.
 */
export interface TemaOverride {
  tinte?: string
  fuerza?: number
  roughness?: number
  metalness?: number
  emissive?: string
  emissiveIntensity?: number
  fondo?: string
  shell?: Partial<TemaShell>
  luz?: Partial<TemaLuz>
  niebla?: Partial<TemaNiebla>
  /** Estilo de render elegido para este tema (sobreescribe el sugerido). */
  estilo?: EstiloVisualId
  /** Postprocesado activado para este tema. */
  efectos?: boolean
  /** Ajuste fino de efectos (on/off + intensidad por efecto) de este tema. */
  efectosConfig?: EfectosConfig
}

/** Fusiona un tema base con la personalización del usuario (o lo devuelve tal cual). */
export function fusionarTema(base: Tema, ov: TemaOverride | undefined): Tema {
  if (!ov) return base
  const { shell, luz, niebla, ...rest } = ov
  const fusion: Tema = { ...base, ...rest, shell: { ...base.shell, ...shell } }
  if (base.luz || luz) fusion.luz = { ...base.luz, ...luz }
  if (base.niebla || niebla) fusion.niebla = { ...base.niebla, ...niebla } as TemaNiebla
  return fusion
}

/**
 * Registro de personalizaciones activas. Lo mantiene sincronizado `disenoStore`
 * (fuente de verdad + persistencia); así `getTema` devuelve el tema ya fusionado
 * en TODOS sus usos (escena, previews, cálculos) sin propagar el override a mano.
 */
let OVERRIDES: Partial<Record<TemaId, TemaOverride>> = {}
export function aplicarOverridesTema(ov: Partial<Record<TemaId, TemaOverride>>) {
  OVERRIDES = ov
}

export function getTema(id: TemaId | null | undefined): Tema | null {
  if (!id) return null
  const base = TEMAS.find((t) => t.id === id)
  if (!base) return null
  return fusionarTema(base, OVERRIDES[id])
}

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

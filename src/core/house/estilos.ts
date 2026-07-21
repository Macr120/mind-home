/**
 * Estilos de render del mapa 3D. Son ortogonales al tema de la casa: el tema
 * decide QUÉ colores/materiales tiene el contenido y el estilo decide CÓMO se
 * dibuja la escena (postprocesado y materiales). Se eligen en el editor,
 * pestaña Configuraciones.
 *
 * 'normal' = sin efecto de estilo; queda solo la base de acabado (oclusión
 * ambiental + bloom sutil + antialias) cuando los efectos están activos.
 */
export type EstiloVisualId = 'normal' | 'comic' | 'miniatura' | 'retro' | 'neon'

export interface EstiloVisual {
  id: EstiloVisualId
  nombre: string
  icon: string
  desc: string
}

export const ESTILOS: EstiloVisual[] = [
  { id: 'normal', nombre: 'Normal', icon: '🎨', desc: 'El look de siempre, con acabado pulido.' },
  { id: 'comic', nombre: 'Cómic', icon: '💥', desc: 'Luz en bandas y contornos de caricatura.' },
  { id: 'miniatura', nombre: 'Miniatura', icon: '🔬', desc: 'La casa como maqueta de juguete.' },
  { id: 'retro', nombre: 'Retro', icon: '👾', desc: 'Píxeles gordos, videojuego de los 90.' },
  { id: 'neon', nombre: 'Neón', icon: '🌟', desc: 'Luces y brillos que resplandecen.' },
]

/** Sanea un id leído de la DB (o de donde sea) a un estilo válido. */
export function getEstilo(id: string | null | undefined): EstiloVisualId {
  return ESTILOS.some((e) => e.id === id) ? (id as EstiloVisualId) : 'normal'
}

/* ------------------------------------------------------------------ *
 * Efectos individuales: el estilo es solo un ATAJO que rellena esta
 * config; el usuario la afina efecto por efecto (on/off + intensidad).
 * ------------------------------------------------------------------ */

export type EfectoId =
  | 'oclusion'
  | 'bloom'
  | 'contornos'
  | 'toon'
  | 'miniatura'
  | 'pixelado'
  | 'byn'
  | 'sepia'
  | 'vineta'
  | 'grano'

export interface EfectoDef {
  id: EfectoId
  nombre: string
  icon: string
  desc: string
  /** Intensidad por defecto (0..1) al activar el efecto. */
  valDefault: number
  /** El efecto es solo on/off (sin intensidad). */
  soloToggle?: boolean
}

/** Catálogo de efectos disponibles, en el orden en que se ofrecen en la UI. */
export const EFECTOS: EfectoDef[] = [
  { id: 'oclusion', nombre: 'Oclusión', icon: '🌑', desc: 'Sombra de contacto en rincones y bordes.', valDefault: 0.6 },
  { id: 'bloom', nombre: 'Brillo', icon: '✨', desc: 'Resplandor de luces y superficies brillantes.', valDefault: 0.35 },
  { id: 'contornos', nombre: 'Contornos', icon: '✏️', desc: 'Líneas de caricatura en las siluetas.', valDefault: 0.5 },
  { id: 'toon', nombre: 'Dibujo animado', icon: '🎨', desc: 'Luz en bandas planas (cel-shading).', valDefault: 0.7, soloToggle: true },
  { id: 'miniatura', nombre: 'Miniatura', icon: '🔬', desc: 'Desenfoque tilt-shift de maqueta.', valDefault: 0.5 },
  { id: 'pixelado', nombre: 'Pixelado', icon: '👾', desc: 'Píxeles gordos estilo retro.', valDefault: 0.35 },
  { id: 'byn', nombre: 'Blanco y negro', icon: '⚫', desc: 'Quita el color hacia escala de grises.', valDefault: 1 },
  { id: 'sepia', nombre: 'Sepia', icon: '🟤', desc: 'Tono cálido de foto antigua.', valDefault: 0.6 },
  { id: 'vineta', nombre: 'Viñeta', icon: '⭕', desc: 'Oscurece las esquinas.', valDefault: 0.5 },
  { id: 'grano', nombre: 'Grano', icon: '📺', desc: 'Ruido de película/TV analógica.', valDefault: 0.4 },
]

export interface EfectoEstado {
  on: boolean
  /** Intensidad 0..1 (se mapea al rango real de cada efecto en el render). */
  val: number
}

export type EfectosConfig = Partial<Record<EfectoId, EfectoEstado>>

/** Config de efectos que aplica cada estilo (atajo). Lo no listado queda apagado. */
export const PRESETS: Record<EstiloVisualId, EfectosConfig> = {
  normal: { oclusion: { on: true, val: 0.6 }, bloom: { on: true, val: 0.22 } },
  comic: { contornos: { on: true, val: 0.5 }, toon: { on: true, val: 0.7 } },
  miniatura: {
    oclusion: { on: true, val: 0.6 },
    miniatura: { on: true, val: 0.5 },
    vineta: { on: true, val: 0.55 },
  },
  retro: { pixelado: { on: true, val: 0.35 } },
  neon: { bloom: { on: true, val: 0.7 }, oclusion: { on: true, val: 0.5 } },
}

/** Config del estilo como copia nueva (para no mutar el PRESET compartido). */
export function configDeEstilo(id: EstiloVisualId): EfectosConfig {
  const preset = PRESETS[id] ?? PRESETS.normal
  const copia: EfectosConfig = {}
  for (const [k, v] of Object.entries(preset)) copia[k as EfectoId] = { ...v! }
  return copia
}

/** Estado efectivo de un efecto (on + intensidad), con sus defaults si no está en la config. */
export function estadoEfecto(config: EfectosConfig, id: EfectoId): EfectoEstado {
  const def = EFECTOS.find((e) => e.id === id)!
  return config[id] ?? { on: false, val: def.valDefault }
}

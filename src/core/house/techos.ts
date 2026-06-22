import type { TemaId } from './temas'
import { mezclar } from './temas'

/** Estilo global de losa de techo (`null` = color del cuarto). */
export type TechoTipoId =
  | 'plano_gris'
  | 'tejas_rojas'
  | 'tejas_oscuras'
  | 'metal'
  | 'paja'
  | 'losa_pizarra'
  | 'cristal'
  | 'teja_castillo'
  | 'panel_orbital'
  | 'lapida'
  | 'rosa_brillo'
  | 'madera_sol'
  | 'neon_techo'
  | 'nieve_techo'

export type TechoCategoria = 'generico' | 'tema'

export interface TechoTipo {
  id: TechoTipoId
  nombre: string
  emoji: string
  categoria: TechoCategoria
  color: string
  roughness: number
  metalness: number
  emissive?: string
  emissiveIntensity?: number
  /** Mezcla con el color del cuarto (0 = solo tipo, 1 = solo cuarto). */
  mezclaCuarto?: number
  tema?: TemaId
  /** Variante procedural en TechoLoseta. */
  variante: TechoTipoId
  /**
   * Prefijo de archivo de textura en `/textures/${textura}_color.jpg`.
   * Reutiliza imágenes de pisos donde el material es compatible.
   */
  textura?: string
  /** Tamaño de un tile en unidades de mundo para el repeat (por defecto 2). */
  tileSize?: number
}

export const TECHOS: TechoTipo[] = [
  {
    id: 'plano_gris',
    nombre: 'Plano gris',
    emoji: '⬜',
    categoria: 'generico',
    color: '#6b7280',
    roughness: 0.85,
    metalness: 0,
    mezclaCuarto: 0.35,
    variante: 'plano_gris',
  },
  {
    id: 'tejas_rojas',
    nombre: 'Tejas rojas',
    emoji: '🧱',
    categoria: 'generico',
    color: '#b45309',
    roughness: 0.9,
    metalness: 0,
    mezclaCuarto: 0.4,
    variante: 'tejas_rojas',
  },
  {
    id: 'tejas_oscuras',
    nombre: 'Tejas oscuras',
    emoji: '🏚️',
    categoria: 'generico',
    color: '#44403c',
    roughness: 0.92,
    metalness: 0,
    mezclaCuarto: 0.35,
    variante: 'tejas_oscuras',
  },
  {
    id: 'metal',
    nombre: 'Metal',
    emoji: '🔩',
    categoria: 'generico',
    color: '#64748b',
    roughness: 0.35,
    metalness: 0.75,
    mezclaCuarto: 0.25,
    variante: 'metal',
  },
  {
    id: 'paja',
    nombre: 'Paja',
    emoji: '🌾',
    categoria: 'generico',
    color: '#ca8a04',
    roughness: 0.95,
    metalness: 0,
    mezclaCuarto: 0.45,
    variante: 'paja',
    textura: 'floors/arena',
    tileSize: 2,
  },
  {
    id: 'losa_pizarra',
    nombre: 'Losa pizarra',
    emoji: '🪨',
    categoria: 'generico',
    color: '#334155',
    roughness: 0.7,
    metalness: 0.08,
    mezclaCuarto: 0.3,
    variante: 'losa_pizarra',
    textura: 'floors/cemento',
    tileSize: 2,
  },
  {
    id: 'cristal',
    nombre: 'Cristal',
    emoji: '💎',
    categoria: 'generico',
    color: '#7dd3fc',
    roughness: 0.1,
    metalness: 0.2,
    emissive: '#0ea5e9',
    emissiveIntensity: 0.12,
    mezclaCuarto: 0.2,
    variante: 'cristal',
  },
  {
    id: 'teja_castillo',
    nombre: 'Castillo',
    emoji: '🏰',
    categoria: 'tema',
    color: '#5b4326',
    roughness: 0.92,
    metalness: 0,
    tema: 'medieval',
    mezclaCuarto: 0.5,
    variante: 'teja_castillo',
    textura: 'floors/adoquin',
    tileSize: 2,
  },
  {
    id: 'panel_orbital',
    nombre: 'Panel orbital',
    emoji: '🛸',
    categoria: 'tema',
    color: '#1e293b',
    roughness: 0.3,
    metalness: 0.6,
    emissive: '#22d3ee',
    emissiveIntensity: 0.35,
    tema: 'espacio',
    mezclaCuarto: 0.2,
    variante: 'panel_orbital',
  },
  {
    id: 'lapida',
    nombre: 'Lápida',
    emoji: '🪦',
    categoria: 'tema',
    color: '#292524',
    roughness: 0.95,
    metalness: 0,
    emissive: '#581c87',
    emissiveIntensity: 0.08,
    tema: 'terror',
    mezclaCuarto: 0.35,
    variante: 'lapida',
  },
  {
    id: 'rosa_brillo',
    nombre: 'Rosa brillante',
    emoji: '💖',
    categoria: 'tema',
    color: '#ff7ab8',
    roughness: 0.15,
    metalness: 0.1,
    emissive: '#ff5fa2',
    emissiveIntensity: 0.2,
    tema: 'barbie',
    mezclaCuarto: 0.45,
    variante: 'rosa_brillo',
  },
  {
    id: 'madera_sol',
    nombre: 'Madera al sol',
    emoji: '🤠',
    categoria: 'tema',
    color: '#92400e',
    roughness: 0.8,
    metalness: 0,
    tema: 'vaquero',
    mezclaCuarto: 0.4,
    variante: 'madera_sol',
    textura: 'floors/madera',
    tileSize: 2,
  },
  {
    id: 'neon_techo',
    nombre: 'Neón',
    emoji: '🌃',
    categoria: 'tema',
    color: '#0f0a1a',
    roughness: 0.4,
    metalness: 0.5,
    emissive: '#d946ef',
    emissiveIntensity: 0.4,
    tema: 'cyberpunk',
    mezclaCuarto: 0.15,
    variante: 'neon_techo',
  },
  {
    id: 'nieve_techo',
    nombre: 'Nieve',
    emoji: '❄️',
    categoria: 'tema',
    color: '#e8f4fc',
    roughness: 0.55,
    metalness: 0,
    emissive: '#bae6fd',
    emissiveIntensity: 0.06,
    tema: 'navidad',
    mezclaCuarto: 0.25,
    variante: 'nieve_techo',
    textura: 'floors/nieve',
    tileSize: 2.5,
  },
]

export const TECHOS_GENERICOS = TECHOS.filter((t) => t.categoria === 'generico')
export const TECHOS_TEMA = TECHOS.filter((t) => t.categoria === 'tema')

export const getTechoTipo = (id: TechoTipoId | null | undefined) =>
  id ? TECHOS.find((t) => t.id === id) ?? null : null

/** Color final de la losa mezclando estilo global y color del cuarto. */
export function colorTechoLoseta(
  tipo: TechoTipoId | null,
  colorCuarto: string,
): { color: string; roughness: number; metalness: number; emissive: string; emissiveIntensity: number } {
  const conf = getTechoTipo(tipo)
  if (!conf) {
    return {
      color: colorCuarto,
      roughness: 0.75,
      metalness: 0,
      emissive: '#000000',
      emissiveIntensity: 0,
    }
  }
  const t = conf.mezclaCuarto ?? 0.4
  return {
    color: mezclar(colorCuarto, conf.color, t),
    roughness: conf.roughness,
    metalness: conf.metalness,
    emissive: conf.emissive ?? '#000000',
    emissiveIntensity: conf.emissiveIntensity ?? 0,
  }
}

const TECHO_POR_TEMA: Record<TemaId, TechoTipoId> = {
  medieval: 'teja_castillo',
  espacio: 'panel_orbital',
  terror: 'lapida',
  barbie: 'rosa_brillo',
  vaquero: 'madera_sol',
  cyberpunk: 'neon_techo',
  navidad: 'nieve_techo',
}

export function techoSugeridoPorTema(tema: TemaId | null): TechoTipoId | null {
  if (!tema) return null
  return TECHO_POR_TEMA[tema]
}

// ── Forma del techo (por cuarto) ──────────────────────────────────────────────
/** Forma geométrica del techo de un cuarto (el material/tipo es independiente). */
export type TechoFormaId = 'plano' | 'dos_aguas' | 'abovedado' | 'cupula'

export const TECHO_FORMAS: { id: TechoFormaId; nombre: string; emoji: string }[] = [
  { id: 'plano', nombre: 'Plano', emoji: '⬛' },
  { id: 'dos_aguas', nombre: 'Aguas', emoji: '🏠' },
  { id: 'abovedado', nombre: 'Abovedado', emoji: '🛢️' },
  { id: 'cupula', nombre: 'Cúpula', emoji: '🕌' },
]

/**
 * Parámetros editables de la forma del techo (las formas son plantillas base que
 * el usuario ajusta). No todos aplican a cada forma:
 * - altura: multiplicador de altura (aguas, abovedado, cúpula)
 * - aguas: nº de faldones (1 = inclinado, 2 = dos aguas, 4 = pabellón) — forma 'dos_aguas'
 * - curva: fracción de arco (abovedado: rebajado ↔ semicircular)
 * - inclinacion: pendiente del techo 'plano' (0 = plano)
 * - dir: orientación (0–3): eje del caballete o lado alto
 */
export interface TechoParams {
  altura: number
  aguas: number
  curva: number
  inclinacion: number
  dir: number
}

export const TECHO_PARAMS_DEFAULT: TechoParams = {
  altura: 1,
  aguas: 2,
  curva: 1,
  inclinacion: 0,
  dir: 0,
}

// ── Forma del techo POR CELDA ─────────────────────────────────────────────────
/** Forma + parámetros de techo de UNA celda (fabricación por rejilla). */
export interface TechoCeldaForma {
  forma: TechoFormaId
  params: TechoParams
}

/** Opción de techo elegible para una celda (preset base que el usuario rota/ajusta). */
export interface TechoCeldaPreset {
  id: string
  nombre: string
  emoji: string
  forma: TechoFormaId
  params: Partial<TechoParams>
  /** true si la orientación (dir) cambia su aspecto (se puede girar). */
  gira?: boolean
}

/** Opciones de techo para una celda CUADRADA. */
export const TECHO_CELDA_PRESETS_CUADRADO: TechoCeldaPreset[] = [
  { id: 'plano', nombre: 'Plano', emoji: '⬛', forma: 'plano', params: { inclinacion: 0 } },
  { id: 'una_agua', nombre: '1 agua', emoji: '🛖', forma: 'dos_aguas', params: { aguas: 1 }, gira: true },
  { id: 'dos_aguas', nombre: '2 aguas', emoji: '🏠', forma: 'dos_aguas', params: { aguas: 2 }, gira: true },
  { id: 'piramidal', nombre: 'Pirámide', emoji: '🔺', forma: 'dos_aguas', params: { aguas: 4 } },
  { id: 'abovedado', nombre: 'Bóveda', emoji: '🛢️', forma: 'abovedado', params: {}, gira: true },
  { id: 'cupula', nombre: 'Cúpula', emoji: '🕌', forma: 'cupula', params: {} },
]

/** Opciones de techo para una celda TRIANGULAR. */
export const TECHO_CELDA_PRESETS_TRIANGULO: TechoCeldaPreset[] = [
  { id: 'plano', nombre: 'Plano', emoji: '⬛', forma: 'plano', params: { inclinacion: 0 } },
  { id: 'pico', nombre: 'Pico', emoji: '⛺', forma: 'cupula', params: {} },
  { id: 'una_agua', nombre: '1 agua', emoji: '🛖', forma: 'dos_aguas', params: { aguas: 1 }, gira: true },
]

/** Opciones de techo para una celda CIRCULAR (cuarto de círculo). */
export const TECHO_CELDA_PRESETS_CIRCULO: TechoCeldaPreset[] = [
  { id: 'plano', nombre: 'Plano', emoji: '⬛', forma: 'plano', params: { inclinacion: 0 } },
  { id: 'cono', nombre: 'Cono', emoji: '🔻', forma: 'cupula', params: {} },
]

/** Presets de techo válidos para la forma de piso de una celda. */
export function presetsTechoCelda(
  forma: 'cuadrado' | 'triangular' | 'circular' | undefined,
): TechoCeldaPreset[] {
  if (forma === 'triangular') return TECHO_CELDA_PRESETS_TRIANGULO
  if (forma === 'circular') return TECHO_CELDA_PRESETS_CIRCULO
  return TECHO_CELDA_PRESETS_CUADRADO
}

/** Construye la forma de celda a partir de un preset y una dirección (0–3). */
export function celdaFormaDePreset(preset: TechoCeldaPreset, dir = 0): TechoCeldaForma {
  return { forma: preset.forma, params: { ...TECHO_PARAMS_DEFAULT, ...preset.params, dir } }
}

/** Preset (de la lista dada) que corresponde a una forma de celda, para resaltar el activo. */
export function presetDeCeldaForma(
  cf: TechoCeldaForma | undefined,
  presets: TechoCeldaPreset[] = TECHO_CELDA_PRESETS_CUADRADO,
): TechoCeldaPreset {
  if (!cf) return presets[0]
  const m = presets.find(
    (p) =>
      p.forma === cf.forma &&
      (cf.forma !== 'dos_aguas' || (p.params.aguas ?? 2) === (cf.params.aguas ?? 2)),
  )
  return m ?? presets[0]
}

/** Siguiente forma de techo al tocar una celda: gira las direccionales, luego avanza. */
export function siguienteTechoCelda(
  cf: TechoCeldaForma | undefined,
  presets: TechoCeldaPreset[],
): TechoCeldaForma | null {
  const actual = presetDeCeldaForma(cf, presets)
  const idx = presets.findIndex((p) => p.id === actual.id)
  if (cf && actual.gira && (cf.params.dir ?? 0) < 3) {
    return { forma: cf.forma, params: { ...cf.params, dir: (cf.params.dir ?? 0) + 1 } }
  }
  const next = presets[(idx + 1) % presets.length]
  return next.id === 'plano' ? null : celdaFormaDePreset(next, 0)
}

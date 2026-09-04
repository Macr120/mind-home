/** Color de la app (naranja pintura). */
export const COLOR_FABRICA = '#fb923c'
/**
 * Con el que se pinta la app: el color del CUARTO abierto (lo baja `RoomOverlay`
 * en `--ui-app`) y, fuera de él, el de fábrica.
 */
export const COLOR = `var(--ui-app, ${COLOR_FABRICA})`

/** Presets de lienzo (px reales; tope 1280 en el lado mayor, como `comprimirFoto`). */
export const PRESETS_LIENZO = [
  { id: '1:1', ancho: 1024, alto: 1024 },
  { id: '4:3', ancho: 1152, alto: 864 },
  { id: '16:9', ancho: 1280, alto: 720 },
  { id: '3:4', ancho: 864, alto: 1152 },
] as const

/**
 * Pila de deshacer/rehacer en `ImageData` (a 1280×720 son ~3.7 MB por
 * snapshot): 10 pasos ≈ 37 MB, asumible con el precedente del grafiti (12).
 * Con capas se guarda SOLO la capa tocada, así que el techo no cambia.
 */
export const MAX_DESHACER = 10

/** Tope de capas: 6 × 1280×720×4 bytes ≈ 22 MB de canvases, asumible en móvil. */
export const MAX_CAPAS = 6

/** Paso de la rejilla de apoyo (px del bitmap). */
export const REJILLA_PASO = 64

/** Paleta fija (la misma docena del grafiti). */
export const PALETA = [
  '#ffffff', '#111827', '#e11d48', '#f97316', '#facc15', '#22c55e',
  '#14b8a6', '#0ea5e9', '#3b82f6', '#8b5cf6', '#ec4899', '#92400e',
]

export const GROSORES = [4, 10, 22]

/** Lado mayor de una foto importada (mismo tope que `comprimirFoto`). */
export const LADO_MAX_FOTO = 1280

/** Zoom del lienzo (rueda o pellizco). */
export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 6

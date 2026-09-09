import type { FiltroEscena, FuenteTexto, PistaId } from '../../core/data/db'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/** Color de la app (rojo cine). */
export const COLOR_FABRICA = '#f87171'
/**
 * Con el que se pinta la app: el color del CUARTO abierto (lo baja `RoomOverlay`
 * en `--ui-app`) y, fuera de él, el de fábrica.
 */
export const COLOR = `var(--ui-app, ${COLOR_FABRICA})`

/** Fundido por negro (entrada/salida de una escena marcada como 'fundido'). */
export const DUR_FUNDIDO = 0.4
export const MIN_ESCENA = 0.5
export const MAX_ESCENA = 60
export const MAX_ESCENAS_IA = 12
/** Importación de medios: aviso y tope duro (MB). */
export const AVISO_MB = 100
export const TOPE_MB = 300
export const FPS_EXPORT = 30
export const BITRATE_AUDIO = 128_000
/** Aviso previo si el export durará más de esto (s): render en tiempo real. */
export const AVISO_DURACION_EXPORT = 600

/**
 * Calidad del export: resolución del lienzo y bitrate, el mismo con
 * MediaRecorder y con WebCodecs.
 *
 * Subir de 720p vale la pena porque el render es INDEPENDIENTE de la
 * resolución: los tamaños de texto, avatar y PIP son fracciones de la altura o
 * la anchura (`TAMANOS_*`) y los encuadres van normalizados 0-1, así que un
 * lienzo mayor da nitidez de verdad, no un reescalado. Lo que NO gana detalle
 * es el material que trajo el usuario: un video de móvil a 720p sigue siendo
 * 720p por mucho que el lienzo sea 4K.
 *
 * El bitrate sube con los píxeles (referencia de YouTube para SDR a 30 fps):
 * dejarlo en 6 Mbps haría que 2160p se viera PEOR que 720p bien codificado.
 */
export type CalidadVideo = '720p' | '1080p' | '1440p' | '2160p'

/** HD por defecto: el salto que más se nota y aún pesa poco. */
export const CALIDAD_DEFECTO: CalidadVideo = '1080p'

export const CALIDADES: Record<CalidadVideo, { largo: number; corto: number; bitrate: number }> = {
  '720p': { largo: 1280, corto: 720, bitrate: 6_000_000 },
  '1080p': { largo: 1920, corto: 1080, bitrate: 8_000_000 },
  '1440p': { largo: 2560, corto: 1440, bitrate: 16_000_000 },
  '2160p': { largo: 3840, corto: 2160, bitrate: 45_000_000 },
}

/** Rótulos del selector. NO se traducen: «HD», «2K» y «4K» son iguales en los 16 idiomas. */
export const ETIQUETA_CALIDAD: Record<CalidadVideo, string> = {
  '720p': '720p',
  '1080p': 'HD · 1080p',
  '1440p': '2K · 1440p',
  '2160p': '4K · 2160p',
}

/** El lienzo: el lado largo va donde lo pida el aspecto. */
export function resolucionDe(aspecto: '16:9' | '9:16', calidad: CalidadVideo = CALIDAD_DEFECTO): { ancho: number; alto: number } {
  const { largo, corto } = CALIDADES[calidad] ?? CALIDADES[CALIDAD_DEFECTO]
  return aspecto === '16:9' ? { ancho: largo, alto: corto } : { ancho: corto, alto: largo }
}

/**
 * Filtros → cadena de `ctx.filter`. Con feature-detect: si el contexto no trae
 * `filter` (WKWebView viejas), el filtro simplemente se omite.
 */
export const FILTROS: Record<FiltroEscena, string> = {
  ninguno: 'none',
  bn: 'grayscale(1)',
  sepia: 'sepia(0.8)',
  calido: 'saturate(1.25) sepia(0.25)',
  frio: 'saturate(1.1) hue-rotate(15deg)',
  oscuro: 'brightness(0.7) contrast(1.1)',
}

/** Tamaño del texto como fracción del alto del lienzo. */
export const TAMANOS_TEXTO: Record<'S' | 'M' | 'L', number> = { S: 0.05, M: 0.08, L: 0.12 }

/**
 * Familias del título: del sistema (sin fuentes empaquetadas). `sans` es
 * EXACTAMENTE la cadena de siempre: los proyectos sin tipografía elegida se
 * pintan igual que antes.
 */
export const FUENTES_TEXTO: Record<FuenteTexto, string> = {
  sans: 'system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, Menlo, Consolas, monospace',
  display: 'Impact, "Arial Black", "Helvetica Neue", sans-serif',
}
/** Entrada del título (fundido/subir) y fundido de salida cuando tiene `hasta`. */
export const DUR_ANIM_TEXTO = 0.5
export const DUR_SALIDA_TEXTO = 0.3
/** Máquina de escribir: segundos por carácter (25 por segundo). */
export const SEG_POR_CARACTER_MAQUINA = 0.04

/** Efectos de sonido por escena. */
export const MAX_SONIDOS_ESCENA = 8

// ─── Timeline multipista (formato 2) ─────────────────────────────────────────

/** Transiciones de dos frames (disolver, deslizar…); el fundido por negro sigue con DUR_FUNDIDO. */
export const DUR_TRANSICION = 0.5
export const DURACIONES_TRANSICION = [0.3, 0.5, 1] as const
export const MIN_CLIP = 0.2
export const MAX_CLIPS_PRINCIPAL = 40
export const MAX_CLIPS = 240
export const ENVOLVENTE_HZ = 20
/** Deriva tolerada entre el reloj del motor y `currentTime` antes de re-seekar (el seek es caro en WebView). */
export const UMBRAL_DERIVA = 0.25
/** Segundos de antelación con los que se instancia el `<audio>` de un clip. */
export const PRECALENTAR_S = 2
export const IMAN_PX = 8
/** Orden visual de arriba abajo: espejo del compositing (lo de arriba tapa a lo de abajo) y el audio debajo. */
export const ORDEN_PISTAS: PistaId[] = ['texto', 'imagen', 'avatar', 'video', 'fondo', 'voz', 'musica', 'sfx']
export const PISTAS: Record<PistaId, { icono: NombreIcono; color: string; audio: boolean }> = {
  texto: { icono: 'letra', color: '#facc15', audio: false },
  imagen: { icono: 'foto', color: '#38bdf8', audio: false },
  avatar: { icono: 'persona', color: '#c084fc', audio: true },
  video: { icono: 'pelicula', color: COLOR_FABRICA, audio: true },
  fondo: { icono: 'imagen', color: '#94a3b8', audio: false },
  voz: { icono: 'microfono', color: '#2dd4bf', audio: true },
  musica: { icono: 'musica', color: '#f472b6', audio: true },
  sfx: { icono: 'bocina', color: '#fb923c', audio: true },
}
/** Niveles de zoom: px por segundo, cada cuántos segundos va una etiqueta y cada cuántos un tick. */
export const NIVELES_ZOOM_VIDEO = [
  { pxPorSeg: 4, etiqueta: 60, tick: 10 },
  { pxPorSeg: 8, etiqueta: 30, tick: 5 },
  { pxPorSeg: 14, etiqueta: 10, tick: 2 },
  { pxPorSeg: 24, etiqueta: 5, tick: 1 },
  { pxPorSeg: 40, etiqueta: 2, tick: 0.5 },
  { pxPorSeg: 80, etiqueta: 1, tick: 0.5 },
] as const
export const NIVEL_ZOOM_DEFECTO = 2
export const ALTO_REGLA = 24
export const ALTO_PISTA = 36
export const ALTO_PISTA_VIDEO = 56
export const ANCHO_CABECERA = 44
/** Aire a la derecha del final del video (s). */
export const COLA_SEG = 10
export const MAX_ETIQUETAS_REGLA = 400
/** Alto del visor (px) guardado por el usuario; ausente = ALTO_PREVIEW_FRACCION del cuerpo. */
export const LS_ALTO_PREVIEW = 'mh.video.altoPreview'
/** Igual que la variante `amplio:` de index.css (columnas laterales del editor): si cambia una, cambia la otra. */
export const MEDIA_AMPLIO = '(min-width: 48rem) and (min-height: 34rem)'
/** Por debajo de este ancho el panel de medios arranca plegado (si no hay preferencia guardada). */
export const MEDIA_LATERALES_ANCHOS = '(min-width: 64rem)'
export const LS_PANEL_MEDIOS = 'mh.video.panelMedios'
export const LS_PANEL_CLIP = 'mh.video.panelClip'
export const ALTO_PREVIEW_PLIEGUE = 48
export const ALTO_PREVIEW_FRACCION = 0.4
/** Lo que la timeline necesita como mínimo: barra + regla + pista principal + una pista + divisor. */
export const RESERVA_TIMELINE = 44 + 24 + 56 + 36 + 12
/** Lado del avatar como fracción del alto del lienzo. */
export const TAMANOS_AVATAR: Record<'S' | 'M' | 'L', number> = { S: 0.22, M: 0.32, L: 0.45 }
export const MARGEN_AVATAR = 0.03
export const DUR_FUNDIDO_AVATAR = 0.25
export const MAX_AVATARES_SIMULTANEOS = 2
/** Tamaños de la imagen superpuesta como fracción del ANCHO del lienzo. */
export const TAMANOS_PIP: Record<'S' | 'M' | 'L', number> = { S: 0.22, M: 0.32, L: 0.45 }
/** Duraciones por defecto de los clips nuevos (s). */
export const DUR_DEFECTO = { imagen: 4, color: 4, texto: 3, voz: 3, avatar: 4, pip: 4, fondo: 4, plano: 5, personaje: 4 } as const

// ─── Modo película (animación 3D en el mapa) ─────────────────────────────────

/** Alto de la zona del mapa (px) guardado por el usuario en el modo película; aparte del visor normal. */
export const LS_ALTO_PELICULA = 'mh.video.altoPelicula'
export const ALTO_PELICULA_FRACCION = 0.55
/** Se graba la pantalla entera: la composición toma su aspecto, con el lado mayor a este tamaño. */
export const LADO_MAX_PELICULA = 1280
/** El `sm` de Tailwind: por debajo, la timeline va encima de los controles de las esquinas (no cabe entre ellos). */
export const MEDIA_ANCHO_SM = '(min-width: 40rem)'

let correlativoClip = 0
/** Id de clip (identidad al mover, dividir y del `<audio>` propio en el pool). */
export const nuevoClipId = () => `clp-${Date.now().toString(36)}-${(correlativoClip++).toString(36)}`

/** Narradores por proyecto (voces con o sin personaje). */
export const MAX_NARRADORES = 4
let correlativoNarrador = 0
export const nuevoNarradorId = () => `nar-${Date.now().toString(36)}-${(correlativoNarrador++).toString(36)}`

/** Paleta del texto y de los fondos de color. */
export const PALETA_VIDEO = [
  '#ffffff', '#0f1115', '#f87171', '#fb923c', '#facc15', '#4ade80',
  '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#94a3b8',
]

let correlativo = 0
/** Id estable de escena (identidad al reordenar y ancla de su narración). */
export const nuevaEscenaId = () => `esc-${Date.now().toString(36)}-${(correlativo++).toString(36)}`

// ─── Guion de la obra (estudio de cine) ─────────────────────────────────────
/** «Quién» de una línea en off en el guion de la obra (no es un id de actor). */
export const EN_OFF = 'narrador'
/** Líneas que la IA escribe como máximo para una obra. */
export const MAX_LINEAS_OBRA = 24

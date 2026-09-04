import type { EfectosPista, InstrumentoAudio, SintePista } from '../../core/data/db'

/** Color de la app (fucsia neón de estudio). */
export const COLOR_FABRICA = '#e879f9'
/**
 * Con el que se pinta la app: el color del CUARTO abierto (lo baja `RoomOverlay`
 * en `--ui-app`) y, fuera de él, el de fábrica.
 */
export const COLOR = `var(--ui-app, ${COLOR_FABRICA})`

/** Rejilla: 16 pasos de semicorchea por compás de 4/4 (fijo en v1). */
export const PASOS_POR_COMPAS = 16

export const MAX_PISTAS = 8
// 64 desde que las canciones de Aprender son proyectos (un .mid real rebasa 32).
export const MAX_COMPASES = 64
export const MAX_NOTAS_PISTA = 1024
/** Voces simultáneas tocando en vivo (teclado/MIDI); al superarlas se roba la más vieja. */
export const MAX_VOCES_VIVAS = 16
/** Tope de notas que el scheduler agenda en un mismo paso (defensa ante datos rotos). */
export const MAX_NOTAS_POR_PASO = 24
export const BPM_MIN = 40
export const BPM_MAX = 240
/** Rango del piano roll (C2..C7; MIDI acepta 21..108 pero la vista vive aquí). */
export const TONO_BAJO = 36
export const TONO_ALTO = 96

/**
 * Mapa fijo de la batería (el resto de tonos no suena en esa pista). El orden
 * es el de los pads y el de las filas del secuenciador (de abajo hacia arriba).
 */
export const TONOS_BATERIA = [36, 38, 42, 46, 39, 41, 48, 49] as const

/** Afinación de las cuerdas (grave→aguda) de los instrumentos con TABLATURA. */
export const CUERDAS_TAB: Partial<Record<InstrumentoAudio, number[]>> = {
  guitarra: [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
  bajo: [28, 33, 38, 43], // E1 A1 D2 G2
}

/** ¿El instrumento es un kit de batería? (pads, sin acordes/arpegio/escala). */
export const esInstrumentoBateria = (i: InstrumentoAudio): i is 'bateria' | 'bateria808' =>
  i === 'bateria' || i === 'bateria808'

/**
 * Familias del selector de la pista (el orden es el de la UI). La pista elige
 * la FAMILIA y la variante se elige en el panel del sinte; al cambiar de
 * familia la pista cae en la primera variante.
 */
export const CARPETAS_INSTRUMENTOS: {
  clave: 'teclados' | 'cuerdas' | 'vientos' | 'baterias' | 'voz'
  instrumentos: InstrumentoAudio[]
}[] = [
  { clave: 'teclados', instrumentos: ['piano', 'organo', 'campanas', 'pad', 'lead'] },
  { clave: 'cuerdas', instrumentos: ['guitarra', 'bajo', 'arpa', 'violines', 'pluck'] },
  { clave: 'vientos', instrumentos: ['flauta', 'trompeta', 'sax'] },
  { clave: 'baterias', instrumentos: ['bateria', 'bateria808'] },
  { clave: 'voz', instrumentos: ['voz', 'coro'] },
]

export type FamiliaInstrumento = (typeof CARPETAS_INSTRUMENTOS)[number]['clave']

export const familiaDe = (instr: InstrumentoAudio): FamiliaInstrumento =>
  CARPETAS_INSTRUMENTOS.find((c) => c.instrumentos.includes(instr))?.clave ?? 'teclados'

/** Color por índice de pista (la activa opaca, las demás fantasma). */
export const PALETA_PISTAS = ['#e879f9', '#38bdf8', '#4ade80', '#facc15', '#fb7185', '#a78bfa', '#2dd4bf', '#fb923c']

/**
 * Alturas del timeline en px. Las comparten el canvas (regla + un carril por
 * pista) y la columna de cabeceras de `Pistas`: si no coinciden, las filas de
 * la izquierda dejan de alinearse con los carriles dibujados a la derecha.
 */
export const ALTO_REGLA = 22
export const ALTO_CARRIL = 32

export const segPorPaso = (bpm: number) => 60 / bpm / 4

/** Efectos apagados (pista sin campo `efectos`). */
export const FX_DEFAULT: EfectosPista = { reverb: 0, delay: 0, chorus: 0, dist: 0 }

/** Volumen del bus maestro cuando el proyecto no trae `volumenMaestro`. */
export const MAESTRO_DEFAULT = 0.9

/** Rangos de los knobs de síntesis (defaults reales: la receta del instrumento). */
export const RANGO_SINTE: Record<keyof SintePista, { min: number; max: number }> = {
  ataque: { min: 0.001, max: 1 },
  liberacion: { min: 0.02, max: 2 },
  filtroHz: { min: 120, max: 8000 },
  resonancia: { min: 0, max: 12 },
  glide: { min: 0, max: 0.4 },
  vibrato: { min: 0, max: 1 },
}

let correlativo = 0
/** Id estable de pista dentro del proyecto (identidad entre dispositivos). */
export const nuevaPistaId = () => `pa-${Date.now().toString(36)}-${(correlativo++).toString(36)}`
export const nuevoClipId = () => `ca-${Date.now().toString(36)}-${(correlativo++).toString(36)}`

// Clips de micrófono (pistas `tipo: 'audio'`). El tope de segundos acota la
// memoria del `decodeAudioData` en móvil (~11 MB por minuto mono a 48 kHz).
export const MAX_SEG_CLIP = 180
export const MAX_CLIPS_POR_PISTA = 8

// Topes de la IA (se aplican en código, no solo en el prompt)
export const MAX_NOTAS_IA = 64
export const MAX_COMPASES_IA = 4

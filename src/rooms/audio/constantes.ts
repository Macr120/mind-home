import type { EfectosPista, InstrumentoAudio, SintePista } from '../../core/data/db'

/** Color de la app (fucsia neón de estudio). */
export const COLOR_FABRICA = '#e879f9'
/**
 * Con el que se pinta la app: el color del CUARTO abierto (lo baja `RoomOverlay`
 * en `--ui-app`) y, fuera de él, el de fábrica.
 */
export const COLOR = `var(--ui-app, ${COLOR_FABRICA})`

/**
 * Rejilla: un paso = una semicorchea; un compás de 4/4 son 16. Las notas se
 * guardan en pasos absolutos, así que el compás del proyecto (`compas`) solo
 * decide dónde caen las barras, la numeración y el metrónomo: lo que se genera
 * (IA, ejemplos, vibes) sigue en 4/4 y usa esta constante.
 */
export const PASOS_POR_COMPAS = 16

/** Compases que ofrece el editor: simples en x/4, compuestos (6/8, 9/8, 12/8) e irregulares (5/4, 7/8). */
export const COMPASES_TIEMPO = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8'] as const

const partesCompas = (c?: string): [number, number] => {
  if (!c || !(COMPASES_TIEMPO as readonly string[]).includes(c)) return [4, 4]
  const [n, d] = c.split('/').map(Number)
  return [n, d]
}

/** Semicorcheas por compás del proyecto (4/4 = 16, 3/4 = 12, 6/8 = 12, 7/8 = 14, 12/8 = 24…). */
export function pasosCompas(p?: { compas?: string } | null): number {
  const [n, d] = partesCompas(p?.compas)
  return n * (16 / d)
}

/**
 * Cada cuántos pasos marca el metrónomo: la negra en x/4, la negra con
 * puntillo en los compuestos (6/8, 9/8, 12/8) y la corchea en 7/8.
 */
export function pasosPulso(p?: { compas?: string } | null): number {
  const [n, d] = partesCompas(p?.compas)
  if (d === 4) return 4
  return n % 3 === 0 ? 6 : 2
}

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

/** Ritmos de fábrica de UN compás: [paso, tono, velocidad] (se repiten al aplicar). */
export const PATRONES_BATERIA: { clave: string; golpes: [number, number, number][] }[] = [
  {
    clave: 'rock',
    golpes: [
      [0, 36, 110], [8, 36, 110], [4, 38, 105], [12, 38, 105],
      [0, 42, 70], [2, 42, 70], [4, 42, 70], [6, 42, 70],
      [8, 42, 70], [10, 42, 70], [12, 42, 70], [14, 42, 70],
    ],
  },
  {
    clave: 'house',
    golpes: [
      [0, 36, 110], [4, 36, 110], [8, 36, 110], [12, 36, 110],
      [2, 46, 80], [6, 46, 80], [10, 46, 80], [14, 46, 80],
      [4, 39, 95], [12, 39, 95],
    ],
  },
  {
    clave: 'trap',
    golpes: [
      [0, 36, 110], [7, 36, 105], [10, 36, 110], [8, 38, 105],
      ...Array.from({ length: 16 }, (_, p) => [p, 42, 65] as [number, number, number]),
    ],
  },
  {
    clave: 'dembow',
    golpes: [
      [0, 36, 110], [4, 36, 110], [8, 36, 110], [12, 36, 110],
      [3, 38, 100], [6, 38, 100], [11, 38, 100], [14, 38, 100],
    ],
  },
  {
    // Boom bap con poco ataque (pide swing).
    clave: 'lofi',
    golpes: [
      [0, 36, 100], [7, 36, 85], [10, 36, 95], [4, 38, 90], [12, 38, 90],
      ...[0, 2, 4, 6, 8, 10, 12, 14].map((p) => [p, 42, 50] as [number, number, number]),
    ],
  },
  {
    // One drop: bombo y caja juntos en el 3, platos a contratiempo.
    clave: 'reggae',
    golpes: [
      [8, 36, 105], [8, 38, 85],
      ...[2, 6, 10, 14].map((p) => [p, 42, 70] as [number, number, number]),
      ...[0, 4, 12].map((p) => [p, 42, 40] as [number, number, number]),
    ],
  },
  {
    // Bombo de bossa y clave suave en la caja.
    clave: 'bossa',
    golpes: [
      [0, 36, 90], [6, 36, 70], [8, 36, 90], [14, 36, 70],
      [0, 38, 50], [3, 38, 50], [6, 38, 50], [10, 38, 50], [12, 38, 50],
      ...[0, 2, 4, 6, 8, 10, 12, 14].map((p) => [p, 42, 40] as [number, number, number]),
    ],
  },
  {
    clave: 'funk',
    golpes: [
      [0, 36, 110], [6, 36, 95], [10, 36, 100], [4, 38, 105], [12, 38, 105],
      [7, 38, 40], [9, 38, 40], [15, 38, 45],
      ...Array.from({ length: 16 }, (_, p) => [p, 42, p % 2 ? 45 : 70] as [number, number, number]),
    ],
  },
  {
    clave: 'disco',
    golpes: [
      [0, 36, 110], [4, 36, 110], [8, 36, 110], [12, 36, 110], [4, 39, 95], [12, 39, 95],
      ...[2, 6, 10, 14].map((p) => [p, 46, 80] as [number, number, number]),
      ...[0, 4, 8, 12].map((p) => [p, 42, 55] as [number, number, number]),
    ],
  },
  {
    // Medio tiempo: la caja cae en el 3.
    clave: 'balada',
    golpes: [
      [0, 36, 100], [10, 36, 85], [8, 38, 95],
      ...[0, 2, 4, 6, 8, 10, 12, 14].map((p) => [p, 42, 50] as [number, number, number]),
    ],
  },
]

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

import type { PartidaEjercicio, RepasoIdioma, RetoEjercicio } from '../../core/data/db'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import type { ModoEjercicio } from './ejercicios'

/**
 * La capa de juego de los ejercicios: puntos con combo, medallas, vidas,
 * contrarreloj y misiones del día. Todo puro y sin efectos, para que la UI solo
 * pinte y el SRS no se entere de nada (ver la regla de abajo).
 *
 * REGLA DURA — el juego NO toca el SRS: un acierto o un fallo elegido por ti
 * programan la caja como siempre, pero que se te acabe el tiempo o la última
 * vida NO escribe nada. Que el reloj te gane no es «no sabérsela», y castigar
 * la caja por presión de tiempo corrompería los intervalos de repaso.
 */

export const PUNTOS_BASE = 10
export const VIDAS_INICIALES = 3
export const SEGUNDOS_CONTRARRELOJ = 60
/** Bajo este tiempo por respuesta hay bonus de rapidez (solo contrarreloj). */
const MS_RAPIDO = 4000
/** Preguntas por ronda en el modo libre (los otros retos son abiertos). */
export const PREGUNTAS_RONDA = 10
/** Lote que se pide al generador en los retos abiertos. */
export const LOTE_ABIERTO = 50

export const RETOS: { id: RetoEjercicio; labelEs: string; icono: NombreIcono }[] = [
  { id: 'libre', labelEs: 'Tranquilo', icono: 'objetivo' },
  { id: 'vidas', labelEs: 'Tres vidas', icono: 'salud' },
  { id: 'contrarreloj', labelEs: 'Contrarreloj', icono: 'cronometro' },
]

/**
 * Lecturas del reloj. Viven aquí y no en el componente porque `Date.now()` es
 * impuro: una partida cuenta por DEADLINE (como el temporizador de Biblioteca),
 * no acumulando ticks, que se desincronizan en cuanto la pestaña se duerme.
 */
export const ahoraMs = (): number => Date.now()
/** Segundos que quedan de un contrarreloj (0 si ya venció). */
export const restanteS = (finMs: number): number => Math.max(0, Math.ceil((finMs - Date.now()) / 1000))
/** Milisegundos desde que apareció la pregunta (bonus de rapidez). */
export const transcurridoMs = (desdeMs: number): number => Date.now() - desdeMs

/** Multiplicador por combo: 1× hasta 2 seguidas, +0,5 cada 3 más, tope 3×. */
export function multiplicador(combo: number): number {
  if (combo < 3) return 1
  return Math.min(3, 1 + Math.floor(combo / 3) * 0.5)
}

/** Puntos de un acierto. El bonus de rapidez solo cuenta si se midió el tiempo. */
export function puntosRespuesta(combo: number, msRespuesta?: number): number {
  const bonus = msRespuesta != null && msRespuesta < MS_RAPIDO ? 5 : 0
  return Math.round(PUNTOS_BASE * multiplicador(combo)) + bonus
}

/** Lo que hay que saber de una partida para puntuarla y medallarla. */
export interface ResumenPartida {
  modo: ModoEjercicio
  reto: RetoEjercicio
  preguntas: number
  aciertos: number
  comboMax: number
  puntos: number
  segundos: number
  /** Vidas que quedaron (solo el reto de vidas). */
  vidas?: number
}

export interface Medalla {
  id: string
  es: string
  icono: NombreIcono
  gana: (r: ResumenPartida) => boolean
}

export const MEDALLAS: Medalla[] = [
  {
    id: 'perfecta',
    es: 'Ronda perfecta',
    icono: 'trofeo',
    gana: (r) => r.preguntas >= 5 && r.aciertos === r.preguntas,
  },
  { id: 'combo10', es: 'Diez seguidas', icono: 'racha', gana: (r) => r.comboMax >= 10 },
  {
    id: 'relampago',
    es: 'Relámpago',
    icono: 'energia',
    gana: (r) => r.preguntas >= 8 && r.segundos > 0 && r.segundos / r.preguntas < 4,
  },
  {
    id: 'superviviente',
    es: 'Superviviente',
    icono: 'salud',
    gana: (r) => r.reto === 'vidas' && r.vidas === VIDAS_INICIALES && r.preguntas >= 10,
  },
  { id: 'maraton', es: 'Maratón', icono: 'gema', gana: (r) => r.preguntas >= 30 },
]

export function medallasDe(r: ResumenPartida): string[] {
  return MEDALLAS.filter((m) => m.gana(r)).map((m) => m.id)
}

// ----- Misiones del día -----

export type MedidaMision = 'respuestas' | 'aciertos' | 'combo' | 'partidas' | 'perfectas' | 'modos'

export interface Mision {
  id: string
  es: string
  objetivo: number
  medida: MedidaMision
}

const CATALOGO_MISIONES: Mision[] = [
  { id: 'resp20', es: 'Responde 20 ejercicios', objetivo: 20, medida: 'respuestas' },
  { id: 'resp40', es: 'Responde 40 ejercicios', objetivo: 40, medida: 'respuestas' },
  { id: 'acierta15', es: 'Acierta 15 veces', objetivo: 15, medida: 'aciertos' },
  { id: 'acierta30', es: 'Acierta 30 veces', objetivo: 30, medida: 'aciertos' },
  { id: 'combo8', es: 'Encadena 8 aciertos', objetivo: 8, medida: 'combo' },
  { id: 'combo12', es: 'Encadena 12 aciertos', objetivo: 12, medida: 'combo' },
  { id: 'partidas2', es: 'Juega 2 rondas', objetivo: 2, medida: 'partidas' },
  { id: 'partidas4', es: 'Juega 4 rondas', objetivo: 4, medida: 'partidas' },
  { id: 'perfecta1', es: 'Cierra una ronda perfecta', objetivo: 1, medida: 'perfectas' },
  { id: 'modos3', es: 'Practica los 3 modos', objetivo: 3, medida: 'modos' },
]

/** Ruido determinista de una cadena: mismo día, mismas misiones en todo dispositivo. */
function semilla(clave: string): () => number {
  let h = 2166136261
  for (let i = 0; i < clave.length; i++) {
    h ^= clave.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    // xorshift32: barato y suficiente para elegir 3 de 10.
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return ((h >>> 0) % 100000) / 100000
  }
}

/**
 * Tres misiones del día. No hacen falta filas en la base: la elección es una
 * función pura de (fecha, idioma) y el avance sale de lo que YA está guardado.
 */
export function misionesDelDia(fecha: string, idiomaId: number): Mision[] {
  const rnd = semilla(`${fecha}:${idiomaId}`)
  const pool = [...CATALOGO_MISIONES]
  const elegidas: Mision[] = []
  for (let i = 0; i < 3 && pool.length; i++) {
    elegidas.push(...pool.splice(Math.floor(rnd() * pool.length), 1))
  }
  return elegidas
}

/** Avance de una misión con las partidas de HOY (y el repaso del día). */
export function avanceMision(m: Mision, partidas: PartidaEjercicio[], repaso?: RepasoIdioma): number {
  switch (m.medida) {
    case 'respuestas':
      // El agregado del día incluye las tarjetas: repasar también cuenta.
      return repaso?.repasos ?? partidas.reduce((a, p) => a + p.preguntas, 0)
    case 'aciertos':
      return repaso?.aciertos ?? partidas.reduce((a, p) => a + p.aciertos, 0)
    case 'combo':
      return Math.max(0, ...partidas.map((p) => p.comboMax))
    case 'partidas':
      return partidas.length
    case 'perfectas':
      return partidas.filter((p) => p.preguntas > 0 && p.aciertos === p.preguntas).length
    case 'modos':
      return new Set(partidas.map((p) => p.modo)).size
  }
}

/** Récord de puntos por modo y mejor combo de todos los tiempos. */
export function records(partidas: PartidaEjercicio[]): {
  porModo: Map<ModoEjercicio, number>
  mejorCombo: number
  medallas: Set<string>
} {
  const porModo = new Map<ModoEjercicio, number>()
  let mejorCombo = 0
  const medallas = new Set<string>()
  for (const p of partidas) {
    porModo.set(p.modo, Math.max(porModo.get(p.modo) ?? 0, p.puntos))
    mejorCombo = Math.max(mejorCombo, p.comboMax)
    for (const m of p.medallas) medallas.add(m)
  }
  return { porModo, mejorCombo, medallas }
}

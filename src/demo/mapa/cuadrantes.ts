/**
 * La retícula de la casa demo: celdas de 8 m repartidas en bloques de 6×6, que
 * son exactamente los cuadrantes de referencia del editor (A1, B1, C1 / A2,
 * B2, C2 — ver `core/house/cuadrantesMapa.ts`, `TAM_BLOQUE = 6`). Cada bloque
 * es una zona temática, y encima se crean cuadrantes PROPIOS con su nombre y
 * color para que la cámara salte a ellos.
 *
 * La casa demo se construye SIEMPRE completa: las seis zonas y una rejilla de
 * 18×12 (`dimsMapaDemo`). Recortarla por intereses arruinaba los tutoriales,
 * que corren sobre esta casa y dan por hecho que todo existe.
 *
 * Reglas de reparto que respetan todos los módulos de `mapa/`:
 *  - El PERÍMETRO de la rejilla (primera y última fila y columna) es del
 *    anillo del tren: ninguna zona lo usa.
 *  - Las fronteras INTERNAS entre bloques (columna 5, columna 11, fila 5) son
 *    calles; en el borde del mapa no se pintan (ahí va el anillo).
 *  - Queda entonces un área útil de 4×4 o 5×4 celdas por zona.
 */
import { cellToWorld, type Cell } from '../../core/house/walls'

/** Lado de un bloque de zona, en celdas (igual que `TAM_BLOQUE` del editor). */
export const TAM_BLOQUE = 6
/** Lado de la celda en metros (el editor admite 4–12). */
export const TAM_CELDA = 8

export interface ZonaCuadrante {
  id: string
  nombre: string
  col: number
  row: number
  cols: number
  rows: number
  /** Emoji de la zona (lista del editor y salto de cámara). */
  emoji: string
}

/** Los 6 bloques, en el mismo orden que los botones de referencia del editor. */
export const CUADRANTES: ZonaCuadrante[] = [
  {
    id: 'zona-casa',
    nombre: 'La casa',
    col: 0,
    row: 0,
    cols: 6,
    rows: 6,
    emoji: '🏠',
  },
  {
    id: 'zona-canchas',
    nombre: 'Canchas',
    col: 6,
    row: 0,
    cols: 6,
    rows: 6,
    emoji: '🏀',
  },
  {
    id: 'zona-santuario',
    nombre: 'Santuario',
    col: 12,
    row: 0,
    cols: 6,
    rows: 6,
    emoji: '🐄',
  },
  {
    id: 'zona-pista',
    nombre: 'Pista de carreras',
    col: 0,
    row: 6,
    cols: 6,
    rows: 6,
    emoji: '🏁',
  },
  {
    id: 'zona-mindfulness',
    nombre: 'Mindfulness',
    col: 6,
    row: 6,
    cols: 6,
    rows: 6,
    emoji: '🧘',
  },
  {
    id: 'zona-feria',
    nombre: 'Tren y feria',
    col: 12,
    row: 6,
    cols: 6,
    rows: 6,
    emoji: '🎢',
  },
]

/** Tamaño de la rejilla que abarca las seis zonas: 18×12. */
export function dimsMapaDemo(): { cols: number; rows: number } {
  return {
    cols: Math.max(...CUADRANTES.map((q) => q.col + q.cols)),
    rows: Math.max(...CUADRANTES.map((q) => q.row + q.rows)),
  }
}

/** Esquinas absolutas del cuadrante de una zona (extremos incluidos). */
export function rectZona(id: string): { c0: number; r0: number; c1: number; r1: number } {
  const q = CUADRANTES.find((z) => z.id === id)!
  return { c0: q.col, r0: q.row, c1: q.col + q.cols - 1, r1: q.row + q.rows - 1 }
}

/**
 * Área ÚTIL de una zona: su cuadrante menos el anillo del tren (perímetro del
 * mapa recortado) y las calles (fronteras internas entre bloques). Todo módulo
 * de `mapa/` debe colocar su contenido como OFFSETS de esta área — así, si la
 * malla crece (más bloques, otro reparto), la infraestructura crece con ella
 * en vez de quedarse corta.
 */
export function areaUtilZona(
  id: string,
  cols: number,
  rows: number,
): { c0: number; r0: number; c1: number; r1: number } {
  const q = rectZona(id)
  // Frontera interna = última columna/fila de un bloque que NO toca el borde.
  const esCalleCol = (c: number) => (c + 1) % TAM_BLOQUE === 0 && c < cols - 1
  const esCalleRow = (r: number) => (r + 1) % TAM_BLOQUE === 0 && r < rows - 1
  const c0 = Math.max(q.c0, 1)
  const r0 = Math.max(q.r0, 1)
  let c1 = Math.min(q.c1, cols - 2)
  let r1 = Math.min(q.r1, rows - 2)
  if (esCalleCol(c1)) c1--
  if (esCalleRow(r1)) r1--
  return { c0, r0, c1, r1 }
}

/**
 * La meta del circuito: punto medio de la recta norte del óvalo. Vive aquí
 * (y no en `pista.ts`) porque es geometría pura y la leen tanto el constructor
 * como los focos de cámara del tutorial, que no deben arrastrar los repos.
 */
export function metaPista(cols: number, rows: number): { col: number; row: number } {
  const u = areaUtilZona('zona-pista', cols, rows)
  return { col: Math.floor((u.c0 + 1 + u.c1) / 2), row: u.r0 }
}

/** Todas las celdas de un rectángulo (extremos incluidos). */
export function celdasRect(c0: number, r0: number, c1: number, r1: number): Cell[] {
  const out: Cell[] = []
  for (let col = c0; col <= c1; col++) for (let row = r0; row <= r1; row++) out.push({ col, row })
  return out
}

/** Solo el BORDE de un rectángulo, útil para óvalos y circuitos cerrados. */
export function bordeRect(c0: number, r0: number, c1: number, r1: number): Cell[] {
  return celdasRect(c0, r0, c1, r1).filter(
    (c) => c.col === c0 || c.col === c1 || c.row === r0 || c.row === r1,
  )
}

/** Centro en coordenadas de mundo de una celda (admite fracciones). */
export function mundo(col: number, row: number): { x: number; z: number } {
  const [x, , z] = cellToWorld(col, row)
  return { x, z }
}

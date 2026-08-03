import { cellToWorld, SPACING, type Cell } from './walls'
import type { CuadranteMapa } from '../data/db'

/**
 * Cuadrantes del mapa: en rejillas grandes la vista completa deja los cuartos
 * diminutos, así que el mapa se parte en bloques a los que la cámara puede saltar.
 * Los automáticos se calculan del tamaño de la rejilla; el usuario puede además
 * dibujar los suyos sobre el croquis (esos sí se guardan en `mapaConfig`).
 */

/** Celdas por lado de un cuadrante automático (≈ la rejilla inicial 6×5). */
export const TAM_BLOQUE = 6
/** A partir de este lado de rejilla el mapa se divide en cuadrantes. */
export const UMBRAL_CUADRANTES = 8

/** Colores de las zonas dibujadas: se reparten en orden para distinguirlas de un vistazo. */
export const COLORES_ZONA = [
  '#22c55e', '#3b82f6', '#f97316', '#a855f7',
  '#ef4444', '#14b8a6', '#eab308', '#ec4899',
] as const

/** Color que le toca a la zona número `i` (cicla la paleta). */
export function colorZona(i: number): string {
  return COLORES_ZONA[((i % COLORES_ZONA.length) + COLORES_ZONA.length) % COLORES_ZONA.length]
}

/** ¿La rejilla es lo bastante grande como para ofrecer cuadrantes? */
export function hayCuadrantes(cols: number, rows: number): boolean {
  return Math.max(cols, rows) > UMBRAL_CUADRANTES
}

/** Etiqueta de un bloque automático: columna en letra + fila en número (A1, B1, A2…). */
function etiquetaBloque(bc: number, br: number): string {
  return `${String.fromCharCode(65 + bc)}${br + 1}`
}

/**
 * División automática en bloques de `TAM_BLOQUE` celdas; el último bloque de cada
 * eje se recorta al borde para no salirse de la rejilla.
 */
export function cuadrantesAuto(cols: number, rows: number): CuadranteMapa[] {
  const nc = Math.ceil(cols / TAM_BLOQUE)
  const nr = Math.ceil(rows / TAM_BLOQUE)
  const out: CuadranteMapa[] = []
  for (let br = 0; br < nr; br++) {
    for (let bc = 0; bc < nc; bc++) {
      const col = bc * TAM_BLOQUE
      const row = br * TAM_BLOQUE
      out.push({
        id: `auto-${bc}-${br}`,
        nombre: etiquetaBloque(bc, br),
        col,
        row,
        cols: Math.min(TAM_BLOQUE, cols - col),
        rows: Math.min(TAM_BLOQUE, rows - row),
      })
    }
  }
  return out
}

/** Número de bloques automáticos por fila (para maquetar la rejilla de botones). */
export function bloquesPorFila(cols: number): number {
  return Math.ceil(cols / TAM_BLOQUE)
}

/**
 * Cuadrante por id, venga de las zonas dibujadas o de la división automática.
 * Lo usan el foco del croquis y el ghost del mapa 3D.
 */
export function cuadrantePorId(
  id: string | null,
  cols: number,
  rows: number,
  propios: CuadranteMapa[],
): CuadranteMapa | null {
  if (!id) return null
  return (
    propios.find((q) => q.id === id) ??
    cuadrantesAuto(cols, rows).find((q) => q.id === id) ??
    null
  )
}

/** ¿Es un bloque de referencia (A1…D4) en vez de una zona dibujada? */
export const esBloqueAuto = (q: CuadranteMapa) => q.id.startsWith('auto-')

/** Color de los bloques de referencia: uno solo, son la retícula del mapa. */
export const COLOR_BLOQUE = '#0284c7'

/**
 * Color con el que se pinta un cuadrante. Las zonas guardadas antes de que existiera la
 * paleta no traen `color`: caen al que les toca por su posición en la lista.
 */
export function colorCuadrante(q: CuadranteMapa, propios: CuadranteMapa[]): string {
  if (esBloqueAuto(q)) return COLOR_BLOQUE
  if (q.color) return q.color
  const i = propios.findIndex((p) => p.id === q.id)
  return colorZona(i < 0 ? 0 : i)
}

/**
 * ¿La celda cae dentro del cuadrante? Acepta coordenadas de ½ y ¼ de celda (pincel fino,
 * pisos): se compara contra el rango continuo [col, col+cols) con media celda de holgura
 * por abajo, que es como se referencian esas sub-celdas.
 */
export function celdaEnCuadrante(col: number, row: number, q: CuadranteMapa): boolean {
  return (
    col >= q.col - 0.5 &&
    col < q.col + q.cols &&
    row >= q.row - 0.5 &&
    row < q.row + q.rows
  )
}

/** Centro y tamaño en unidades de mundo de un cuadrante (para encuadrar la cámara). */
export function rectMundo(q: CuadranteMapa): {
  centro: [number, number, number]
  ancho: number
  largo: number
} {
  const [x, y, z] = cellToWorld(q.col + (q.cols - 1) / 2, q.row + (q.rows - 1) / 2)
  return { centro: [x, y, z], ancho: q.cols * SPACING, largo: q.rows * SPACING }
}

/** Dos celdas de un arrastre → cuadrante válido (mínimo 1×1, acotado a la rejilla). */
export function normalizarRect(
  a: Cell,
  b: Cell,
  cols: number,
  rows: number,
  nombre: string,
  color: string,
): CuadranteMapa {
  const acota = (v: number, max: number) => Math.max(0, Math.min(max - 1, Math.round(v)))
  const c0 = acota(Math.min(a.col, b.col), cols)
  const c1 = acota(Math.max(a.col, b.col), cols)
  const r0 = acota(Math.min(a.row, b.row), rows)
  const r1 = acota(Math.max(a.row, b.row), rows)
  return {
    id: `q${Date.now().toString(36)}`,
    nombre,
    col: c0,
    row: r0,
    cols: c1 - c0 + 1,
    rows: r1 - r0 + 1,
    color,
  }
}

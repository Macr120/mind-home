import { useCuartos } from '../state/cuartosStore'
import {
  footprintCells,
  cellId,
  tileOcupado,
  SIDE_KEYS,
  type SideKey,
  type Cell,
  type Footprint,
} from './walls'

const DELTA: Record<SideKey, Cell> = {
  N: { col: 0, row: -1 },
  S: { col: 0, row: 1 },
  O: { col: -1, row: 0 },
  E: { col: 1, row: 0 },
}

/** ¿El conjunto de celdas absolutas sigue siendo una sola pieza (4-conexo)? */
export function celdasConexas(celdas: Cell[]): boolean {
  if (celdas.length <= 1) return true
  const paso = celdas.some((c) => !Number.isInteger(c.col) || !Number.isInteger(c.row)) ? 0.5 : 1
  const set = new Set(celdas.map((c) => cellId(c.col, c.row)))
  const visto = new Set<string>()
  const cola = [celdas[0]]
  visto.add(cellId(celdas[0].col, celdas[0].row))
  while (cola.length) {
    const c = cola.pop()!
    for (const s of SIDE_KEYS) {
      const nc = c.col + DELTA[s].col * paso
      const nr = c.row + DELTA[s].row * paso
      const k = cellId(nc, nr)
      if (set.has(k) && !visto.has(k)) {
        visto.add(k)
        cola.push({ col: nc, row: nr })
      }
    }
  }
  return visto.size === celdas.length
}

/** Celdas absolutas cubiertas por el techo del cuarto (footprint + extensiones). */
export function celdasTechoAbsolutas(
  anchor: Cell,
  footprint: Footprint,
  techoExtra: Cell[],
): Cell[] {
  const base = footprintCells(anchor, footprint)
  const set = new Map<string, Cell>()
  for (const c of base) set.set(cellId(c.col, c.row), c)
  for (const c of techoExtra) set.set(cellId(c.col, c.row), c)
  return [...set.values()]
}

/** Offsets relativos al ancla (footprint + extra deduplicado). */
export function offsetsTecho(
  anchor: Cell,
  footprint: Footprint,
  techoExtra: Cell[],
): Cell[] {
  const base = footprintCells(anchor, footprint)
  const keys = new Set(base.map((c) => cellId(c.col, c.row)))
  const out = footprint.map((o) => ({ ...o }))
  for (const a of techoExtra) {
    const k = cellId(a.col, a.row)
    if (keys.has(k)) continue
    keys.add(k)
    out.push({ col: a.col - anchor.col, row: a.row - anchor.row })
  }
  return out
}

/** ¿Otro cuarto extiende su techo sobre esta celda absoluta? */
export function techoExtraDeOtroEnCelda(
  abs: Cell,
  excludeRoomId: string,
  nivel: number,
  roomTechoExtra: Record<string, Cell[]>,
  placed: Record<string, boolean>,
  niveles: Record<string, number>,
): boolean {
  for (const r of useCuartos.getState().cuartos) {
    if (!placed[r.id] || r.id === excludeRoomId) continue
    if ((niveles[r.id] ?? 0) !== nivel) continue
    const extra = roomTechoExtra[r.id] ?? []
    if (extra.some((c) => c.col === abs.col && c.row === abs.row)) return true
  }
  return false
}

/** Caja contenedora (en celdas absolutas) de un conjunto de celdas. */
function bbox(celdas: Cell[]) {
  let minCol = celdas[0].col
  let maxCol = celdas[0].col
  let minRow = celdas[0].row
  let maxRow = celdas[0].row
  for (const c of celdas) {
    if (c.col < minCol) minCol = c.col
    if (c.col > maxCol) maxCol = c.col
    if (c.row < minRow) minRow = c.row
    if (c.row > maxRow) maxRow = c.row
  }
  return { minCol, maxCol, minRow, maxRow }
}

function rango(a: number, b: number): number[] {
  const out: number[] = []
  for (let i = a; i <= b; i++) out.push(i)
  return out
}

function centroDe(celdas: Cell[]): Cell {
  const col = celdas.reduce((s, c) => s + c.col, 0) / celdas.length
  const row = celdas.reduce((s, c) => s + c.row, 0) / celdas.length
  return { col: Math.round(col), row: Math.round(row) }
}

/**
 * Una línea completa (fila/columna) que extiende o retrae el techo en una dirección.
 * El techo se trata como UNA losa: crece/encoge por líneas enteras, nunca celda suelta.
 */
export interface LineaTecho {
  dir: SideKey
  /** Todas las celdas absolutas que se añaden/quitan juntas. */
  celdas: Cell[]
  /** Centro de la línea (posición del botón). */
  centro: Cell
}

/**
 * Líneas en las que se puede extender el techo: como mucho UNA por dirección. Cada
 * línea cubre todo el ancho/alto actual de la losa para que el techo crezca uniforme
 * (rectangular) y ninguna parte avance más que otra. Solo sobre celdas con cuarto.
 */
export function lineasExpandiblesTecho(
  anchor: Cell,
  footprint: Footprint,
  techoExtra: Cell[],
  gridCols: number,
  gridRows: number,
  ocupadoNivel: Set<string>,
  ocupadoNivelSup: Set<string> | undefined,
  alturaTechoActual: number,
  alturaTechoPorCelda: Map<string, number>,
): LineaTecho[] {
  const cubiertas = celdasTechoAbsolutas(anchor, footprint, techoExtra)
  const cubiertasSet = new Set(cubiertas.map((c) => cellId(c.col, c.row)))
  const { minCol, maxCol, minRow, maxRow } = bbox(cubiertas)

  const lineaValida = (celdas: Cell[]): boolean => {
    if (!celdas.length) return false
    for (const v of celdas) {
      const k = cellId(v.col, v.row)
      if (v.col < 0 || v.row < 0 || v.col > gridCols - 1 || v.row > gridRows - 1) return false
      if (cubiertasSet.has(k)) return false
      if (ocupadoNivelSup && tileOcupado(ocupadoNivelSup, v.col, v.row)) return false
      if (!tileOcupado(ocupadoNivel, v.col, v.row)) return false // toda la línea debe estar sobre cuartos
      // El cuarto vecino debe tener el muro de la misma altura: no se mezclan techos a distinto nivel.
      const alturaVecina = alturaTechoPorCelda.get(k)
      if (alturaVecina == null || Math.abs(alturaVecina - alturaTechoActual) > 0.01) return false
    }
    return true
  }

  const candidatos: { dir: SideKey; celdas: Cell[] }[] = [
    { dir: 'N', celdas: rango(minCol, maxCol).map((col) => ({ col, row: minRow - 1 })) },
    { dir: 'S', celdas: rango(minCol, maxCol).map((col) => ({ col, row: maxRow + 1 })) },
    { dir: 'O', celdas: rango(minRow, maxRow).map((row) => ({ col: minCol - 1, row })) },
    { dir: 'E', celdas: rango(minRow, maxRow).map((row) => ({ col: maxCol + 1, row })) },
  ]

  const lineas: LineaTecho[] = []
  for (const { dir, celdas } of candidatos) {
    if (lineaValida(celdas)) lineas.push({ dir, celdas, centro: centroDe(celdas) })
  }
  return lineas
}

/**
 * Líneas que se pueden retraer: como mucho UNA por dirección. Solo el borde exterior
 * de la losa cuando toda esa línea son celdas extra (no la planta base del cuarto).
 */
export function lineasRetraiblesTecho(
  anchor: Cell,
  footprint: Footprint,
  techoExtra: Cell[],
): LineaTecho[] {
  if (!techoExtra.length) return []
  const base = footprintCells(anchor, footprint)
  const baseSet = new Set(base.map((c) => cellId(c.col, c.row)))
  const extraSet = new Set(techoExtra.map((c) => cellId(c.col, c.row)))
  const cubiertas = celdasTechoAbsolutas(anchor, footprint, techoExtra)
  const cubiertasSet = new Set(cubiertas.map((c) => cellId(c.col, c.row)))
  const { minCol, maxCol, minRow, maxRow } = bbox(cubiertas)

  const candidatos: { dir: SideKey; celdas: Cell[] }[] = [
    { dir: 'N', celdas: cubiertas.filter((c) => c.row === minRow) },
    { dir: 'S', celdas: cubiertas.filter((c) => c.row === maxRow) },
    { dir: 'O', celdas: cubiertas.filter((c) => c.col === minCol) },
    { dir: 'E', celdas: cubiertas.filter((c) => c.col === maxCol) },
  ]

  const lineas: LineaTecho[] = []
  for (const { dir, celdas } of candidatos) {
    if (!celdas.length) continue
    // Toda la línea debe ser extra (no se quita la planta base del cuarto).
    if (celdas.some((c) => baseSet.has(cellId(c.col, c.row)))) continue
    if (celdas.some((c) => !extraSet.has(cellId(c.col, c.row)))) continue
    // No dejar el techo desconectado tras quitar la línea.
    const quitar = new Set(celdas.map((c) => cellId(c.col, c.row)))
    const resto = [...cubiertasSet]
      .filter((k) => !quitar.has(k))
      .map((k) => {
        const [col, row] = k.split(',').map(Number)
        return { col, row }
      })
    if (resto.length && !celdasConexas(resto)) continue
    lineas.push({ dir, celdas, centro: centroDe(celdas) })
  }
  return lineas
}

import {
  cellId,
  footprintCells,
  tileOcupado,
  SIDE_KEYS,
  type Cell,
  type Footprint,
} from './walls'

const DELTA: Record<string, Cell> = {
  N: { col: 0, row: -1 },
  S: { col: 0, row: 1 },
  O: { col: -1, row: 0 },
  E: { col: 1, row: 0 },
}

/** ¿El conjunto de celdas absolutas sigue siendo una sola pieza (4-conexo)? */
function conexo(celdas: Cell[]): boolean {
  if (celdas.length <= 1) return true
  const set = new Set(celdas.map((c) => cellId(c.col, c.row)))
  const visto = new Set<string>()
  const cola = [celdas[0]]
  visto.add(cellId(celdas[0].col, celdas[0].row))
  while (cola.length) {
    const c = cola.pop()!
    for (const s of SIDE_KEYS) {
      const k = cellId(c.col + DELTA[s].col, c.row + DELTA[s].row)
      if (set.has(k) && !visto.has(k)) {
        visto.add(k)
        cola.push({ col: c.col + DELTA[s].col, row: c.row + DELTA[s].row })
      }
    }
  }
  return visto.size === celdas.length
}

export interface CeldasEdicionCuarto {
  /** Celdas propias y si pueden quitarse sin partir el cuarto. */
  quitar: { cell: Cell; puede: boolean }[]
  /** Celdas libres adyacentes donde se puede extender el cuarto. */
  agregar: Cell[]
}

/**
 * Celdas + / − para dar forma a un cuarto: '+' en cada celda libre adyacente y
 * '−' en cada celda propia (deshabilitada si partiría el cuarto). Compartido por
 * el editor 3D (RoomCellEditor) y el croquis 2D (PlanoCanvas).
 */
export function celdasEdicionCuarto(
  anchor: Cell,
  fp: Footprint,
  ocupado: Parameters<typeof tileOcupado>[0],
  gridCols: number,
  gridRows: number,
): CeldasEdicionCuarto {
  const propias = footprintCells(anchor, fp)
  const quitar = propias.map((c) => {
    // Cuarto de una sola celda: el '−' lo elimina por completo.
    if (propias.length === 1) return { cell: c, puede: true }
    const resto = propias.filter((o) => !(o.col === c.col && o.row === c.row))
    return { cell: c, puede: conexo(resto) }
  })
  const agregar = new Map<string, Cell>()
  for (const c of propias) {
    for (const s of SIDE_KEYS) {
      const v = { col: c.col + DELTA[s].col, row: c.row + DELTA[s].row }
      if (v.col < 0 || v.row < 0 || v.col > gridCols - 1 || v.row > gridRows - 1) continue
      if (tileOcupado(ocupado, v.col, v.row)) continue
      const k = cellId(v.col, v.row)
      if (!agregar.has(k)) agregar.set(k, v)
    }
  }
  return { quitar, agregar: [...agregar.values()] }
}

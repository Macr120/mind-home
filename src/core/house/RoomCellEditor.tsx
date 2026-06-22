import { Html } from '@react-three/drei'
import { useLayout, SIN_OCUPACION } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import {
  cellToWorld,
  cellId,
  footprintCells,
  nivelBaseY,
  tileOcupado,
  SIDE_KEYS,
  FOOTPRINT_DEFAULT,
  type Cell,
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

/**
 * Botones + / − por celda para dar forma al cuarto en edición:
 * - '+' en cada celda libre adyacente a la forma (la añade).
 * - '−' en cada celda de la forma (la quita, si no parte el cuarto).
 */
export function RoomCellEditor() {
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const niveles = useLayout((s) => s.niveles)
  const conTecho = useHouse((s) => s.conTecho)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const addRoomCell = useLayout((s) => s.addRoomCell)
  const removeRoomCell = useLayout((s) => s.removeRoomCell)

  if (!editingRoomId || !cells[editingRoomId]) return null

  const fp = footprints[editingRoomId] ?? FOOTPRINT_DEFAULT
  const propias = footprintCells(cells[editingRoomId], fp)
  const ocupado = ocupadoPorNivel.get(niveles[editingRoomId] ?? 0) ?? SIN_OCUPACION
  // Altura del nivel del cuarto: los botones +/− siguen al cuarto aunque esté elevado.
  const y0 = nivelBaseY(niveles[editingRoomId] ?? 0, conTecho)

  // Celdas '+' candidatas: libres, dentro de la rejilla y adyacentes a la forma.
  const agregables = new Map<string, Cell>()
  for (const c of propias) {
    for (const s of SIDE_KEYS) {
      const v = { col: c.col + DELTA[s].col, row: c.row + DELTA[s].row }
      const k = cellId(v.col, v.row)
      if (v.col < 0 || v.row < 0 || v.col > gridCols - 1 || v.row > gridRows - 1) continue
      if (tileOcupado(ocupado, v.col, v.row)) continue // ocupada por algún cuarto del mismo nivel
      if (!agregables.has(k)) agregables.set(k, v)
    }
  }

  return (
    <>
      {/* '−' en cada celda propia (deshabilitado si parte el cuarto) */}
      {propias.map((c) => {
        const resto = propias.filter((o) => !(o.col === c.col && o.row === c.row))
        const puede = propias.length > 1 && conexo(resto)
        const [x, , z] = cellToWorld(c.col, c.row)
        return (
          <Html key={'m' + cellId(c.col, c.row)} position={[x, y0 + 1.1, z]} center zIndexRange={[70, 0]}>
            <button
              type="button"
              onClick={() => removeRoomCell(editingRoomId, c)}
              disabled={!puede}
              title="Quitar esta celda"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-black/60 text-base font-bold text-red-400 backdrop-blur-sm transition hover:bg-red-400/25 disabled:cursor-not-allowed disabled:text-white/15"
            >
              −
            </button>
          </Html>
        )
      })}

      {/* '+' en cada celda libre adyacente */}
      {[...agregables.values()].map((v) => {
        const [x, , z] = cellToWorld(v.col, v.row)
        return (
          <Html key={'p' + cellId(v.col, v.row)} position={[x, y0 + 0.6, z]} center zIndexRange={[70, 0]}>
            <button
              type="button"
              onClick={() => addRoomCell(editingRoomId, v)}
              title="Extender el cuarto aquí"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-400/40 bg-black/60 text-lg font-bold text-emerald-400 backdrop-blur-sm transition hover:bg-emerald-400/25"
            >
              +
            </button>
          </Html>
        )
      })}
    </>
  )
}

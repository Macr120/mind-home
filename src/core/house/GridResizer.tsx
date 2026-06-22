import { Html } from '@react-three/drei'
import { useLayout } from '../state/layoutStore'
import { SPACING, footprintCells, FOOTPRINT_DEFAULT, type Cell, type Footprint } from './walls'

const MAX_GRID = 12
const MIN_GRID = 1

type Dir = 'N' | 'S' | 'E' | 'O'

function puedeContraer(
  dir: Dir,
  gridCols: number,
  gridRows: number,
  placed: Record<string, boolean>,
  cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
): boolean {
  if ((dir === 'E' || dir === 'O') && gridCols <= MIN_GRID) return false
  if ((dir === 'N' || dir === 'S') && gridRows <= MIN_GRID) return false

  const colocados = Object.entries(placed)
    .filter(([, v]) => v)
    .map(([id]) => id)
    .filter((id) => cells[id])

  // Bloquea contraer si algún cuarto cae dentro de ½ celda del borde a quitar.
  return !colocados.some((id) =>
    footprintCells(cells[id], footprints[id] ?? FOOTPRINT_DEFAULT).some((c) =>
      dir === 'E'
        ? c.col > gridCols - 2
        : dir === 'O'
          ? c.col < 1
          : dir === 'S'
            ? c.row > gridRows - 2
            : c.row < 1,
    ),
  )
}

/** Botones + / − en los cuatro bordes del mapa; solo en "Editar mapa", no al editar un cuarto. */
export function GridResizer() {
  const editMode = useLayout((s) => s.editMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const expandGrid = useLayout((s) => s.expandGrid)
  const contractGrid = useLayout((s) => s.contractGrid)

  if (!editMode || editingRoomId) return null

  const halfW = (gridCols / 2) * SPACING
  const halfH = (gridRows / 2) * SPACING
  const off = 2.8 // distancia fuera del borde

  const bordes: { dir: Dir; pos: [number, number, number] }[] = [
    { dir: 'N', pos: [0, 0, -halfH - off] },
    { dir: 'S', pos: [0, 0, halfH + off] },
    { dir: 'E', pos: [halfW + off, 0, 0] },
    { dir: 'O', pos: [-halfW - off, 0, 0] },
  ]

  return (
    <>
      {bordes.map(({ dir, pos }) => {
        const puedeExpandir =
          (dir === 'E' || dir === 'O') ? gridCols < MAX_GRID : gridRows < MAX_GRID
        const puedeContr = puedeContraer(dir, gridCols, gridRows, placed, cells, footprints)

        return (
          <Html key={dir} position={pos} center zIndexRange={[80, 0]}>
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={() => expandGrid(dir)}
                disabled={!puedeExpandir}
                title={`Expandir hacia ${dir}`}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-black/70 text-base font-bold text-emerald-400 backdrop-blur-sm transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:text-white/20"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => contractGrid(dir)}
                disabled={!puedeContr}
                title={`Contraer desde ${dir}`}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-black/70 text-base font-bold text-red-400 backdrop-blur-sm transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:text-white/20"
              >
                −
              </button>
            </div>
          </Html>
        )
      })}
    </>
  )
}

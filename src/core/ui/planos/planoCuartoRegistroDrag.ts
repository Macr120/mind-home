import type { ZonaPlano } from '../../data/db'
import type { Cell, Footprint } from '../../house/walls'
import { puedeMoverCuartoRegistro } from '../../house/planoGeometria'

/** Confirma el arrastre de un cuarto del registro (misma idea que `finalizarArrastreZona`). */
export async function finalizarArrastreCuartoRegistro(opts: {
  roomId: string
  origen: Cell
  preview: Cell
  fp: Footprint
  nivel: number
  placed: Record<string, boolean>
  cells: Record<string, Cell>
  footprints: Record<string, Footprint>
  niveles: Record<string, number>
  zonas: ZonaPlano[]
  moveRoom: (id: string, cell: Cell) => Promise<void>
  setAviso: (aviso: string | null) => void
}): Promise<boolean> {
  const {
    roomId,
    origen,
    preview,
    fp,
    nivel,
    placed,
    cells,
    footprints,
    niveles,
    zonas,
    moveRoom,
    setAviso,
  } = opts

  const sinCambio = origen.col === preview.col && origen.row === preview.row
  if (sinCambio) return true

  const valido = puedeMoverCuartoRegistro({
    roomId,
    origen,
    preview,
    fp,
    nivel,
    placed,
    cells,
    footprints,
    niveles,
    zonas,
  })

  if (!valido) {
    setAviso('No se puede colocar el cuarto ahí.')
    return false
  }

  await moveRoom(roomId, preview)
  setAviso(null)
  return true
}

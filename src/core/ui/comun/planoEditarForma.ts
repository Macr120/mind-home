import { zonasRepo } from '../../data/repository'
import type { ZonaPlano } from '../../data/db'
import {
  claveCeldaAbs,
  claveCeldaOff,
  siguienteFormaEnCelda,
  formaEnCelda,
  type FormaLoseta,
} from '../../house/formasLoseta'
import { useLayout } from '../../state/layoutStore'
import { zonaEnCelda } from '../../house/planoGeometria'
import { footprintCells, type Cell } from '../../house/walls'

/** Aplica la forma activa a una celda de cuarto (zona o registro). */
export async function aplicarFormaEnPlano(opts: {
  col: number
  row: number
  nivel: number
  forma: FormaLoseta
  zonas: ZonaPlano[]
  placed: Record<string, boolean>
  cells: Record<string, Cell>
  footprints: Record<string, { col: number; row: number }[]>
  idsCuartosNivel: string[]
  setAviso: (msg: string | null) => void
}): Promise<void> {
  const {
    col,
    row,
    nivel,
    forma,
    zonas,
    placed,
    cells,
    footprints,
    idsCuartosNivel,
    setAviso,
  } = opts

  const celda = { col: Math.round(col), row: Math.round(row) }
  const kAbs = claveCeldaAbs(celda.col, celda.row)

  for (const roomId of idsCuartosNivel) {
    if (!placed[roomId]) continue
    const anchor = cells[roomId]
    const fp = footprints[roomId]
    if (!anchor || !fp?.length) continue
    const absCells = footprintCells(anchor, fp)
    const hit = absCells.some((c) => c.col === celda.col && c.row === celda.row)
    if (!hit) continue
    const rel = { col: celda.col - anchor.col, row: celda.row - anchor.row }
    const kOff = claveCeldaOff(rel.col, rel.row)
    await useLayout.getState().setCeldaForma(roomId, kOff, forma)
    setAviso(null)
    return
  }

  const zona = zonaEnCelda(zonas, nivel, celda.col, celda.row)
  if (zona?.id != null) {
    const pertenece = zona.celdas.some((c) => c.col === celda.col && c.row === celda.row)
    if (!pertenece) return
    const prev = formaEnCelda(zona.formasCelda, kAbs)
    const next = siguienteFormaEnCelda(prev.forma === forma ? prev : undefined, forma)
    const formasCelda = { ...(zona.formasCelda ?? {}), [kAbs]: next }
    await zonasRepo.update(zona.id, { formasCelda })
    setAviso(null)
    return
  }

  setAviso('Selecciona una celda dentro de un cuarto.')
}

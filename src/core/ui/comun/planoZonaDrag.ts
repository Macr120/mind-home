import { zonasRepo } from '../../data/repository'
import type { ZonaPlano } from '../../data/db'
import type { Cell, Footprint } from '../../house/walls'
import { puedeMoverZona } from '../../house/planoGeometria'
import { trasladarFormasCelda } from '../../house/formasLoseta'

/** Confirma el arrastre de una zona si la posición es válida. */
export async function finalizarArrastreZona(opts: {
  zonaId: number
  origen: Cell[]
  preview: Cell[]
  nivel: number
  gridCols: number
  gridRows: number
  placed: Record<string, boolean>
  cells: Record<string, Cell>
  footprints: Record<string, Footprint>
  niveles: Record<string, number>
  zonas: ZonaPlano[]
  idsCuartosNivel: string[]
  anchorDe: (id: string) => Cell | undefined
  setAviso: (aviso: string | null) => void
}): Promise<void> {
  const {
    zonaId,
    origen,
    preview,
    nivel,
    gridCols,
    gridRows,
    placed,
    cells,
    footprints,
    niveles,
    zonas,
    idsCuartosNivel,
    anchorDe,
    setAviso,
  } = opts

  const valido =
    preview.length > 0 &&
    puedeMoverZona(
      preview,
      zonaId,
      nivel,
      gridCols,
      gridRows,
      placed,
      cells,
      footprints,
      niveles,
      zonas,
      idsCuartosNivel,
      anchorDe,
    )
  const keysOrigen = new Set(origen.map((c) => `${c.col},${c.row}`))
  const sinCambio =
    preview.length === origen.length &&
    preview.every((c) => keysOrigen.has(`${c.col},${c.row}`))

  if (valido && !sinCambio) {
    const zona = zonas.find((z) => z.id === zonaId)
    const sortC = (a: Cell, b: Cell) => a.col - b.col || a.row - b.row
    const o0 = [...origen].sort(sortC)[0]
    const p0 = [...preview].sort(sortC)[0]
    const dc = p0.col - o0.col
    const dr = p0.row - o0.row
    const formasCelda =
      dc !== 0 || dr !== 0
        ? trasladarFormasCelda(zona?.formasCelda, dc, dr)
        : zona?.formasCelda
    // No destructivo: el piso exterior bajo la zona se oculta solo y reaparece al
    // liberar las celdas; no se borra el piso del destino ni se fija gris en el origen.
    await zonasRepo.update(zonaId, {
      celdas: preview.map((x) => ({ col: x.col, row: x.row })),
      ...(formasCelda !== undefined ? { formasCelda } : {}),
    })
    if (dc !== 0 || dr !== 0) {
      const { trasladarPisosInteriores } = await import('../../data/repository')
      await trasladarPisosInteriores(nivel, origen, dc, dr)
    }
    setAviso(null)
  } else if (!valido) {
    setAviso('No se puede colocar el cuarto ahí.')
  }
}

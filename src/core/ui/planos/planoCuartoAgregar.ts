import { zonasRepo } from '../../data/repository'
import { murosInicialesZona } from '../../house/murosZona'
import type { Cell, Footprint } from '../../house/walls'
import { celdaEnteraEsLibre, normalizarCeldasEnteras } from '../../house/planoGeometria'
import { celdasConexas } from '../../house/techoCeldas'
import type { ZonaPlano } from '../../data/db'
import type { SeleccionPlano } from '../../state/planosStore'
import { useCuartos } from '../../state/cuartosStore'

/** Crea un cuarto básico desde las celdas marcadas en el croquis. */
export async function confirmarCuartoAgregar(opts: {
  celdasMarcadas: Cell[]
  nivel: number
  placed: Record<string, boolean>
  cells: Record<string, Cell>
  footprints: Record<string, Footprint>
  niveles: Record<string, number>
  zonas: ZonaPlano[]
  ocupadoLayout: Set<string>
  setAviso: (aviso: string | null) => void
  limpiarMarcadas: () => void
  setPendienteNombre: (id: number) => void
  setSeleccion: (s: SeleccionPlano) => void
}): Promise<void> {
  const {
    celdasMarcadas,
    nivel,
    placed,
    cells,
    footprints,
    niveles,
    zonas,
    ocupadoLayout,
    setAviso,
    limpiarMarcadas,
    setPendienteNombre,
    setSeleccion,
  } = opts

  if (celdasMarcadas.length === 0) {
    setAviso('Marca al menos una celda en el plano.')
    return
  }

  const espacio = normalizarCeldasEnteras(celdasMarcadas)
  if (espacio.length === 0) {
    setAviso('Marca al menos una celda en el plano.')
    return
  }
  if (!celdasConexas(espacio)) {
    setAviso('Las celdas deben formar una sola pieza unida (espacio interior).')
    return
  }
  const idsNivel = useCuartos.getState().cuartos
    .filter((r) => placed[r.id] && (niveles[r.id] ?? 0) === nivel)
    .map((r) => r.id)
  const anchorDe = (id: string) => cells[id]
  for (const c of espacio) {
    if (
      !celdaEnteraEsLibre(c, nivel, placed, cells, footprints, niveles, zonas, idsNivel, anchorDe)
    ) {
      setAviso('Alguna celda marcada ya no está libre.')
      return
    }
  }

  const celdas = espacio.map((c) => ({ col: c.col, row: c.row }))
  const muros = murosInicialesZona(celdas, nivel, ocupadoLayout, zonas)

  const n = zonas.filter((z) => z.nivel === nivel).length + 1
  const id = await zonasRepo.add({
    nombre: `Cuarto ${n}`,
    color: '#94a3b8',
    nivel,
    celdas,
    pisoTipo: null,
    pisoColor: '#a8a29e',
    muros,
  })
  limpiarMarcadas()
  setAviso(null)
  setPendienteNombre(id)
  setSeleccion({ tipo: 'zona', zonaId: id })
}

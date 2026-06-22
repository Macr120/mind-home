import { useCuartos } from '../state/cuartosStore'
import type { ZonaPlano } from '../data/db'
import { useLayout } from '../state/layoutStore'
import type { SeleccionPlano } from '../state/planosStore'
import { celdaEsExterior } from './planoGeometria'
import type { Cell, Footprint } from './walls'

/** Celdas exteriores (sin cuarto ni zona) en un nivel. */
export function celdasExteriorDelNivel(
  nivel: number,
  gridCols: number,
  gridRows: number,
  idsCuartosNivel: string[],
  cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
  zonas: ZonaPlano[],
  anchorDe: (id: string) => Cell | undefined,
): Cell[] {
  const out: Cell[] = []
  for (let col = 0; col < gridCols; col++) {
    for (let row = 0; row < gridRows; row++) {
      if (
        celdaEsExterior(col, row, nivel, idsCuartosNivel, cells, footprints, zonas, anchorDe)
      ) {
        out.push({ col, row })
      }
    }
  }
  return out
}

/** IDs de cuartos colocados en el nivel. */
export function cuartosEnNivel(nivel: number): string[] {
  const { placed, niveles } = useLayout.getState()
  return useCuartos.getState().cuartos
    .filter((r) => placed[r.id] && (niveles[r.id] ?? 0) === nivel)
    .map((r) => r.id)
}

export function conteoPisosInteriores(nivel: number, zonas: ZonaPlano[]) {
  const nCuartos = cuartosEnNivel(nivel).length
  const nZonas = zonas.filter((z) => z.nivel === nivel).length
  return { nCuartos, nZonas, total: nCuartos + nZonas }
}

/** Selección de todos los pisos interiores del nivel actual. */
export function seleccionPisosInteriores(): SeleccionPlano {
  return { tipo: 'pisos-interiores' }
}

/** Selección de todas las celdas exteriores del nivel. */
export function seleccionPisosExteriores(
  nivel: number,
  zonas: ZonaPlano[],
): SeleccionPlano {
  const layout = useLayout.getState()
  const ids = cuartosEnNivel(nivel)
  const celdas = celdasExteriorDelNivel(
    nivel,
    layout.gridCols,
    layout.gridRows,
    ids,
    layout.cells,
    layout.footprints,
    zonas,
    (id) => layout.cells[id],
  )
  return celdas.length > 0 ? { tipo: 'exterior', celdas } : null
}

export function esGrupoExteriorCompleto(
  seleccion: SeleccionPlano,
  nivel: number,
  zonas: ZonaPlano[],
): boolean {
  if (seleccion?.tipo !== 'exterior') return false
  const layout = useLayout.getState()
  const todas = celdasExteriorDelNivel(
    nivel,
    layout.gridCols,
    layout.gridRows,
    cuartosEnNivel(nivel),
    layout.cells,
    layout.footprints,
    zonas,
    (id) => layout.cells[id],
  )
  if (todas.length === 0 || seleccion.celdas.length !== todas.length) return false
  const setSel = new Set(seleccion.celdas.map((c) => `${c.col},${c.row}`))
  return todas.every((c) => setSel.has(`${c.col},${c.row}`))
}

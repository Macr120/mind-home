import { useCuartos } from '../state/cuartosStore'
import type { ZonaPlano } from '../data/db'
import { useLayout } from '../state/layoutStore'
import type { SeleccionPlano } from '../state/planosStore'
import type { Cell } from './walls'

/**
 * Todas las celdas de la rejilla del nivel. El piso exterior es una CAPA continua bajo
 * todo: se pinta también bajo los cuartos (en cuadrados queda oculto por su piso interior;
 * en triángulos/círculos el hueco fuera de la silueta deja ver esta capa), así "Cambiar
 * todas de golpe" cubre el suelo entero sin dejar huecos alrededor de las formas.
 */
function celdasExteriorDelNivel(gridCols: number, gridRows: number): Cell[] {
  const out: Cell[] = []
  for (let col = 0; col < gridCols; col++) {
    for (let row = 0; row < gridRows; row++) {
      out.push({ col, row })
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
  _nivel: number,
  _zonas: ZonaPlano[],
): SeleccionPlano {
  const layout = useLayout.getState()
  const celdas = celdasExteriorDelNivel(layout.gridCols, layout.gridRows)
  return celdas.length > 0 ? { tipo: 'exterior', celdas } : null
}

export function esGrupoExteriorCompleto(
  seleccion: SeleccionPlano,
  _nivel: number,
  _zonas: ZonaPlano[],
): boolean {
  if (seleccion?.tipo !== 'exterior') return false
  const layout = useLayout.getState()
  const todas = celdasExteriorDelNivel(layout.gridCols, layout.gridRows)
  if (todas.length === 0 || seleccion.celdas.length !== todas.length) return false
  const setSel = new Set(seleccion.celdas.map((c) => `${c.col},${c.row}`))
  return todas.every((c) => setSel.has(`${c.col},${c.row}`))
}

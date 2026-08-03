import { useLayout } from '../state/layoutStore'
import { usePlanos } from '../state/planosStore'
import { useHouse } from '../state/houseStore'
import { nivelBaseY } from './walls'
import { ContornoRegion3D } from './ContornoRegion3D'
import { colorCuadrante, cuadrantePorId, esBloqueAuto, rectMundo } from './cuadrantesMapa'

/**
 * Ghost del cuadrante enfocado sobre el mapa 3D, para no perder de vista dónde estás
 * trabajando al cambiar de modo en el editor. Los bloques de referencia (A1…) marcan
 * SOLO el borde; las zonas dibujadas pintan su área con su color.
 */
export function CuadranteGhost3D() {
  const editMode = useLayout((s) => s.editMode)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const propios = useLayout((s) => s.cuadrantes)
  const cuadranteActivo = usePlanos((s) => s.cuadranteActivo)
  const modo = usePlanos((s) => s.modo)
  const nivel = usePlanos((s) => s.nivel)
  const apilado = !useHouse((s) => s.explotado)

  const q = cuadrantePorId(cuadranteActivo, gridCols, gridRows, propios)
  if (!editMode || !q) return null

  // Los bloques de referencia son solo borde; las zonas pintan su área en el modo Grid,
  // pero fuera de él el suelo tiene que verse limpio para poder editarlo.
  const soloBorde = esBloqueAuto(q) || modo !== 'grid'

  return (
    <ContornoRegion3D
      region={rectMundo(q)}
      color={colorCuadrante(q, propios)}
      y={nivelBaseY(nivel, apilado) + 0.35}
      relleno={!soloBorde}
    />
  )
}

import { usePlanos } from '../state/planosStore'
import { useHouse } from '../state/houseStore'
import { cellToWorld, nivelBaseY, SIZE } from './walls'

/**
 * Resaltado 3D de las celdas/cuadrantes seleccionados para pintar piso (capa Pisos). El cuarto
 * o zona seleccionados ya se resaltan en su propio render; aquí solo las celdas exteriores/finas.
 */
export function PlanoPisosSeleccion3D() {
  const activo = usePlanos((s) => s.activo)
  const capa = usePlanos((s) => s.capa)
  const seleccion = usePlanos((s) => s.seleccion)
  const nivel = usePlanos((s) => s.nivel)
  const conTecho = useHouse((s) => s.conTecho)

  if (!activo || capa !== 'pisos' || seleccion?.tipo !== 'exterior') return null
  const y = nivelBaseY(nivel, conTecho) + 0.35

  return (
    <>
      {seleccion.celdas.map((c, i) => {
        const [x, , z] = cellToWorld(c.col, c.row)
        const entero = Number.isInteger(c.col) && Number.isInteger(c.row)
        const lado = entero ? SIZE - 0.1 : SIZE / 2 - 0.12
        return (
          <mesh key={i} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[lado, lado]} />
            <meshBasicMaterial color="#34d399" transparent opacity={0.55} depthWrite={false} />
          </mesh>
        )
      })}
    </>
  )
}

import { usePlanos } from '../state/planosStore'
import { useHouse } from '../state/houseStore'
import { cellToWorld, nivelBaseY, SIZE } from './walls'

const COLOR_SEL = '#34d399'
const GROSOR = 0.1 // grosor del borde

/**
 * Resaltado 3D de las celdas seleccionadas para pintar piso (capa Pisos). Se dibuja como un
 * CONTORNO (no un relleno) para no tapar la textura del piso ya aplicado: así, tras aplicar
 * un piso, sigue viéndose la celda con solo su borde de selección.
 */
export function PlanoPisosSeleccion3D() {
  const activo = usePlanos((s) => s.activo)
  const capa = usePlanos((s) => s.capa)
  const seleccion = usePlanos((s) => s.seleccion)
  const nivel = usePlanos((s) => s.nivel)
  const apilado = !useHouse((s) => s.explotado)

  if (!activo || capa !== 'pisos' || seleccion?.tipo !== 'exterior') return null
  const y = nivelBaseY(nivel, apilado) + 0.35

  return (
    <>
      {seleccion.celdas.map((c, i) => {
        const [x, , z] = cellToWorld(c.col, c.row)
        const entero = Number.isInteger(c.col) && Number.isInteger(c.row)
        const lado = entero ? SIZE - 0.06 : SIZE / 2 - 0.08
        const h = lado / 2
        // 4 barras finas formando el contorno de la celda (planas sobre el piso).
        const barra = (bx: number, bz: number, w: number, d: number, k: string) => (
          <mesh key={k} position={[x + bx, y, z + bz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w, d]} />
            <meshBasicMaterial color={COLOR_SEL} transparent opacity={0.9} depthWrite={false} />
          </mesh>
        )
        return (
          <group key={i}>
            {barra(0, -h, lado, GROSOR, 'n')}
            {barra(0, h, lado, GROSOR, 's')}
            {barra(-h, 0, GROSOR, lado, 'o')}
            {barra(h, 0, GROSOR, lado, 'e')}
          </group>
        )
      })}
    </>
  )
}

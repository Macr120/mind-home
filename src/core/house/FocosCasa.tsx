import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { useCiclo } from '../state/cicloStore'
import { useCuartos } from '../state/cuartosStore'
import { estadoCielo } from './cielo'
import { useTemaActivo } from './useTema'
import { roomCenter, nivelBaseY, WALL_H, SIZE_DEFAULT } from './walls'

/** Color cálido de los focos encendidos (el tema puede cambiarlo). */
const FOCO_COLOR = '#ffd9a0'

/**
 * Focos de la casa: de noche se enciende una luz cálida (con su bombilla visible) cerca
 * del techo de cada cuarto colocado. Se atenúan al anochecer/amanecer con `nocheFactor`
 * y desaparecen de día. Sin sombras (una docena de luces puntuales sale barato).
 */
export function FocosCasa() {
  const minutos = useCiclo((s) => s.minutos)
  const brilloFocos = useCiclo((s) => s.brilloFocos)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const sizes = useLayout((s) => s.sizes)
  const niveles = useLayout((s) => s.niveles)
  const apilado = !useHouse((s) => s.explotado)
  const cuartos = useCuartos((s) => s.cuartos)
  const tema = useTemaActivo()
  const focoColor = tema?.luz?.focos ?? FOCO_COLOR

  const { nocheFactor } = estadoCielo(minutos)
  // Se encienden también al atardecer/amanecer (no solo cuando es noche cerrada).
  // El dimmer de cuartos (brilloFocos) escala la intensidad final.
  const fuerza = Math.max(0, Math.min(1, nocheFactor)) * brilloFocos
  if (fuerza < 0.04) return null

  return (
    <>
      {cuartos
        .filter((r) => placed[r.id] && cells[r.id])
        .map((r) => {
          const [x, , z] = roomCenter(cells[r.id], sizes[r.id] ?? SIZE_DEFAULT)
          const y = nivelBaseY(niveles[r.id] ?? 0, apilado) + WALL_H * 0.78
          return (
            <group key={r.id} position={[x, y, z]}>
              {/* Intensidad alta (candelas físicas de Three.js); distance cubre todo el cuarto */}
              <pointLight color={focoColor} intensity={28 * fuerza} distance={16} decay={1.6} />
              <mesh>
                {/* Bombilla un poco más grande para que sea visible de noche */}
                <sphereGeometry args={[0.22, 12, 12]} />
                <meshBasicMaterial color={focoColor} toneMapped={false} />
              </mesh>
            </group>
          )
        })}
    </>
  )
}

import { useRef, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { J, N_CANALES, faseRepresentativa, poseEnFase, type PatronResuelto } from '../../rooms/ejercicio/anim/pose'
import type { EstadoMarcha } from './animacion'

/** El cuerpo se inclina y gira alrededor de su mitad, no de los pies. */
const PIVOTE_Y = 0.8
/** Brazo articulado de las mascotas (`Brazo` en Asistente3D): en Z, 0.1 = colgando, 2.4 = arriba. */
const BRAZO_REPOSO = 0.1
const BRAZO_ARRIBA = 2.4

/**
 * Baile o ejercicio para un cuerpo SIN el rig del gym (mascota integrada,
 * piezas de IA/preset o .glb): del mismo patrón en grados se saca lo que un
 * cuerpo entero sí puede hacer —saltar, inclinarse, girar, tumbarse— y se
 * reparte lo demás a lo que tenga: el brazo articulado de las mascotas sigue la
 * flexión del hombro y la marcha sintética balancea piernas/brazos de los
 * cuerpos de piezas con extremidades (y la ropa). Con sus limitaciones.
 */
export function CuerpoLibre({
  patron,
  estado,
  brazoRef,
  escala = 1,
  children,
}: {
  patron: PatronResuelto
  /** Marcha sintética que consume el cuerpo de dentro (piezas con extremidades, ropa). */
  estado: EstadoMarcha
  brazoRef?: RefObject<THREE.Group | null>
  escala?: number
  children: ReactNode
}) {
  const g = useRef<THREE.Group>(null)
  const out = useRef(new Float32Array(N_CANALES)).current
  const faseRef = useRef(faseRepresentativa(patron))

  useFrame((_st, dt) => {
    const grupo = g.current
    if (!grupo) return
    faseRef.current = (faseRef.current + Math.min(dt, 0.1) / patron.periodo) % 1
    poseEnFase(patron, faseRef.current, out)
    // Piernas: la que sube levanta el cuerpo; las rodillas dobladas lo agachan.
    const alza = Math.max(out[J.caderaDF], out[J.caderaIF], 0) / (Math.PI / 2)
    const agache = Math.max(0, Math.min(out[J.rodillaD], out[J.rodillaI])) / (Math.PI / 2)
    grupo.position.y = PIVOTE_Y * escala + (out[J.salto] + alza * 0.06 - agache * 0.1) * escala
    // Tumbarse (raíz) + inclinación del tronco + giro sobre la vertical, en YXZ como el rig.
    grupo.rotation.set(
      out[J.raizX] + out[J.troncoX] * 0.7,
      out[J.troncoY] + out[J.giro],
      out[J.raizZ] + out[J.troncoZ] * 0.7,
    )
    // Marcha sintética: las piernas se abren como la diferencia entre las dos caderas.
    estado.velocidad = 1
    estado.fase = Math.asin(THREE.MathUtils.clamp((out[J.caderaDF] - out[J.caderaIF]) / 1.2, -1, 1))
    if (brazoRef?.current) {
      const flex = THREE.MathUtils.clamp(Math.max(out[J.hombroIF], out[J.hombroDF]) / Math.PI, 0, 1)
      brazoRef.current.rotation.z = BRAZO_REPOSO + (BRAZO_ARRIBA - BRAZO_REPOSO) * flex
    }
  })

  return (
    <group
      ref={(o) => {
        g.current = o
        if (o) o.rotation.order = 'YXZ'
      }}
      position={[0, PIVOTE_Y * escala, 0]}
    >
      <group position={[0, -PIVOTE_Y * escala, 0]}>{children}</group>
    </group>
  )
}

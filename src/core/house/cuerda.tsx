import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { accionFrame, faseCuerda } from '../state/herramientaStore'

/**
 * Manos del cuerpo de cubos con la pose de la cuerda: hombro en (±0.42, 1.22, 0)
 * más 0.6 de brazo girado ANGULO_BRAZO_CUERDA (-0.6 rad) hacia el frente.
 * Las dos están sobre el mismo eje X, que es justo el eje de giro de la cuerda:
 * por eso sus extremos se quedan clavados en las manos al rotar el grupo.
 */
const MANO = { x: 0.42, y: 0.72, z: 0.34 }
/**
 * Radio del arco. Con el pivote a la altura de las manos (0.72), la cabeza
 * (1.72) queda 1.0 por encima y el suelo 0.72 por debajo: 1.2 deja holgura
 * visible sobre la cabeza y hunde el arco bajo los pies, donde el piso lo tapa.
 */
const RADIO = 1.2
/** Calibración: el arco pasa abajo cuando el brinco (offsetCuerda) está en su pico. */
const FASE_ARCO = 0

/**
 * Cuerda de saltar: un tubo que va de una mano a la otra abombándose hasta
 * `RADIO`, y que gira alrededor del eje de las manos pasando sobre la cabeza y
 * bajo los pies. Se monta dentro del grupo del Character y solo se ve mientras
 * se salta (fuera de eso los brazos no tienen la pose que la sujeta).
 */
export function CuerdaSaltar({ escala }: { escala: number }) {
  const g = useRef<THREE.Group>(null)
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI
      pts.push(new THREE.Vector3(Math.cos(a) * MANO.x * escala, Math.sin(a) * RADIO * escala, 0))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.02, 5, false)
  }, [escala])
  useFrame(() => {
    if (!g.current) return
    g.current.visible = accionFrame.cuerda
    g.current.rotation.x = faseCuerda(performance.now()) * Math.PI * 2 + FASE_ARCO
  })
  return (
    <group ref={g} position={[0, MANO.y * escala, MANO.z * escala]} visible={false}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
    </group>
  )
}

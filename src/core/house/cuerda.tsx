import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { faseCuerda } from '../state/herramientaStore'

// Calibración: desplaza el arco para que pase bajo los pies cuando el brinco
// (offsetCuerda) está en su pico (fase 0.5). Ajustar en vivo si se desfasa.
const FASE_ARCO = -Math.PI * 0.65

/**
 * Cuerda de saltar: un arco de torus (un torus completo girando sobre su propio
 * eje sería invisible) que gira alrededor del eje X del avatar, pasando sobre
 * la cabeza y bajo los pies. Se monta dentro del grupo del Character.
 */
export function CuerdaSaltar({ escala }: { escala: number }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (g.current) g.current.rotation.x = faseCuerda(performance.now()) * Math.PI * 2 + FASE_ARCO
  })
  return (
    <group position={[0, 0.85 * escala, 0]} ref={g}>
      {/* rotation.y=π/2 lleva el arco (plano XY del torus) al plano YZ del avatar */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.05 * escala, 0.02, 6, 28, Math.PI * 1.3]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
    </group>
  )
}

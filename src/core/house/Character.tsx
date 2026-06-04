import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useHouse, playerPos } from '../state/houseStore'
import { wallColliders } from './walls'

const RADIO = 0.4 // radio del personaje para colisiones

/** ¿La posición (x,z) cae dentro de alguna pared (inflada por el radio)? */
function chocado(x: number, z: number) {
  for (const c of wallColliders) {
    if (
      x > c.minX - RADIO &&
      x < c.maxX + RADIO &&
      z > c.minZ - RADIO &&
      z < c.maxZ + RADIO
    ) {
      return true
    }
  }
  return false
}

/**
 * Avatar cúbico estilo Roblox. Se desliza hacia el destino, pero las paredes
 * lo detienen: resuelve la colisión eje por eje para deslizarse por los muros.
 */
export function Character() {
  const ref = useRef<THREE.Group>(null)
  const target = useHouse((s) => s.target)

  useFrame(() => {
    if (!ref.current) return
    const cur = ref.current.position
    const nx = THREE.MathUtils.lerp(cur.x, target.x, 0.15)
    const nz = THREE.MathUtils.lerp(cur.z, target.z, 0.15)

    let x = cur.x
    let z = cur.z
    if (!chocado(nx, z)) x = nx
    if (!chocado(x, nz)) z = nz

    cur.set(x, 0, z)
    playerPos.copy(cur)

    if (Math.hypot(target.x - x, target.z - z) > 0.05) {
      ref.current.lookAt(target.x, 0, target.z)
    }
  })

  return (
    <group ref={ref} position={[-3, 0, 0]}>
      {/* piernas */}
      <mesh position={[-0.14, 0.3, 0]} castShadow>
        <boxGeometry args={[0.24, 0.6, 0.26]} />
        <meshStandardMaterial color="#2f5fd0" />
      </mesh>
      <mesh position={[0.14, 0.3, 0]} castShadow>
        <boxGeometry args={[0.24, 0.6, 0.26]} />
        <meshStandardMaterial color="#2f5fd0" />
      </mesh>
      {/* torso */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.6, 0.62, 0.3]} />
        <meshStandardMaterial color="#e23b3b" />
      </mesh>
      {/* brazos */}
      <mesh position={[-0.42, 0.92, 0]} castShadow>
        <boxGeometry args={[0.2, 0.6, 0.26]} />
        <meshStandardMaterial color="#e23b3b" />
      </mesh>
      <mesh position={[0.42, 0.92, 0]} castShadow>
        <boxGeometry args={[0.2, 0.6, 0.26]} />
        <meshStandardMaterial color="#e23b3b" />
      </mesh>
      {/* cabeza */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.44, 0.44, 0.44]} />
        <meshStandardMaterial color="#ffd23b" />
      </mesh>
    </group>
  )
}

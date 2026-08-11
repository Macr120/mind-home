import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

/**
 * Señales flotantes de un ser vivo de la casa: corazones al mimarlo, «!» de
 * hambre y «…» de aburrimiento. Las comparten los animales de la granja
 * (`granja.tsx`) y los objetos con el preset «Dale vida» (`Animado.tsx`).
 */

/** Corazones que suben y se desvanecen tras un mimo. */
export function Corazones({ y = 1.5 }: { y?: number }) {
  const g = useRef<THREE.Group>(null)
  const t0 = useRef<number | null>(null)
  useFrame((state) => {
    if (!g.current) return
    if (t0.current == null) t0.current = state.clock.elapsedTime
    const t = state.clock.elapsedTime - t0.current
    if (t > 1.5) {
      g.current.visible = false
      return
    }
    g.current.position.y = y + t * 0.9
    g.current.scale.setScalar(Math.max(0.01, 1 - t / 1.5))
  })
  return (
    <group ref={g} position={[0, y, 0]}>
      {[-0.24, 0, 0.24].map((x, i) => (
        <group key={x} position={[x, i === 1 ? 0.2 : 0, 0]}>
          {[-0.055, 0.055].map((dx) => (
            <mesh key={dx} position={[dx, 0.05, 0]}>
              <sphereGeometry args={[0.07, 8, 6]} />
              <meshStandardMaterial color="#fb7185" emissive="#e11d48" emissiveIntensity={0.5} />
            </mesh>
          ))}
          <mesh position={[0, -0.04, 0]} rotation-z={Math.PI}>
            <coneGeometry args={[0.1, 0.18, 4]} />
            <meshStandardMaterial color="#fb7185" emissive="#e11d48" emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Aviso de hambre: signo de admiración ámbar flotando encima. */
export function SenalHambre({ y = 1.75 }: { y?: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.09, 0.26, 0.09]} />
        <meshStandardMaterial color="#fbbf24" emissive="#b45309" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#fbbf24" emissive="#b45309" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

/** Aviso de aburrimiento: «…» gris flotando encima. */
export function SenalAburrido({ y = 1.75 }: { y?: number }) {
  return (
    <group position={[0, y, 0]}>
      {[-0.16, 0, 0.16].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <meshStandardMaterial color="#9ca3af" emissive="#4b5563" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  )
}

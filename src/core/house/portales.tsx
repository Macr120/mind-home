import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { create } from 'zustand'
import { sonar } from '../audio/sfx'

/**
 * Portales tipo "Portal": máximo 2 (azul y naranja); cruzar uno teletransporta
 * al otro. La colocación y el teleport los resuelve Character en su frame (ahí
 * viven colliders y playerPos); aquí el estado y el render de los aros.
 * Runtime, NO persistido.
 */
export interface Portal {
  x: number
  z: number
  color: 'azul' | 'naranja'
}

/** Cooldown del teleport: Character lo rearma al alejarse de ambos portales. */
export const portalFrame = { inhibido: false }

const COLORES = { azul: '#38bdf8', naranja: '#fb923c' } as const

interface PortalesState {
  portales: Portal[]
  colocar: (x: number, z: number) => void
  limpiar: () => void
}

export const usePortales = create<PortalesState>((set) => ({
  portales: [],
  // Alterna azul/naranja; el nuevo reemplaza al existente de su color (máx 2).
  colocar: (x, z) => {
    sonar('portal')
    set((s) => {
      const color = s.portales.at(-1)?.color === 'azul' ? 'naranja' : 'azul'
      return { portales: [...s.portales.filter((p) => p.color !== color), { x, z, color }] }
    })
  },
  limpiar: () => {
    portalFrame.inhibido = false
    set({ portales: [] })
  },
}))

/** Aro de pie tipo stargate: torus emisivo + disco translúcido, con vaivén leve. */
function AroPortal({ portal }: { portal: Portal }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (g.current) g.current.rotation.y = Math.sin(performance.now() * 0.0008) * 0.35
  })
  const color = COLORES[portal.color]
  return (
    <group position={[portal.x, 0, portal.z]} ref={g}>
      <group position={[0, 0.78, 0]}>
        <mesh>
          <torusGeometry args={[0.7, 0.04, 10, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.62, 24]} />
          <meshStandardMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

export function Portales() {
  const portales = usePortales((s) => s.portales)
  return (
    <>
      {portales.map((p) => (
        <AroPortal key={p.color} portal={p} />
      ))}
    </>
  )
}

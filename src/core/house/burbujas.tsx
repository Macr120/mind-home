import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { accionFrame } from '../state/herramientaStore'
import { playerPos } from '../state/playerPosition'
import { useDiseño } from '../state/disenoStore'
import { sonar } from '../audio/sfx'

/**
 * Burbujas: mientras el toggle está activo, emite una burbuja desde la cabeza
 * del avatar cada INTERVALO; suben con drift lateral y se desvanecen. Son un
 * componente de mundo para que queden atrás al caminar. Pool fijo mutable.
 */
const MAX_BURBUJAS = 14
const INTERVALO = 350 // ms
const VIDA = 2500 // ms

interface Burbuja {
  activa: boolean
  x: number
  y: number
  z: number
  r: number
  t0: number
  fase: number
}

const pool: Burbuja[] = Array.from({ length: MAX_BURBUJAS }, () => ({
  activa: false,
  x: 0,
  y: 0,
  z: 0,
  r: 0.1,
  t0: 0,
  fase: 0,
}))
let ultimaEmision = 0

export function Burbujas() {
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const escala = useDiseño((s) => s.avatar.escala)
  const limpio = useRef(true) // los meshes nacen ocultos

  useFrame((_, delta) => {
    const ahora = performance.now()
    // Toggle apagado y sin burbujas vivas (lo normal): cero trabajo por frame.
    if (!accionFrame.burbujas && !pool.some((b) => b.activa)) {
      if (!limpio.current) {
        limpio.current = true
        for (const m of meshes.current) if (m) m.visible = false
      }
      return
    }
    limpio.current = false
    if (accionFrame.burbujas && ahora - ultimaEmision > INTERVALO) {
      const b = pool.find((b) => !b.activa)
      if (b) {
        ultimaEmision = ahora
        sonar('burbuja')
        b.activa = true
        b.x = playerPos.x
        b.y = playerPos.y + 1.55 * escala
        b.z = playerPos.z
        b.r = 0.06 + Math.random() * 0.08
        b.t0 = ahora
        b.fase = Math.random() * Math.PI * 2
      }
    }
    pool.forEach((b, i) => {
      const m = meshes.current[i]
      if (!m) return
      if (!b.activa) {
        m.visible = false
        return
      }
      const vida = ahora - b.t0
      if (vida >= VIDA) {
        b.activa = false
        m.visible = false
        return
      }
      b.y += 0.5 * delta
      b.x += Math.sin(ahora * 0.002 + b.fase) * 0.15 * delta
      m.visible = true
      m.position.set(b.x, b.y, b.z)
      m.scale.setScalar(b.r / 0.1)
      const q = vida / VIDA
      ;(m.material as THREE.MeshStandardMaterial).opacity = q > 0.75 ? 0.28 * (1 - (q - 0.75) / 0.25) : 0.28
    })
  })

  return (
    <group>
      {pool.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el
          }}
          visible={false}
        >
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial
            color="#bae6fd"
            emissive="#7dd3fc"
            emissiveIntensity={0.25}
            transparent
            opacity={0.28}
            roughness={0.1}
          />
        </mesh>
      ))}
    </group>
  )
}

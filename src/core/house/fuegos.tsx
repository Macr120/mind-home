import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sonar } from '../audio/sfx'

/**
 * Fuegos artificiales: un cohete sube y explota en partículas emisivas de
 * colores (el Bloom del estilo de render las hace brillar). Pool fijo mutable
 * module-level; el componente de mundo solo mueve meshes (cero re-renders).
 */
const MAX_COHETES = 2
const N_PART = 24
const DUR_SUBIDA = 700 // ms
const DUR_EXPLOSION = 900 // ms
const ALTURA = 5
const RADIO_EXP = 1.6
const PALETA = ['#f87171', '#facc15', '#4ade80', '#60a5fa', '#e879f9']

interface Cohete {
  activo: boolean
  x: number
  z: number
  y0: number
  t0: number
  explotoT: number
  /** Dirección esférica fija de cada partícula (se sortea al explotar). */
  dirs: { x: number; y: number; z: number }[]
}

const cohetes: Cohete[] = Array.from({ length: MAX_COHETES }, () => ({
  activo: false,
  x: 0,
  z: 0,
  y0: 0,
  t0: 0,
  explotoT: 0,
  dirs: Array.from({ length: N_PART }, () => ({ x: 0, y: 1, z: 0 })),
}))

/** Lanza un cohete desde (x,y,z); si no hay slot libre se ignora. */
export function lanzarCohete(x: number, y: number, z: number) {
  const c = cohetes.find((c) => !c.activo)
  if (!c) return
  sonar('cohete')
  c.activo = true
  c.x = x
  c.z = z
  c.y0 = y + 0.5
  c.t0 = performance.now()
  c.explotoT = 0
}

export function Fuegos() {
  const bolas = useRef<(THREE.Mesh | null)[]>([])
  const parts = useRef<(THREE.Mesh | null)[]>([])

  useFrame(() => {
    const ahora = performance.now()
    cohetes.forEach((c, ci) => {
      const bola = bolas.current[ci]
      if (!c.activo) {
        if (bola) bola.visible = false
        for (let i = 0; i < N_PART; i++) {
          const m = parts.current[ci * N_PART + i]
          if (m) m.visible = false
        }
        return
      }
      if (!c.explotoT) {
        const q = (ahora - c.t0) / DUR_SUBIDA
        if (q >= 1) {
          c.explotoT = ahora
          sonar('explosion')
          for (const d of c.dirs) {
            const a = Math.random() * Math.PI * 2
            const b = Math.acos(Math.random() * 2 - 1)
            d.x = Math.sin(b) * Math.cos(a)
            d.y = Math.cos(b)
            d.z = Math.sin(b) * Math.sin(a)
          }
          if (bola) bola.visible = false
        } else if (bola) {
          bola.visible = true
          bola.position.set(c.x, c.y0 + ALTURA * (1 - (1 - q) * (1 - q)), c.z)
        }
        return
      }
      const q2 = (ahora - c.explotoT) / DUR_EXPLOSION
      if (q2 >= 1) {
        c.activo = false
        return
      }
      const cy = c.y0 + ALTURA
      const r = RADIO_EXP * (1 - (1 - q2) * (1 - q2))
      for (let i = 0; i < N_PART; i++) {
        const m = parts.current[ci * N_PART + i]
        if (!m) continue
        const d = c.dirs[i]
        m.visible = true
        m.position.set(c.x + d.x * r, cy + d.y * r - 0.5 * q2 * q2, c.z + d.z * r)
        ;(m.material as THREE.MeshStandardMaterial).opacity = 1 - q2
      }
    })
  })

  return (
    <group>
      {cohetes.map((_, ci) => (
        <group key={ci}>
          <mesh
            ref={(el) => {
              bolas.current[ci] = el
            }}
            visible={false}
          >
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
          {Array.from({ length: N_PART }, (_, i) => (
            <mesh
              key={i}
              ref={(el) => {
                parts.current[ci * N_PART + i] = el
              }}
              visible={false}
            >
              <sphereGeometry args={[0.045, 6, 6]} />
              <meshStandardMaterial
                color={PALETA[i % PALETA.length]}
                emissive={PALETA[i % PALETA.length]}
                emissiveIntensity={2.2}
                toneMapped={false}
                transparent
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

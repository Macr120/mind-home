import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sonar } from '../audio/sfx'

/**
 * Ráfagas del blaster: bolts cortos que viajan desde la boca del cañón hasta
 * el punto de impacto (calculado por Character con el raymarch de colisión).
 * Pool mutable module-level + un componente de mundo que solo mueve meshes y
 * togglea `visible` (cero re-renders), patrón accionFrame/monturaFrame.
 */
const MAX_BOLTS = 12
const MAX_CHISPAS = 4
const VEL_BOLT = 16 // unidades/s
const LARGO_BOLT = 0.45
const SEP_RAFAGA = 90 // ms entre bolts de una ráfaga
const DUR_CHISPA = 120 // ms

interface Bolt {
  activo: boolean
  x: number
  y: number
  z: number
  dx: number
  dz: number
  recorrido: number
  largoMax: number
  impacto: boolean
  nacimiento: number
}

const bolts: Bolt[] = Array.from({ length: MAX_BOLTS }, () => ({
  activo: false,
  x: 0,
  y: 0,
  z: 0,
  dx: 0,
  dz: 1,
  recorrido: 0,
  largoMax: 0,
  impacto: false,
  nacimiento: 0,
}))
const chispas = Array.from({ length: MAX_CHISPAS }, () => ({ x: 0, y: 0, z: 0, hasta: 0 }))

/** Encola una ráfaga de 3 bolts (nacimientos escalonados; si el pool está lleno, salen menos). */
export function dispararRafaga(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dz: number,
  largo: number,
  impacto: boolean,
) {
  const ahora = performance.now()
  let puestos = 0
  for (const b of bolts) {
    if (b.activo || puestos >= 3) continue
    b.activo = true
    b.x = ox
    b.y = oy
    b.z = oz
    b.dx = dx
    b.dz = dz
    b.recorrido = 0
    b.largoMax = largo
    b.impacto = impacto
    b.nacimiento = ahora + puestos * SEP_RAFAGA
    puestos++
  }
}

export function RafagasLaser() {
  const grupos = useRef<(THREE.Group | null)[]>([])
  const meshChispas = useRef<(THREE.Mesh | null)[]>([])

  useFrame((_, delta) => {
    const ahora = performance.now()
    bolts.forEach((b, i) => {
      const g = grupos.current[i]
      if (!g) return
      if (!b.activo || b.nacimiento > ahora) {
        g.visible = false
        return
      }
      b.recorrido += VEL_BOLT * delta
      if (b.recorrido >= b.largoMax) {
        b.activo = false
        g.visible = false
        if (b.impacto) {
          sonar('impacto')
          const c = chispas.find((c) => c.hasta <= ahora) ?? chispas[0]
          c.x = b.x + b.dx * b.largoMax
          c.y = b.y
          c.z = b.z + b.dz * b.largoMax
          c.hasta = ahora + DUR_CHISPA
        }
        return
      }
      // El bolt asoma desde la boca: su centro nunca retrocede detrás del cañón.
      const centro = Math.max(LARGO_BOLT / 2, b.recorrido - LARGO_BOLT / 2)
      g.visible = true
      g.position.set(b.x + b.dx * centro, b.y, b.z + b.dz * centro)
      g.rotation.y = Math.atan2(b.dx, b.dz)
    })
    chispas.forEach((c, i) => {
      const m = meshChispas.current[i]
      if (!m) return
      m.visible = c.hasta > ahora
      if (m.visible) m.position.set(c.x, c.y, c.z)
    })
  })

  return (
    <group>
      {bolts.map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            grupos.current[i] = el
          }}
          visible={false}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, LARGO_BOLT, 6]} />
            <meshStandardMaterial color="#fca5a5" emissive="#ef4444" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {chispas.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshChispas.current[i] = el
          }}
          visible={false}
        >
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshStandardMaterial color="#fff7ed" emissive="#fb923c" emissiveIntensity={2.8} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

/**
 * Marcas de derrape: ring buffer de quads negros que las llantas traseras van
 * dejando al derrapar (los registra `conducir` en Character.tsx) y que se
 * desvanecen solos. Módulo mutable + InstancedMesh: cero re-renders de React.
 */

const MAX_MARCAS = 160
/** Vida de cada marca en ms (el último tramo se encoge hasta desaparecer). */
const VIDA = 4000
const DESVANECER = 800

const marcas: { x: number; y: number; z: number; rot: number; k: number; t: number }[] = []
let idx = 0
let ultima = 0

/**
 * Deja las dos huellas traseras del vehículo (throttling interno ~45 ms).
 * `y` es la altura del suelo bajo el vehículo; `esc` es la escala visual del
 * vehículo (en carrera va encogido y las huellas también).
 */
export function registrarMarcasDerrape(x: number, y: number, z: number, heading: number, esc = 1) {
  const ahora = performance.now()
  if (ahora - ultima < 45) return
  ultima = ahora
  const c = Math.cos(heading)
  const s = Math.sin(heading)
  for (const lado of [-0.35, 0.35]) {
    // Offset local (lado, -0.5) rotado por el rumbo (atrás del asiento).
    const lx = lado * esc
    const lz = -0.5 * esc
    marcas[idx % MAX_MARCAS] = {
      x: x + lx * c + lz * s,
      y,
      z: z - lx * s + lz * c,
      rot: heading,
      k: esc,
      t: ahora,
    }
    idx++
  }
}

export function MarcasDerrape() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => {
    const o = new THREE.Object3D()
    o.rotation.order = 'YXZ'
    return o
  }, [])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    // Sin marcas vivas (lo normal fuera del derrape): cero trabajo por frame.
    if (marcas.length === 0 && m.count === 0) return
    const ahora = performance.now()
    let n = 0
    for (let i = 0; i < Math.min(marcas.length, MAX_MARCAS); i++) {
      const mk = marcas[i]
      const edad = ahora - mk.t
      if (edad > VIDA) continue
      const esc = Math.min(1, (VIDA - edad) / DESVANECER) * mk.k
      dummy.position.set(mk.x, mk.y, mk.z)
      dummy.rotation.set(-Math.PI / 2, mk.rot, 0)
      dummy.scale.set(esc, esc, 1)
      dummy.updateMatrix()
      m.setMatrixAt(n, dummy.matrix)
      n++
    }
    // Todas desvanecidas: vaciar el buffer (con idx a 0 para no dejar huecos)
    // habilita el early-return de arriba.
    if (n === 0 && marcas.length > 0) {
      marcas.length = 0
      idx = 0
    }
    m.count = n
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX_MARCAS]} frustumCulled={false}>
      <planeGeometry args={[0.16, 0.5]} />
      <meshBasicMaterial color="#0a0a0a" transparent opacity={0.35} depthWrite={false} />
    </instancedMesh>
  )
}

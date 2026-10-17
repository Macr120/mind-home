import { useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import type { BocaHabla } from '../../../src/core/house/bocaHabla'
import type { ExpresionId } from '../../../src/core/house/apariencia'
import type { Pieza3D } from '../../../src/core/chat/mascotas'
import { CUERPOS_PRESET } from '../../../src/core/house/cuerpos'
import { GESTOS, Pieza } from './Princesa3D'

/**
 * El alien verde, narrador de la guía de Matemáticas: el mismo cuerpo de piezas que el
 * preset «Alien» de la app (`CUERPOS_PRESET` en src/core/house/cuerpos.ts: torso de cajas,
 * cabeza redonda y dos ojos negros grandes), con los brazos articulados desde el hombro para
 * los gestos de la guía (los mismos que la princesa) y una boca que se abre con la narración.
 * `colores` cambia colores de sus piezas (Hobbies: el alien amarillo, como `CUERPO_COLORES` en la casa).
 */
const ALIEN = CUERPOS_PRESET.find((c) => c.id === 'alien')!
const PIEZAS = ALIEN.piezas()
/** Índices de los brazos dentro de las piezas (los de su `marcha`). */
const BRAZO_I = ALIEN.marcha?.brazoIzq ?? 3
const BRAZO_D = ALIEN.marcha?.brazoDer ?? 4
/** Centro de la cabeza (la esfera de 0,3 en y = 1,55). */
const CABEZA_Y = 1.55

export function Alien3D({ escena, boca, cara, colores }: { escena: string; boca: MutableRefObject<BocaHabla>; cara?: ExpresionId; colores?: Record<string, string> }) {
  const piezas = useMemo(() => (colores ? PIEZAS.map((p) => ({ ...p, color: colores[p.color] ?? p.color })) : PIEZAS), [colores])
  const cuerpo = useRef<THREE.Group>(null)
  const cabeza = useRef<THREE.Group>(null)
  const brazoD = useRef<THREE.Group>(null)
  const brazoI = useRef<THREE.Group>(null)
  const labios = useRef<THREE.Mesh>(null)
  const gesto = GESTOS[escena] ?? GESTOS.habla
  const sorpresa = cara === 'sorpresa'
  const feliz = cara === 'feliz' || cara === 'guino'

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const g = gesto(t)
    const k = 1 - Math.exp(-dt / 0.18)
    const mover = (r: THREE.Group | null, [z, x]: [number, number], signo: number) => {
      if (!r) return
      r.rotation.z += (signo * z - r.rotation.z) * k
      r.rotation.x += (x - r.rotation.x) * k
    }
    mover(brazoD.current, g.der, 1)
    mover(brazoI.current, g.izq, -1)
    if (cuerpo.current) {
      cuerpo.current.rotation.y += ((g.giro ?? 0) - cuerpo.current.rotation.y) * k
      cuerpo.current.rotation.x += ((g.inclina ?? 0) - cuerpo.current.rotation.x) * k
    }
    if (cabeza.current) cabeza.current.rotation.z += ((g.ladeo ?? 0) - cabeza.current.rotation.z) * k
    if (labios.current) {
      const abre = Math.min(1, boca.current.nivel * 1.6)
      labios.current.scale.y = sorpresa ? 1.3 : 0.25 + abre * 1.1
      labios.current.scale.x = sorpresa ? 0.8 : feliz ? 1.25 : 1
    }
  })

  // La cabeza y sus ojos giran juntos; los brazos, desde el hombro.
  const enCabeza = (p: Pieza3D) => p.pos[1] >= 1.4
  const brazo = (ref: MutableRefObject<THREE.Group | null>, i: number) => {
    const p = piezas[i]
    const hombro = p.pos[1] + (p.tam[1] ?? 0.6) / 2
    return (
      <group ref={ref} position={[p.pos[0], hombro, p.pos[2]]}>
        <Pieza p={p} pos={[0, p.pos[1] - hombro, 0]} />
      </group>
    )
  }

  return (
    <group ref={cuerpo} scale={1.1}>
      {piezas.map((p, i) => (i === BRAZO_I || i === BRAZO_D || enCabeza(p) ? null : <Pieza key={i} p={p} />))}
      <group ref={cabeza} position={[0, CABEZA_Y, 0]}>
        {piezas.map((p, i) => (enCabeza(p) ? <Pieza key={i} p={p} pos={[p.pos[0], p.pos[1] - CABEZA_Y, p.pos[2]]} /> : null))}
        {/* Boca, sobre la esfera de la cabeza, bajo los ojos */}
        <mesh ref={labios} position={[0, -0.13, 0.27]}>
          <sphereGeometry args={[0.04, 16, 12]} />
          <meshStandardMaterial color="#1f3b1a" />
        </mesh>
      </group>
      {brazo(brazoI, BRAZO_I)}
      {brazo(brazoD, BRAZO_D)}
    </group>
  )
}

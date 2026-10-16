import { useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import type { BocaHabla } from '../../../src/core/house/bocaHabla'
import type { ExpresionId } from '../../../src/core/house/apariencia'
import type { Pieza3D } from '../../../src/core/chat/mascotas'
import { CUERPOS_PRESET } from '../../../src/core/house/cuerpos'

/**
 * La princesa, narradora de las guías de Metas y Mindfulness: el mismo cuerpo de piezas que el
 * preset «Princesa» de la app (`CUERPOS_PRESET` en src/core/house/cuerpos.ts:
 * falda acampanada, corpiño, coletas y tiara), aquí con los dos brazos articulados
 * desde el hombro para los gestos de la guía, ojos y una boca que se abre con la narración.
 * `vestido` pinta el vestido de otro color (Mindfulness: verde).
 */
const PRINCESA = CUERPOS_PRESET.find((c) => c.id === 'princesa')!
/** Índices de los brazos dentro de las piezas (los de su `marcha`). */
const BRAZO_I = PRINCESA.marcha?.brazoIzq ?? 2
const BRAZO_D = PRINCESA.marcha?.brazoDer ?? 3

/** Ángulos de los brazos por gesto: [abre, adelante] de cada uno (rad; abre > 0 = hacia fuera, adelante < 0 = hacia la cámara). */
type Gesto = (t: number) => { der: [number, number]; izq: [number, number]; giro?: number; ladeo?: number; inclina?: number }
const GESTOS: Record<string, Gesto> = {
  habla: (t) => ({
    der: [0.35 + 0.22 * Math.sin(t * 2.1), -0.55 + 0.25 * Math.sin(t * 1.3)],
    izq: [0.25 + 0.15 * Math.sin(t * 1.7 + 1), -0.35 + 0.15 * Math.sin(t * 1.1)],
    ladeo: 0.04 * Math.sin(t * 0.9),
  }),
  saluda: (t) => ({ der: [2.55 + 0.3 * Math.sin(t * 6), -0.2], izq: [0.15, 0] }),
  senala: (t) => ({ der: [1.45 + 0.04 * Math.sin(t * 2.6), -0.35], izq: [0.15, -0.1], giro: 0.22 }),
  pensando: (t) => ({ der: [0.2, -0.3], izq: [-0.35, -2.05 + 0.04 * Math.sin(t * 1.5)], ladeo: -0.12, inclina: -0.1 }),
  rechaza: () => ({ der: [0.35, -1.75], izq: [0.1, 0], giro: -0.65, ladeo: -0.1 }),
  aprueba: (t) => ({ der: [2.2 + 0.08 * Math.sin(t * 3), -0.4], izq: [0.35, 0], giro: 0.2, ladeo: 0.06 }),
  orgulloso: () => ({ der: [0.65, 0.2], izq: [0.65, 0.2], inclina: -0.08 }),
  confundido: () => ({ der: [2.35, -0.75], izq: [0.2, -0.2], ladeo: 0.18 }),
  cansado: (t) => ({ der: [0.05, 0.1], izq: [0.05, 0.1], inclina: 0.18 + 0.02 * Math.sin(t), ladeo: 0.05 }),
  relajado: () => ({ der: [0.9, -0.3], izq: [0.9, -0.3], inclina: -0.15 }),
}

/** Una pieza del cuerpo con la misma geometría que en la app (modeloPersonalizado.tsx). */
function Pieza({ p, pos = p.pos }: { p: Pieza3D; pos?: [number, number, number] }) {
  return (
    <mesh position={pos} castShadow>
      {p.tipo === 'caja' ? (
        <boxGeometry args={[p.tam[0] ?? 0.3, p.tam[1] ?? 0.3, p.tam[2] ?? 0.3]} />
      ) : p.tipo === 'esfera' ? (
        <sphereGeometry args={[p.tam[0] ?? 0.2, 20, 20]} />
      ) : p.tipo === 'cono' ? (
        <coneGeometry args={[p.tam[0] ?? 0.2, p.tam[1] ?? 0.4, 16]} />
      ) : (
        <cylinderGeometry args={[p.tam[0] ?? 0.15, p.tam[1] ?? 0.15, p.tam[2] ?? 0.4, 24]} />
      )}
      <meshStandardMaterial color={p.color} roughness={0.75} />
    </mesh>
  )
}

export function Princesa3D({ escena, boca, cara, vestido }: { escena: string; boca: MutableRefObject<BocaHabla>; cara?: ExpresionId; vestido?: string }) {
  const piezas = useMemo(() => {
    const base = PRINCESA.piezas()
    // El color de fábrica del vestido es el de su falda (la primera pieza).
    const deFabrica = base[0].color
    return vestido ? base.map((p) => (p.color === deFabrica ? { ...p, color: vestido } : p)) : base
  }, [vestido])
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

  // La cabeza (caja de 0,4 en y = 1,5), las coletas y la tiara giran juntas; los brazos, desde el hombro.
  const enCabeza = (p: Pieza3D) => p.pos[1] >= 1.4
  const brazo = (ref: MutableRefObject<THREE.Group | null>, i: number) => {
    const p = piezas[i]
    const hombro = p.pos[1] + (p.tam[1] ?? 0.5) / 2
    return (
      <group ref={ref} position={[p.pos[0], hombro, p.pos[2]]}>
        <Pieza p={p} pos={[0, p.pos[1] - hombro, 0]} />
      </group>
    )
  }

  return (
    <group ref={cuerpo} scale={1.1}>
      {piezas.map((p, i) => (i === BRAZO_I || i === BRAZO_D || enCabeza(p) ? null : <Pieza key={i} p={p} />))}
      <group ref={cabeza} position={[0, 1.5, 0]}>
        {piezas.map((p, i) => (enCabeza(p) ? <Pieza key={i} p={p} pos={[p.pos[0], p.pos[1] - 1.5, p.pos[2]]} /> : null))}
        {/* Ojos (más abiertos con sorpresa) */}
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 0.03, 0.2]} scale={sorpresa ? 1.35 : 1}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color="#141414" />
          </mesh>
        ))}
        {/* Boca */}
        <mesh ref={labios} position={[0, -0.09, 0.205]}>
          <sphereGeometry args={[0.04, 16, 12]} />
          <meshStandardMaterial color="#9b2242" />
        </mesh>
        {/* Mejillas */}
        {[-0.13, 0.13].map((x) => (
          <mesh key={x} position={[x, -0.05, 0.201]}>
            <circleGeometry args={[0.035, 16]} />
            <meshStandardMaterial color="#f29bb5" />
          </mesh>
        ))}
      </group>
      {brazo(brazoI, BRAZO_I)}
      {brazo(brazoD, BRAZO_D)}
    </group>
  )
}

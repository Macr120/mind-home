import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import type { BocaHabla } from '../../../src/core/house/bocaHabla'
import type { ExpresionId } from '../../../src/core/house/apariencia'

/**
 * El mago, narrador de la guía de Idiomas: la misma figura que el asistente
 * mago de la app (`Mago` en src/core/house/Asistente3D.tsx: túnica cónica,
 * barba, sombrero y el orbe en la mano), aquí con los dos brazos articulados
 * para los gestos de la guía y una boca que se abre con la narración. No se
 * importa la pieza de la app: arrastra los stores de la casa.
 */
const TUNICA = '#5b3fb0'
const PIEL = '#f2c79a'
const BARBA = '#e8e8ee'

/**
 * Ángulos de los brazos por gesto: [abre, adelante] de cada uno (rad; abre > 0 = hacia fuera,
 * adelante < 0 = hacia la cámara). `orbe` es el brazo del orbe, a la derecha de la pantalla.
 */
type Gesto = (t: number) => { orbe: [number, number]; otro: [number, number]; giro?: number; ladeo?: number; inclina?: number }
const GESTOS: Record<string, Gesto> = {
  habla: (t) => ({
    orbe: [0.35 + 0.22 * Math.sin(t * 2.1), -0.55 + 0.25 * Math.sin(t * 1.3)],
    otro: [0.25 + 0.15 * Math.sin(t * 1.7 + 1), -0.35 + 0.15 * Math.sin(t * 1.1)],
    ladeo: 0.04 * Math.sin(t * 0.9),
  }),
  saluda: (t) => ({ orbe: [2.55 + 0.3 * Math.sin(t * 6), -0.2], otro: [0.15, 0] }),
  senala: (t) => ({ orbe: [1.45 + 0.04 * Math.sin(t * 2.6), -0.35], otro: [0.15, -0.1], giro: 0.22 }),
  pensando: (t) => ({ orbe: [0.2, -0.3], otro: [-0.35, -2.05 + 0.04 * Math.sin(t * 1.5)], ladeo: -0.12, inclina: -0.1 }),
  // «No»: la mano en alto como un alto y la cara para otro lado.
  rechaza: () => ({ orbe: [0.35, -1.75], otro: [0.1, 0], giro: -0.65, ladeo: -0.1 }),
  // «Sí»: el orbe arriba, contento, de frente.
  aprueba: (t) => ({ orbe: [2.2 + 0.08 * Math.sin(t * 3), -0.4], otro: [0.35, 0], giro: 0.2, ladeo: 0.06 }),
  orgulloso: () => ({ orbe: [0.65, 0.2], otro: [0.65, 0.2], inclina: -0.08 }),
  confundido: () => ({ orbe: [2.35, -0.75], otro: [0.2, -0.2], ladeo: 0.18 }),
  cansado: (t) => ({ orbe: [0.05, 0.1], otro: [0.05, 0.1], inclina: 0.18 + 0.02 * Math.sin(t), ladeo: 0.05 }),
  relajado: () => ({ orbe: [0.9, -0.3], otro: [0.9, -0.3], inclina: -0.15 }),
}

export function Mago3D({ escena, boca, cara }: { escena: string; boca: MutableRefObject<BocaHabla>; cara?: ExpresionId }) {
  const cuerpo = useRef<THREE.Group>(null)
  const cabeza = useRef<THREE.Group>(null)
  const brazoOrbe = useRef<THREE.Group>(null)
  const brazoOtro = useRef<THREE.Group>(null)
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
    mover(brazoOrbe.current, g.orbe, 1)
    mover(brazoOtro.current, g.otro, -1)
    if (cuerpo.current) {
      cuerpo.current.rotation.y += ((g.giro ?? 0) - cuerpo.current.rotation.y) * k
      cuerpo.current.rotation.x += ((g.inclina ?? 0) - cuerpo.current.rotation.x) * k
      // Levita como el mago de la casa: sube y baja sin tocar el piso.
      cuerpo.current.position.y = 0.1 + 0.06 * Math.sin(t * 2)
    }
    if (cabeza.current) cabeza.current.rotation.z += ((g.ladeo ?? 0) - cabeza.current.rotation.z) * k
    if (labios.current) {
      const abre = Math.min(1, boca.current.nivel * 1.6)
      labios.current.scale.y = sorpresa ? 1.3 : 0.25 + abre * 1.1
      labios.current.scale.x = sorpresa ? 0.8 : feliz ? 1.25 : 1
    }
  })

  const brazo = (ref: MutableRefObject<THREE.Group | null>, x: number, mano: React.ReactNode) => (
    <group ref={ref} position={[x, 0.92, 0]}>
      <mesh position={[0, -0.22, 0]} castShadow>
        <boxGeometry args={[0.14, 0.44, 0.14]} />
        <meshStandardMaterial color={TUNICA} roughness={0.85} />
      </mesh>
      <group position={[0, -0.46, 0]}>{mano}</group>
    </group>
  )

  return (
    <group ref={cuerpo} scale={1.25}>
      {/* Túnica cónica */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <coneGeometry args={[0.46, 1.0, 20]} />
        <meshStandardMaterial color={TUNICA} roughness={0.85} />
      </mesh>
      <group ref={cabeza} position={[0, 1.12, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.24, 24, 24]} />
          <meshStandardMaterial color={PIEL} roughness={0.7} />
        </mesh>
        {/* Ojos (más abiertos con sorpresa) */}
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 0.02, 0.2]} scale={sorpresa ? 1.35 : 1}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        ))}
        {/* Cejas blancas */}
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, sorpresa ? 0.12 : 0.09, 0.2]} rotation={[0, 0, x * (sorpresa ? -2 : 1.5)]}>
            <boxGeometry args={[0.09, 0.022, 0.03]} />
            <meshStandardMaterial color={BARBA} />
          </mesh>
        ))}
        {/* Boca */}
        <mesh ref={labios} position={[0, -0.08, 0.215]}>
          <sphereGeometry args={[0.05, 16, 12]} />
          <meshStandardMaterial color="#5a1f2a" />
        </mesh>
        {/* Barba */}
        <mesh position={[0, -0.24, 0.12]}>
          <coneGeometry args={[0.16, 0.34, 12]} />
          <meshStandardMaterial color={BARBA} roughness={0.95} />
        </mesh>
        {/* Bigote */}
        <mesh position={[0, -0.04, 0.22]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.022, 0.12, 4, 8]} />
          <meshStandardMaterial color={BARBA} />
        </mesh>
        {/* Sombrero: ala + cono */}
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.05, 24]} />
          <meshStandardMaterial color={TUNICA} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow>
          <coneGeometry args={[0.26, 0.7, 24]} />
          <meshStandardMaterial color={TUNICA} roughness={0.85} />
        </mesh>
      </group>
      {brazo(brazoOtro, -0.32, null)}
      {brazo(
        brazoOrbe,
        0.32,
        <mesh>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#7ee0ff" emissive="#39bfff" emissiveIntensity={0.8} />
        </mesh>,
      )}
    </group>
  )
}

import { Suspense, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { playerPos } from '../state/houseStore'
import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { useLayout } from '../state/layoutStore'
import { SPACING } from './walls'
import { COLOR_FORMA, type MascotaId, type Asistente, type Pieza3D } from '../chat/mascotas'
import { ModeloPiezas, ModeloGLB } from './modeloPersonalizado'

/**
 * Los asistentes (mago/gato/perro/…) como personajes EN el mapa 3D.
 *
 * - El ACTIVO no sigue al avatar: aparece en un punto aleatorio al abrir el
 *   mapa y se reubica al último lugar donde le pediste algo (estado `destino`).
 * - Siempre miran al jugador (cara +Z apuntando al player).
 * - No salen de los límites del mapa.
 * - El activo levanta la mano cuando el usuario manda un mensaje (`saludando`)
 *   y proyecta su cabeza a coordenadas de pantalla para anclar la burbuja 2D.
 * - Los demás asistentes con `enMapa` aparecen como compañeros que solo flotan.
 */

const ALTURA_FLOTE = 1.0
const _screen = new THREE.Vector3()

export function Asistente3D() {
  const mascotaId = useMascota((s) => s.mascota)
  const lista = useAsistentes((s) => s.lista)
  const activo = lista.find((a) => a.id === mascotaId) ?? lista[0]
  return (
    <>
      {activo && <AsistenteActivo asistente={activo} />}
      {lista
        .filter((a) => a.enMapa && a.id !== activo?.id)
        .map((a) => (
          <Companero key={a.id} asistente={a} />
        ))}
    </>
  )
}

function AsistenteActivo({ asistente }: { asistente: Asistente }) {
  const group = useRef<THREE.Group>(null)
  const brazo = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  const { gridCols, gridRows } = useLayout()
  const colocado = useRef(false)

  useFrame((state) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const st = useMascota.getState()

    // Límites reales del mapa (media extensión de la cuadrícula menos margen).
    const halfW = (gridCols * SPACING) / 2 - 1.0
    const halfH = (gridRows * SPACING) / 2 - 1.0

    // Primera vez: aparecer en un punto aleatorio del mapa.
    if (!colocado.current) {
      const rx = (Math.random() * 2 - 1) * halfW
      const rz = (Math.random() * 2 - 1) * halfH
      st.irA(rx, rz)
      g.position.set(rx, ALTURA_FLOTE, rz)
      colocado.current = true
    }

    // Destino actual (último lugar donde le pediste algo); se acerca con lerp.
    const dest = st.destino
    if (dest) {
      const tx = Math.max(-halfW, Math.min(halfW, dest.x))
      const tz = Math.max(-halfH, Math.min(halfH, dest.z))
      g.position.x = THREE.MathUtils.lerp(g.position.x, tx, 0.05)
      g.position.z = THREE.MathUtils.lerp(g.position.z, tz, 0.05)
    }
    g.position.y = ALTURA_FLOTE + Math.sin(t * 2) * 0.12

    // La cara (+Z) mira siempre al jugador: atan2(fx, fz) da el ángulo correcto.
    g.rotation.y = Math.atan2(playerPos.x - g.position.x, playerPos.z - g.position.z)

    // Levantar la mano al saludar (lerp del ángulo + vaivén).
    if (brazo.current) {
      const objetivo = st.saludando ? 2.4 : 0.1
      const vaiven = st.saludando ? Math.sin(t * 12) * 0.18 : 0
      brazo.current.rotation.z = THREE.MathUtils.lerp(
        brazo.current.rotation.z,
        objetivo + vaiven,
        0.25,
      )
    }

    // Proyectar la cabeza a pantalla SOLO mientras habla o piensa (evita re-render constante).
    if (st.mensaje || st.pensando) {
      _screen.set(g.position.x, g.position.y + 1.5, g.position.z)
      _screen.project(camera)
      const x = (_screen.x * 0.5 + 0.5) * size.width
      const y = (-_screen.y * 0.5 + 0.5) * size.height
      const visible = _screen.z < 1 && Number.isFinite(x) && Number.isFinite(y)
      st.setScreen(x, y, visible)
    }
  })

  return (
    <group ref={group}>
      <ModeloMascota
        forma={asistente.forma}
        color={asistente.color}
        modelo3d={asistente.modelo3d}
        modeloGlb={asistente.modeloGlb}
        brazoRef={brazo}
      />
    </group>
  )
}

/** Compañero en el mapa (asistente con `enMapa` que no es el activo): solo flota y mira al jugador. */
function Companero({ asistente }: { asistente: Asistente }) {
  const group = useRef<THREE.Group>(null)
  const brazo = useRef<THREE.Group>(null)
  const { gridCols, gridRows } = useLayout()
  const colocado = useRef(false)

  useFrame((state) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const halfW = (gridCols * SPACING) / 2 - 1.0
    const halfH = (gridRows * SPACING) / 2 - 1.0
    if (!colocado.current) {
      g.position.set((Math.random() * 2 - 1) * halfW, ALTURA_FLOTE, (Math.random() * 2 - 1) * halfH)
      colocado.current = true
    }
    // Desfase por posición para que no floten todos al unísono.
    g.position.y = ALTURA_FLOTE + Math.sin(t * 2 + g.position.x) * 0.12
    g.rotation.y = Math.atan2(playerPos.x - g.position.x, playerPos.z - g.position.z)
  })

  return (
    <group ref={group}>
      <ModeloMascota
        forma={asistente.forma}
        color={asistente.color}
        modelo3d={asistente.modelo3d}
        modeloGlb={asistente.modeloGlb}
        brazoRef={brazo}
      />
    </group>
  )
}

/**
 * Modelo 3D del asistente. Prioridad: .glb subido por el usuario →
 * piezas generadas por IA → forma base integrada (mago/gato/…).
 */
function ModeloMascota({
  forma,
  color,
  modelo3d,
  modeloGlb,
  brazoRef,
}: {
  forma: MascotaId
  color?: string
  modelo3d?: Pieza3D[]
  modeloGlb?: Blob
  brazoRef: RefObject<THREE.Group | null>
}) {
  if (modeloGlb) {
    return (
      <Suspense fallback={null}>
        <ModeloGLB blob={modeloGlb} />
      </Suspense>
    )
  }
  if (modelo3d && modelo3d.length > 0) return <ModeloPiezas piezas={modelo3d} />
  switch (forma) {
    case 'gato':
      return <Gato color={color} brazoRef={brazoRef} />
    case 'perro':
      return <Perro color={color} brazoRef={brazoRef} />
    case 'buho':
      return <Buho color={color} brazoRef={brazoRef} />
    case 'robot':
      return <Robot color={color} brazoRef={brazoRef} />
    default:
      return <Mago color={color} brazoRef={brazoRef} />
  }
}

/** Brazo articulado genérico: grupo con pivote en el hombro; al rotar en Z se levanta. */
function Brazo({
  brazoRef,
  hombro,
  color,
  mano,
}: {
  brazoRef: RefObject<THREE.Group | null>
  hombro: [number, number, number]
  color: string
  mano?: React.ReactNode
}) {
  return (
    <group ref={brazoRef} position={hombro}>
      <mesh position={[0, -0.22, 0]} castShadow>
        <boxGeometry args={[0.14, 0.44, 0.14]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {mano && <group position={[0, -0.46, 0]}>{mano}</group>}
    </group>
  )
}

const PIEL = '#f2c79a'

interface PropsModelo {
  brazoRef: RefObject<THREE.Group | null>
  /** Color principal del cuerpo (vacío = el de la forma). */
  color?: string
}

function Mago({ brazoRef, color }: PropsModelo) {
  const tunica = color || COLOR_FORMA.mago
  return (
    <group>
      {/* Túnica cónica */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <coneGeometry args={[0.46, 1.0, 10]} />
        <meshStandardMaterial color={tunica} />
      </mesh>
      {/* Cabeza */}
      <mesh position={[0, 1.12, 0]} castShadow>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshStandardMaterial color={PIEL} />
      </mesh>
      {/* Barba */}
      <mesh position={[0, 0.92, 0.12]}>
        <coneGeometry args={[0.16, 0.34, 8]} />
        <meshStandardMaterial color="#e8e8ee" />
      </mesh>
      {/* Sombrero: ala + cono */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.05, 12]} />
        <meshStandardMaterial color={tunica} />
      </mesh>
      <mesh position={[0, 1.62, 0]} castShadow>
        <coneGeometry args={[0.26, 0.7, 12]} />
        <meshStandardMaterial color={tunica} />
      </mesh>
      {/* Ojos */}
      <Ojos />
      {/* Brazo izquierdo fijo */}
      <mesh position={[-0.32, 0.7, 0]}>
        <boxGeometry args={[0.14, 0.44, 0.14]} />
        <meshStandardMaterial color={tunica} />
      </mesh>
      {/* Brazo derecho articulado con orbe mágico */}
      <Brazo
        brazoRef={brazoRef}
        hombro={[0.32, 0.92, 0]}
        color={tunica}
        mano={
          <mesh>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color="#7ee0ff" emissive="#39bfff" emissiveIntensity={0.7} />
          </mesh>
        }
      />
    </group>
  )
}

function Gato({ brazoRef, color }: PropsModelo) {
  const pelaje = color || COLOR_FORMA.gato
  return (
    <group>
      {/* Cuerpo */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.5, 0.62, 0.42]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      {/* Cabeza */}
      <mesh position={[0, 1.08, 0.02]} castShadow>
        <boxGeometry args={[0.46, 0.42, 0.4]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      {/* Orejas */}
      <mesh position={[-0.16, 1.36, 0]}>
        <coneGeometry args={[0.1, 0.2, 4]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      <mesh position={[0.16, 1.36, 0]}>
        <coneGeometry args={[0.1, 0.2, 4]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      {/* Cola */}
      <mesh position={[0, 0.7, -0.3]} rotation={[0.6, 0, 0]}>
        <boxGeometry args={[0.1, 0.5, 0.1]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      <Ojos y={1.08} z={0.21} />
      {/* Pata izquierda fija */}
      <mesh position={[-0.28, 0.36, 0.1]}>
        <boxGeometry args={[0.14, 0.4, 0.14]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      {/* Pata derecha articulada (saluda) */}
      <Brazo brazoRef={brazoRef} hombro={[0.28, 0.62, 0.1]} color={pelaje} />
    </group>
  )
}

function Perro({ brazoRef, color }: PropsModelo) {
  const pelaje = color || COLOR_FORMA.perro
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.54, 0.62, 0.46]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      <mesh position={[0, 1.06, 0.04]} castShadow>
        <boxGeometry args={[0.48, 0.44, 0.44]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      {/* Hocico */}
      <mesh position={[0, 0.98, 0.3]}>
        <boxGeometry args={[0.22, 0.2, 0.18]} />
        <meshStandardMaterial color="#8a5e34" />
      </mesh>
      {/* Orejas caídas */}
      <mesh position={[-0.26, 1.18, 0.02]}>
        <boxGeometry args={[0.1, 0.32, 0.16]} />
        <meshStandardMaterial color="#8a5e34" />
      </mesh>
      <mesh position={[0.26, 1.18, 0.02]}>
        <boxGeometry args={[0.1, 0.32, 0.16]} />
        <meshStandardMaterial color="#8a5e34" />
      </mesh>
      <Ojos y={1.12} z={0.23} />
      <mesh position={[-0.28, 0.36, 0.1]}>
        <boxGeometry args={[0.15, 0.4, 0.15]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      <Brazo brazoRef={brazoRef} hombro={[0.28, 0.62, 0.1]} color={pelaje} />
    </group>
  )
}

function Buho({ brazoRef, color }: PropsModelo) {
  const plumas = color || COLOR_FORMA.buho
  return (
    <group>
      {/* Cuerpo ovoide */}
      <mesh position={[0, 0.7, 0]} scale={[1, 1.25, 1]} castShadow>
        <sphereGeometry args={[0.42, 16, 16]} />
        <meshStandardMaterial color={plumas} />
      </mesh>
      {/* Ojos grandes */}
      <mesh position={[-0.16, 0.92, 0.34]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#fdfdf5" />
      </mesh>
      <mesh position={[0.16, 0.92, 0.34]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#fdfdf5" />
      </mesh>
      <mesh position={[-0.16, 0.92, 0.45]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.16, 0.92, 0.45]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* Pico */}
      <mesh position={[0, 0.78, 0.42]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.07, 0.18, 4]} />
        <meshStandardMaterial color="#e0a73a" />
      </mesh>
      {/* Ala izquierda fija */}
      <mesh position={[-0.42, 0.7, 0]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.12, 0.5, 0.3]} />
        <meshStandardMaterial color="#6b4f38" />
      </mesh>
      {/* Ala derecha articulada (saluda) */}
      <Brazo brazoRef={brazoRef} hombro={[0.42, 0.85, 0]} color="#6b4f38" />
    </group>
  )
}

function Robot({ brazoRef, color }: PropsModelo) {
  const metal = color || COLOR_FORMA.robot
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.36]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.44, 0.4, 0.36]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Antena */}
      <mesh position={[0, 1.34, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.16, 6]} />
        <meshStandardMaterial color="#5a6b7a" />
      </mesh>
      <mesh position={[0, 1.46, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ff5d5d" emissive="#ff2d2d" emissiveIntensity={0.6} />
      </mesh>
      {/* Visor de ojos */}
      <mesh position={[0, 1.06, 0.19]}>
        <boxGeometry args={[0.3, 0.12, 0.02]} />
        <meshStandardMaterial color="#0c1014" emissive="#39bfff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.34, 0.7, 0]}>
        <boxGeometry args={[0.13, 0.44, 0.13]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.3} />
      </mesh>
      <Brazo brazoRef={brazoRef} hombro={[0.32, 0.85, 0]} color={metal} />
    </group>
  )
}

/** Par de ojitos mirando al frente (−Z). */
function Ojos({ y = 1.14, z = 0.2 }: { y?: number; z?: number }) {
  return (
    <group>
      <mesh position={[-0.09, y, z]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.09, y, z]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  )
}

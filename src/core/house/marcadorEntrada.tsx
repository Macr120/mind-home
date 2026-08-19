import { useRef, type ReactElement } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { useDiseño } from '../state/disenoStore'
import { usePendientesCasa } from '../state/pendientesStore'
import type { TemaId } from './temas'

/** Marcador por defecto (sin tema): esfera verde, roja con misiones pendientes. */
function MarcadorDefault({ pendiente }: { pendiente: boolean }) {
  const c = pendiente ? '#ef4444' : '#22c55e'
  return (
    <mesh>
      <sphereGeometry args={[0.16, 16, 16]} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.9} toneMapped={false} />
    </mesh>
  )
}

/** Medieval: bola de fuego. */
function MarcadorMedieval() {
  const llamas = useRef<Group>(null)
  useFrame((s) => {
    if (llamas.current) llamas.current.rotation.y = s.clock.elapsedTime * 2.5
  })
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.17, 14, 14]} />
        <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      <group ref={llamas}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.12, 0.08, Math.sin(a) * 0.12]} rotation={[0.4, a, 0]}>
              <coneGeometry args={[0.07, 0.22, 5]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} toneMapped={false} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

/** Espacio: órbita luminosa. */
function MarcadorEspacio() {
  const anillo = useRef<Mesh>(null)
  useFrame((s) => {
    if (anillo.current) anillo.current.rotation.z = s.clock.elapsedTime * 1.8
  })
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#e0f2fe" emissive="#22d3ee" emissiveIntensity={1} toneMapped={false} />
      </mesh>
      <mesh ref={anillo} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.025, 8, 20]} />
        <meshStandardMaterial color="#67e8f9" emissive="#06b6d4" emissiveIntensity={0.7} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Terror: calavera. */
function MarcadorTerror() {
  return (
    <group scale={0.95}>
      <mesh>
        <sphereGeometry args={[0.17, 12, 12]} />
        <meshStandardMaterial color="#e7e5e4" emissive="#7f1d1d" emissiveIntensity={0.15} toneMapped={false} />
      </mesh>
      <mesh position={[-0.06, 0.03, 0.14]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#1c1917" emissive="#450a0a" emissiveIntensity={0.3} toneMapped={false} />
      </mesh>
      <mesh position={[0.06, 0.03, 0.14]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#1c1917" emissive="#450a0a" emissiveIntensity={0.3} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.07, 0.12]}>
        <boxGeometry args={[0.1, 0.04, 0.06]} />
        <meshStandardMaterial color="#292524" toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Barbie: corazón brillante. */
function MarcadorBarbie() {
  const c = '#ff5fa2'
  return (
    <group scale={0.55}>
      <mesh position={[-0.15, 0.1, 0]}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshStandardMaterial color={c} emissive="#ff7ab8" emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
      <mesh position={[0.15, 0.1, 0]}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshStandardMaterial color={c} emissive="#ff7ab8" emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.12, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.28, 0.35, 4]} />
        <meshStandardMaterial color={c} emissive="#ff7ab8" emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Vaquero: estrella sheriff. */
function MarcadorVaquero() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.17, 0.17, 0.05, 5]} />
      <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.5} metalness={0.4} toneMapped={false} />
    </mesh>
  )
}

/** Cyberpunk: diamante neón. */
function MarcadorCyberpunk() {
  const ref = useRef<Mesh>(null)
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 2
  })
  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.2, 0]} />
      <meshStandardMaterial color="#d946ef" emissive="#a855f7" emissiveIntensity={1} toneMapped={false} />
    </mesh>
  )
}

/** Navidad: adorno esférico. */
function MarcadorNavidad() {
  const ref = useRef<Group>(null)
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = Math.sin(s.clock.elapsedTime) * 0.3
  })
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.16, 14, 14]} />
        <meshStandardMaterial color="#dc2626" emissive="#b91c1c" emissiveIntensity={0.5} metalness={0.3} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[0.06, 0.08, 0.06]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

const MARCADORES: Record<TemaId, () => ReactElement> = {
  medieval: MarcadorMedieval,
  espacio: MarcadorEspacio,
  terror: MarcadorTerror,
  barbie: MarcadorBarbie,
  vaquero: MarcadorVaquero,
  cyberpunk: MarcadorCyberpunk,
  navidad: MarcadorNavidad,
}

/** El aviso de los marcadores CON tema: conservan su forma y ganan un aro rojo. */
function AroPendiente() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.3, 0.035, 8, 24]} />
      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} toneMapped={false} />
    </mesh>
  )
}

function MarcadorVisual({ tema, pendiente }: { tema: TemaId | null; pendiente: boolean }) {
  if (!tema) return <MarcadorDefault pendiente={pendiente} />
  const Comp = MARCADORES[tema]
  return (
    <>
      <Comp />
      {pendiente && <AroPendiente />}
    </>
  )
}

/**
 * Indicador flotante sobre el mueble principal: forma según el tema de la casa.
 * Sin tema → esfera verde clásica.
 *
 * El color avisa de las misiones del día de esa app: verde si no queda ninguna,
 * rojo si quedan (el mismo criterio que el globo rojo de la pantalla de inicio).
 */
export function MarcadorEntrada({ y, appId }: { y: number; appId?: string }) {
  const tema = useDiseño((s) => s.temaGlobal)
  // Booleano, no el objeto: el marcador solo se repinta al pasar de verde a rojo.
  const pendiente = usePendientesCasa((s) => (appId ? (s.porApp[appId]?.cuantos ?? 0) : 0) > 0)
  const ref = useRef<Group>(null)
  useFrame((s) => {
    if (ref.current) ref.current.position.y = y + Math.sin(s.clock.elapsedTime * 2.2) * 0.12
  })
  return (
    <group ref={ref} position={[0, y, 0]}>
      <MarcadorVisual tema={tema} pendiente={pendiente} />
    </group>
  )
}

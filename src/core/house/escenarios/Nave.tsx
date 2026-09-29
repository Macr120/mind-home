import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { esGamaBaja } from '../../gamaDispositivo'
import { mezclar } from '../temas'
import { Desfile, useRecorrido } from './fondoMovil'
import type { PropsEscenario } from './EscenarioVivo'

/** Planeta lejano: cruza muy despacio por debajo (lento = lejos, la cámara no tiene perspectiva). */
function Planeta({ x0, z, y, r, color, anillo, largo }: { x0: number; z: number; y: number; r: number; color: string; anillo?: boolean; largo: number }) {
  const ref = useRef<THREE.Group>(null)
  const recorrido = useRecorrido()
  useFrame(() => {
    if (!ref.current) return
    const d = (((x0 + recorrido.d * 0.06) % largo) + largo) % largo
    ref.current.position.x = largo / 2 - d
  })
  return (
    <group ref={ref} position={[0, y, z]}>
      <mesh>
        <sphereGeometry args={[r, 32, 24]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {anillo && (
        <mesh rotation={[Math.PI / 2.4, 0, 0.3]}>
          <ringGeometry args={[r * 1.35, r * 1.9, 48]} />
          <meshBasicMaterial color={mezclar(color, '#ffffff', 0.4)} transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

/** Tobera con brillo que parpadea. */
function Tobera({ pos, r, color }: { pos: [number, number, number]; r: number; color: string }) {
  const llama = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    if (!llama.current) return
    const t = s.clock.elapsedTime * 18 + pos[2] * 3
    llama.current.scale.set(1 + Math.sin(t) * 0.12 + Math.sin(t * 2.3) * 0.08, 1, 1)
  })
  return (
    <group position={pos}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r * 0.8, r, r * 1.6, 20]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.35} />
      </mesh>
      {/* Llama: cono apuntando hacia atrás (−X). */}
      <mesh ref={llama} position={[-r * 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[r * 0.75, r * 2.6, 20, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.75} toneMapped={false} />
      </mesh>
      <mesh position={[-r * 0.81, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <circleGeometry args={[r * 0.72, 20]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  )
}

function LuzAla({ pos, color, fase }: { pos: [number, number, number]; color: string; fase: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    if (ref.current) ref.current.visible = Math.sin(s.clock.elapsedTime * 3 + fase) > 0.2
  })
  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[0.18, 10, 10]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
}

export default function Nave({ L, W, tema }: PropsEscenario) {
  const casco = tema.shell.muroExt
  const oscuro = mezclar(casco, '#0b0f19', 0.55)
  const acento = tema.paleta[1] ?? '#38bdf8'
  const pocos = esGamaBaja()

  const estrella = useMemo(() => new THREE.BoxGeometry(1, 0.07, 0.07), [])
  const matEstrella = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e2e8f0', toneMapped: false }), [])
  const matEstrellaAzul = useMemo(() => new THREE.MeshBasicMaterial({ color: mezclar(acento, '#ffffff', 0.5), toneMapped: false }), [acento])
  const lados = useMemo<[number, number][]>(() => [[-W / 2 - 110, -W / 2 - 14], [W / 2 + 14, W / 2 + 110]], [W])
  const bajo = useMemo<[number, number][]>(() => [[-W * 1.5 - 20, W * 1.5 + 20]], [W])

  // Proa: pirámide de 4 caras aplanada.
  const proa = Math.min(16, Math.max(3, W * 0.55))
  // La proa se aplana hasta ~1.3 de alto aunque la casa sea muy ancha.
  const aplanado = Math.min(0.42, 1.3 / (W / 2))
  const alaLargo = Math.min(16, L * 0.55)
  const alaAncho = Math.min(12, W * 0.56)
  const rToberas = Math.min(1.3, Math.max(0.5, W * 0.12))
  const nToberas = W > 14 ? 3 : 2

  return (
    <>
      {/* Estelas de estrellas (a los lados y por debajo). */}
      <Desfile geometria={estrella} material={matEstrella} n={pocos ? 110 : 240} largo={240} bandas={lados} y={[-45, 3]} escala={[0.5, 1.3]} estirarX={9} girar={false} semilla={3} />
      <Desfile geometria={estrella} material={matEstrellaAzul} n={pocos ? 60 : 130} largo={240} bandas={bajo} y={[-55, -8]} escala={[0.5, 1.2]} estirarX={12} girar={false} factor={0.8} semilla={7} />
      <Planeta x0={40} z={-70} y={-95} r={22} color={tema.paleta[0] ?? '#94a3b8'} anillo largo={420} />
      <Planeta x0={260} z={60} y={-120} r={12} color={mezclar(acento, '#1e1b4b', 0.5)} largo={420} />

      {/* Cubierta bajo la casa + panza. */}
      <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[L, 0.36, W]} />
        <meshStandardMaterial color={casco} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.2, -1, 0]} castShadow>
        <boxGeometry args={[L * 0.96, 1.3, W * 0.8]} />
        <meshStandardMaterial color={oscuro} metalness={0.75} roughness={0.35} />
      </mesh>
      {/* Franja luminosa del borde de la cubierta. */}
      {[-1, 1].map((l) => (
        <mesh key={l} position={[0, -0.2, l * (W / 2 + 0.03)]}>
          <boxGeometry args={[L * 0.9, 0.08, 0.04]} />
          <meshBasicMaterial color={acento} toneMapped={false} />
        </mesh>
      ))}
      <group position={[L / 2 + proa / 2 - 0.01, -0.55, 0]} scale={[1, aplanado, 1]}>
        <mesh rotation={[Math.PI / 4, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[(W / 2) * Math.SQRT2, proa, 4]} />
          <meshStandardMaterial color={casco} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      {/* Alas en flecha. */}
      {[-1, 1].map((l) => (
        <group key={l} position={[-L * 0.12, -0.8, l * (W / 2 + alaAncho / 2)]} rotation={[l * 0.12, -l * 0.35, 0]}>
          <mesh castShadow>
            <boxGeometry args={[alaLargo, 0.18, alaAncho]} />
            <meshStandardMaterial color={casco} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.1, l * alaAncho * 0.42]}>
            <boxGeometry args={[alaLargo * 0.9, 0.04, 0.12]} />
            <meshBasicMaterial color={acento} toneMapped={false} />
          </mesh>
          <LuzAla pos={[-alaLargo * 0.35, 0.15, l * alaAncho * 0.5]} color={l < 0 ? '#ef4444' : '#22c55e'} fase={l} />
        </group>
      ))}
      {/* Toberas en la popa. */}
      {Array.from({ length: nToberas }, (_, i) => {
        const z = (i / (nToberas - 1) - 0.5) * W * 0.55
        return <Tobera key={i} pos={[-L / 2 - rToberas * 0.7, -0.9, z]} r={rToberas} color={acento} />
      })}
    </>
  )
}

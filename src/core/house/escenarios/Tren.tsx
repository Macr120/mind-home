import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { esGamaBaja } from '../../gamaDispositivo'
import { Desfile, SueloMovil, manchas, useRecorrido } from './fondoMovil'
import type { PropsEscenario } from './EscenarioVivo'

/** Campo con pasto y tierra. */
const pintarCampo = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#7ea24e'
  ctx.fillRect(0, 0, lado, lado)
  manchas(ctx, lado, ['#6f9444', '#8cb05a', '#9a8a5a', '#76993f'], 70, [6, 20], 61)
  manchas(ctx, lado, ['#fde68a', '#ffffff'], 25, [1.5, 2.5], 67)
}

const NEGRO = '#1f2937'
const LATON = '#d4a72c'
const ROJO = '#b91c1c'

/** Rueda con rayos que gira con el recorrido. */
function Rueda({ pos, r, ancho, color }: { pos: [number, number, number]; r: number; ancho: number; color: string }) {
  const ref = useRef<THREE.Group>(null)
  const recorrido = useRecorrido()
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = -recorrido.d / r
  })
  return (
    <group position={pos}>
      <group ref={ref}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[r, r, ancho, 20]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
        </mesh>
        {[0, 1, 2].map((k) => (
          <mesh key={k} rotation={[0, 0, (k * Math.PI) / 3]}>
            <boxGeometry args={[r * 1.8, r * 0.14, ancho * 1.1]} />
            <meshStandardMaterial color={NEGRO} metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Humo de la chimenea: bocanadas que suben y se quedan atrás. */
function Humo({ pos, escala }: { pos: [number, number, number]; escala: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const recorrido = useRecorrido()
  useFrame(() => {
    refs.current.forEach((m, i) => {
      if (!m) return
      const t = (recorrido.d * 0.12 + i / 7) % 1
      m.position.set(-t * 7 * escala, t * 4 * escala, 0)
      m.scale.setScalar((0.4 + t * 1.6) * escala)
      ;(m.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - t)
    })
  })
  return (
    <group position={pos}>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)}>
          <sphereGeometry args={[0.6, 10, 8]} />
          <meshBasicMaterial color="#e5e7eb" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export default function Tren({ L, W, tema }: PropsEscenario) {
  const pocos = esGamaBaja()
  const k = Math.min(3, Math.max(1, Math.max(L, W) / 30))
  const casco = tema.shell.muroExt

  // Vía bajo el vagón: ruedas, rieles y durmientes.
  const rw = Math.min(2, Math.max(0.5, W * 0.05))
  const yEje = -0.55 - rw
  const yRiel = yEje - rw
  const ySuelo = yRiel - 0.45

  // Locomotora: ancho según el vagón, pero con tope para casas enormes.
  const lw = Math.min(W * 0.75, Math.max(3.5, W * 0.5), 22)
  // La vía va a la medida de la locomotora; en casas anchas el vagón sobresale.
  const trocha = Math.min(W * 0.6, lw * 0.85)
  const largoLoco = lw * 2.4
  const x0 = L / 2 + 1.2 // enganche
  const rCaldera = lw * 0.36
  const yCaldera = yEje + rw + rCaldera + 0.2
  const rMotriz = Math.max(rw, rCaldera * 0.55)
  const bogies = Math.min(8, Math.max(2, Math.round(L / 8)))

  const durmiente = useMemo(() => new THREE.BoxGeometry(0.9, 0.25, trocha + 2.2), [trocha])
  const poste = useMemo(() => {
    const partes = [
      new THREE.CylinderGeometry(0.12, 0.16, 7, 6).translate(0, 3.5, 0),
      new THREE.BoxGeometry(0.15, 0.15, 2).translate(0, 6.4, 0),
    ]
    const g = mergeGeometries(partes)
    partes.forEach((p) => p.dispose())
    return g
  }, [])
  const tronco = useMemo(() => new THREE.CylinderGeometry(0.25, 0.4, 3, 7).translate(0, 1.5, 0), [])
  const copa = useMemo(() => new THREE.IcosahedronGeometry(1.8, 0).translate(0, 4, 0), [])
  const colina = useMemo(() => new THREE.SphereGeometry(10, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.6, 0.5, 1), [])
  const matDurmiente = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5b4330', roughness: 1 }), [])
  const matPoste = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 1 }), [])
  const matTronco = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 1 }), [])
  const matCopa = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3f7d2c', roughness: 0.9, flatShading: true }), [])
  const matColina = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6f9a45', roughness: 1 }), [])
  const via = useMemo<[number, number][]>(() => [[0, 0]], [])
  const libre = W / 2 + 6
  const lados = useMemo<[number, number][]>(() => [[-libre - 80 * k, -libre], [libre, libre + 80 * k]], [libre, k])
  const postes = useMemo<[number, number][]>(() => [[libre - 2, libre - 1.5]], [libre])
  const lejos = useMemo<[number, number][]>(() => [[-libre - 160 * k, -libre - 40], [libre + 40, libre + 160 * k]], [libre, k])
  const pintar = useCallback(pintarCampo, [])
  const arboles = { n: pocos ? 10 : 24, largo: 170 * k, bandas: lados, y: [ySuelo, ySuelo] as [number, number], escala: [0.9 * k, 1.7 * k] as [number, number], semilla: 71 }

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={12} y={ySuelo} rugosidad={0.95} />
      {/* Balasto bajo la vía (quieto: es igual a lo largo). */}
      <mesh position={[0, ySuelo + 0.08, 0]} receiveShadow>
        <boxGeometry args={[900, 0.18, trocha + 4]} />
        <meshStandardMaterial color="#8a8175" roughness={1} />
      </mesh>
      <Desfile geometria={durmiente} material={matDurmiente} n={Math.round(420 / 1.6)} largo={420} bandas={via} y={[yRiel - 0.2, yRiel - 0.2]} escala={[1, 1]} girar={false} uniforme semilla={3} />
      {[-1, 1].map((l) => (
        <mesh key={l} position={[0, yRiel - 0.05, (l * trocha) / 2]}>
          <boxGeometry args={[900, 0.2, 0.18]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <Desfile geometria={poste} material={matPoste} n={pocos ? 6 : 10} largo={200} bandas={postes} y={[ySuelo, ySuelo]} escala={[k, k]} girar={false} uniforme semilla={5} />
      <Desfile geometria={tronco} material={matTronco} {...arboles} />
      <Desfile geometria={copa} material={matCopa} {...arboles} />
      <Desfile geometria={colina} material={matColina} n={pocos ? 4 : 8} largo={420 * k} bandas={lejos} y={[ySuelo - 0.5, ySuelo - 0.5]} escala={[0.8 * k, 1.6 * k]} factor={0.5} girar={false} semilla={9} />

      {/* Vagón plataforma bajo la casa, con largueros y bogies. */}
      <mesh position={[0, -0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[L + 0.6, 0.32, W + 0.4]} />
        <meshStandardMaterial color={tema.shell.piso} roughness={0.9} />
      </mesh>
      {[-1, 1].map((l) => (
        <mesh key={l} position={[0, -0.45, l * (W / 2 + 0.05)]} castShadow>
          <boxGeometry args={[L + 0.8, 0.35, 0.3]} />
          <meshStandardMaterial color={casco} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[L * 0.98, 0.25, trocha * 0.9]} />
        <meshStandardMaterial color={NEGRO} roughness={0.7} />
      </mesh>
      {Array.from({ length: bogies }, (_, i) => {
        const x = (i / (bogies - 1) - 0.5) * L * 0.86
        return [-1, 1].flatMap((l) =>
          [-1, 1].map((f) => <Rueda key={`${i}${l}${f}`} pos={[x + f * rw * 1.2, yEje, (l * trocha) / 2]} r={rw} ancho={0.3} color={NEGRO} />),
        )
      })}

      {/* Enganche y locomotora de vapor (proa a +X). */}
      <mesh position={[L / 2 + 0.6, -0.45, 0]}>
        <boxGeometry args={[1.4, 0.3, 0.5]} />
        <meshStandardMaterial color={NEGRO} metalness={0.5} roughness={0.5} />
      </mesh>
      <group position={[x0, 0, 0]}>
        {/* Chasis */}
        <mesh position={[largoLoco / 2, yEje + rw * 0.6, 0]} castShadow>
          <boxGeometry args={[largoLoco, rw * 0.7, lw * 0.9]} />
          <meshStandardMaterial color={ROJO} roughness={0.6} />
        </mesh>
        {/* Cabina */}
        <mesh position={[lw * 0.35, yCaldera + rCaldera * 0.4, 0]} castShadow>
          <boxGeometry args={[lw * 0.7, rCaldera * 2.8, lw * 0.95]} />
          <meshStandardMaterial color={casco} roughness={0.6} />
        </mesh>
        <mesh position={[lw * 0.35, yCaldera + rCaldera * 1.9, 0]} castShadow>
          <boxGeometry args={[lw * 0.85, 0.25, lw * 1.05]} />
          <meshStandardMaterial color={NEGRO} roughness={0.6} />
        </mesh>
        {[-1, 1].map((l) => (
          <mesh key={l} position={[lw * 0.35, yCaldera + rCaldera * 0.9, l * lw * 0.48]}>
            <boxGeometry args={[lw * 0.35, rCaldera * 0.7, 0.05]} />
            <meshBasicMaterial color="#fcd34d" toneMapped={false} />
          </mesh>
        ))}
        {/* Caldera con anillos de latón, domo y chimenea */}
        <mesh position={[lw * 0.7 + (largoLoco - lw * 0.7) / 2, yCaldera, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[rCaldera, rCaldera, largoLoco - lw * 0.7, 24]} />
          <meshStandardMaterial color={NEGRO} metalness={0.5} roughness={0.4} />
        </mesh>
        {[0.3, 0.6, 0.9].map((f) => (
          <mesh key={f} position={[lw * 0.7 + (largoLoco - lw * 0.7) * f, yCaldera, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[rCaldera * 1.03, rCaldera * 1.03, 0.15, 24]} />
            <meshStandardMaterial color={LATON} metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[largoLoco - 0.05, yCaldera, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[rCaldera * 0.9, rCaldera * 0.9, 0.12, 24]} />
          <meshStandardMaterial color={NEGRO} metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[largoLoco + 0.02, yCaldera + rCaldera * 0.45, 0]}>
          <sphereGeometry args={[rCaldera * 0.2, 12, 10]} />
          <meshBasicMaterial color="#fef3c7" toneMapped={false} />
        </mesh>
        <mesh position={[lw * 0.7 + (largoLoco - lw * 0.7) * 0.45, yCaldera + rCaldera, 0]}>
          <sphereGeometry args={[rCaldera * 0.35, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={LATON} metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[largoLoco - rCaldera * 0.9, yCaldera + rCaldera * 1.3, 0]} castShadow>
          <cylinderGeometry args={[rCaldera * 0.4, rCaldera * 0.25, rCaldera * 1.2, 16]} />
          <meshStandardMaterial color={NEGRO} metalness={0.5} roughness={0.4} />
        </mesh>
        <Humo pos={[largoLoco - rCaldera * 0.9, yCaldera + rCaldera * 2, 0]} escala={Math.max(1, lw / 5)} />
        {/* Quitapiedras al frente */}
        <mesh position={[largoLoco + rw * 0.5, yEje - rw * 0.3, 0]} rotation={[Math.PI / 4, 0, -Math.PI / 2]} scale={[1, 1, 0.6]}>
          <coneGeometry args={[lw * 0.5, rw * 1.6, 4]} />
          <meshStandardMaterial color={ROJO} roughness={0.6} />
        </mesh>
        {/* Ruedas motrices grandes y ruedas guía chicas */}
        {[-1, 1].flatMap((l) => [
          ...[0.25, 0.5].map((f) => (
            <Rueda key={`m${l}${f}`} pos={[largoLoco * f, yRiel + rMotriz, (l * trocha) / 2]} r={rMotriz} ancho={0.35} color={ROJO} />
          )),
          <Rueda key={`g${l}`} pos={[largoLoco * 0.85, yEje, (l * trocha) / 2]} r={rw} ancho={0.3} color={ROJO} />,
        ])}
      </group>
    </>
  )
}

import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { esGamaBaja } from '../../gamaDispositivo'
import { mezclar } from '../temas'
import { Desfile, SueloMovil, hash01, manchas, useRecorrido } from './fondoMovil'
import type { PropsEscenario } from './EscenarioVivo'

/** Tierra seca y agrietada. */
const pintarYermo = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#8a6a48'
  ctx.fillRect(0, 0, lado, lado)
  manchas(ctx, lado, ['#7a5c3d', '#9a7a55', '#6e5236', '#a88660'], 60, [6, 22], 31)
  ctx.strokeStyle = '#4a3624'
  ctx.lineWidth = 2
  for (let i = 0; i < 14; i++) {
    let x = hash01(i, 7) * lado
    let y = hash01(i, 8) * lado
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < 5; k++) {
      x += (hash01(i * 13 + k, 9) - 0.5) * 60
      y += (hash01(i * 13 + k, 10) - 0.5) * 60
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

/** Llanta que rueda con el recorrido y rebota un poco (la casa no se mueve). */
function Llanta({ pos, r, fase }: { pos: [number, number, number]; r: number; fase: number }) {
  const giro = useRef<THREE.Group>(null)
  const rebote = useRef<THREE.Group>(null)
  const recorrido = useRecorrido()
  useFrame(() => {
    if (giro.current) giro.current.rotation.z = -recorrido.d / r
    if (rebote.current) rebote.current.position.y = Math.abs(Math.sin(recorrido.d * 0.9 + fase)) * 0.08
  })
  return (
    <group ref={rebote}>
      <group position={pos}>
        <group ref={giro}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[r, r, 0.75, 18]} />
            <meshStandardMaterial color="#1c1917" roughness={0.95} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r * 0.5, r * 0.5, 0.8, 8]} />
            <meshStandardMaterial color="#78716c" metalness={0.6} roughness={0.5} />
          </mesh>
          {/* Tacos del rin: se ve que gira. */}
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} rotation={[0, 0, (k * Math.PI) / 4]}>
              <boxGeometry args={[r * 0.9, 0.12, 0.84]} />
              <meshStandardMaterial color="#57534e" metalness={0.5} roughness={0.6} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

/** Humo del escape: bocanadas que suben y se desvanecen. */
function Humo({ pos }: { pos: [number, number, number] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const recorrido = useRecorrido()
  useFrame(() => {
    refs.current.forEach((m, i) => {
      if (!m) return
      const t = (recorrido.d * 0.35 + i / 5) % 1
      m.position.set(-t * 2.5, t * 3, 0)
      m.scale.setScalar(0.3 + t * 1.1)
      ;(m.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t)
    })
  })
  return (
    <group position={pos}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)}>
          <sphereGeometry args={[0.5, 8, 6]} />
          <meshBasicMaterial color="#57534e" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export default function CasaRodante({ L, W, tema }: PropsEscenario) {
  const pocos = esGamaBaja()
  const oxido = tema.shell.techo
  const lamina = mezclar(tema.shell.muroExt, '#3f3a33', 0.4)

  const rw = Math.min(2.2, Math.max(0.85, W * 0.11))
  const yLlanta = -0.55 - rw * 0.45
  const ySuelo = yLlanta - rw
  const nPorLado = Math.min(8, Math.max(2, Math.round(L / 6)))
  const nPuas = Math.max(3, Math.round(W / 1.5))
  // En casas grandes el paisaje crece con el vehículo para no verse de juguete.
  const k = Math.min(3, Math.max(1, Math.max(L, W) / 30))

  // Utilería del yermo; cada geometría con la base en y=0.
  const roca = useMemo(() => new THREE.DodecahedronGeometry(1, 0).scale(1, 0.6, 1.2).translate(0, 0.35, 0), [])
  const arbolSeco = useMemo(() => {
    const partes = [
      new THREE.CylinderGeometry(0.12, 0.2, 3, 6).translate(0, 1.5, 0),
      new THREE.CylinderGeometry(0.05, 0.1, 1.4, 5).rotateZ(0.8).translate(0.45, 2.2, 0),
      new THREE.CylinderGeometry(0.05, 0.09, 1.1, 5).rotateZ(-0.9).translate(-0.4, 1.7, 0),
      new THREE.CylinderGeometry(0.04, 0.07, 0.9, 5).rotateX(0.9).translate(0, 2.6, 0.3),
    ]
    const g = mergeGeometries(partes)
    partes.forEach((p) => p.dispose())
    return g
  }, [])
  const ruina = useMemo(() => {
    const partes = [
      new THREE.BoxGeometry(3, 2.2, 0.3).translate(0, 1.1, 0),
      new THREE.BoxGeometry(0.3, 1.4, 2.2).translate(1.35, 0.7, 1),
      new THREE.BoxGeometry(1.2, 0.8, 0.3).translate(-0.8, 2.6, 0),
      new THREE.BoxGeometry(0.6, 0.3, 0.6).translate(-0.4, 0.15, 1.3),
    ]
    const g = mergeGeometries(partes)
    partes.forEach((p) => p.dispose())
    return g
  }, [])
  const chatarra = useMemo(() => {
    const partes = [
      new THREE.BoxGeometry(3.2, 0.8, 1.6).translate(0, 0.5, 0),
      new THREE.BoxGeometry(1.6, 0.6, 1.4).rotateZ(0.12).translate(-0.2, 1.1, 0),
      new THREE.CylinderGeometry(0.35, 0.35, 0.3, 10).rotateX(Math.PI / 2).translate(1, 0.35, 0.85),
    ]
    const g = mergeGeometries(partes)
    partes.forEach((p) => p.dispose())
    return g
  }, [])
  const polvo = useMemo(() => new THREE.SphereGeometry(0.12, 6, 4), [])
  const matRoca = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b5b4a', roughness: 1, flatShading: true }), [])
  const matArbol = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3b2f25', roughness: 1 }), [])
  const matRuina = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7d7468', roughness: 1 }), [])
  const matChatarra = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7c3a1a', roughness: 0.9, metalness: 0.4 }), [])
  const matPolvo = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c9a67a', transparent: true, opacity: 0.5, depthWrite: false }), [])
  const libre = W / 2 + 4
  const lados = useMemo<[number, number][]>(() => [[-libre - 70 * k, -libre], [libre, libre + 70 * k]], [libre, k])
  const lejos = useMemo<[number, number][]>(() => [[-libre - 100 * k, -libre - 12], [libre + 12, libre + 100 * k]], [libre, k])
  const todo = useMemo<[number, number][]>(() => [[-40, 40]], [])
  const pintar = useCallback(pintarYermo, [])

  const xs = Array.from({ length: nPorLado }, (_, i) => (i / (nPorLado - 1) - 0.5) * L * 0.78)

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={14} y={ySuelo} />
      <Desfile geometria={roca} material={matRoca} n={pocos ? 14 : 30} largo={170 * k} bandas={lados} y={[ySuelo, ySuelo]} escala={[0.5 * k, 1.8 * k]} semilla={4} />
      <Desfile geometria={arbolSeco} material={matArbol} n={pocos ? 6 : 14} largo={170 * k} bandas={lados} y={[ySuelo, ySuelo]} escala={[0.8 * k, 1.5 * k]} semilla={8} />
      <Desfile geometria={ruina} material={matRuina} n={pocos ? 3 : 7} largo={200 * k} bandas={lejos} y={[ySuelo, ySuelo]} escala={[k, 2.2 * k]} semilla={12} />
      <Desfile geometria={chatarra} material={matChatarra} n={pocos ? 3 : 6} largo={190 * k} bandas={lados} y={[ySuelo, ySuelo]} escala={[0.9 * k, 1.2 * k]} semilla={15} />
      <Desfile geometria={polvo} material={matPolvo} n={pocos ? 20 : 50} largo={90} bandas={todo} y={[ySuelo + 0.2, ySuelo + 4]} escala={[0.6, 2]} factor={1.4} semilla={21} />

      {/* Chasis bajo la casa. */}
      <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[L + 0.6, 0.55, W + 0.3]} />
        <meshStandardMaterial color={lamina} metalness={0.4} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.75, 0]} castShadow>
        <boxGeometry args={[L * 0.9, 0.4, W * 0.7]} />
        <meshStandardMaterial color="#292524" metalness={0.5} roughness={0.7} />
      </mesh>
      {/* Placas de blindaje remachadas, algo torcidas. */}
      {[-1, 1].map((l) =>
        xs.map((x, i) => (
          <mesh key={`${l}-${i}`} position={[x * 0.95 + 0.4, -0.3, l * (W / 2 + 0.22)]} rotation={[l * 0.05, 0, (hash01(i, l) - 0.5) * 0.12]} castShadow>
            <boxGeometry args={[(L / nPorLado) * 0.75, 0.75, 0.1]} />
            <meshStandardMaterial color={i % 2 ? oxido : lamina} metalness={0.45} roughness={0.85} />
          </mesh>
        )),
      )}
      {/* Defensa con púas al frente. */}
      <mesh position={[L / 2 + 0.55, -0.55, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, W + 0.4]} />
        <meshStandardMaterial color="#44403c" metalness={0.6} roughness={0.6} />
      </mesh>
      {Array.from({ length: nPuas }, (_, i) => (
        <mesh key={i} position={[L / 2 + 1.05, -0.55, (i / (nPuas - 1) - 0.5) * W]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[0.16, 0.7, 6]} />
          <meshStandardMaterial color="#a8a29e" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* Escape trasero con humo. */}
      <mesh position={[-L / 2 - 0.3, 0.6, W / 2 - 0.4]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 2.2, 10]} />
        <meshStandardMaterial color="#44403c" metalness={0.7} roughness={0.5} />
      </mesh>
      <Humo pos={[-L / 2 - 0.3, 1.8, W / 2 - 0.4]} />
      {[-1, 1].map((l) =>
        xs.map((x, i) => <Llanta key={`${l}-${i}`} pos={[x, yLlanta, l * (W / 2 + 0.7)]} r={rw} fase={i * 1.3 + l} />),
      )}
    </>
  )
}

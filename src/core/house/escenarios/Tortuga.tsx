import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { esGamaBaja } from '../../gamaDispositivo'
import { mezclar } from '../temas'
import { Desfile, SueloMovil, manchas, useRecorrido } from './fondoMovil'
import type { PropsEscenario } from './EscenarioVivo'

/** Pasto con florecitas. */
const pintarPasto = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#6a9a3c'
  ctx.fillRect(0, 0, lado, lado)
  manchas(ctx, lado, ['#5d8a33', '#7aab46', '#83b650', '#557f2e'], 70, [6, 20], 41)
  manchas(ctx, lado, ['#fde68a', '#f9a8d4', '#ffffff', '#c4b5fd'], 40, [1.5, 3], 77)
}

/** Placas del caparazón: rejilla de hexágonos sobre el color base. */
function texturaCaparazon(base: string, linea: string): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = base
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = linea
  ctx.lineWidth = 5
  const r = 30
  for (let fila = 0; fila < 4; fila++) {
    for (let col = 0; col < 10; col++) {
      const cx = col * r * 1.75 + (fila % 2) * r * 0.87
      const cy = fila * r * 1.5 + 10
      ctx.fillStyle = mezclar(base, '#000000', ((col + fila) % 3) * 0.06)
      ctx.beginPath()
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k + Math.PI / 6
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Pata con ciclo de caminata: las diagonales van en contrafase. */
function Pata({ pos, r, largo, fase, zancada, color }: { pos: [number, number, number]; r: number; largo: number; fase: number; zancada: number; color: string }) {
  const ref = useRef<THREE.Group>(null)
  const recorrido = useRecorrido()
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = Math.sin(recorrido.d / zancada + fase) * 0.32
  })
  return (
    <group ref={ref} position={pos}>
      <mesh position={[0, -largo / 2, 0]} castShadow>
        <cylinderGeometry args={[r * 0.85, r, largo, 14]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[r * 0.25, -largo, 0]} scale={[1.35, 0.5, 1.15]}>
        <sphereGeometry args={[r, 14, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  )
}

export default function Tortuga({ L, W, tema }: PropsEscenario) {
  const pocos = esGamaBaja()
  const recorrido = useRecorrido()
  const piel = '#7c8f4a'
  const colorCaparazon = mezclar(tema.shell.techo, '#5b4a2a', 0.35)

  // Un rectángulo cabe en la elipse con radios ×√2; 1.58 deja las esquinas dentro del corte.
  const rx = (L / 2) * 1.58
  const rz = (W / 2) * 1.58
  const ry = Math.min(16, Math.max(2, Math.min(rx, rz) * 0.6))
  // Casquete cortado donde el anillo ya encierra toda la casa; ahí va la cubierta plana.
  const corte = Math.asin(0.9)
  const yc = -0.05 - Math.cos(corte) * ry
  const rPata = Math.max(0.6, Math.min(rx, rz) * 0.16)
  // En casas grandes el paisaje crece con la tortuga para no verse de juguete.
  const k = Math.min(3, Math.max(1, Math.max(L, W) / 30))
  const largoPata = rPata * 2.6 + ry * 0.35
  const ySuelo = yc - largoPata - rPata * 0.3
  const zancada = rPata * 0.9

  const tex = useMemo(() => texturaCaparazon(colorCaparazon, mezclar(colorCaparazon, '#1c1917', 0.55)), [colorCaparazon])
  // La cubierta lleva las mismas placas, repetidas para que no salgan estiradas.
  const texCubierta = useMemo(() => {
    const t = texturaCaparazon(mezclar(colorCaparazon, tema.shell.piso, 0.35), mezclar(colorCaparazon, '#1c1917', 0.4))
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(Math.max(1, rx / 10), Math.max(2, (rz / 10) * 4))
    return t
  }, [colorCaparazon, tema.shell.piso, rx, rz])
  useEffect(
    () => () => {
      tex.dispose()
      texCubierta.dispose()
    },
    [tex, texCubierta],
  )

  const cabeza = useRef<THREE.Group>(null)
  const cola = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const t = recorrido.d / zancada
    if (cabeza.current) {
      cabeza.current.position.y = Math.sin(t * 2) * 0.12 * rPata
      cabeza.current.rotation.y = Math.sin(t * 0.35) * 0.25
    }
    if (cola.current) cola.current.rotation.y = Math.sin(t) * 0.3
  })

  // Árboles: tronco y copa comparten semilla y reparto, así caen en el mismo sitio.
  const tronco = useMemo(() => new THREE.CylinderGeometry(0.25, 0.4, 3, 7).translate(0, 1.5, 0), [])
  const copa = useMemo(() => new THREE.IcosahedronGeometry(1.8, 0).translate(0, 4, 0), [])
  const arbusto = useMemo(() => new THREE.IcosahedronGeometry(1, 0).scale(1.3, 0.8, 1.1).translate(0, 0.5, 0), [])
  const roca = useMemo(() => new THREE.DodecahedronGeometry(0.8, 0).scale(1, 0.6, 1.2).translate(0, 0.3, 0), [])
  const mariposa = useMemo(() => new THREE.PlaneGeometry(0.35, 0.22), [])
  const matTronco = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 1 }), [])
  const matCopa = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3f7d2c', roughness: 0.9, flatShading: true }), [])
  const matArbusto = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4d8f35', roughness: 0.9, flatShading: true }), [])
  const matRoca = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8b8878', roughness: 1, flatShading: true }), [])
  const matMariposa = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f9a8d4', side: THREE.DoubleSide }), [])
  const libre = rz + rPata * 2 + 3
  const lados = useMemo<[number, number][]>(() => [[-libre - 90 * k, -libre], [libre, libre + 90 * k]], [libre, k])
  const cerca = useMemo<[number, number][]>(() => [[-libre - 6, libre + 6]], [libre])
  const pintar = useCallback(pintarPasto, [])

  const arboles = { n: pocos ? 12 : 26, largo: 170 * k, bandas: lados, y: [ySuelo, ySuelo] as [number, number], escala: [0.9 * k, 1.8 * k] as [number, number], semilla: 6 }

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={12} y={ySuelo} rugosidad={0.95} />
      <Desfile geometria={tronco} material={matTronco} {...arboles} />
      <Desfile geometria={copa} material={matCopa} {...arboles} />
      <Desfile geometria={arbusto} material={matArbusto} n={pocos ? 12 : 28} largo={150 * k} bandas={lados} y={[ySuelo, ySuelo]} escala={[0.6 * k, 1.6 * k]} semilla={9} />
      <Desfile geometria={roca} material={matRoca} n={pocos ? 8 : 18} largo={150 * k} bandas={lados} y={[ySuelo, ySuelo]} escala={[0.5 * k, 1.5 * k]} semilla={14} />
      <Desfile geometria={mariposa} material={matMariposa} n={pocos ? 6 : 14} largo={60} bandas={cerca} y={[ySuelo + 1, ySuelo + 5]} escala={[0.8, 1.3]} factor={0.6} semilla={19} />

      {/* Cubierta plana del caparazón, justo bajo la casa. */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[rx * 0.9, rz * 0.9, 1]} receiveShadow>
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial map={texCubierta} roughness={0.85} />
      </mesh>
      {/* Anillo del caparazón con sus placas. */}
      <mesh position={[0, yc, 0]} scale={[rx, ry, rz]} castShadow>
        <sphereGeometry args={[1, 48, 16, 0, Math.PI * 2, corte, Math.PI / 2 - corte]} />
        <meshStandardMaterial map={tex} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Borde y plastrón. */}
      <mesh position={[0, yc, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[rx, rz, 1]}>
        <torusGeometry args={[1, 0.035, 8, 64]} />
        <meshStandardMaterial color={mezclar(colorCaparazon, '#000000', 0.3)} roughness={0.8} />
      </mesh>
      <mesh position={[0, yc, 0]} scale={[rx * 0.97, ry * 0.3, rz * 0.97]}>
        <sphereGeometry args={[1, 40, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#d9c38a" roughness={0.9} />
      </mesh>

      {[
        [1, 1, 0],
        [-1, -1, 0],
        [1, -1, Math.PI],
        [-1, 1, Math.PI],
      ].map(([sx, sz, fase]) => (
        <Pata key={`${sx}${sz}`} pos={[sx * rx * 0.55, yc - ry * 0.1, sz * rz * 0.72]} r={rPata} largo={largoPata} fase={fase} zancada={zancada} color={piel} />
      ))}

      {/* Cabeza con cuello, al frente (+X). */}
      <group position={[rx * 0.92, yc - ry * 0.05, 0]}>
        <group ref={cabeza}>
          <mesh position={[rPata * 0.9, 0, 0]} rotation={[0, 0, -Math.PI / 2.6]} castShadow>
            <cylinderGeometry args={[rPata * 0.7, rPata * 0.85, rPata * 2.2, 14]} />
            <meshStandardMaterial color={piel} roughness={0.9} />
          </mesh>
          <mesh position={[rPata * 2.1, rPata * 0.55, 0]} scale={[1.3, 1, 1]} castShadow>
            <sphereGeometry args={[rPata * 0.95, 20, 14]} />
            <meshStandardMaterial color={piel} roughness={0.9} />
          </mesh>
          {[-1, 1].map((l) => (
            <mesh key={l} position={[rPata * 2.75, rPata * 0.85, l * rPata * 0.55]}>
              <sphereGeometry args={[rPata * 0.14, 10, 8]} />
              <meshStandardMaterial color="#111827" roughness={0.2} />
            </mesh>
          ))}
        </group>
      </group>
      <mesh ref={cola} position={[-rx * 0.98, yc - ry * 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[rPata * 0.4, rPata * 1.4, 10]} />
        <meshStandardMaterial color={piel} roughness={0.9} />
      </mesh>
    </>
  )
}

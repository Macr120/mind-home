import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { esGamaBaja } from '../../gamaDispositivo'
import { mezclar } from '../temas'
import { Desfile, SueloMovil, manchas, useRecorrido } from './fondoMovil'
import type { PropsEscenario } from './EscenarioVivo'

/** Mar con reflejos y crestas de ola. */
const pintarMar = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#1f5f8b'
  ctx.fillRect(0, 0, lado, lado)
  manchas(ctx, lado, ['#23699a', '#1b5580', '#2a77aa'], 50, [10, 26], 53)
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 2
  for (let i = 0; i < 18; i++) {
    const x = ((i * 67) % lado) + 4
    const y = ((i * 131) % lado) + 4
    ctx.beginPath()
    ctx.arc(x, y, 9, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
  }
}

/** Tablones del casco: franja amarilla arriba y línea de flotación oscura. */
function texturaCasco(madera: string): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = madera
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = mezclar(madera, '#000000', 0.35)
  for (let y = 0; y < 256; y += 18) ctx.fillRect(0, y, 256, 2)
  ctx.fillStyle = '#d4a72c'
  ctx.fillRect(0, 26, 256, 14)
  ctx.fillStyle = '#1c1917'
  ctx.fillRect(0, 150, 256, 106)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Casco: el contorno de la cubierta (arriba) unido a uno más angosto (la quilla). */
function cascoGeometria(contorno: [number, number][], borda: number, fondo: number, vueltasU: number): THREE.BufferGeometry {
  const n = contorno.length
  const pos: number[] = []
  const uv: number[] = []
  contorno.forEach(([x, z], i) => {
    pos.push(x, borda, z)
    uv.push((i / n) * vueltasU, 1)
  })
  contorno.forEach(([x, z], i) => {
    pos.push(x * 0.9, -fondo, z * 0.4)
    uv.push((i / n) * vueltasU, 0)
  })
  pos.push(0, -fondo, 0)
  uv.push(0, 0)
  const idx: number[] = []
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    idx.push(i, n + i, j, j, n + i, n + j, 2 * n, n + j, n + i)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Vela inflada por el viento (la panza hacia la proa, +X). */
function Vela({ pos, ancho, alto, color }: { pos: [number, number, number]; ancho: number; alto: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null)
  const recorrido = useRecorrido()
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(ancho, alto, 10, 6)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / ancho + 0.5
      const v = p.getY(i) / alto + 0.5
      p.setZ(i, Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * alto * 0.18)
    }
    g.computeVertexNormals()
    return g
  }, [ancho, alto])
  useEffect(() => () => geo.dispose(), [geo])
  useFrame(() => {
    if (ref.current) ref.current.scale.z = 1 + Math.sin(recorrido.d * 0.6 + pos[1]) * 0.12
  })
  return (
    <mesh ref={ref} geometry={geo} position={pos} rotation={[0, Math.PI / 2, 0]} castShadow>
      <meshStandardMaterial color={color} roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Bandera pirata ondeando hacia popa. */
function Bandera({ pos, lado }: { pos: [number, number, number]; lado: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const { geo, tex, base } = useMemo(() => {
    const g = new THREE.PlaneGeometry(lado * 1.5, lado, 12, 4).translate(-lado * 0.75, 0, 0)
    const c = document.createElement('canvas')
    c.width = 192
    c.height = 128
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#0b0b0f'
    ctx.fillRect(0, 0, 192, 128)
    ctx.fillStyle = '#f5f5f4'
    // Calavera y tibias cruzadas.
    ctx.beginPath()
    ctx.arc(96, 52, 24, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(84, 66, 24, 16)
    ctx.lineWidth = 9
    ctx.strokeStyle = '#f5f5f4'
    ctx.beginPath()
    ctx.moveTo(56, 88)
    ctx.lineTo(136, 116)
    ctx.moveTo(136, 88)
    ctx.lineTo(56, 116)
    ctx.stroke()
    ctx.fillStyle = '#0b0b0f'
    ctx.beginPath()
    ctx.arc(87, 50, 7, 0, Math.PI * 2)
    ctx.arc(105, 50, 7, 0, Math.PI * 2)
    ctx.fill()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return { geo: g, tex: t, base: Float32Array.from(g.attributes.position.array) }
  }, [lado])
  useEffect(
    () => () => {
      geo.dispose()
      tex.dispose()
    },
    [geo, tex],
  )
  useFrame((s) => {
    const p = geo.attributes.position
    const t = s.clock.elapsedTime * 4
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3]
      // El borde sujeto al mástil (x=0) no se mueve; la punta ondea más.
      p.setZ(i, Math.sin(x * 1.6 + t) * (-x / (lado * 1.5)) * lado * 0.18)
    }
    p.needsUpdate = true
    if (ref.current) ref.current.rotation.y = Math.sin(t * 0.25) * 0.08
  })
  return (
    <mesh ref={ref} geometry={geo} position={pos}>
      <meshStandardMaterial map={tex} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Mastil({ x, y0, alto, anchoVela, madera, lona }: { x: number; y0: number; alto: number; anchoVela: number; madera: string; lona: string }) {
  const r = Math.max(0.18, alto * 0.018)
  const velas = [
    { y: y0 + alto * 0.36, h: alto * 0.3, w: anchoVela },
    { y: y0 + alto * 0.7, h: alto * 0.24, w: anchoVela * 0.78 },
  ]
  return (
    <group>
      <mesh position={[x, y0 + alto / 2, 0]} castShadow>
        <cylinderGeometry args={[r * 0.7, r, alto, 10]} />
        <meshStandardMaterial color={madera} roughness={0.9} />
      </mesh>
      {velas.map((v) => (
        <group key={v.y}>
          {/* Vergas arriba y abajo de cada vela. */}
          {[v.y + v.h / 2, v.y - v.h / 2].map((yv) => (
            <mesh key={yv} position={[x + 0.05, yv, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[r * 0.5, r * 0.5, v.w * 1.08, 8]} />
              <meshStandardMaterial color={madera} roughness={0.9} />
            </mesh>
          ))}
          <Vela pos={[x + 0.15, v.y, 0]} ancho={v.w} alto={v.h} color={lona} />
        </group>
      ))}
      {/* Cofa del vigía. */}
      <mesh position={[x, y0 + alto * 0.86, 0]}>
        <cylinderGeometry args={[r * 4, r * 3, r * 3, 12]} />
        <meshStandardMaterial color={madera} roughness={0.9} />
      </mesh>
      <Bandera pos={[x, y0 + alto + Math.max(0.6, alto * 0.05), 0]} lado={Math.max(1, alto * 0.1)} />
    </group>
  )
}

export default function Barco({ L, W, tema }: PropsEscenario) {
  const pocos = esGamaBaja()
  const madera = tema.shell.muroExt
  const oscura = tema.shell.techo
  const cubierta = tema.shell.piso
  const lona = '#efe6cf'
  // En barcos grandes el paisaje crece con él para no verse de juguete.
  const k = Math.min(3, Math.max(1, Math.max(L, W) / 30))

  const m = 0.35
  const media = W / 2 + m
  const proa = Math.min(30, Math.max(3, W * 0.7))
  const popa = Math.min(14, Math.max(3, L * 0.12))
  const fondo = Math.min(10, Math.max(2, W * 0.35))
  const borda = 0.6
  const yAgua = -fondo * 0.55
  const altoMastil = Math.min(40, Math.max(8, Math.max(L, W) * 0.45))
  const anchoVela = Math.min(W * 0.8, altoMastil * 0.7)
  const altoCastillo = Math.min(4, Math.max(2, W * 0.12))

  // Contorno de la cubierta: popa recta en −X, costados rectos y proa en punta en +X.
  const contorno = useMemo(() => {
    const pts: [number, number][] = []
    const x0 = -L / 2 - popa
    pts.push([x0, media])
    for (let i = 1; i <= 4; i++) pts.push([x0 + ((L / 2 - x0) * i) / 4, media])
    for (let i = 1; i < 10; i++) {
      const t = i / 10
      pts.push([L / 2 + proa * t, media * Math.cos((t * Math.PI) / 2)])
    }
    pts.push([L / 2 + proa, 0])
    const vuelta = pts.slice(1, -1).reverse().map(([x, z]) => [x, -z] as [number, number])
    return [...pts, ...vuelta, [x0, -media] as [number, number]]
  }, [L, popa, proa, media])

  const casco = useMemo(() => cascoGeometria(contorno, borda, fondo, Math.max(2, (L + proa) / 6)), [contorno, fondo, L, proa])
  const suelo = useMemo(() => {
    const forma = new THREE.Shape(contorno.map(([x, z]) => new THREE.Vector2(x, -z)))
    return new THREE.ShapeGeometry(forma)
  }, [contorno])
  const tex = useMemo(() => texturaCasco(madera), [madera])
  useEffect(
    () => () => {
      casco.dispose()
      suelo.dispose()
      tex.dispose()
    },
    [casco, suelo, tex],
  )

  // Paisaje: espuma de la estela, islas con palmera, rocas y gaviotas.
  const espuma = useMemo(() => new THREE.SphereGeometry(0.5, 8, 4).scale(2.2, 0.15, 0.8), [])
  const arena = useMemo(() => new THREE.SphereGeometry(4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.4, 0.35, 1), [])
  const palmera = useMemo(() => new THREE.CylinderGeometry(0.15, 0.25, 4.5, 6).translate(0.4, 3.3, 0).rotateZ(-0.12), [])
  const hojas = useMemo(() => {
    const partes = [0, 1, 2, 3, 4].map((i) =>
      new THREE.ConeGeometry(0.35, 2.4, 4)
        .rotateZ(Math.PI / 2 + 0.5)
        .translate(1.1, 5.4, 0)
        .rotateY((i / 5) * Math.PI * 2),
    )
    const g = mergeGeometries(partes)
    partes.forEach((p) => p.dispose())
    return g
  }, [])
  const roca = useMemo(() => new THREE.DodecahedronGeometry(1.2, 0).scale(1, 0.8, 1.3).translate(0, 0.3, 0), [])
  const gaviota = useMemo(() => {
    const partes = [
      new THREE.BoxGeometry(0.7, 0.05, 0.12).rotateZ(0.35).translate(-0.32, 0.1, 0),
      new THREE.BoxGeometry(0.7, 0.05, 0.12).rotateZ(-0.35).translate(0.32, 0.1, 0),
    ]
    const g = mergeGeometries(partes).rotateY(Math.PI / 2)
    partes.forEach((p) => p.dispose())
    return g
  }, [])
  const matEspuma = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f0f9ff', transparent: true, opacity: 0.8, depthWrite: false }), [])
  const matArena = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8d49a', roughness: 1 }), [])
  const matPalmera = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7c5a36', roughness: 1 }), [])
  const matHojas = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3f8f3a', roughness: 0.9, flatShading: true }), [])
  const matRoca = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b7280', roughness: 1, flatShading: true }), [])
  const matGaviota = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff' }), [])
  const estela = useMemo<[number, number][]>(() => [[-media - 3, -media - 0.2], [media + 0.2, media + 3]], [media])
  const libre = media + 8
  const lejos = useMemo<[number, number][]>(() => [[-libre - 110 * k, -libre - 15], [libre + 15, libre + 110 * k]], [libre, k])
  const cielo = useMemo<[number, number][]>(() => [[-80 * k, 80 * k]], [k])
  const pintar = useCallback(pintarMar, [])
  const islas = { n: pocos ? 3 : 6, largo: 260 * k, bandas: lejos, y: [yAgua - 0.2, yAgua - 0.2] as [number, number], escala: [1.2 * k, 2.4 * k] as [number, number], semilla: 23 }

  const nCanones = Math.min(10, Math.max(2, Math.round(L / 5)))
  const xCastillo = -L / 2 - popa / 2

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={12} y={yAgua} rugosidad={0.35} />
      <Desfile geometria={espuma} material={matEspuma} n={pocos ? 14 : 30} largo={(L + proa + popa) * 1.4} bandas={estela} y={[yAgua + 0.03, yAgua + 0.06]} escala={[0.8, 1.6]} factor={1.6} girar={false} semilla={31} />
      <Desfile geometria={arena} material={matArena} {...islas} girar={false} />
      <Desfile geometria={palmera} material={matPalmera} {...islas} girar={false} />
      <Desfile geometria={hojas} material={matHojas} {...islas} girar={false} />
      <Desfile geometria={roca} material={matRoca} n={pocos ? 6 : 14} largo={200 * k} bandas={lejos} y={[yAgua - 0.3, yAgua - 0.3]} escala={[0.6 * k, 1.8 * k]} semilla={37} />
      <Desfile geometria={gaviota} material={matGaviota} n={pocos ? 5 : 12} largo={120 * k} bandas={cielo} y={[altoMastil * 0.6, altoMastil * 1.1]} escala={[1, 1.5]} factor={0.4} girar={false} semilla={41} />

      {/* Casco con bordas y la cubierta de tablones bajo la casa. */}
      <mesh geometry={casco} castShadow receiveShadow>
        <meshStandardMaterial map={tex} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={suelo} position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color={cubierta} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Pasamanos sobre la borda. */}
      <mesh position={[0, borda + 0.05, 0]}>
        <tubeGeometry args={[new THREE.CatmullRomCurve3(contorno.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.1), contorno.length * 3, 0.08, 6, true]} />
        <meshStandardMaterial color={oscura} roughness={0.8} />
      </mesh>

      {/* Castillo de popa con ventanas encendidas y faroles. */}
      <mesh position={[xCastillo, altoCastillo / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[popa * 0.95, altoCastillo, media * 1.8]} />
        <meshStandardMaterial color={madera} roughness={0.85} />
      </mesh>
      <mesh position={[xCastillo, altoCastillo + 0.1, 0]} castShadow>
        <boxGeometry args={[popa * 1.02, 0.2, media * 1.9]} />
        <meshStandardMaterial color={oscura} roughness={0.85} />
      </mesh>
      {[-0.5, 0, 0.5].map((f) => (
        <mesh key={f} position={[xCastillo - popa * 0.48, altoCastillo * 0.55, f * media]}>
          <boxGeometry args={[0.06, altoCastillo * 0.3, Math.min(1.2, media * 0.3)]} />
          <meshBasicMaterial color="#fcd34d" toneMapped={false} />
        </mesh>
      ))}
      {[-1, 1].map((l) => (
        <mesh key={l} position={[xCastillo - popa * 0.5, altoCastillo + 0.6, l * media * 0.8]}>
          <sphereGeometry args={[0.25, 10, 8]} />
          <meshBasicMaterial color="#fdba74" toneMapped={false} />
        </mesh>
      ))}

      {/* Cañones asomando por las portas. */}
      {[-1, 1].map((l) =>
        Array.from({ length: nCanones }, (_, i) => (
          <mesh key={`${l}-${i}`} position={[-L / 2 + ((i + 0.5) / nCanones) * L, -0.45, l * (media + 0.35)]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.24, 1.1, 10]} />
            <meshStandardMaterial color="#27272a" metalness={0.7} roughness={0.4} />
          </mesh>
        )),
      )}

      {/* Bauprés y los dos mástiles: uno en la proa y otro sobre el castillo. */}
      <mesh position={[L / 2 + proa + 1.5, borda + 0.9, 0]} rotation={[0, 0, -Math.PI / 2 + 0.35]} castShadow>
        <cylinderGeometry args={[0.1, 0.2, 4.5, 8]} />
        <meshStandardMaterial color={oscura} roughness={0.9} />
      </mesh>
      <Mastil x={L / 2 + proa * 0.35} y0={0} alto={altoMastil} anchoVela={anchoVela} madera={oscura} lona={lona} />
      <Mastil x={xCastillo} y0={altoCastillo} alto={altoMastil * 0.8} anchoVela={anchoVela * 0.85} madera={oscura} lona={lona} />
    </>
  )
}

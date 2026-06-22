import { useRef, useMemo, createContext, useContext } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh, MeshBasicMaterial } from 'three'
import { useDiseño } from '../state/disenoStore'
import { useLayout } from '../state/layoutStore'
import type { TemaId } from './temas'
import { SIZE } from './walls'

/** Área del cielo donde vuelan / caen las microanimaciones. */
interface CieloExtent {
  x: number
  zMin: number
  zMax: number
  yMin: number
  yMax: number
}

const CieloCtx = createContext<CieloExtent>({
  x: 28,
  zMin: -42,
  zMax: -8,
  yMin: 8,
  yMax: 26,
})

/** Posición pseudo-aleatoria pero estable por `seed`, repartida en el volumen del cielo. */
function puntoCielo(seed: number, ext: CieloExtent): [number, number, number] {
  const a = seed * 2.399963
  const b = seed * 1.618033
  const fx = 0.35 + ((seed * 13) % 10) / 10 * 0.65
  const fz = ext.zMin + (((seed * 7) % 100) / 100) * (ext.zMax - ext.zMin)
  return [
    Math.sin(a) * ext.x * fx,
    ext.yMin + ((seed * 11) % 100) / 100 * (ext.yMax - ext.yMin),
    Math.cos(b) * ext.x * 0.55 + fz,
  ]
}

function useCieloExtent(): CieloExtent {
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  return useMemo(() => {
    const span = Math.max(gridCols, gridRows) * SIZE + 14
    return {
      x: span,
      zMin: -span * 1.1,
      zMax: -span * 0.15,
      yMin: 7,
      yMax: 24 + span * 0.08,
    }
  }, [gridCols, gridRows])
}

// ─── Cometa (espacio) ─────────────────────────────────────────────────────────

function Cometa({ seed }: { seed: number }) {
  const ext = useContext(CieloCtx)
  const ref = useRef<Group>(null)
  const inicio = useMemo(() => puntoCielo(seed, ext), [seed, ext])
  const dir = useMemo(() => {
    const cuadrante = seed % 4
    const dirs: [number, number][] = [
      [5, -3],
      [-4.5, -3.5],
      [3, -4],
      [-5.5, -2.5],
    ]
    return dirs[cuadrante]
  }, [seed])
  const pos = useRef({ x: inicio[0], y: inicio[1], z: inicio[2] })

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    pos.current.x += dir[0] * dt
    pos.current.y += dir[1] * dt
    if (
      pos.current.x > ext.x ||
      pos.current.x < -ext.x ||
      pos.current.y < ext.yMin - 2
    ) {
      const p = puntoCielo(seed + Math.floor(pos.current.x), ext)
      pos.current.x = p[0]
      pos.current.y = p[1]
      pos.current.z = p[2]
    }
    g.position.set(pos.current.x, pos.current.y, pos.current.z)
    g.rotation.z = Math.atan2(dir[1], dir[0])
  })

  return (
    <group ref={ref} position={inicio}>
      <mesh>
        <coneGeometry args={[0.12, 0.75, 6]} />
        <meshBasicMaterial color="#e0f4ff" toneMapped={false} />
      </mesh>
      <mesh position={[-0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.06, 1.1, 6]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.4} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Dragón (medieval) ────────────────────────────────────────────────────────

function Dragon({ seed }: { seed: number }) {
  const ext = useContext(CieloCtx)
  const ref = useRef<Group>(null)
  const alas = useRef<Mesh>(null)
  const fase = useRef(seed * 1.7)
  const centro = useMemo(() => {
    const p = puntoCielo(seed, ext)
    return { x: p[0] * 0.6, z: p[2], y: p[1] }
  }, [seed, ext])
  const radio = useMemo(() => 10 + (seed % 4) * 5, [seed])
  const velocidad = useMemo(() => 0.18 + (seed % 3) * 0.08, [seed])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    fase.current += dt * velocidad
    const a = fase.current
    g.position.set(
      centro.x + Math.cos(a) * radio,
      centro.y + Math.sin(a * 2.2) * 2,
      centro.z + Math.sin(a) * radio * 0.45,
    )
    g.rotation.y = -a + Math.PI / 2
    if (alas.current) alas.current.rotation.z = Math.sin(a * 8) * 0.35
  })

  return (
    <group ref={ref} scale={0.75 + (seed % 3) * 0.12}>
      <mesh>
        <boxGeometry args={[1.4, 0.35, 0.5]} />
        <meshBasicMaterial color="#6b4423" toneMapped={false} />
      </mesh>
      <mesh position={[0.75, 0.1, 0]}>
        <coneGeometry args={[0.2, 0.5, 4]} />
        <meshBasicMaterial color="#4a2f15" toneMapped={false} />
      </mesh>
      <mesh ref={alas} position={[0, 0.15, 0.35]}>
        <boxGeometry args={[0.9, 0.05, 0.55]} />
        <meshBasicMaterial color="#8b5a2b" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.15, -0.35]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[0.9, 0.05, 0.55]} />
        <meshBasicMaterial color="#8b5a2b" transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Murciélago (terror) ──────────────────────────────────────────────────────

function Murcielago({ seed }: { seed: number }) {
  const ext = useContext(CieloCtx)
  const ref = useRef<Group>(null)
  const base = useMemo(() => puntoCielo(seed, ext), [seed, ext])
  const fase = useRef(seed * 2.3)
  const vel = useMemo(() => 0.35 + (seed % 5) * 0.12, [seed])
  const amp = useMemo(() => 4 + (seed % 4) * 3, [seed])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    fase.current += dt * vel
    const t = fase.current
    g.position.set(
      base[0] + Math.sin(t * 1.3 + seed) * amp,
      base[1] + Math.sin(t * 2 + seed) * 2.5,
      base[2] + Math.cos(t * 0.9 + seed) * amp * 0.6,
    )
    g.rotation.y = Math.sin(t) * 0.5
    g.scale.setScalar(0.55 + Math.sin(t * 6) * 0.12)
  })

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshBasicMaterial color="#1f2937" toneMapped={false} />
      </mesh>
      <mesh position={[-0.18, 0, 0]} rotation={[0, 0, 0.6]}>
        <boxGeometry args={[0.3, 0.02, 0.18]} />
        <meshBasicMaterial color="#374151" toneMapped={false} />
      </mesh>
      <mesh position={[0.18, 0, 0]} rotation={[0, 0, -0.6]}>
        <boxGeometry args={[0.3, 0.02, 0.18]} />
        <meshBasicMaterial color="#374151" toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Partícula brumosa (terror) — sin planos grandes ───────────────────────────

function ParticulaBruma({ seed }: { seed: number }) {
  const ext = useContext(CieloCtx)
  const ref = useRef<Mesh>(null)
  const base = useMemo(() => puntoCielo(seed + 40, ext), [seed, ext])
  const fase = useRef(seed)

  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    fase.current += dt * 0.2
    const t = fase.current
    m.position.set(
      base[0] + Math.sin(t + seed) * 6,
      base[1] + Math.cos(t * 0.7) * 1.5,
      base[2] + Math.cos(t * 0.5 + seed) * 4,
    )
    ;(m.material as MeshBasicMaterial).opacity = 0.12 + Math.sin(t * 0.9) * 0.06
  })

  return (
    <mesh ref={ref} position={base}>
      <sphereGeometry args={[0.35 + (seed % 3) * 0.15, 8, 8]} />
      <meshBasicMaterial color="#94a3b8" transparent opacity={0.1} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// ─── Corazón flotante (barbie) ────────────────────────────────────────────────

function CorazonFlotante({ seed }: { seed: number }) {
  const ext = useContext(CieloCtx)
  const ref = useRef<Group>(null)
  const base = useMemo(() => puntoCielo(seed, ext), [seed, ext])
  const fase = useRef(seed)
  const drift = useMemo(() => ({
    x: ((seed % 5) - 2) * 0.4,
    z: ((seed % 7) - 3) * 0.25,
  }), [seed])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    fase.current += dt
    const t = fase.current
    const y = base[1] + ((t * 1.2 + seed) % (ext.yMax - ext.yMin + 6))
    g.position.set(
      base[0] + Math.sin(t * 0.6) * 3 + drift.x * t,
      y,
      base[2] + Math.cos(t * 0.4) * 2 + drift.z * t,
    )
    if (y > ext.yMax + 2) fase.current = 0
    g.rotation.z = Math.sin(t * 2) * 0.2
  })

  const color = seed % 2 === 0 ? '#ff5fa2' : '#c084fc'
  return (
    <group ref={ref} scale={0.3 + (seed % 3) * 0.06}>
      <mesh position={[-0.15, 0.1, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0.15, 0.1, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.12, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.28, 0.35, 4]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Ave (vaquero) ────────────────────────────────────────────────────────────

function Ave({ seed }: { seed: number }) {
  const ext = useContext(CieloCtx)
  const ref = useRef<Group>(null)
  const base = useMemo(() => puntoCielo(seed, ext), [seed, ext])
  const fase = useRef(seed * 1.1)
  const sentido = useMemo(() => (seed % 2 === 0 ? 1 : -1), [seed])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    fase.current += dt * (0.3 + (seed % 3) * 0.1)
    const t = fase.current
    g.position.set(
      base[0] + sentido * ((t * 5) % (ext.x * 2) - ext.x),
      base[1] + Math.sin(t * 4) * 0.6,
      base[2] + Math.sin(t * 0.5) * 5,
    )
    g.rotation.z = Math.sin(t * 8) * 0.25 * sentido
  })

  return (
    <group ref={ref} scale={0.45}>
      <mesh rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.5, 0.03, 0.15]} />
        <meshBasicMaterial color="#5c4033" toneMapped={false} />
      </mesh>
      <mesh rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.5, 0.03, 0.15]} />
        <meshBasicMaterial color="#5c4033" toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Raya neón (cyberpunk) ────────────────────────────────────────────────────

function RayaNeon({ seed }: { seed: number }) {
  const ext = useContext(CieloCtx)
  const ref = useRef<Mesh>(null)
  const base = useMemo(() => puntoCielo(seed, ext), [seed, ext])
  const vel = useMemo(() => 6 + (seed % 5) * 4, [seed])
  const color = seed % 2 === 0 ? '#d946ef' : '#22d3ee'
  const sentido = useMemo(() => (seed % 2 === 0 ? 1 : -1), [seed])
  const x = useRef(base[0])

  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    x.current += vel * dt * sentido
    if (Math.abs(x.current) > ext.x + 5) x.current = -sentido * ext.x
    m.position.set(x.current, base[1], base[2])
  })

  return (
    <mesh ref={ref} position={base}>
      <boxGeometry args={[1.8 + (seed % 3) * 0.6, 0.04, 0.04]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
}

// ─── Copo de nieve (navidad) ──────────────────────────────────────────────────

function CopoNieve({ seed }: { seed: number }) {
  const ext = useContext(CieloCtx)
  const ref = useRef<Group>(null)
  const base = useMemo(() => puntoCielo(seed, ext), [seed, ext])
  const fase = useRef(seed * 0.5)

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    fase.current += dt
    const t = fase.current
    g.position.set(
      base[0] + Math.sin(t + seed) * 2,
      base[1] + 2 - ((t * 2 + seed) % (ext.yMax - ext.yMin + 8)),
      base[2] + Math.cos(t * 0.6 + seed) * 3,
    )
    g.rotation.y = t * 0.8
  })

  return (
    <group ref={ref} scale={0.16 + (seed % 4) * 0.04}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
          <boxGeometry args={[0.8, 0.03, 0.03]} />
          <meshBasicMaterial color="#f8fafc" transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function AnimacionesTema({ tema }: { tema: TemaId }) {
  switch (tema) {
    case 'espacio':
      return (
        <>
          {Array.from({ length: 10 }, (_, i) => (
            <Cometa key={i} seed={i} />
          ))}
        </>
      )
    case 'medieval':
      return (
        <>
          {Array.from({ length: 5 }, (_, i) => (
            <Dragon key={i} seed={i} />
          ))}
        </>
      )
    case 'terror':
      return (
        <>
          {Array.from({ length: 8 }, (_, i) => (
            <Murcielago key={i} seed={i} />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <ParticulaBruma key={`b${i}`} seed={i} />
          ))}
        </>
      )
    case 'barbie':
      return (
        <>
          {Array.from({ length: 12 }, (_, i) => (
            <CorazonFlotante key={i} seed={i} />
          ))}
        </>
      )
    case 'vaquero':
      return (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <Ave key={i} seed={i} />
          ))}
        </>
      )
    case 'cyberpunk':
      return (
        <>
          {Array.from({ length: 14 }, (_, i) => (
            <RayaNeon key={i} seed={i} />
          ))}
        </>
      )
    case 'navidad':
      return (
        <>
          {Array.from({ length: 28 }, (_, i) => (
            <CopoNieve key={i} seed={i} />
          ))}
        </>
      )
    default:
      return null
  }
}

/**
 * Microanimaciones repartidas por todo el cielo según el tema activo.
 */
export function FondoAnimaciones() {
  const tema = useDiseño((s) => s.temaGlobal)
  const activas = useDiseño((s) => s.animacionesFondo)
  const ext = useCieloExtent()
  if (!activas || !tema) return null
  return (
    <CieloCtx.Provider value={ext}>
      <AnimacionesTema tema={tema} />
    </CieloCtx.Provider>
  )
}

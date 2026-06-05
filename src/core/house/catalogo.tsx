import { Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Furniture } from './Furniture'

/**
 * Catálogo de objetos de decoración. Soporta dos tipos de recurso:
 * - primitivas (render con bloques, peso 0, estilo Roblox) → `render`
 * - modelos .glb destacados (Kenney/Quaternius CC0) → `glb`
 * Para agregar una pieza .glb: pon el archivo en `public/models/` y añade
 * una entrada con `glb: '/models/archivo.glb'`.
 */

type Vec3 = [number, number, number]

function B({ p, s, c }: { p: Vec3; s: Vec3; c: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.7} />
    </mesh>
  )
}
function Cyl({ p, r, h, c }: { p: Vec3; r: number; h: number; c: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, 14]} />
      <meshStandardMaterial color={c} roughness={0.7} />
    </mesh>
  )
}
function Sphere({ p, r, c }: { p: Vec3; r: number; c: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <sphereGeometry args={[r, 14, 14]} />
      <meshStandardMaterial color={c} roughness={0.6} />
    </mesh>
  )
}

export interface CatalogoItem {
  id: string
  nombre: string
  icon: string
  defaultColor: string
  /** Render con primitivas (recibe el color elegido). */
  render?: (color: string) => React.ReactElement
  /** O modelo .glb destacado. */
  glb?: string
  escala?: number
}

const WOOD = '#7a5230'

export const CATALOGO: CatalogoItem[] = [
  {
    id: 'planta',
    nombre: 'Planta',
    icon: '🪴',
    defaultColor: '#22c55e',
    render: (c) => (
      <group>
        <Cyl p={[0, 0.25, 0]} r={0.28} h={0.5} c={WOOD} />
        <Sphere p={[0, 0.75, 0]} r={0.42} c={c} />
      </group>
    ),
  },
  {
    id: 'lampara',
    nombre: 'Lámpara',
    icon: '💡',
    defaultColor: '#fbbf24',
    render: (c) => (
      <group>
        <Cyl p={[0, 0.05, 0]} r={0.28} h={0.1} c="#2b2f3a" />
        <Cyl p={[0, 0.7, 0]} r={0.05} h={1.2} c="#2b2f3a" />
        <mesh position={[0, 1.4, 0]} castShadow>
          <coneGeometry args={[0.35, 0.4, 16]} />
          <meshStandardMaterial color={c} roughness={0.5} emissive={c} emissiveIntensity={0.3} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'alfombra',
    nombre: 'Alfombra',
    icon: '🟫',
    defaultColor: '#a855f7',
    render: (c) => (
      <group>
        <B p={[0, 0.06, 0]} s={[2, 0.08, 1.4]} c={c} />
        <B p={[0, 0.07, 0]} s={[1.6, 0.06, 1.05]} c="#ffffff" />
        <B p={[0, 0.08, 0]} s={[1.3, 0.05, 0.8]} c={c} />
      </group>
    ),
  },
  {
    id: 'silla',
    nombre: 'Silla',
    icon: '🪑',
    defaultColor: '#ef4444',
    render: (c) => (
      <group>
        <B p={[0, 0.5, 0]} s={[0.6, 0.1, 0.6]} c={c} />
        <B p={[0, 0.85, -0.25]} s={[0.6, 0.6, 0.1]} c={c} />
        <B p={[-0.25, 0.25, -0.25]} s={[0.08, 0.5, 0.08]} c={WOOD} />
        <B p={[0.25, 0.25, -0.25]} s={[0.08, 0.5, 0.08]} c={WOOD} />
        <B p={[-0.25, 0.25, 0.25]} s={[0.08, 0.5, 0.08]} c={WOOD} />
        <B p={[0.25, 0.25, 0.25]} s={[0.08, 0.5, 0.08]} c={WOOD} />
      </group>
    ),
  },
  {
    id: 'baul',
    nombre: 'Baúl',
    icon: '🧰',
    defaultColor: '#b45309',
    render: (c) => (
      <group>
        <B p={[0, 0.3, 0]} s={[1.1, 0.6, 0.7]} c={c} />
        <B p={[0, 0.65, 0]} s={[1.15, 0.15, 0.75]} c="#6b4f3a" />
        <B p={[0, 0.5, 0.38]} s={[0.2, 0.2, 0.05]} c="#fbbf24" />
      </group>
    ),
  },
  {
    id: 'cuadro',
    nombre: 'Cuadro',
    icon: '🖼️',
    defaultColor: '#3b82f6',
    render: (c) => (
      <group>
        <Cyl p={[0, 0.55, 0]} r={0.04} h={1.1} c="#2b2f3a" />
        <B p={[0, 1.0, 0]} s={[0.9, 0.7, 0.08]} c="#1f2937" />
        <B p={[0, 1.0, 0.05]} s={[0.75, 0.55, 0.02]} c={c} />
      </group>
    ),
  },
  // Ejemplo de pieza .glb destacada (descomenta y pon el archivo en public/models/):
  // { id: 'trofeo', nombre: 'Trofeo', icon: '🏆', defaultColor: '#fbbf24', glb: '/models/trofeo.glb', escala: 1 },
]

export const getCatalogoItem = (id: string) => CATALOGO.find((i) => i.id === id)

function GlbObjeto({ src, escala = 1 }: { src: string; escala?: number }) {
  const { scene } = useGLTF(src)
  const cloned = useMemo(() => scene.clone(), [scene])
  return <primitive object={cloned} scale={escala} />
}

/** Dibuja un objeto del catálogo, mueble temático o .glb. */
export function ObjetoView({ tipo, color }: { tipo: string; color: string }) {
  if (tipo.startsWith('mueble:')) {
    const roomId = tipo.slice('mueble:'.length)
    return <Furniture id={roomId} color={color} />
  }
  const item = getCatalogoItem(tipo)
  if (!item) return null
  if (item.glb) {
    return (
      <Suspense fallback={null}>
        <GlbObjeto src={item.glb} escala={item.escala} />
      </Suspense>
    )
  }
  return item.render ? item.render(color) : null
}

import { Suspense, useContext, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { TB as B, TC as Cyl, TS as Sphere, TemaContext } from './primitivas'
import { getModelo, COLISION, ALTO } from './modelosRecursos'

/**
 * Catálogo de objetos de decoración. Soporta dos tipos de recurso:
 * - primitivas temáticas (TB/TC/TS, peso 0, estilo Roblox) → `render`
 * - modelos .glb destacados (Kenney/Quaternius CC0) → `glb`
 * Las primitivas se re-visten con el tema activo (ver `primitivas.tsx`).
 * Para agregar una pieza .glb: pon el archivo en `public/models/` y añade
 * una entrada con `glb: '/models/archivo.glb'`.
 */

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
  {
    id: 'guitarra',
    nombre: 'Guitarra',
    icon: '🎸',
    defaultColor: '#d97706',
    // Acostada en el suelo: cuerpo en forma de 8 + mástil con pala.
    render: (c) => (
      <group>
        <Sphere p={[0, 0.18, 0.55]} r={0.42} c={c} />
        <Sphere p={[0, 0.18, 0.1]} r={0.28} c={c} />
        <Cyl p={[0, 0.33, 0.55]} r={0.12} h={0.04} c="#1f2937" />
        <B p={[0, 0.18, -0.55]} s={[0.16, 0.1, 1.1]} c={WOOD} />
        <B p={[0, 0.18, -1.15]} s={[0.26, 0.1, 0.26]} c="#1f2937" />
      </group>
    ),
  },
  {
    id: 'mesa',
    nombre: 'Mesa',
    icon: '🪵',
    defaultColor: '#8b5a2b',
    render: (c) => (
      <group>
        <B p={[0, 0.72, 0]} s={[1.4, 0.1, 0.9]} c={c} />
        <B p={[-0.6, 0.36, -0.35]} s={[0.1, 0.72, 0.1]} c={WOOD} />
        <B p={[0.6, 0.36, -0.35]} s={[0.1, 0.72, 0.1]} c={WOOD} />
        <B p={[-0.6, 0.36, 0.35]} s={[0.1, 0.72, 0.1]} c={WOOD} />
        <B p={[0.6, 0.36, 0.35]} s={[0.1, 0.72, 0.1]} c={WOOD} />
      </group>
    ),
  },
  {
    id: 'pelota',
    nombre: 'Pelota',
    icon: '⚽',
    defaultColor: '#ef4444',
    render: (c) => <Sphere p={[0, 0.35, 0]} r={0.35} c={c} />,
  },
  {
    id: 'libro',
    nombre: 'Libro',
    icon: '📕',
    defaultColor: '#2563eb',
    render: (c) => (
      <group>
        <B p={[0, 0.12, 0]} s={[0.72, 0.2, 0.52]} c={c} />
        <B p={[0.02, 0.12, 0]} s={[0.66, 0.16, 0.48]} c="#f5f5f0" />
      </group>
    ),
  },
  // Ejemplo de pieza .glb destacada (descomenta y pon el archivo en public/models/):
  // { id: 'trofeo', nombre: 'Trofeo', icon: '🏆', defaultColor: '#fbbf24', glb: '/models/trofeo.glb', escala: 1 },
]

export const getCatalogoItem = (id: string) => CATALOGO.find((i) => i.id === id)

/** Footprint de colisión [hx, hz] de la decoración genérica. Ausente = no estorba. */
const COLISION_CAT: Record<string, [number, number]> = {
  planta: [0.35, 0.35],
  lampara: [0.28, 0.28],
  silla: [0.3, 0.3],
  baul: [0.55, 0.35],
  mesa: [0.7, 0.45],
  pelota: [0.35, 0.35],
  guitarra: [0.4, 0.5],
  cuadro: [0.45, 0.1],
  // alfombra y libro: planos / menudos → se pueden pisar.
}

/**
 * Footprint de colisión [hx, hz] de cualquier objeto colocado según su `tipo`.
 * `null` = no estorba (el personaje pasa por encima).
 */
export function footprintDeTipo(tipo: string): [number, number] | null {
  if (tipo.startsWith('recurso:')) return COLISION[Number(tipo.slice('recurso:'.length))] ?? null
  return COLISION_CAT[tipo] ?? null
}

/** Alto aproximado del objeto (para el marcador del objeto principal). */
export function altoDeTipo(tipo: string): number {
  if (tipo.startsWith('recurso:')) return ALTO[Number(tipo.slice('recurso:'.length))] ?? 2.2
  return 1.2
}

function GlbObjeto({ src, escala = 1 }: { src: string; escala?: number }) {
  const { scene } = useGLTF(src)
  const cloned = useMemo(() => scene.clone(), [scene])
  return <primitive object={cloned} scale={escala} />
}

/** Dibuja un recurso 3D, objeto del catálogo, mueble temático o .glb. */
export function ObjetoView({ tipo, color }: { tipo: string; color: string }) {
  const tema = useContext(TemaContext)
  if (tipo.startsWith('recurso:')) {
    const modelo = getModelo(Number(tipo.slice('recurso:'.length)))
    return modelo ? modelo.render(color, tema?.id ?? null) : null
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

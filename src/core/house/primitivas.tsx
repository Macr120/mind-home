import { createContext, useContext } from 'react'
import * as THREE from 'three'
import { matTema, type Tema } from './temas'
import { useDiseño } from '../state/disenoStore'

/**
 * Primitivas temáticas compartidas (estilo Roblox). Cualquier mesh hecho con
 * <TB/>, <TC/> o <TS/> se "re-viste" automáticamente con el tema activo, que se
 * provee con <TemaContext.Provider value={tema}> alrededor de los objetos.
 * Así el tema afecta a los objetos (muebles y decoración), no solo al shell.
 */

export const TemaContext = createContext<Tema | null>(null)

type Vec3 = [number, number, number]

/** Mapa de bandas para el cel-shading (estilo cómic): 4 escalones de luz. */
let gradienteToon: THREE.DataTexture | null = null
function gradientMapToon(): THREE.DataTexture {
  if (gradienteToon) return gradienteToon
  const tex = new THREE.DataTexture(new Uint8Array([90, 150, 210, 255]), 4, 1, THREE.RedFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  gradienteToon = tex
  return tex
}

/** Material de primitiva: estándar (PBR) o toon con bandas si el efecto 'toon' está activo. */
function MatPrimitiva({ c, rough }: { c: string; rough: number }) {
  const tema = useContext(TemaContext)
  const toon = useDiseño((s) => s.efectosVisuales && s.efectosConfig.toon?.on === true)
  const m = matTema(c, tema, rough)
  if (toon) {
    return (
      <meshToonMaterial
        color={m.color}
        gradientMap={gradientMapToon()}
        emissive={m.emissive ?? '#000000'}
        emissiveIntensity={m.emissiveIntensity ?? 0}
      />
    )
  }
  return <meshStandardMaterial {...m} />
}

/** Caja temática. */
export function TB({ p, s, c, rough }: { p: Vec3; s: Vec3; c: string; rough?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <MatPrimitiva c={c} rough={rough ?? 0.7} />
    </mesh>
  )
}

/** Cilindro temático. */
export function TC({
  p,
  r,
  h,
  c,
  rough,
  seg = 16,
}: {
  p: Vec3
  r: number
  h: number
  c: string
  rough?: number
  seg?: number
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, seg]} />
      <MatPrimitiva c={c} rough={rough ?? 0.7} />
    </mesh>
  )
}

/** Esfera temática. */
export function TS({ p, r, c, rough }: { p: Vec3; r: number; c: string; rough?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <sphereGeometry args={[r, 16, 16]} />
      <MatPrimitiva c={c} rough={rough ?? 0.6} />
    </mesh>
  )
}

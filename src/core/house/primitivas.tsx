import { createContext, Suspense, useContext, type ReactElement } from 'react'
import * as THREE from 'three'
import { matTema, type Tema } from './temas'
import { useDiseño } from '../state/disenoStore'
import { esMaterialPbr, useMapasPBR, useRealismo, type MaterialPbrId } from './materialesPBR'
import { cajaMetros } from './uvMetros'

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

/**
 * Material PBR que toca a una pieza con `acabado` (id de `materialesPBR.ts`), o
 * null si el realismo de muebles está apagado, el render es toon o el id no
 * existe. La madera la puede cambiar el tema (`shell.texturas.mueble`).
 */
export function useAcabado(acabado: string | undefined): MaterialPbrId | null {
  const on = useRealismo('pbrMuebles')
  const toon = useDiseño((s) => s.efectosVisuales && s.efectosConfig.toon?.on === true)
  const delTema = useContext(TemaContext)?.shell.texturas?.mueble
  if (!on || toon || !esMaterialPbr(acabado)) return null
  if (acabado.startsWith('mueble.madera') && esMaterialPbr(delTema)) return delTema
  return acabado
}

/** Material con las texturas PBR (suspende mientras cargan). */
function MatTexturado({ id, color, metalness }: { id: MaterialPbrId; color: string; metalness?: number }) {
  const pbr = useMapasPBR(id)
  return (
    <meshStandardMaterial
      color={color}
      map={pbr.map}
      normalMap={pbr.normalMap}
      roughnessMap={pbr.roughnessMap}
      roughness={1}
      metalness={metalness ?? pbr.metalness}
    />
  )
}

/**
 * Material de una pieza con acabado PBR: mientras cargan las texturas (o si no
 * hay acabado) se ve el material de siempre, que llega como `children`.
 */
export function MatAcabado({
  id,
  color,
  metalness,
  children,
}: {
  id: MaterialPbrId | null
  color: string
  metalness?: number
  children: ReactElement
}) {
  if (!id) return children
  return (
    <Suspense fallback={children}>
      <MatTexturado id={id} color={color} metalness={metalness} />
    </Suspense>
  )
}

/** Material de primitiva: estándar (PBR) o toon con bandas si el efecto 'toon' está activo. */
function MatPrimitiva({ c, rough, acabado }: { c: string; rough: number; acabado: MaterialPbrId | null }) {
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
  return (
    <MatAcabado id={acabado} color={m.color}>
      <meshStandardMaterial {...m} />
    </MatAcabado>
  )
}

/** Caja temática. `acabado`: material PBR opcional (solo con el realismo de muebles). */
export function TB({ p, s, c, rough, acabado }: { p: Vec3; s: Vec3; c: string; rough?: number; acabado?: string }) {
  const id = useAcabado(acabado)
  return (
    <mesh position={p} castShadow receiveShadow geometry={id ? cajaMetros(...s) : undefined}>
      {!id && <boxGeometry args={s} />}
      <MatPrimitiva c={c} rough={rough ?? 0.7} acabado={id} />
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
  acabado,
}: {
  p: Vec3
  r: number
  h: number
  c: string
  rough?: number
  seg?: number
  acabado?: string
}) {
  const id = useAcabado(acabado)
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, seg]} />
      <MatPrimitiva c={c} rough={rough ?? 0.7} acabado={id} />
    </mesh>
  )
}

/** Esfera temática. */
export function TS({ p, r, c, rough }: { p: Vec3; r: number; c: string; rough?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <sphereGeometry args={[r, 16, 16]} />
      <MatPrimitiva c={c} rough={rough ?? 0.6} acabado={null} />
    </mesh>
  )
}

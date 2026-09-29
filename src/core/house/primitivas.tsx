import { createContext, Suspense, useContext, type ReactElement } from 'react'
import * as THREE from 'three'
import type { ThreeElements } from '@react-three/fiber'
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

/**
 * UV en metros calculadas en el shader desde la posición en el mundo: cada cara
 * proyecta el plano de su eje dominante (mapeo «por caja»). Sirve para las mallas
 * escritas a mano (cajas, cilindros, esferas) sin tocar su geometría, que trae UV
 * de 0 a 1 por cara, y respeta la escala del objeto. El relieve sigue funcionando:
 * three arma la base tangente con las derivadas de esas mismas UV.
 */
const PROYECCION_METROS = `#include <project_vertex>
{
  vec3 mphP = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vec3 mphN = abs(normalize(mat3(modelMatrix) * objectNormal));
  vec2 mphUv = mphN.y > max(mphN.x, mphN.z) ? mphP.xz : (mphN.x > mphN.z ? mphP.zy : mphP.xy);
  #ifdef USE_MAP
    vMapUv = (mapTransform * vec3(mphUv, 1.0)).xy;
  #endif
  #ifdef USE_NORMALMAP
    vNormalMapUv = (normalMapTransform * vec3(mphUv, 1.0)).xy;
  #endif
  #ifdef USE_ROUGHNESSMAP
    vRoughnessMapUv = (roughnessMapTransform * vec3(mphUv, 1.0)).xy;
  #endif
}`
const proyectarEnMetros = (sh: { vertexShader: string }) => {
  sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', PROYECCION_METROS)
}
const claveProyeccion = () => 'mph-uv-metros'

/** Material con las texturas PBR (suspende mientras cargan). */
function MatTexturado({
  id,
  color,
  metalness,
  proyectar,
}: {
  id: MaterialPbrId
  color: string
  metalness?: number
  proyectar?: boolean
}) {
  const pbr = useMapasPBR(id)
  return (
    <meshStandardMaterial
      color={color}
      map={pbr.map}
      normalMap={pbr.normalMap}
      roughnessMap={pbr.roughnessMap}
      roughness={1}
      metalness={metalness ?? pbr.metalness}
      onBeforeCompile={proyectar ? proyectarEnMetros : undefined}
      customProgramCacheKey={proyectar ? claveProyeccion : undefined}
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
  proyectar,
  children,
}: {
  id: MaterialPbrId | null
  color: string
  metalness?: number
  /** Las UV de la malla no van en metros: proyectarlas en el shader. */
  proyectar?: boolean
  children: ReactElement
}) {
  if (!id) return children
  return (
    <Suspense fallback={children}>
      <MatTexturado id={id} color={color} metalness={metalness} proyectar={proyectar} />
    </Suspense>
  )
}

/**
 * `<meshStandardMaterial>` de siempre con un `acabado` PBR opcional, para mallas
 * escritas a mano (especiales): con el realismo de muebles encendido se cambia por
 * el material texturizado con UV proyectadas en metros.
 */
export function MatStd({ acabado, ...props }: ThreeElements['meshStandardMaterial'] & { acabado?: string }) {
  const id = useAcabado(acabado)
  return (
    <MatAcabado id={id} color={typeof props.color === 'string' ? props.color : '#ffffff'} proyectar>
      <meshStandardMaterial {...props} />
    </MatAcabado>
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
export function TS({ p, r, c, rough, acabado }: { p: Vec3; r: number; c: string; rough?: number; acabado?: string }) {
  const id = useAcabado(acabado)
  return (
    <mesh position={p} castShadow receiveShadow>
      <sphereGeometry args={[r, 16, 16]} />
      <MatPrimitiva c={c} rough={rough ?? 0.6} acabado={id} />
    </mesh>
  )
}

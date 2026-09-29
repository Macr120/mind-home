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
export function useAcabado(
  acabado: string | undefined,
  /** Qué interruptor de Realismo lo gobierna (puertas y muros van con los muros). */
  clave: 'pbrMuebles' | 'pbrMuros' = 'pbrMuebles',
): MaterialPbrId | null {
  const on = useRealismo(clave)
  const toon = useDiseño((s) => s.efectosVisuales && s.efectosConfig.toon?.on === true)
  const delTema = useContext(TemaContext)?.shell.texturas?.mueble
  if (!on || toon || !esMaterialPbr(acabado)) return null
  if (acabado.startsWith('mueble.madera') && esMaterialPbr(delTema)) return delTema
  return acabado
}

/**
 * UV en metros calculadas en el shader: cada cara proyecta el plano de su eje
 * dominante (mapeo «por caja»). Sirve para las mallas escritas a mano (cajas,
 * cilindros, esferas) sin tocar su geometría, que trae UV de 0 a 1 por cara. Se
 * proyecta en el espacio de la PIEZA (escalado por su escala en el mundo): así la
 * textura viaja pegada a lo que se mueve (puertas, vehículos, ropa del avatar) y
 * sigue midiendo metros. El relieve funciona: three arma la base tangente con las
 * derivadas de esas mismas UV.
 */
const PROYECCION_METROS = `#include <project_vertex>
{
  vec3 mphEsc = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
  vec3 mphP = transformed * mphEsc;
  vec3 mphN = abs(normalize(objectNormal / mphEsc));
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
const claveProyeccion = () => 'mph-uv-metros-local'

/**
 * Variante para mallas cuyas UV ya siguen la superficie pero en otra unidad (los
 * muros curvos y en polilínea las dan en metros / TILE): se escalan a metros, así
 * la textura corre continua a lo largo de la curva, sin las costuras de proyectar.
 */
const escalasUv = new Map<number, { onBeforeCompile: (sh: { vertexShader: string }) => void; clave: () => string }>()
function escalarUv(k: number) {
  let e = escalasUv.get(k)
  if (!e) {
    const f = k.toFixed(4)
    const codigo = `#include <project_vertex>
  #ifdef USE_MAP
    vMapUv = (mapTransform * vec3(uv * ${f}, 1.0)).xy;
  #endif
  #ifdef USE_NORMALMAP
    vNormalMapUv = (normalMapTransform * vec3(uv * ${f}, 1.0)).xy;
  #endif
  #ifdef USE_ROUGHNESSMAP
    vRoughnessMapUv = (roughnessMapTransform * vec3(uv * ${f}, 1.0)).xy;
  #endif`
    e = {
      onBeforeCompile: (sh) => {
        sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', codigo)
      },
      clave: () => `mph-uv-x${f}`,
    }
    escalasUv.set(k, e)
  }
  return e
}

/** Cómo sacar UV en metros: proyectarlas desde la pieza, o escalar las de la malla. */
export type UvMetros = 'proyectar' | number

/** Quita las claves sin valor: un `undefined` explícito pisaría el default de three. */
const soloDefinidos = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

/** Lo que el material texturizado hereda del de siempre (brillo y transparencia). */
type MatExtra = Pick<
  ThreeElements['meshStandardMaterial'],
  'emissive' | 'emissiveIntensity' | 'toneMapped' | 'transparent' | 'opacity' | 'depthWrite'
>

/** Material con las texturas PBR (suspende mientras cargan). */
function MatTexturado({
  id,
  color,
  metalness,
  uvMetros,
  side,
  extra,
}: {
  id: MaterialPbrId
  color: string
  metalness?: number
  uvMetros?: UvMetros
  side?: THREE.Side
  extra?: MatExtra
}) {
  const pbr = useMapasPBR(id)
  const escala = typeof uvMetros === 'number' ? escalarUv(uvMetros) : null
  return (
    <meshStandardMaterial
      color={color}
      map={pbr.map}
      normalMap={pbr.normalMap}
      roughnessMap={pbr.roughnessMap}
      roughness={1}
      metalness={metalness ?? pbr.metalness}
      side={side}
      {...extra}
      onBeforeCompile={escala?.onBeforeCompile ?? (uvMetros === 'proyectar' ? proyectarEnMetros : undefined)}
      customProgramCacheKey={escala?.clave ?? (uvMetros === 'proyectar' ? claveProyeccion : undefined)}
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
  uvMetros,
  side,
  extra,
  children,
}: {
  id: MaterialPbrId | null
  color: string
  metalness?: number
  /** Las UV de la malla no van en metros: proyectarlas o escalarlas en el shader. */
  uvMetros?: UvMetros
  side?: THREE.Side
  extra?: MatExtra
  children: ReactElement
}) {
  if (!id) return children
  return (
    <Suspense fallback={children}>
      <MatTexturado id={id} color={color} metalness={metalness} uvMetros={uvMetros} side={side} extra={extra} />
    </Suspense>
  )
}

/**
 * `<meshStandardMaterial>` de siempre con un `acabado` PBR opcional, para mallas
 * escritas a mano (especiales): con el realismo de muebles encendido se cambia por
 * el material texturizado con UV proyectadas en metros.
 */
export function MatStd({
  acabado,
  realismo = 'pbrMuebles',
  uvMetros = 'proyectar',
  ...props
}: ThreeElements['meshStandardMaterial'] & {
  acabado?: string
  realismo?: 'pbrMuebles' | 'pbrMuros'
  uvMetros?: UvMetros
}) {
  const id = useAcabado(acabado, realismo)
  return (
    <MatAcabado
      id={id}
      color={typeof props.color === 'string' ? props.color : '#ffffff'}
      uvMetros={uvMetros}
      side={props.side as THREE.Side | undefined}
      extra={soloDefinidos({
        emissive: props.emissive,
        emissiveIntensity: props.emissiveIntensity,
        toneMapped: props.toneMapped,
        transparent: props.transparent,
        opacity: props.opacity,
        depthWrite: props.depthWrite,
      })}
    >
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

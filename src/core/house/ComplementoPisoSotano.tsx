import { Suspense, useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { RepeatWrapping } from 'three'
import type * as THREE from 'three'
import { SIZE } from './walls'
import { geometriaComplementoLoseta3D, type CeldaFormaLoseta } from './formasLoseta'
import type { MatPiso } from './pisoSubcelda'

/** Mismo tamaño de loseta que el piso del cuarto: el complemento calza con su silueta. */
const TILE = SIZE - 0.1
/** El relleno nunca intercepta clics (arrastrar el cuarto, caminar). */
const sinRaycast = () => {}

type Subformas = (CeldaFormaLoseta | undefined)[] | null

type MeshProps = {
  geometry: THREE.BufferGeometry
  position: [number, number, number]
  rotation: [number, number, number]
  receiveShadow: boolean
  raycast: () => void
}

/** Complemento con textura PBR (arena, madera…): calza con el piso exterior texturado del mapa. */
function CompTexturado({
  props,
  textura,
  tileSize,
  roughness,
  metalness,
}: {
  props: MeshProps
  textura: string
  tileSize: number
  roughness: number
  metalness: number
}) {
  const base = `/textures/floors/${textura}`
  const maps = useTexture({
    map: `${base}_color.jpg`,
    normalMap: `${base}_normal.jpg`,
    roughnessMap: `${base}_roughness.jpg`,
  })
  useMemo(() => {
    const rep = Math.max(1, TILE / tileSize)
    for (const t of [maps.map, maps.normalMap, maps.roughnessMap]) {
      if (!t) continue
      t.wrapS = t.wrapT = RepeatWrapping
      t.repeat.set(rep, rep)
      t.needsUpdate = true
    }
  }, [maps, tileSize])
  return (
    <mesh {...props}>
      <meshStandardMaterial {...maps} color="#ffffff" roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

/**
 * Relleno de piso exterior FUERA de la silueta de una celda de sótano (triángulo/círculo
 * o recortes finos). El pozo va hacia abajo; sin esto las esquinas dejarían ver el vacío.
 * Usa el MISMO material que el piso exterior del mapa (textura o color) para que se funda
 * con el suelo de alrededor, y va un pelín por debajo del borde para que los muros del
 * cuarto se vean por encima (no compitan a la misma altura).
 */
export function ComplementoPisoSotano({
  lx,
  lz,
  y,
  forma,
  subformas,
  mat,
}: {
  lx: number
  lz: number
  y: number
  forma: CeldaFormaLoseta
  subformas: Subformas
  mat: MatPiso
}) {
  const geo = useMemo(() => geometriaComplementoLoseta3D(forma, TILE, subformas), [forma, subformas])
  useEffect(() => () => geo?.dispose(), [geo])
  if (!geo) return null
  const props: MeshProps = {
    geometry: geo,
    position: [lx, y, lz],
    rotation: [-Math.PI / 2, 0, 0],
    receiveShadow: true,
    raycast: sinRaycast,
  }
  const solido = (
    <mesh {...props}>
      <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
    </mesh>
  )
  if (mat.pisoConf?.textura) {
    return (
      <Suspense fallback={solido}>
        <CompTexturado
          props={props}
          textura={mat.pisoConf.textura}
          tileSize={mat.pisoConf.tileSize ?? 2.5}
          roughness={mat.roughness}
          metalness={mat.metalness}
        />
      </Suspense>
    )
  }
  return solido
}

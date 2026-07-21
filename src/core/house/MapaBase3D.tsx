import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { useLayout } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'
import { useEditorUi } from '../state/editorUiStore'
import { usePlanos } from '../state/planosStore'
import { SPACING, subId, worldToCeldaEntera } from './walls'
import { getPisoTipo } from './pisos'
import { MAPA_SUPERFICIE_ID, rellenoPapelPlano } from './mapaSuperficie'

/**
 * Base del mapa como malla de sub-celdas (½×½) en el plano XZ, SALTANDO las sub-celdas
 * excavadas por cuartos de sótano (el hueco deja ver la alberca/búnker de abajo). Con
 * UVs 0..1 sobre el rectángulo completo, idénticas al planeGeometry que sustituye.
 */
function geometriaBaseConHuecos(
  cols: number,
  rows: number,
  huecos: Set<string>,
): THREE.BufferGeometry {
  const ancho = cols * SPACING
  const alto = rows * SPACING
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  // Sub-índices que cubren la rejilla: la celda col cubre [2col-1, 2col] (ver subRango).
  for (let sc = -1; sc <= 2 * cols - 2; sc++) {
    for (let sr = -1; sr <= 2 * rows - 2; sr++) {
      if (huecos.has(subId(sc, sr))) continue
      const x0 = (sc / 2 - (cols - 1) / 2) * SPACING
      const z0 = (sr / 2 - (rows - 1) / 2) * SPACING
      const x1 = x0 + SPACING / 2
      const z1 = z0 + SPACING / 2
      const base = pos.length / 3
      pos.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x1, 0, z0)
      for (const [px, pz] of [
        [x0, z0],
        [x0, z1],
        [x1, z1],
        [x1, z0],
      ] as const) {
        uv.push(px / ancho + 0.5, 0.5 - pz / alto)
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  const normales = new Float32Array(pos.length)
  for (let i = 0; i < normales.length; i += 3) normales[i + 1] = 1
  geo.setAttribute('normal', new THREE.BufferAttribute(normales, 3))
  geo.setIndex(idx)
  return geo
}

function PlanoBaseMesh({
  geometry,
  material,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
}) {
  return (
    <mesh
      position={[0, 0.005, 0]}
      receiveShadow
      onClick={(e) => {
        // Editor 3D: el suelo del mapa (la base) abre el modo Piso ext. y selecciona la
        // celda tocada. (Es la capa que el clic golpea sobre el suelo exterior.)
        if (!useEditorUi.getState().editor3d) return
        if (usePlanos.getState().modo === 'piso-ext') return
        e.stopPropagation()
        const celda = worldToCeldaEntera(e.point.x, e.point.z)
        useEditorUi.getState().setTab('mapa')
        usePlanos.getState().setModo('piso-ext')
        usePlanos.getState().setSeleccion({ tipo: 'exterior', celdas: [celda] })
      }}
    >
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

function BaseColor({ geometry, color }: { geometry: THREE.BufferGeometry; color: string }) {
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }),
    [color],
  )
  return <PlanoBaseMesh geometry={geometry} material={material} />
}

function BaseTextura({
  geometry,
  textura,
  cols,
  rows,
}: {
  geometry: THREE.BufferGeometry
  textura: string
  cols: number
  rows: number
}) {
  const piso = getPisoTipo(textura as import('./pisos').PisoTipoId)
  const path = `/textures/floors/${piso?.textura ?? 'parquet'}_color.jpg`
  const tex = useTexture(path)
  useEffect(() => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(cols * 2, rows * 2)
    tex.needsUpdate = true
  }, [tex, cols, rows])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: piso?.roughness ?? 0.9,
        metalness: piso?.metalness ?? 0,
      }),
    [tex, piso?.roughness, piso?.metalness],
  )
  return <PlanoBaseMesh geometry={geometry} material={material} />
}

function BaseImagen({ geometry, url }: { geometry: THREE.BufferGeometry; url: string }) {
  const tex = useTexture(url)
  useEffect(() => {
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    tex.needsUpdate = true
  }, [tex])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 }),
    [tex],
  )
  return <PlanoBaseMesh geometry={geometry} material={material} />
}

/** Plano bajo la rejilla 3D con el mismo relleno que el croquis (con huecos de sótano). */
export function MapaBase3D() {
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const mapaSuperficie = useDiseño((s) => s.mapaSuperficie)
  const imagenUrl = useDiseño((s) => s.roomPisoImagenes[MAPA_SUPERFICIE_ID])
  const imagenActiva = useDiseño((s) => s.roomPisoImagenActiva[MAPA_SUPERFICIE_ID] ?? false)

  // Sub-celdas excavadas por sótanos: la base se abre ahí para ver el pozo de abajo.
  const huecos = useMemo(() => {
    const s = new Set<string>()
    for (const [lvl, occ] of ocupadoPorNivel) {
      if (lvl < 0) for (const k of occ) s.add(k)
    }
    return s
  }, [ocupadoPorNivel])

  const geometry = useMemo(
    () => geometriaBaseConHuecos(gridCols, gridRows, huecos),
    [gridCols, gridRows, huecos],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  const relleno = rellenoPapelPlano(mapaSuperficie, imagenActiva ? imagenUrl : undefined)

  if (relleno.tipo === 'ninguno') return null

  if (relleno.tipo === 'imagen' && relleno.imagenUrl) {
    return <BaseImagen geometry={geometry} url={relleno.imagenUrl} />
  }
  if (relleno.tipo === 'textura' && relleno.textura) {
    return (
      <BaseTextura geometry={geometry} textura={relleno.textura} cols={gridCols} rows={gridRows} />
    )
  }
  return <BaseColor geometry={geometry} color={relleno.color} />
}

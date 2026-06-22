import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { useLayout } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'
import { SPACING } from './walls'
import { getPisoTipo } from './pisos'
import { MAPA_SUPERFICIE_ID, rellenoPapelPlano } from './mapaSuperficie'

function PlanoBaseMesh({
  ancho,
  alto,
  material,
}: {
  ancho: number
  alto: number
  material: THREE.Material
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
      <planeGeometry args={[ancho, alto]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

function BaseColor({ ancho, alto, color }: { ancho: number; alto: number; color: string }) {
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }),
    [color],
  )
  return <PlanoBaseMesh ancho={ancho} alto={alto} material={material} />
}

function BaseTextura({
  ancho,
  alto,
  textura,
  cols,
  rows,
}: {
  ancho: number
  alto: number
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
  return <PlanoBaseMesh ancho={ancho} alto={alto} material={material} />
}

function BaseImagen({ ancho, alto, url }: { ancho: number; alto: number; url: string }) {
  const tex = useTexture(url)
  useEffect(() => {
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    tex.needsUpdate = true
  }, [tex])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 }),
    [tex],
  )
  return <PlanoBaseMesh ancho={ancho} alto={alto} material={material} />
}

/** Plano bajo la rejilla 3D con el mismo relleno que el croquis. */
export function MapaBase3D() {
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const mapaSuperficie = useDiseño((s) => s.mapaSuperficie)
  const imagenUrl = useDiseño((s) => s.roomPisoImagenes[MAPA_SUPERFICIE_ID])
  const imagenActiva = useDiseño((s) => s.roomPisoImagenActiva[MAPA_SUPERFICIE_ID] ?? false)

  const ancho = gridCols * SPACING
  const alto = gridRows * SPACING
  const relleno = rellenoPapelPlano(mapaSuperficie, imagenActiva ? imagenUrl : undefined)

  if (relleno.tipo === 'ninguno') return null

  if (relleno.tipo === 'imagen' && relleno.imagenUrl) {
    return <BaseImagen ancho={ancho} alto={alto} url={relleno.imagenUrl} />
  }
  if (relleno.tipo === 'textura' && relleno.textura) {
    return (
      <BaseTextura
        ancho={ancho}
        alto={alto}
        textura={relleno.textura}
        cols={gridCols}
        rows={gridRows}
      />
    )
  }
  return <BaseColor ancho={ancho} alto={alto} color={relleno.color} />
}

import { useMemo } from 'react'
import * as THREE from 'three'
import type { CeldaFormaLoseta } from './formasLoseta'
import { outlineCeldaXZ, centroCirculoCelda, verticesTrianguloXZ } from './formasLoseta'
import { geoTechoTienda, geoTechoVertices, alturasPicos, centroidePt } from './techoCeldaGeo'
import type { TechoTipoId, TechoCeldaForma } from './techos'
import { colorTechoLoseta } from './techos'
import { mezclar } from './temas'

/**
 * Techo de UNA celda NO cuadrada (triángulo o círculo), fabricado por rejilla.
 * - Triángulo: pico (tienda de 3 aguas) o 1 agua (pendiente).
 * - Círculo: cono (ápice sobre el centro del círculo).
 * El material se deriva del tipo de techo igual que la losa plana.
 */
export function TechoCeldaNoCuadrada({
  formaLoseta,
  cf,
  tipo,
  colorCuarto,
  tinte,
  tile,
  atenuado = false,
}: {
  formaLoseta: CeldaFormaLoseta
  cf: TechoCeldaForma
  tipo: TechoTipoId | null
  colorCuarto: string
  tinte?: string
  tile: number
  atenuado?: boolean
}) {
  const geo = useMemo(() => {
    const alt = Math.min(2.4, Math.max(1.0, tile * 0.5)) * (cf.params.altura || 1)
    if (formaLoseta.forma === 'circular') {
      // Cono: ápice sobre el centro del círculo (la esquina recta de la celda).
      const outline = outlineCeldaXZ(formaLoseta, tile)
      return geoTechoTienda(outline, centroCirculoCelda(formaLoseta, tile), alt)
    }
    // Triángulo: 'cupula' = pirámide de 3 caras (tienda); 'dos_aguas' = picos (vértices).
    const verts = verticesTrianguloXZ(formaLoseta, tile)
    if (cf.forma === 'cupula') return geoTechoTienda(verts, centroidePt(verts), alt)
    const cuantos = cf.params.aguas === 1 ? 1 : 2 // 1 pico o 2 picos
    return geoTechoVertices(verts, alturasPicos(alt, cuantos, cf.params.dir))
  }, [formaLoseta, cf, tile])

  const mat = colorTechoLoseta(tipo, colorCuarto)
  if (tinte) mat.color = mezclar(mat.color, tinte, 0.55)

  return (
    <mesh geometry={geo} castShadow={!atenuado} receiveShadow={!atenuado}>
      <meshStandardMaterial
        color={mat.color}
        roughness={mat.roughness}
        metalness={mat.metalness}
        emissive={mat.emissive}
        emissiveIntensity={atenuado ? 0 : mat.emissiveIntensity}
        transparent={atenuado}
        opacity={atenuado ? 0.16 : 1}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}

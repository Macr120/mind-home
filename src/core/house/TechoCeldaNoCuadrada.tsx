import { useMemo } from 'react'
import * as THREE from 'three'
import type { CeldaFormaLoseta } from './formasLoseta'
import {
  outlineCeldaXZ,
  outlineCeldaRecortadaXZ,
  centroCirculoCelda,
  verticesTrianguloXZ,
} from './formasLoseta'
import {
  geoTechoTienda,
  geoTechoVertices,
  geoTechoFaldonContorno,
  alturasPicos,
  centroidePt,
} from './techoCeldaGeo'
import type { TechoTipoId, TechoCeldaForma } from './techos'
import { colorTechoLoseta } from './techos'
import { mezclar } from './temas'

/**
 * Techo de UNA celda NO cuadrada (triángulo, círculo o cuadrada con recortes finos),
 * fabricado por rejilla siguiendo su silueta.
 * - Triángulo: pico (tienda de 3 aguas), picos por vértice o 1 agua (pendiente).
 * - Círculo: cono (ápice sobre el centro del círculo) o faldones sobre el sector.
 * - Recortes finos (`subformas`): tienda o faldones (1/2 aguas) sobre la silueta recortada.
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
  subformas,
}: {
  formaLoseta: CeldaFormaLoseta
  cf: TechoCeldaForma
  tipo: TechoTipoId | null
  colorCuarto: string
  tinte?: string
  tile: number
  atenuado?: boolean
  /** Recortes finos por cuadrante (NO,NE,SO,SE) de una celda cuadrada. */
  subformas?: (CeldaFormaLoseta | undefined)[] | null
}) {
  const geo = useMemo(() => {
    const alt = Math.min(2.4, Math.max(1.0, tile * 0.5)) * (cf.params.altura || 1)
    // Plano inclinado (heredado de la forma global del cuarto) = 1 agua a esa pendiente.
    const altPlano = (cf.params.inclinacion || 0) * tile * 0.85
    if (subformas) {
      const outline = outlineCeldaRecortadaXZ(subformas, tile)
      if (cf.forma === 'cupula') return geoTechoTienda(outline, centroidePt(outline), alt)
      if (cf.forma === 'plano') return geoTechoFaldonContorno(outline, altPlano, 1, cf.params.dir, tile)
      return geoTechoFaldonContorno(outline, alt, cf.params.aguas === 1 ? 1 : 2, cf.params.dir, tile)
    }
    if (formaLoseta.forma === 'circular') {
      const outline = outlineCeldaXZ(formaLoseta, tile)
      if (cf.forma === 'plano') return geoTechoFaldonContorno(outline, altPlano, 1, cf.params.dir, tile)
      if (cf.forma === 'dos_aguas' || cf.forma === 'abovedado')
        return geoTechoFaldonContorno(outline, alt, cf.params.aguas === 1 ? 1 : 2, cf.params.dir, tile)
      // Cono: ápice sobre el centro del círculo (la esquina recta de la celda).
      return geoTechoTienda(outline, centroCirculoCelda(formaLoseta, tile), alt)
    }
    // Triángulo: 'cupula' = pirámide de 3 caras (tienda); 'dos_aguas' = picos (vértices).
    const verts = verticesTrianguloXZ(formaLoseta, tile)
    if (cf.forma === 'cupula') return geoTechoTienda(verts, centroidePt(verts), alt)
    if (cf.forma === 'plano') return geoTechoFaldonContorno(verts, altPlano, 1, cf.params.dir, tile)
    const cuantos = cf.params.aguas === 1 ? 1 : 2 // 1 pico o 2 picos
    return geoTechoVertices(verts, alturasPicos(alt, cuantos, cf.params.dir))
  }, [formaLoseta, cf, tile, subformas])

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

import { useMemo } from 'react'
import * as THREE from 'three'
import type { CeldaFormaLoseta } from './formasLoseta'
import { outlineCeldaXZ, centroCirculoCelda, verticesTrianguloXZ } from './formasLoseta'
import { geoTechoTienda, geoTechoDosPicos, lerpPt } from './techoCeldaGeo'
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
    // Triángulo: 'dos_aguas' = dos picos; resto = un pico (tienda).
    const verts = verticesTrianguloXZ(formaLoseta, tile)
    if (cf.forma === 'dos_aguas') return geoTechoDosPicos(verts, alt, cf.params.dir)
    const cen = {
      x: verts.reduce((s, p) => s + p.x, 0) / verts.length,
      z: verts.reduce((s, p) => s + p.z, 0) / verts.length,
    }
    // Un pico: ápice interior, desplazado hacia un vértice según la rotación.
    const objetivo = [cen, verts[0], verts[1], verts[2]][((cf.params.dir % 4) + 4) % 4]
    return geoTechoTienda(verts, lerpPt(cen, objetivo, 0.4), alt)
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

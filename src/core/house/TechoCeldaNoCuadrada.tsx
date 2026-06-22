import { useMemo } from 'react'
import * as THREE from 'three'
import type { CeldaFormaLoseta } from './formasLoseta'
import { outlineCeldaXZ, centroCirculoCelda } from './formasLoseta'
import { geoTechoTienda, geoTechoFalda } from './techoCeldaGeo'
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
    const outline = outlineCeldaXZ(formaLoseta, tile)
    const alt = Math.min(2.4, Math.max(1.0, tile * 0.5)) * (cf.params.altura || 1)
    if (formaLoseta.forma === 'circular') {
      // Cono: ápice sobre el centro del círculo (la esquina recta de la celda).
      return geoTechoTienda(outline, centroCirculoCelda(formaLoseta, tile), alt)
    }
    // Triángulo: 'dos_aguas' = 1 agua (pendiente); resto = pico (tienda).
    if (cf.forma === 'dos_aguas') return geoTechoFalda(outline, alt, cf.params.dir)
    const cx = outline.reduce((s, p) => s + p.x, 0) / outline.length
    const cz = outline.reduce((s, p) => s + p.z, 0) / outline.length
    return geoTechoTienda(outline, { x: cx, z: cz }, alt)
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

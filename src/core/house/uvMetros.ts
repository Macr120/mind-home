import * as THREE from 'three'

/**
 * UV métricas: las caras horizontales o inclinadas proyectan (x, z) y las verticales
 * (faldas, hastiales, cantos) el eje horizontal de la cara y la altura, así la textura
 * repite con `1/tileSize` sin estirarse en ninguna.
 */
export function uvMetricas(g0: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = g0.index ? g0.toNonIndexed() : g0
  if (g !== g0) g0.dispose()
  const pos = g.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  for (let t = 0; t + 2 < pos.count; t += 3) {
    const ux = pos.getX(t + 1) - pos.getX(t)
    const uy = pos.getY(t + 1) - pos.getY(t)
    const uz = pos.getZ(t + 1) - pos.getZ(t)
    const vx = pos.getX(t + 2) - pos.getX(t)
    const vy = pos.getY(t + 2) - pos.getY(t)
    const vz = pos.getZ(t + 2) - pos.getZ(t)
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    const vertical = Math.abs(ny) < 0.5 * Math.hypot(nx, ny, nz)
    // Cara vertical que mira a ±X: se extiende a lo largo de Z (y viceversa).
    const enZ = vertical && Math.abs(nx) > Math.abs(nz)
    for (let i = t; i < t + 3; i++) {
      uv[2 * i] = enZ ? pos.getZ(i) : pos.getX(i)
      uv[2 * i + 1] = vertical ? pos.getY(i) : pos.getZ(i)
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return g
}

/** Cajas con UV en metros, compartidas por medidas (muros y muebles repiten muchísimo). */
const CAJAS = new Map<string, THREE.BufferGeometry>()

export function cajaMetros(w: number, h: number, d: number): THREE.BufferGeometry {
  const clave = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`
  let g = CAJAS.get(clave)
  if (!g) {
    g = uvMetricas(new THREE.BoxGeometry(w, h, d))
    CAJAS.set(clave, g)
  }
  return g
}

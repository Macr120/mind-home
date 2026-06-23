import * as THREE from 'three'

type Pt = { x: number; z: number }

function geoDeTriangulos(pos: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

/** Caras desde cada arista del contorno hacia un ápice elevado (tienda/cono/pirámide). */
function tiendaPos(outline: Pt[], apice: Pt, alt: number): number[] {
  const pos: number[] = []
  const n = outline.length
  for (let i = 0; i < n; i++) {
    const a = outline[i]
    const b = outline[(i + 1) % n]
    pos.push(a.x, 0, a.z, b.x, 0, b.z, apice.x, alt, apice.z)
  }
  return pos
}

/**
 * Tienda/cono/pirámide: una cara por cada arista del contorno hacia un ápice.
 * - Triángulo con ápice en el centroide → pirámide de 3 caras.
 * - Sector circular con ápice sobre el centro → cono.
 */
export function geoTechoTienda(outline: Pt[], apice: Pt, alt: number): THREE.BufferGeometry {
  return geoDeTriangulos(tiendaPos(outline, apice, alt))
}

/** Centroide de un contorno. */
export function centroidePt(pts: Pt[]): Pt {
  let x = 0
  let z = 0
  for (const p of pts) {
    x += p.x
    z += p.z
  }
  return { x: x / pts.length, z: z / pts.length }
}

/**
 * Techo levantando vértices a alturas dadas: la cara superior pasa por los vértices
 * (cada uno a su altura) y se cierra con faldas hasta el alero (y=0). Un vértice
 * levantado = "un pico"; dos vértices levantados = "dos picos".
 */
export function geoTechoVertices(vertices: Pt[], alturas: number[]): THREE.BufferGeometry {
  const n = vertices.length
  const top = vertices.map((p, i) => ({ x: p.x, y: alturas[i] ?? 0, z: p.z }))
  const cx = top.reduce((s, p) => s + p.x, 0) / n
  const cz = top.reduce((s, p) => s + p.z, 0) / n
  const cy = top.reduce((s, p) => s + p.y, 0) / n
  const pos: number[] = []
  for (let i = 0; i < n; i++) {
    const a = top[i]
    const b = top[(i + 1) % n]
    // Cara superior (abanico desde el centroide).
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, cx, cy, cz)
    // Falda lateral hasta el alero.
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, b.x, 0, b.z)
    pos.push(a.x, a.y, a.z, b.x, 0, b.z, a.x, 0, a.z)
  }
  return geoDeTriangulos(pos)
}

/** Alturas de los 3 vértices: levanta `cuantos` de ellos (el resto a 0), girando con `dir`. */
export function alturasPicos(alt: number, cuantos: 1 | 2, dir: number): number[] {
  const d = ((dir % 3) + 3) % 3
  if (cuantos === 1) return [0, 1, 2].map((i) => (i === d ? alt : 0))
  // dos picos: el vértice `d` queda bajo, los otros dos levantados.
  return [0, 1, 2].map((i) => (i === d ? 0 : alt))
}

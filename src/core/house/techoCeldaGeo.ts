import * as THREE from 'three'

type Pt = { x: number; z: number }

function geoDeTriangulos(pos: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

/** Centroide de un contorno (x,z). */
function centroide(outline: Pt[]): Pt {
  let x = 0
  let z = 0
  for (const p of outline) {
    x += p.x
    z += p.z
  }
  return { x: x / outline.length, z: z / outline.length }
}

/**
 * Tienda/cono: una cara por cada arista del contorno hacia un ápice elevado.
 * - Triángulo con ápice en el centroide → tienda de 3 aguas (pico).
 * - Sector circular con ápice sobre el centro del círculo → cono (las aristas
 *   rectas que tocan el centro forman las caras planas laterales; el arco, la cónica).
 */
export function geoTechoTienda(outline: Pt[], apice: Pt, alt: number): THREE.BufferGeometry {
  const pos: number[] = []
  const n = outline.length
  for (let i = 0; i < n; i++) {
    const a = outline[i]
    const b = outline[(i + 1) % n]
    pos.push(a.x, 0, a.z, b.x, 0, b.z, apice.x, alt, apice.z)
  }
  return geoDeTriangulos(pos)
}

const DIR_XZ: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
]

/**
 * Pendiente (1 agua): inclina la loseta como un plano único a lo largo de `dir`,
 * y cierra los lados con faldas verticales hasta el alero (y=0). Para celdas
 * triangulares queda un techo a un agua bien cerrado.
 */
export function geoTechoFalda(outline: Pt[], alt: number, dir: number): THREE.BufferGeometry {
  const [dx, dz] = DIR_XZ[((dir % 4) + 4) % 4]
  const proy = outline.map((p) => p.x * dx + p.z * dz)
  const mn = Math.min(...proy)
  const span = Math.max(0.001, Math.max(...proy) - mn)
  const top = outline.map((p, i) => ({ x: p.x, y: (alt * (proy[i] - mn)) / span, z: p.z }))
  const c = centroide(outline)
  const cy = top.reduce((s, p) => s + p.y, 0) / top.length
  const pos: number[] = []
  const n = top.length
  for (let i = 0; i < n; i++) {
    const a = top[i]
    const b = top[(i + 1) % n]
    // Cara superior (abanico desde el centroide elevado).
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, cy, c.z)
    // Falda lateral hasta el alero (dos triángulos del quad).
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, b.x, 0, b.z)
    pos.push(a.x, a.y, a.z, b.x, 0, b.z, a.x, 0, a.z)
  }
  return geoDeTriangulos(pos)
}

import * as THREE from 'three'

type Pt = { x: number; z: number }

function geoDeTriangulos(pos: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

function centroide(pts: Pt[]): Pt {
  let x = 0
  let z = 0
  for (const p of pts) {
    x += p.x
    z += p.z
  }
  return { x: x / pts.length, z: z / pts.length }
}

/** Caras desde cada arista del contorno hacia un ápice elevado (tienda/cono). */
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
 * Tienda/cono: una cara por cada arista del contorno hacia un ápice elevado.
 * - Triángulo con ápice interior → un pico (tienda).
 * - Sector circular con ápice sobre el centro del círculo → cono.
 */
export function geoTechoTienda(outline: Pt[], apice: Pt, alt: number): THREE.BufferGeometry {
  return geoDeTriangulos(tiendaPos(outline, apice, alt))
}

/** Interpola entre dos puntos (t=0 → a, t=1 → b). */
export function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
}

/**
 * Dos picos sobre una celda triangular: parte el triángulo por la mediana desde
 * el vértice `dir` hasta el punto medio de la arista opuesta y levanta una tienda
 * en cada mitad → dos cumbres con un valle entre ellas. Gira con `dir` (0–2).
 */
export function geoTechoDosPicos(vertices: Pt[], alt: number, dir: number): THREE.BufferGeometry {
  if (vertices.length < 3) return geoTechoTienda(vertices, centroide(vertices), alt)
  const rot = [
    [0, 1, 2],
    [1, 2, 0],
    [2, 0, 1],
  ][((dir % 3) + 3) % 3]
  const v0 = vertices[rot[0]]
  const v1 = vertices[rot[1]]
  const v2 = vertices[rot[2]]
  const m = { x: (v1.x + v2.x) / 2, z: (v1.z + v2.z) / 2 } // punto medio de la arista opuesta a v0
  const t1 = [v0, v1, m]
  const t2 = [v0, m, v2]
  const pos = [
    ...tiendaPos(t1, centroide(t1), alt),
    ...tiendaPos(t2, centroide(t2), alt),
  ]
  return geoDeTriangulos(pos)
}

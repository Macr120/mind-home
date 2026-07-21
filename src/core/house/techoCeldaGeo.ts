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
 * levantado = "un pico"; dos vértices levantados = "dos picos". El abanico superior
 * sale del centroide; `centroY` permite fijar su altura (p. ej. el caballete de un
 * plegado a dos aguas, donde el promedio de alturas quedaría por debajo).
 */
export function geoTechoVertices(vertices: Pt[], alturas: number[], centroY?: number): THREE.BufferGeometry {
  const n = vertices.length
  const top = vertices.map((p, i) => ({ x: p.x, y: alturas[i] ?? 0, z: p.z }))
  const cx = top.reduce((s, p) => s + p.x, 0) / n
  const cz = top.reduce((s, p) => s + p.z, 0) / n
  const cy = centroY ?? top.reduce((s, p) => s + p.y, 0) / n
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

/** Inserta en el contorno (ciclo) los cruces exactos con el eje del caballete. */
function insertarCrucesEje(pts: Pt[], ejeX: boolean): Pt[] {
  const v = (p: Pt) => (ejeX ? p.x : p.z)
  const out: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    out.push(a)
    const va = v(a)
    const vb = v(b)
    if ((va < 0 && vb > 0) || (va > 0 && vb < 0)) {
      const t = va / (va - vb)
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })
    }
  }
  return out
}

/**
 * Faldones sobre un contorno arbitrario (silueta de celda con recortes, sector…):
 * - aguas=1: plano inclinado; dir 0..3 = lado alto −X/+X/−Z/+Z (como el cobertizo).
 * - aguas=2: plegado al caballete central (dir par = caballete a lo largo de Z).
 * La cara superior pasa por el contorno a la altura del faldón y se cierra con
 * faldas verticales al alero; `span` es el lado de la celda. En siluetas asimétricas
 * el centroide puede caer fuera del caballete y el plegado se abomba ligeramente.
 */
export function geoTechoFaldonContorno(
  outline: Pt[],
  alt: number,
  aguas: 1 | 2,
  dir: number,
  span: number,
): THREE.BufferGeometry {
  const d = ((dir % 4) + 4) % 4
  const h = span / 2
  const altura = (p: Pt): number => {
    if (aguas === 1) {
      const t = d === 0 ? (h - p.x) / span : d === 1 ? (p.x + h) / span : d === 2 ? (h - p.z) / span : (p.z + h) / span
      return alt * Math.min(1, Math.max(0, t))
    }
    return alt * Math.max(0, 1 - Math.abs(d % 2 === 0 ? p.x : p.z) / h)
  }
  const pts = aguas === 2 ? insertarCrucesEje(outline, d % 2 === 0) : outline
  const c = centroidePt(pts)
  return geoTechoVertices(pts, pts.map(altura), altura(c))
}

/** Alturas de los 3 vértices: levanta `cuantos` de ellos (el resto a 0), girando con `dir`. */
export function alturasPicos(alt: number, cuantos: 1 | 2, dir: number): number[] {
  const d = ((dir % 3) + 3) % 3
  if (cuantos === 1) return [0, 1, 2].map((i) => (i === d ? alt : 0))
  // dos picos: el vértice `d` queda bajo, los otros dos levantados.
  return [0, 1, 2].map((i) => (i === d ? 0 : alt))
}

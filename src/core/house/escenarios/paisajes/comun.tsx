import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { hash01 } from '../fondoMovil'

/**
 * Piezas de los paisajes que solo existen quietos (menú Fondo). Nada corre: los
 * elementos se reparten una vez alrededor de la casa, fuera del plano del mapa.
 */

/** Altura del suelo del paisaje: al ras del piso de la casa. */
export const Y_SUELO = -0.12

/** Rectángulo libre de la casa (medio largo y medio ancho) y escala del paisaje. */
export function medidas(L: number, W: number) {
  // En casas grandes el paisaje crece con ellas para no verse de juguete: lo lejano
  // (montañas, dunas) con `k` y lo cercano (árboles, rocas) solo un poco, con `e`.
  const k = Math.min(3, Math.max(1, Math.max(L, W) / 30))
  return { hx: L / 2 + 2, hz: W / 2 + 2, k, e: 1 + (k - 1) * 0.3 }
}

/** Punto del marco local que cae en (wx, wz) del mundo, relativo al centro del mapa. */
export function aLocal(rumbo: number, wx: number, wz: number): [number, number] {
  const c = Math.cos(rumbo)
  const s = Math.sin(rumbo)
  return [wx * c - wz * s, wx * s + wz * c]
}

/**
 * Filtro para lo alto (edificios, montañas, dunas): solo del lado lejano a la cámara
 * isométrica, que mira desde +X+Z; del lado de la cámara taparía la casa.
 */
export function alFondo(rumbo: number) {
  const c = Math.cos(rumbo)
  const s = Math.sin(rumbo)
  return (lx: number, lz: number) => lx * c + lz * s + (-lx * s + lz * c) < 0
}

/** Zona alrededor de la casa: de `desde` a `hasta` unidades más allá del rectángulo libre. */
export interface Zona {
  hx: number
  hz: number
  desde: number
  hasta: number
}

/** Puntos repartidos en la zona (estables por semilla); `filtro` descarta los que no quepan. */
export function repartir(n: number, zona: Zona, semilla: number, filtro?: (x: number, z: number) => boolean) {
  const pts: { x: number; z: number; s: number }[] = []
  for (let i = 0; i < n; i++) {
    for (let intento = 0; intento < 24; intento++) {
      const s = semilla * 131 + i * 29 + intento
      const x = (hash01(s, 1) * 2 - 1) * (zona.hx + zona.hasta)
      const z = (hash01(s, 2) * 2 - 1) * (zona.hz + zona.hasta)
      const fuera = Math.abs(x) > zona.hx + zona.desde || Math.abs(z) > zona.hz + zona.desde
      if (fuera && (!filtro || filtro(x, z))) {
        pts.push({ x, z, s })
        break
      }
    }
  }
  return pts
}

/** Geometría con un color por vértice (para juntar tronco y copa en una sola pieza). */
export function pintada(geo: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo
  const c = new THREE.Color(color)
  const n = g.getAttribute('position').count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  g.deleteAttribute('uv')
  return g
}

/** Junta piezas ya pintadas en una geometría. */
export const juntar = (...partes: THREE.BufferGeometry[]) => mergeGeometries(partes)!

interface EsparcidosProps {
  geometria: THREE.BufferGeometry
  material: THREE.Material
  n: number
  zona: Zona
  semilla: number
  escala: [number, number]
  y?: number
  /** Tinte por pieza (multiplica el color del material o de los vértices). */
  colores?: string[]
  girar?: boolean
  filtro?: (x: number, z: number) => boolean
}

const sinRayo = () => null

/** Piezas instanciadas quietas alrededor de la casa. No atrapan clics ni proyectan sombra. */
export function Esparcidos({ geometria, material, n, zona, semilla, escala, y = Y_SUELO, colores, girar = true, filtro }: EsparcidosProps) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const pts = useMemo(() => repartir(n, zona, semilla, filtro), [n, zona, semilla, filtro])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const eje = new THREE.Vector3(0, 1, 0)
    const c = new THREE.Color()
    pts.forEach((p, i) => {
      const e = escala[0] + hash01(p.s, 5) * (escala[1] - escala[0])
      q.setFromAxisAngle(eje, girar ? hash01(p.s, 6) * Math.PI * 2 : 0)
      m.compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(e, e, e))
      mesh.setMatrixAt(i, m)
      if (colores) mesh.setColorAt(i, c.set(colores[Math.floor(hash01(p.s, 7) * colores.length) % colores.length]))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [pts, escala, y, colores, girar])
  if (!pts.length) return null
  return <instancedMesh key={pts.length} ref={ref} args={[geometria, material, pts.length]} raycast={sinRayo} receiveShadow />
}

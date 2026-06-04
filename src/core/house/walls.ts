import { rooms } from '../registry'

/**
 * Geometría de las paredes de los cuartos, en un solo lugar.
 * La usan Room3D (para dibujar) y Character (para colisiones), así nunca
 * se desincronizan: lo que ves es exactamente contra lo que chocas.
 */

export const SIZE = 6 // tamaño del cuarto
export const WALL_H = 2.4 // alto de pared
export const WALL_T = 0.35 // grosor de pared
export const DOOR_W = 2.2 // ancho de la puerta
export const HALF = SIZE / 2
const SEG = (SIZE - DOOR_W) / 2 // largo de cada mitad de pared con puerta
const OFF = DOOR_W / 2 + SEG / 2 // desplazamiento de cada mitad

export type Axis = 'x' | 'z'
/** Segmento de pared en el plano XZ, local al centro del cuarto. */
export interface Seg {
  cx: number
  cz: number
  sx: number
  sz: number
}

/** Punto frente a la puerta (mundo x,z) donde debe parar el personaje. */
export function roomEntrance(position: [number, number, number]): [number, number] {
  const [x, , z] = position
  const { axis, sign } = doorFor(position)
  const offset = HALF + 1.0
  if (axis === 'x') return [x + sign * offset, z]
  return [x, z + sign * offset]
}

/** La puerta del cuarto mira hacia el centro de la casa. */
export function doorFor(position: [number, number, number]) {
  const [x, , z] = position
  const axis: Axis = Math.abs(x) >= Math.abs(z) ? 'x' : 'z'
  const sign = axis === 'x' ? -Math.sign(x || 1) : -Math.sign(z || 1)
  return { axis, sign }
}

// Límites de la cuadrícula 4×3 (cols x: -9..9 · filas z: -6..6).
const X_MIN = -9
const X_MAX = 9
const Z_MIN = -6
const Z_MAX = 6

/**
 * Segmentos de pared (locales) de un cuarto. Cada lado que da a otro cuarto
 * (interior) lleva una puerta (hueco al centro); el perímetro queda sólido.
 * Así todos los cuartos quedan conectados y se puede atravesar entre ellos.
 */
export function localWallSegments(position: [number, number, number]): Seg[] {
  const [x, , z] = position
  // Un lado tiene puerta si hay un cuarto vecino en esa dirección.
  const sides: { axis: Axis; sign: number; puerta: boolean }[] = [
    { axis: 'z', sign: -1, puerta: z > Z_MIN + 0.1 }, // norte
    { axis: 'z', sign: 1, puerta: z < Z_MAX - 0.1 }, // sur
    { axis: 'x', sign: -1, puerta: x > X_MIN + 0.1 }, // oeste
    { axis: 'x', sign: 1, puerta: x < X_MAX - 0.1 }, // este
  ]
  const segs: Seg[] = []
  for (const { axis, sign, puerta } of sides) {
    if (!puerta) {
      if (axis === 'z')
        segs.push({ cx: 0, cz: sign * HALF, sx: SIZE + WALL_T, sz: WALL_T })
      else segs.push({ cx: sign * HALF, cz: 0, sx: WALL_T, sz: SIZE + WALL_T })
    } else {
      for (const dir of [-1, 1]) {
        if (axis === 'z')
          segs.push({ cx: dir * OFF, cz: sign * HALF, sx: SEG, sz: WALL_T })
        else segs.push({ cx: sign * HALF, cz: dir * OFF, sx: WALL_T, sz: SEG })
      }
    }
  }
  return segs
}

/** Caja de colisión alineada a ejes, en coordenadas del mundo. */
export interface AABB {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/** Todos los colliders de pared de la casa (se calcula una vez al cargar). */
export const wallColliders: AABB[] = rooms.flatMap((r) => {
  const [x, , z] = r.posicion
  return localWallSegments(r.posicion).map((s) => ({
    minX: x + s.cx - s.sx / 2,
    maxX: x + s.cx + s.sx / 2,
    minZ: z + s.cz - s.sz / 2,
    maxZ: z + s.cz + s.sz / 2,
  }))
})

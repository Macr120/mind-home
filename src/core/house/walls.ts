/**
 * Geometría de las paredes de los cuartos, en un solo lugar.
 * La usan Room3D (para dibujar) y el layoutStore (para colisiones), así nunca
 * se desincronizan: lo que ves es exactamente contra lo que chocas.
 *
 * Las puertas se abren solo hacia cuartos VECINOS colocados (ocupación), por lo
 * que el mapa puede tener cualquier subconjunto de cuartos y siempre se conecta bien.
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

/** Tamaño de celda de la rejilla (= tamaño del cuarto). */
export const SPACING = SIZE

/** Clave de celda del mundo para el conjunto de ocupación. */
export const cellKey = (x: number, z: number) => `${x},${z}`

/**
 * Segmentos de pared (locales) de un cuarto. Cada lado que da a un cuarto
 * vecino COLOCADO lleva una puerta (hueco al centro); los demás quedan sólidos.
 * `ocupado` es el conjunto de claves "x,z" de los cuartos presentes en el mapa.
 */
export function localWallSegments(
  position: [number, number, number],
  ocupado: Set<string>,
): Seg[] {
  const [x, , z] = position
  // Un lado tiene puerta si el cuarto vecino en esa dirección está colocado.
  const sides: { axis: Axis; sign: number; puerta: boolean }[] = [
    { axis: 'z', sign: -1, puerta: ocupado.has(cellKey(x, z - SPACING)) }, // norte
    { axis: 'z', sign: 1, puerta: ocupado.has(cellKey(x, z + SPACING)) }, // sur
    { axis: 'x', sign: -1, puerta: ocupado.has(cellKey(x - SPACING, z)) }, // oeste
    { axis: 'x', sign: 1, puerta: ocupado.has(cellKey(x + SPACING, z)) }, // este
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

/** Colliders de pared de un cuarto (mundo), dado el conjunto de ocupación. */
export function collidersForRoom(
  position: [number, number, number],
  ocupado: Set<string>,
): AABB[] {
  const [x, , z] = position
  return localWallSegments(position, ocupado).map((s) => ({
    minX: x + s.cx - s.sx / 2,
    maxX: x + s.cx + s.sx / 2,
    minZ: z + s.cz - s.sz / 2,
    maxZ: z + s.cz + s.sz / 2,
  }))
}

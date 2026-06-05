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

// ── Rejilla editable 6×5 ──────────────────────────────────────────────────────
// Los 12 cuartos por defecto caen en el bloque interno 4×3 (mismas posiciones de
// antes: cols x -9..9, filas z -6..6) y queda un borde de celdas libres para mover.
export const COLS = 6
export const ROWS = 5

export interface Cell {
  col: number
  row: number
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

/** Celda (col,row) → posición del mundo [x, 0, z]. */
export function cellToWorld(col: number, row: number): [number, number, number] {
  return [(col - (COLS - 1) / 2) * SPACING, 0, (row - (ROWS - 1) / 2) * SPACING]
}

/** Posición del mundo → celda más cercana (acotada a la rejilla). */
export function worldToCell(x: number, z: number): Cell {
  return {
    col: clamp(Math.round(x / SPACING + (COLS - 1) / 2), 0, COLS - 1),
    row: clamp(Math.round(z / SPACING + (ROWS - 1) / 2), 0, ROWS - 1),
  }
}

/** Celda por defecto de un cuarto a partir de su posición del registro. */
export function defaultCell(position: [number, number, number]): Cell {
  return worldToCell(position[0], position[2])
}

// ── Paredes y vanos manuales ──────────────────────────────────────────────────
/** Lado del cuarto: Norte, Sur, Este, Oeste. */
export type SideKey = 'N' | 'S' | 'E' | 'O'
/** Estado manual de un lado (sin valor = automático según vecinos). */
export type WallState = 'pared' | 'puerta' | 'abierto'
export type WallOverrides = Partial<Record<SideKey, WallState>>
export const SIDE_KEYS: SideKey[] = ['N', 'S', 'E', 'O']

const SIDE_DELTA: Record<SideKey, [number, number]> = {
  N: [0, -1],
  S: [0, 1],
  O: [-1, 0],
  E: [1, 0],
}

/** Estado automático de un lado: 'puerta' si hay vecino colocado, si no 'pared'. */
export function autoWall(
  position: [number, number, number],
  ocupado: Set<string>,
  side: SideKey,
): WallState {
  const [x, , z] = position
  const [dx, dz] = SIDE_DELTA[side]
  return ocupado.has(cellKey(x + dx * SPACING, z + dz * SPACING))
    ? 'puerta'
    : 'pared'
}

/** Estado efectivo (concreto) de un lado: override del usuario o el automático. */
export function effectiveWall(
  position: [number, number, number],
  ocupado: Set<string>,
  overrides: WallOverrides | undefined,
  side: SideKey,
): WallState {
  return overrides?.[side] ?? autoWall(position, ocupado, side)
}

/**
 * Segmentos de pared (locales) de un cuarto.
 * - Sin override: puerta si el cuarto vecino está colocado; si no, pared.
 * - override 'pared' → pared sólida · 'puerta' → vano con puerta · 'abierto' → sin pared.
 */
export function localWallSegments(
  position: [number, number, number],
  ocupado: Set<string>,
  overrides?: WallOverrides,
): Seg[] {
  const [x, , z] = position
  const sides: { axis: Axis; sign: number; key: SideKey; vecino: boolean }[] = [
    { axis: 'z', sign: -1, key: 'N', vecino: ocupado.has(cellKey(x, z - SPACING)) },
    { axis: 'z', sign: 1, key: 'S', vecino: ocupado.has(cellKey(x, z + SPACING)) },
    { axis: 'x', sign: -1, key: 'O', vecino: ocupado.has(cellKey(x - SPACING, z)) },
    { axis: 'x', sign: 1, key: 'E', vecino: ocupado.has(cellKey(x + SPACING, z)) },
  ]
  const segs: Seg[] = []
  for (const { axis, sign, key, vecino } of sides) {
    const ov = overrides?.[key]
    if (ov === 'abierto') continue // vano completo: sin pared
    const puerta = ov === 'puerta' ? true : ov === 'pared' ? false : vecino
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
  overrides?: WallOverrides,
): AABB[] {
  const [x, , z] = position
  return localWallSegments(position, ocupado, overrides).map((s) => ({
    minX: x + s.cx - s.sx / 2,
    maxX: x + s.cx + s.sx / 2,
    minZ: z + s.cz - s.sz / 2,
    maxZ: z + s.cz + s.sz / 2,
  }))
}

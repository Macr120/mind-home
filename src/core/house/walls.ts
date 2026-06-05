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

// ── Tamaño de cuartos (multi-celda) ───────────────────────────────────────────
/** Tamaño de un cuarto en celdas: ancho (w) × largo (h). */
export interface Size {
  w: number
  h: number
}
export const SIZE_DEFAULT: Size = { w: 1, h: 1 }
export const MAX_DIM = 4 // máximo de celdas por lado
export const MAX_AREA = 16 // máximo 16 veces el espacio estándar (hasta 4×4)

/** Clave de celda (col,row) para el conjunto de ocupación. */
export const cellId = (col: number, row: number) => `${col},${row}`

/** Celdas que ocupa un cuarto (ancla + tamaño). */
export function footprintCells(cell: Cell, size: Size): Cell[] {
  const out: Cell[] = []
  for (let i = 0; i < size.w; i++)
    for (let j = 0; j < size.h; j++)
      out.push({ col: cell.col + i, row: cell.row + j })
  return out
}

/** Centro del cuarto (mundo) según su celda ancla y tamaño. */
export function roomCenter(cell: Cell, size: Size): [number, number, number] {
  return cellToWorld(cell.col + (size.w - 1) / 2, cell.row + (size.h - 1) / 2)
}

/** ¿El footprint cabe en la rejilla? */
export function cabeEnRejilla(cell: Cell, size: Size): boolean {
  return (
    cell.col >= 0 &&
    cell.row >= 0 &&
    cell.col + size.w <= COLS &&
    cell.row + size.h <= ROWS
  )
}

// ── Paredes y vanos manuales ──────────────────────────────────────────────────
/** Lado del cuarto: Norte, Sur, Este, Oeste. */
export type SideKey = 'N' | 'S' | 'E' | 'O'
/** Estado manual de un lado (sin valor = automático según vecinos). */
export type WallState = 'pared' | 'puerta' | 'abierto'
export type WallOverrides = Partial<Record<SideKey, WallState>>
export const SIDE_KEYS: SideKey[] = ['N', 'S', 'E', 'O']

/** ¿Hay un cuarto vecino al otro lado de este lado del footprint? */
function vecinoEnLado(
  cell: Cell,
  size: Size,
  side: SideKey,
  ocupado: Set<string>,
): boolean {
  if (side === 'N')
    return Array.from({ length: size.w }, (_, i) => i).some((i) =>
      ocupado.has(cellId(cell.col + i, cell.row - 1)),
    )
  if (side === 'S')
    return Array.from({ length: size.w }, (_, i) => i).some((i) =>
      ocupado.has(cellId(cell.col + i, cell.row + size.h)),
    )
  if (side === 'O')
    return Array.from({ length: size.h }, (_, j) => j).some((j) =>
      ocupado.has(cellId(cell.col - 1, cell.row + j)),
    )
  return Array.from({ length: size.h }, (_, j) => j).some((j) =>
    ocupado.has(cellId(cell.col + size.w, cell.row + j)),
  )
}

/** Estado automático de un lado: 'puerta' si hay vecino, si no 'pared'. */
export function autoWall(
  cell: Cell,
  size: Size,
  ocupado: Set<string>,
  side: SideKey,
): WallState {
  return vecinoEnLado(cell, size, side, ocupado) ? 'puerta' : 'pared'
}

/** Estado efectivo (concreto) de un lado: override del usuario o el automático. */
export function effectiveWall(
  cell: Cell,
  size: Size,
  ocupado: Set<string>,
  overrides: WallOverrides | undefined,
  side: SideKey,
): WallState {
  return overrides?.[side] ?? autoWall(cell, size, ocupado, side)
}

/** Desplazamiento de la puerta a lo largo del muro, por lado (-1..1, 0 = centro). */
export type DoorPos = Partial<Record<SideKey, number>>

/**
 * Segmentos de pared (LOCALES al centro) de un cuarto de tamaño w×h.
 * Cada lado: 'pared' sólida, 'puerta' con vano (deslizable), o 'abierto'.
 */
export function roomWallSegments(
  cell: Cell,
  size: Size,
  ocupado: Set<string>,
  overrides?: WallOverrides,
  doorPos?: DoorPos,
): Seg[] {
  const W = size.w * SIZE
  const H = size.h * SIZE
  const sides: {
    axis: Axis
    sign: number
    key: SideKey
    len: number
    half: number
  }[] = [
    { axis: 'z', sign: -1, key: 'N', len: W, half: H / 2 },
    { axis: 'z', sign: 1, key: 'S', len: W, half: H / 2 },
    { axis: 'x', sign: -1, key: 'O', len: H, half: W / 2 },
    { axis: 'x', sign: 1, key: 'E', len: H, half: W / 2 },
  ]
  const segs: Seg[] = []
  for (const { axis, sign, key, len, half } of sides) {
    const est = effectiveWall(cell, size, ocupado, overrides, key)
    if (est === 'abierto') continue
    if (est === 'pared') {
      if (axis === 'z')
        segs.push({ cx: 0, cz: sign * half, sx: len + WALL_T, sz: WALL_T })
      else segs.push({ cx: sign * half, cz: 0, sx: WALL_T, sz: len + WALL_T })
    } else {
      // Puerta deslizable: el hueco se centra en `g` (según el desplazamiento).
      const maxSlide = (len - DOOR_W) / 2
      const g = Math.max(-1, Math.min(1, doorPos?.[key] ?? 0)) * maxSlide
      const partes: [number, number][] = [
        // [centro, largo] de cada mitad del muro a los lados del hueco
        [(-len / 2 + (g - DOOR_W / 2)) / 2, g - DOOR_W / 2 + len / 2],
        [((g + DOOR_W / 2) + len / 2) / 2, len / 2 - (g + DOOR_W / 2)],
      ]
      for (const [centro, largo] of partes) {
        if (largo <= 0.02) continue
        if (axis === 'z')
          segs.push({ cx: centro, cz: sign * half, sx: largo, sz: WALL_T })
        else segs.push({ cx: sign * half, cz: centro, sx: WALL_T, sz: largo })
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

/** Colliders de pared de un cuarto (mundo) según celda, tamaño y ocupación. */
export function collidersForRoom(
  cell: Cell,
  size: Size,
  ocupado: Set<string>,
  overrides?: WallOverrides,
  doorPos?: DoorPos,
): AABB[] {
  const [cx, , cz] = roomCenter(cell, size)
  return roomWallSegments(cell, size, ocupado, overrides, doorPos).map((s) => ({
    minX: cx + s.cx - s.sx / 2,
    maxX: cx + s.cx + s.sx / 2,
    minZ: cz + s.cz - s.sz / 2,
    maxZ: cz + s.cz + s.sz / 2,
  }))
}

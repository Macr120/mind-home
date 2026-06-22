/**
 * Geometría de las paredes de los cuartos, en un solo lugar.
 * La usan Room3D (para dibujar) y el layoutStore (para colisiones), así nunca
 * se desincronizan: lo que ves es exactamente contra lo que chocas.
 *
 * Las puertas se abren solo hacia cuartos VECINOS colocados (ocupación), por lo
 * que el mapa puede tener cualquier subconjunto de cuartos y siempre se conecta bien.
 */

import type { EstiloArista, EstiloMuro, EstiloPuerta, PincelesCuarto } from './murosPuertas'
import { PINCELES_DEFAULT } from './murosPuertas'

export const SIZE = 6 // tamaño del cuarto
export const WALL_H = 2.4 // alto de pared
export const WALL_T = 0.35 // grosor de pared
export const DOOR_W = 2.2 // ancho de la puerta
export const HALF = SIZE / 2

/**
 * Alto por defecto del pico de arco/triángulo, como factor de WALL_H: iguala la
 * altura de los techos a dos aguas/abovedado, cuyo `altBase` en TechoForma se topa
 * en 2.6 m para cualquier cuarto (min(W,H)≥6 → *0.5 ≥ 2.6).
 */
export const FORMA_ALTO_TECHO = 2.6 / WALL_H

// ── Niveles (pisos apilables) ─────────────────────────────────────────────────
/** Acceso para subir a un nivel: escalera, elevador o resbaladilla (con escalera). */
export type TipoAcceso = 'escalera' | 'elevador' | 'resbaladilla'
/** Altura apilada de cada nivel (techo ON): el piso de arriba se asienta sobre el de abajo. */
export const NIVEL_ALTURA = WALL_H + 0.2

/** Holgura base de la separación explotada (mínimo visible aunque haya 1 solo cuarto). */
const FLOTA_BASE = NIVEL_ALTURA + 2.2
/** Tope para que en plantas enormes la separación no se dispare fuera de cuadro. */
const FLOTA_MAX = 30
/** Cuánto sube la separación por cada cuarto de la planta inferior. */
const FLOTA_POR_CUARTO = 2.0

/**
 * Separación explotada (techo OFF) entre pisos: DINÁMICA según el NÚMERO de cuartos de la
 * planta inferior. Pocos cuartos ⇒ poca separación; muchos cuartos ⇒ más (el piso de
 * arriba se aleja para no tapar la planta más extensa). Lineal en el conteo, acotada por
 * `FLOTA_MAX`. `nCuartos` = cuántos cuartos hay en la planta de abajo.
 */
export function flotaPara(nCuartos: number): number {
  const f = FLOTA_BASE + FLOTA_POR_CUARTO * Math.max(0, nCuartos - 1)
  return Math.min(FLOTA_MAX, f)
}

// Separación explotada activa por nivel. La fija layoutStore según el número de cuartos de
// la planta inferior. Mutable, como las dimensiones de la rejilla.
let _flota = flotaPara(1)

/** Ajusta la separación explotada (llamado por layoutStore al recalcular). */
export function setFlota(g: number) {
  _flota = g
}

/**
 * Altura del mundo (base del piso) de un nivel. Planta baja (0) siempre en el suelo;
 * los de arriba flotan (vista explotada) salvo que la casa esté techada, donde se apilan.
 */
export function nivelBaseY(nivel: number, conTecho: boolean): number {
  if (nivel <= 0) return 0
  return nivel * (conTecho ? NIVEL_ALTURA : _flota)
}

export type Axis = 'x' | 'z'
/** Segmento de pared en el plano XZ, local al centro del cuarto. */
export interface Seg {
  cx: number
  cz: number
  sx: number
  sz: number
  /**
   * El muro da al EXTERIOR de la casa (no hay cuarto vecino del otro lado).
   * Solo para el render (fachada vs muro interior); las colisiones lo ignoran.
   */
  exterior: boolean
  /** Tipo visual del muro (solo segmentos sólidos). */
  tipoMuro?: EstiloMuro['tipo']
  /** Color personalizado del muro. */
  colorMuro?: string
  /** Forma paramétrica: alto (factor de WALL_H) y params de ventana. */
  alto?: number
  /** Este segmento muestra una ventana. */
  ventana?: boolean
  ventAncho?: number
  ventAlto?: number
  ventPosY?: number
  ventPosX?: number
  ventForma?: EstiloMuro['ventForma']
  ventRot?: number
  ventColor?: string
  ventMosaico?: boolean
  ventMulticolor?: boolean
  /** Silueta superior del muro completo (no aplica a las mitades junto a una puerta). */
  forma?: EstiloMuro['forma']
  formaAlto?: number
  formaAncho?: number
  formaPosX?: number
  formaDividir?: boolean
  formaColor?: string
  /** Altura absoluta del segmento en metros (si está, ignora `alto`). Para dinteles/cabeceras. */
  alturaM?: number
  /** Base Y del segmento (default 0). Para segmentos que flotan, p.ej. el muro sobre la puerta. */
  yBase?: number
  /** Clave de arista (para asociar imagen de fondo por muro). */
  clave?: string
  /** Imagen de fondo (objectURL) inyectada por el render, y su ajuste. */
  imagen?: string
  imagenAjuste?: string
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

// ── Rejilla editable (tamaño inicial 6×5, expandible 1×1 – 12×12) ────────────
export const COLS = 6   // valor inicial / referencia de carga
export const ROWS = 5

// Dimensiones actuales (mutable, sincronizado desde layoutStore al cargar y al cambiar).
let _cols = COLS
let _rows = ROWS

/** Actualiza las dimensiones activas (llamado por layoutStore). */
export function setGridDims(cols: number, rows: number) {
  _cols = cols
  _rows = rows
}

export function getGridDims() {
  return { cols: _cols, rows: _rows }
}

export interface Cell {
  col: number
  row: number
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

/** Celda (col,row) → posición del mundo [x, 0, z]. */
export function cellToWorld(col: number, row: number): [number, number, number] {
  return [(col - (_cols - 1) / 2) * SPACING, 0, (row - (_rows - 1) / 2) * SPACING]
}

/** Margen lógico al E/S: permite anclar en la última media celda sin ampliar el papel. */
export const GRID_MARGEN_MEDIA = 0.5

/** Índice centro máximo de ancla para un footprint (respeta minCol/minRow). */
export function maxIndiceAncla(celdas: number, fp: Footprint): number {
  const rect = footprintBoundsRect(fp)
  return celdas - rect.minCol - rect.w + GRID_MARGEN_MEDIA
}

/** Índice centro máximo para cuarto 1×1 (snap en el croquis). */
export function maxIndiceAnclaBasico(celdas: number): number {
  return celdas - 1 + GRID_MARGEN_MEDIA
}

/**
 * Posición del mundo → celda más cercana (acotada a la rejilla), enganchada a pasos
 * de ½ celda: los cuartos se mueven en media rejilla (cada celda = 4 sub-cuadros).
 */
export function worldToCell(x: number, z: number): Cell {
  const snap = (w: number, n: number) =>
    clamp(Math.round((w / SPACING + (n - 1) / 2) * 2) / 2, 0, maxIndiceAnclaBasico(n))
  return { col: snap(x, _cols), row: snap(z, _rows) }
}

/** Posición del mundo → celda entera de la rejilla (para colocar cuartos básicos). */
export function worldToCeldaEntera(x: number, z: number): Cell {
  const half = worldToCell(x, z)
  return {
    col: clamp(Math.floor(half.col + 0.5), 0, _cols - 1),
    row: clamp(Math.floor(half.row + 0.5), 0, _rows - 1),
  }
}

/** Celda por defecto de un cuarto a partir de su posición del registro. */
export function defaultCell(position: [number, number, number]): Cell {
  return worldToCell(position[0], position[2])
}

// ── Forma del cuarto (footprint = conjunto de celdas) ─────────────────────────
/** Caja contenedora de un cuarto en celdas: ancho (w) × largo (h). */
export interface Size {
  w: number
  h: number
}
export const SIZE_DEFAULT: Size = { w: 1, h: 1 }
export const MAX_GRID = 12 // máximo lado de la rejilla (también el del cuarto)

/**
 * Forma del cuarto: lista de celdas como OFFSETS desde el ancla (`cells[id]`),
 * normalizados para que la celda mínima sea (0,0). Un cuarto 1×1 es [{0,0}];
 * uno rectangular w×h tiene todas las celdas de su caja; uno en L omite alguna.
 */
export type Footprint = Cell[]
export const FOOTPRINT_DEFAULT: Footprint = [{ col: 0, row: 0 }]

/** Clave de celda (col,row) para conjuntos. */
export const cellId = (col: number, row: number) => `${col},${row}`

/** Footprint rectangular w×h (para migrar cuartos antiguos {w,h}). */
export function rectFootprint(size: Size): Footprint {
  const out: Footprint = []
  for (let i = 0; i < size.w; i++)
    for (let j = 0; j < size.h; j++) out.push({ col: i, row: j })
  return out
}

/** Celdas ABSOLUTAS que ocupa un cuarto (ancla + offsets del footprint). */
export function footprintCells(anchor: Cell, fp: Footprint): Cell[] {
  return fp.map((c) => ({ col: anchor.col + c.col, row: anchor.row + c.row }))
}

/** Caja contenedora (w×h) de un footprint normalizado. */
export function footprintBounds(fp: Footprint): Size {
  let w = 1
  let h = 1
  for (const c of fp) {
    if (c.col + 1 > w) w = c.col + 1
    if (c.row + 1 > h) h = c.row + 1
  }
  return { w, h }
}

/** Caja contenedora con min col/row (offsets negativos, p. ej. techo extendido al N/O). */
export function footprintBoundsRect(fp: Footprint): Size & { minCol: number; minRow: number } {
  if (!fp.length) return { w: 1, h: 1, minCol: 0, minRow: 0 }
  let minCol = fp[0].col
  let maxCol = fp[0].col
  let minRow = fp[0].row
  let maxRow = fp[0].row
  for (const c of fp) {
    if (c.col < minCol) minCol = c.col
    if (c.col > maxCol) maxCol = c.col
    if (c.row < minRow) minRow = c.row
    if (c.row > maxRow) maxRow = c.row
  }
  return { w: maxCol - minCol + 1, h: maxRow - minRow + 1, minCol, minRow }
}

/** Centro local con rect que puede tener minCol/minRow ≠ 0. */
export function cellLocalRect(
  off: Cell,
  rect: ReturnType<typeof footprintBoundsRect>,
): [number, number] {
  return [
    (off.col - rect.minCol - (rect.w - 1) / 2) * SIZE,
    (off.row - rect.minRow - (rect.h - 1) / 2) * SIZE,
  ]
}

/** Desplazamiento del centro de `inner` respecto al de `outer` (mismo espacio de offsets). */
export function centroRelativo(
  outer: ReturnType<typeof footprintBoundsRect>,
  inner: ReturnType<typeof footprintBoundsRect>,
): [number, number] {
  const ocx = outer.minCol + (outer.w - 1) / 2
  const ocz = outer.minRow + (outer.h - 1) / 2
  const icx = inner.minCol + (inner.w - 1) / 2
  const icz = inner.minRow + (inner.h - 1) / 2
  return [(icx - ocx) * SIZE, (icz - ocz) * SIZE]
}

/** Centro (mundo) de la caja contenedora del cuarto. */
export function roomCenter(cell: Cell, size: Size): [number, number, number] {
  return cellToWorld(cell.col + (size.w - 1) / 2, cell.row + (size.h - 1) / 2)
}

/** Centro del grupo 3D de un cuarto (ancla + footprint, respeta minCol/minRow). */
export function centroCuarto3D(anchor: Cell, fp: Footprint): [number, number, number] {
  const rect = footprintBoundsRect(fp)
  return roomCenter(
    { col: anchor.col + rect.minCol, row: anchor.row + rect.minRow },
    { w: rect.w, h: rect.h },
  )
}

/** Posición local [lx,lz] de una loseta respecto al centro del cuarto. */
export function tileLocalEnCuarto(anchor: Cell, off: Cell, fp: Footprint): [number, number] {
  const [gx, , gz] = centroCuarto3D(anchor, fp)
  const [wx, , wz] = cellToWorld(anchor.col + off.col, anchor.row + off.row)
  return [wx - gx, wz - gz]
}

/** ¿El footprint cabe en la rejilla (índice centro, respeta minCol/minRow)? */
export function cabeEnRejilla(anchor: Cell, fp: Footprint, cols = _cols, rows = _rows): boolean {
  const rect = footprintBoundsRect(fp)
  const minCol = anchor.col + rect.minCol
  const minRow = anchor.row + rect.minRow
  const maxCol = anchor.col + rect.minCol + rect.w - 1
  const maxRow = anchor.row + rect.minRow + rect.h - 1
  const limE = cols + GRID_MARGEN_MEDIA
  const limS = rows + GRID_MARGEN_MEDIA
  return minCol >= 0 && minRow >= 0 && maxCol + 1 <= limE && maxRow + 1 <= limS
}

/** Centro local (relativo al centro del cuarto) de una celda offset. */
export function cellLocal(off: Cell, bounds: Size): [number, number] {
  return [
    (off.col - (bounds.w - 1) / 2) * SIZE,
    (off.row - (bounds.h - 1) / 2) * SIZE,
  ]
}

// ── Paredes y vanos (por arista del footprint) ────────────────────────────────
/** Lado de una celda: Norte, Sur, Este, Oeste. */
export type SideKey = 'N' | 'S' | 'E' | 'O'
/** Estado de una arista (sin valor = automático según vecinos). */
export type WallState = 'pared' | 'puerta' | 'abierto'
/** Overrides por arista. Clave: `${offCol},${offRow},${side}`. */
export type WallOverrides = Record<string, WallState>
export const SIDE_KEYS: SideKey[] = ['N', 'S', 'E', 'O']

/**
 * Dirección (offset unitario en XZ y rotación Y) de la estructura de acceso
 * según la pared del cuarto a la que se ancla. El frente local (+Z) mira al cuarto.
 * Fuente única: la usan Accesos.tsx, Character.tsx y AccesoProximity.
 */
export const LADO_DIR: Record<SideKey, { dx: number; dz: number; rotY: number }> = {
  N: { dx: 0, dz: -1, rotY: 0 },
  S: { dx: 0, dz: 1, rotY: Math.PI },
  E: { dx: 1, dz: 0, rotY: -Math.PI / 2 },
  O: { dx: -1, dz: 0, rotY: Math.PI / 2 },
}

const DELTA: Record<SideKey, Cell> = {
  N: { col: 0, row: -1 },
  S: { col: 0, row: 1 },
  O: { col: -1, row: 0 },
  E: { col: 1, row: 0 },
}

/** Clave de override de una arista. */
export const edgeKey = (off: Cell, side: SideKey) =>
  `${off.col},${off.row},${side}`

// ── Sub-rejilla de ½ celda ────────────────────────────────────────────────────
/**
 * Los cuartos se mueven en pasos de ½ celda (cada celda de cuarto = 2×2 sub-celdas
 * de 3×3). La OCUPACIÓN, el traslape, las puertas automáticas y el piso caminable se
 * llevan en SUB-CELDAS: así dos cuartos a media celda de distancia comparten
 * sub-celdas (se detecta el traslape) y los muros vecinos se conectan en pasos de ½.
 * Las claves de muro/footprint/accesos siguen en celdas de cuarto (col/row, que ahora
 * pueden ser múltiplos de ½) — no requiere migrar mapas guardados.
 */
export const subId = (sc: number, sr: number) => `${sc},${sr}`

/** Las 2 sub-índices que cubre, en un eje, el tile centrado en `c` (c múltiplo de ½). */
function subRango(c: number): [number, number] {
  const s = Math.round(c * 2) // 2c es entero (c es múltiplo de ½)
  return [s - 1, s]
}

/** Sub-celdas (claves) que cubre el tile de una celda de cuarto (col/row puede ser ½). */
export function subCeldasDeTile(col: number, row: number): string[] {
  const [c0, c1] = subRango(col)
  const [r0, r1] = subRango(row)
  return [subId(c0, r0), subId(c1, r0), subId(c0, r1), subId(c1, r1)]
}

/** Sub-celdas que ocupa un cuarto (ancla en ½ + footprint en celdas enteras). */
export function roomSubCells(anchor: Cell, fp: Footprint): string[] {
  const out: string[] = []
  for (const c of fp) out.push(...subCeldasDeTile(anchor.col + c.col, anchor.row + c.row))
  return out
}

/** ¿El tile de la celda de cuarto (col,row) toca alguna sub-celda ocupada? */
export function tileOcupado(ocupado: Set<string>, col: number, row: number): boolean {
  const [c0, c1] = subRango(col)
  const [r0, r1] = subRango(row)
  return (
    ocupado.has(subId(c0, r0)) || ocupado.has(subId(c1, r0)) ||
    ocupado.has(subId(c0, r1)) || ocupado.has(subId(c1, r1))
  )
}

/** Sub-celda (sc,sr) en la que cae el punto de mundo (x,z) — para el piso caminable. */
export function worldToSubCell(x: number, z: number): { sc: number; sr: number } {
  return {
    sc: Math.floor((x / SPACING + (_cols - 1) / 2) * 2),
    sr: Math.floor((z / SPACING + (_rows - 1) / 2) * 2),
  }
}

/** ¿Hay cuarto vecino al otro lado de esta arista (sub-celdas justo afuera del tile)? */
export function vecinoEnLado(
  ocupado: Set<string>,
  col: number,
  row: number,
  side: SideKey,
): boolean {
  const [c0, c1] = subRango(col) // [2c-1, 2c]
  const [r0, r1] = subRango(row)
  if (side === 'E') return ocupado.has(subId(c1 + 1, r0)) || ocupado.has(subId(c1 + 1, r1))
  if (side === 'O') return ocupado.has(subId(c0 - 1, r0)) || ocupado.has(subId(c0 - 1, r1))
  if (side === 'S') return ocupado.has(subId(c0, r1 + 1)) || ocupado.has(subId(c1, r1 + 1))
  return ocupado.has(subId(c0, r0 - 1)) || ocupado.has(subId(c1, r0 - 1)) // N
}

/** Arista exterior del cuarto: la celda offset, su lado y datos de dibujo. */
export interface EdgeInfo {
  off: Cell
  side: SideKey
  /** Centro local del muro (relativo al centro del cuarto). */
  cx: number
  cz: number
  /** El muro corre a lo largo de X (lados N/S). */
  horizontal: boolean
  /** Estado automático: 'puerta' si da a otro cuarto, si no 'pared'. */
  auto: WallState
}

/**
 * Aristas EXTERIORES del footprint: cada arista de celda que no colinda con otra
 * celda del mismo cuarto. Si la celda vecina pertenece a otro cuarto → puerta auto.
 */
export function roomEdges(
  anchor: Cell,
  fp: Footprint,
  ocupado: Set<string>,
): EdgeInfo[] {
  const rect = footprintBoundsRect(fp)
  const propias = new Set(fp.map((c) => cellId(c.col, c.row)))
  const edges: EdgeInfo[] = []
  for (const c of fp) {
    const [lx, lz] = cellLocalRect(c, rect)
    for (const side of SIDE_KEYS) {
      const d = DELTA[side]
      const vec = { col: c.col + d.col, row: c.row + d.row }
      if (propias.has(cellId(vec.col, vec.row))) continue // arista interna
      // Vecino por sub-celda: detecta cuartos alineados Y a media celda (puerta auto).
      const auto: WallState = vecinoEnLado(ocupado, anchor.col + c.col, anchor.row + c.row, side)
        ? 'puerta'
        : 'pared'
      edges.push({
        off: c,
        side,
        cx: lx + (side === 'E' ? HALF : side === 'O' ? -HALF : 0),
        cz: lz + (side === 'S' ? HALF : side === 'N' ? -HALF : 0),
        horizontal: side === 'N' || side === 'S',
        auto,
      })
    }
  }
  return edges
}

/** Estado efectivo de una arista: override del usuario o el automático. */
export function effectiveEdge(e: EdgeInfo, overrides?: WallOverrides): WallState {
  return overrides?.[edgeKey(e.off, e.side)] ?? e.auto
}

function estiloDeArista(
  e: EdgeInfo,
  estilos?: Record<string, EstiloArista>,
  pinceles?: PincelesCuarto,
): EstiloArista | undefined {
  const key = edgeKey(e.off, e.side)
  const pin = pinceles ?? PINCELES_DEFAULT
  const guardado = estilos?.[key]
  return {
    muro: guardado?.muro ?? pin.muro,
    puerta: guardado?.puerta ?? pin.puerta,
  }
}

/**
 * Segmentos de pared (LOCALES al centro) del cuarto, una por arista exterior.
 * Cada arista: 'pared' sólida, 'puerta' con vano centrado, o 'abierto' (sin muro).
 */
export function roomWallSegments(
  anchor: Cell,
  fp: Footprint,
  ocupado: Set<string>,
  overrides?: WallOverrides,
  estilos?: Record<string, EstiloArista>,
  pinceles?: PincelesCuarto,
): Seg[] {
  const segs: Seg[] = []
  // Celdas propias (offsets relativos al ancla) para detectar extremos de footprint multi-celda.
  const propias = new Set(fp.map((c) => cellId(c.col, c.row)))
  // ¿Hay algún cuarto en la celda vecina (offset base + delta)? Por sub-celda.
  const hayVecino = (base: Cell, dc: number, dr: number): boolean =>
    propias.has(cellId(base.col + dc, base.row + dr)) ||
    tileOcupado(ocupado, anchor.col + base.col + dc, anchor.row + base.row + dr)
  for (const e of roomEdges(anchor, fp, ocupado)) {
    const est = effectiveEdge(e, overrides)
    if (est === 'abierto') continue
    const exterior = e.auto === 'pared'
    const ea = estiloDeArista(e, estilos, pinceles)
    const em = ea?.muro
    const ep = ea?.puerta
    const t = WALL_T * (em?.grosor ?? 1) // grosor paramétrico del muro
    const clave = edgeKey(e.off, e.side)
    // La ventana es independiente del tipo: bandera `ventana` (compat: tipo 'ventana').
    const tieneVent = em?.ventana || em?.tipo === 'ventana'
    const texTipo = em?.tipo === 'ventana' ? 'solido' : em?.tipo
    const extra = {
      tipoMuro: texTipo,
      colorMuro: em?.color,
      alto: em?.alto,
      ventAncho: em?.ventAncho,
      ventAlto: em?.ventAlto,
      ventPosY: em?.ventPosY,
      ventPosX: em?.ventPosX,
      ventForma: em?.ventForma,
      ventRot: em?.ventRot,
      ventColor: em?.ventColor,
      ventMosaico: em?.ventMosaico,
      ventMulticolor: em?.ventMulticolor,
      clave,
    }
    // Muros INTERIORES (comparten arista con otro cuarto): cada cuarto dibuja solo su
    // media sección, pegada a su propio lado y separada del eje por una rendija, para
    // no traslaparse con el muro del vecino (cada uno conserva su color). El grosor
    // combinado de ambas mitades + rendija sigue siendo `t`.
    // Muros EXTERIORES (fachada): grosor completo, centrados en el eje.
    const interior = !exterior
    const sep = t * 0.16 // rendija de separación entre muros vecinos
    const tEf = interior ? (t - sep) / 2 : t // grosor efectivo del segmento
    // Normal hacia el interior del cuarto (N→+z, S→−z, E→−x, O→+x).
    const innz = e.side === 'N' ? 1 : e.side === 'S' ? -1 : 0
    const innx = e.side === 'O' ? 1 : e.side === 'E' ? -1 : 0
    const dOff = interior ? sep / 2 + tEf / 2 : 0 // desplazamiento del centro hacia el interior
    const odx = innx * dOff
    const odz = innz * dOff
    if (est === 'pared') {
      // En pared, la ventana y la silueta (forma) van en el muro completo.
      const forma = {
        forma: em?.forma,
        formaAlto: em?.formaAlto,
        formaAncho: em?.formaAncho,
        formaPosX: em?.formaPosX,
        formaDividir: em?.formaDividir,
        formaColor: em?.formaColor,
      }
      if (interior) {
        // Media sección pegada al lado del cuarto, separada del eje por la rendija.
        if (e.horizontal)
          segs.push({ cx: e.cx, cz: e.cz + odz, sx: SIZE, sz: tEf, exterior, ...extra, ...forma, ventana: tieneVent })
        else
          segs.push({ cx: e.cx + odx, cz: e.cz, sx: tEf, sz: SIZE, exterior, ...extra, ...forma, ventana: tieneVent })
      } else if (e.horizontal) {
        // Fachada: grosor completo; cierra el canto en esquinas salvo donde topa con vecino.
        const tL = hayVecino(e.off, -1, 0) ? t / 2 : 0
        const tR = hayVecino(e.off, +1, 0) ? t / 2 : 0
        segs.push({ cx: e.cx + (tL - tR) / 2, cz: e.cz, sx: SIZE + t - tL - tR, sz: t, exterior, ...extra, ...forma, ventana: tieneVent })
      } else {
        const tN = hayVecino(e.off, 0, -1) ? t / 2 : 0
        const tS = hayVecino(e.off, 0, +1) ? t / 2 : 0
        segs.push({ cx: e.cx, cz: e.cz + (tN - tS) / 2, sx: t, sz: SIZE + t - tN - tS, exterior, ...extra, ...forma, ventana: tieneVent })
      }
    } else {
      // Puerta en la arista (ancho paramétrico hasta abarcar el muro y posición
      // horizontal): el vano se desplaza a lo largo del muro y las dos mitades
      // a los lados quedan desiguales.
      const dw = Math.min(SIZE, DOOR_W * (ep?.anchoVano ?? 1))
      const margen = (SIZE - dw) / 2
      const shift = (ep?.posX ?? 0) * margen // centro del vano respecto al centro de la arista
      const negLen = margen + shift // mitad del lado negativo
      const posLen = margen - shift // mitad del lado positivo
      const negC = -SIZE / 2 + negLen / 2 // centro de la mitad negativa
      const posC = SIZE / 2 - posLen / 2 // centro de la mitad positiva
      // Muro sobre la puerta: rellena desde el alto de la hoja hasta el alto del muro.
      const He = WALL_H * (em?.alto ?? 1)
      const D = Math.min(He, He * (ep?.alto ?? 0.97))
      const headerH = He - D
      const hcx = e.cx + (e.horizontal ? shift : 0)
      const hcz = e.cz + (e.horizontal ? 0 : shift)
      // La ventana sobre una puerta va en la cabecera (sin chocar con el vano).
      if (e.horizontal) {
        if (negLen > 0.02) segs.push({ cx: e.cx + negC, cz: e.cz + odz, sx: negLen, sz: tEf, exterior, ...extra })
        if (posLen > 0.02) segs.push({ cx: e.cx + posC, cz: e.cz + odz, sx: posLen, sz: tEf, exterior, ...extra })
        if (headerH > 0.05 && dw > 0.05)
          segs.push({ cx: hcx, cz: hcz + odz, sx: dw, sz: tEf, exterior, ...extra, alturaM: headerH, yBase: D, ventana: tieneVent })
      } else {
        if (negLen > 0.02) segs.push({ cx: e.cx + odx, cz: e.cz + negC, sx: tEf, sz: negLen, exterior, ...extra })
        if (posLen > 0.02) segs.push({ cx: e.cx + odx, cz: e.cz + posC, sx: tEf, sz: posLen, exterior, ...extra })
        if (headerH > 0.05 && dw > 0.05)
          segs.push({ cx: hcx + odx, cz: hcz, sx: tEf, sz: dw, exterior, ...extra, alturaM: headerH, yBase: D, ventana: tieneVent })
      }
    }
  }
  return segs
}

// ── Vanos (puertas y portones) para el render de fachada ──────────────────────
/** Tipo de hoja en un vano: 'puerta' (estado puerta) o 'porton' (estado abierto). */
export type VanoTipo = 'puerta' | 'porton'

/** Un vano (hueco) de una arista, con lo necesario para dibujar y animar su hoja. */
export interface Vano {
  /** Centro local del vano (relativo al centro del cuarto). */
  cx: number
  cz: number
  /** El vano corre a lo largo de X (lados N/S). */
  horizontal: boolean
  /** Da al exterior de la casa (sin cuarto vecino). */
  exterior: boolean
  tipo: VanoTipo
  /** Ancho del hueco: DOOR_W para 'puerta', SIZE (lado completo) para 'porton'. */
  ancho: number
  /** Alto de la hoja como factor del alto del muro (0–1), solo 'puerta'. */
  alto?: number
  /** Alto del muro de la arista (factor de WALL_H), para calcular el alto de la hoja. */
  altoMuro?: number
  /** Normal hacia el INTERIOR del cuarto (las hojas abren hacia ahí). */
  nx: number
  nz: number
  /** Tipo visual de la puerta. */
  tipoPuerta?: EstiloPuerta['tipo']
  colorPuerta?: string
}

/** Normal hacia el interior del cuarto según el lado de la arista. */
const NORMAL_INT: Record<SideKey, [number, number]> = {
  N: [0, 1],
  S: [0, -1],
  E: [-1, 0],
  O: [1, 0],
}

/**
 * Vanos del cuarto (aristas con 'puerta' o 'abierto'), una por arista con hueco.
 * Es solo para el render: las hojas son decorativas (no añaden colisión), así que
 * el vano sigue siendo atravesable igual que hoy.
 */
export function roomDoorways(
  anchor: Cell,
  fp: Footprint,
  ocupado: Set<string>,
  overrides?: WallOverrides,
  estilos?: Record<string, EstiloArista>,
  pinceles?: PincelesCuarto,
): Vano[] {
  const out: Vano[] = []
  for (const e of roomEdges(anchor, fp, ocupado)) {
    const est = effectiveEdge(e, overrides)
    if (est === 'pared') continue // muro sólido: no hay hueco
    const [nx, nz] = NORMAL_INT[e.side]
    const ea = estiloDeArista(e, estilos, pinceles)
    const ep = ea?.puerta
    const dw = est === 'abierto' ? SIZE : Math.min(SIZE, DOOR_W * (ep?.anchoVano ?? 1))
    const shift = est === 'puerta' ? (ep?.posX ?? 0) * ((SIZE - dw) / 2) : 0
    out.push({
      cx: e.cx + (e.horizontal ? shift : 0),
      cz: e.cz + (e.horizontal ? 0 : shift),
      horizontal: e.horizontal,
      exterior: e.auto === 'pared',
      tipo: est === 'abierto' ? 'porton' : 'puerta',
      ancho: dw,
      alto: ep?.alto,
      altoMuro: ea?.muro?.alto,
      nx,
      nz,
      tipoPuerta: ep?.tipo,
      colorPuerta: ep?.color,
    })
  }
  return out
}

/** Caja de colisión alineada a ejes, en coordenadas del mundo. */
export interface AABB {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/** Colliders de pared de un cuarto (mundo) según ancla, footprint y ocupación. */
export function collidersForRoom(
  anchor: Cell,
  fp: Footprint,
  ocupado: Set<string>,
  overrides?: WallOverrides,
  estilos?: Record<string, EstiloArista>,
  pinceles?: PincelesCuarto,
): AABB[] {
  const [cx, , cz] = centroCuarto3D(anchor, fp)
  return roomWallSegments(anchor, fp, ocupado, overrides, estilos, pinceles)
    // El dintel sobre la puerta flota en altura: no debe bloquear el paso a nivel de piso.
    .filter((s) => s.alturaM == null)
    .map((s) => ({
      minX: cx + s.cx - s.sx / 2,
      maxX: cx + s.cx + s.sx / 2,
      minZ: cz + s.cz - s.sz / 2,
      maxZ: cz + s.cz + s.sz / 2,
    }))
}

/** Altura del techo según los segmentos de muro: la del más alto (WALL_H si no hay ninguno). */
export function alturaTechoDeSegs(segs: Seg[]): number {
  let max = WALL_H
  for (const s of segs) {
    if (s.alturaM != null) continue // dintel sobre puerta: no es la altura del muro
    const h = WALL_H * (s.alto ?? 1)
    if (h > max) max = h
  }
  return max
}

/** Altura de techo de un cuarto: la de su muro más alto. */
export function alturaTechoRoom(
  anchor: Cell,
  fp: Footprint,
  ocupado: Set<string>,
  overrides?: WallOverrides,
  estilos?: Record<string, EstiloArista>,
  pinceles?: PincelesCuarto,
): number {
  return alturaTechoDeSegs(roomWallSegments(anchor, fp, ocupado, overrides, estilos, pinceles))
}

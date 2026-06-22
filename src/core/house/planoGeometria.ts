import {
  cellId,
  effectiveEdge,
  footprintCells,
  roomEdges,
  roomSubCells,
  subCeldasDeTile,
  FOOTPRINT_DEFAULT,
  footprintBoundsRect,
  type Cell,
  type EdgeInfo,
  type Footprint,
  type WallState,
  type WallOverrides,
} from './walls'
import { esFootprintLibre } from '../state/layoutStore'
import { celdasTechoAbsolutas } from './techoCeldas'
import type { ZonaPlano } from '../data/db'

/** Tamaño de celda en píxeles (vista ortogonal en planta). */
export const PLANO_CELL_PX = 52
/** Media celda (= paso de snap, igual que el mapa 3D). */
export const PLANO_SUB_PX = PLANO_CELL_PX / 2
export const PLANO_PAD = 28

/** Colores del croquis (fondo blanco + plano tipo papel). */
export const PLANO_FONDO = '#ffffff'
export const PLANO_PAPEL = '#e8dcc4'
export const PLANO_PAPEL_BORDE = '#c4a574'
export const PLANO_GRID_FUERTE = '#a08050'
export const PLANO_GRID_SUAVE = '#c9b896'
export const PLANO_TEXTO = '#3d2914'

export interface ViewportPlano {
  ancho: number
  alto: number
  cols: number
  rows: number
}

/** Tamaño del área dibujable (rejilla lógica cols × rows). */
export function areaPlanoPx(cols: number, rows: number): { ancho: number; alto: number } {
  return {
    ancho: cols * PLANO_CELL_PX,
    alto: rows * PLANO_CELL_PX,
  }
}

/** Índice centro máximo de ancla (cuarto 1×1 en el borde E/S). */
export function maxIndiceAnclaPlano(celdas: number): number {
  return celdas - 1 + 0.5
}

export function viewportPlano(cols: number, rows: number): ViewportPlano {
  const area = areaPlanoPx(cols, rows)
  return {
    ancho: PLANO_PAD * 2 + area.ancho,
    alto: PLANO_PAD * 2 + area.alto,
    cols,
    rows,
  }
}

/** Celda absoluta → esquina superior-izquierda en SVG. */
export function celdaASvg(col: number, row: number): { x: number; y: number } {
  return {
    x: PLANO_PAD + col * PLANO_CELL_PX,
    y: PLANO_PAD + row * PLANO_CELL_PX,
  }
}

/** Centro de celda en SVG. */
export function celdaCentroSvg(col: number, row: number): { x: number; y: number } {
  const { x, y } = celdaASvg(col, row)
  return { x: x + PLANO_CELL_PX / 2, y: y + PLANO_CELL_PX / 2 }
}

/** Punto SVG → celda según detalle del croquis. */
export function celdaSnapEnPlano(
  svgX: number,
  svgY: number,
  cols: number,
  rows: number,
  detalle: 'celda' | 'subcelda',
): Cell | null {
  return detalle === 'subcelda'
    ? svgACeldaMedia(svgX, svgY, cols, rows)
    : svgACelda(svgX, svgY, cols, rows)
}

/** Esquina SVG de un tile (celda entera o media). */
export function tileASvg(col: number, row: number): { x: number; y: number } {
  return {
    x: PLANO_PAD + col * PLANO_CELL_PX,
    y: PLANO_PAD + row * PLANO_CELL_PX,
  }
}

/** Tamaño en px de un tile según detalle. */
export function tilePxEnPlano(detalle: 'celda' | 'subcelda'): number {
  return detalle === 'subcelda' ? PLANO_SUB_PX : PLANO_CELL_PX
}

/** Punto SVG → celda entera (solo lectura gruesa). */
export function svgACelda(
  svgX: number,
  svgY: number,
  cols: number,
  rows: number,
): Cell | null {
  const col = Math.floor((svgX - PLANO_PAD) / PLANO_CELL_PX)
  const row = Math.floor((svgY - PLANO_PAD) / PLANO_CELL_PX)
  if (col < 0 || row < 0 || col >= cols || row >= rows) return null
  return { col, row }
}

/**
 * Punto SVG → celda enganchada a ½ con índice de **centro** (igual que `worldToCell`
 * en el mapa 3D). En SVG la esquina de celda entera es `col` entero; el centro de
 * esa celda es `col + 0.5` en coordenadas de dibujo.
 */
export function svgACeldaMedia(
  svgX: number,
  svgY: number,
  cols: number,
  rows: number,
): Cell | null {
  const rawCol = (svgX - PLANO_PAD) / PLANO_CELL_PX
  const rawRow = (svgY - PLANO_PAD) / PLANO_CELL_PX
  if (rawCol < -0.25 || rawRow < -0.25 || rawCol > cols - 0.25 || rawRow > rows - 0.25)
    return null
  const maxCol = maxIndiceAnclaPlano(cols)
  const maxRow = maxIndiceAnclaPlano(rows)
  const col = Math.max(0, Math.min(maxCol, Math.round((rawCol - 0.5) * 2) / 2))
  const row = Math.max(0, Math.min(maxRow, Math.round((rawRow - 0.5) * 2) / 2))
  return { col, row }
}

/** Cantidad de tiles de ½ celda por eje (cubre cols × rows sin franja extra). */
export function tilesMediaEnEje(celdas: number): number {
  return celdas * 2
}

/** ¿Se puede colocar un cuarto básico (1×1) en esta posición? */
export function puedeColocarCuartoBasico(
  anchor: Cell,
  nivel: number,
  placed: Record<string, boolean>,
  cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
  niveles: Record<string, number>,
  zonas: ZonaPlano[],
): boolean {
  const fp = FOOTPRINT_DEFAULT
  if (!esFootprintLibre(placed, cells, footprints, niveles, '__nuevo__', anchor, fp, nivel))
    return false
  const subs = new Set(roomSubCells(anchor, fp))
  for (const z of zonas) {
    if (z.nivel !== nivel) continue
    for (const c of z.celdas) {
      for (const k of subCeldasDeTile(c.col, c.row)) {
        if (subs.has(k)) return false
      }
    }
  }
  return true
}

/** ¿Qué cuarto del registro ocupa este tile (detección por sub-celdas ½)? */
export function cuartoIdEnTile(
  c: Cell,
  cuartoIds: string[],
  _cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
  anchorDe: (id: string) => Cell | undefined,
): string | undefined {
  const clickSubs = new Set(subCeldasDeTile(c.col, c.row))
  for (const id of cuartoIds) {
    const anchor = anchorDe(id)
    const fp = footprints[id]
    if (!anchor || !fp?.length) continue
    for (const off of fp) {
      for (const k of subCeldasDeTile(anchor.col + off.col, anchor.row + off.row)) {
        if (clickSubs.has(k)) return id
      }
    }
  }
  return undefined
}

/** Celdas absolutas ocupadas por cuartos en un nivel. */
export function celdasOcupadasEnNivel(
  nivel: number,
  placed: Record<string, boolean>,
  cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
  niveles: Record<string, number>,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const [roomId, ok] of Object.entries(placed)) {
    if (!ok) continue
    if ((niveles[roomId] ?? 0) !== nivel) continue
    const anchor = cells[roomId]
    const fp = footprints[roomId]
    if (!anchor || !fp?.length) continue
    for (const c of footprintCells(anchor, fp)) {
      map.set(cellId(c.col, c.row), roomId)
    }
  }
  return map
}

export interface AristaPlano {
  roomId: string
  edge: EdgeInfo
  estado: WallState
}

/** Aristas exteriores de todos los cuartos en un nivel. */
export function aristasEnNivel(
  nivel: number,
  placed: Record<string, boolean>,
  cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
  niveles: Record<string, number>,
  ocupadoPorNivel: Map<number, Set<string>>,
  wallOverrides: Record<string, WallOverrides>,
): AristaPlano[] {
  const occ = ocupadoPorNivel.get(nivel) ?? new Set<string>()
  const out: AristaPlano[] = []
  for (const [roomId, ok] of Object.entries(placed)) {
    if (!ok) continue
    if ((niveles[roomId] ?? 0) !== nivel) continue
    const anchor = cells[roomId]
    const fp = footprints[roomId]
    if (!anchor || !fp?.length) continue
    const ov = wallOverrides[roomId]
    for (const e of roomEdges(anchor, fp, occ)) {
      out.push({ roomId, edge: e, estado: effectiveEdge(e, ov) })
    }
  }
  return out
}

/** Cobertura de techo por cuarto en un nivel (celdas absolutas). */
export function coberturaTechoEnNivel(
  nivel: number,
  placed: Record<string, boolean>,
  cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
  niveles: Record<string, number>,
  roomTechoExtra: Record<string, Cell[]>,
): { roomId: string; celdas: Cell[] }[] {
  const out: { roomId: string; celdas: Cell[] }[] = []
  for (const [roomId, ok] of Object.entries(placed)) {
    if (!ok) continue
    if ((niveles[roomId] ?? 0) !== nivel) continue
    const anchor = cells[roomId]
    const fp = footprints[roomId]
    if (!anchor || !fp?.length) continue
    const extra = roomTechoExtra[roomId] ?? []
    out.push({
      roomId,
      celdas: celdasTechoAbsolutas(anchor, fp, extra),
    })
  }
  return out
}

/** ¿Conjunto de tiles ½ conexo (vecinos a 0,5)? */
export function celdasConexasMedia(celdas: Cell[]): boolean {
  if (celdas.length <= 1) return true
  const set = new Set(celdas.map((c) => `${c.col},${c.row}`))
  const deltas: Cell[] = [
    { col: 0, row: 0.5 },
    { col: 0, row: -0.5 },
    { col: 0.5, row: 0 },
    { col: -0.5, row: 0 },
  ]
  const visto = new Set<string>()
  const cola = [celdas[0]]
  visto.add(`${celdas[0].col},${celdas[0].row}`)
  while (cola.length) {
    const c = cola.pop()!
    for (const d of deltas) {
      const k = `${c.col + d.col},${c.row + d.row}`
      if (set.has(k) && !visto.has(k)) {
        visto.add(k)
        cola.push({ col: c.col + d.col, row: c.row + d.row })
      }
    }
  }
  return visto.size === celdas.length
}

/** Normaliza a celdas enteras únicas (espacio interior del cuarto). */
export function normalizarCeldasEnteras(celdas: Cell[]): Cell[] {
  const map = new Map<string, Cell>()
  for (const c of celdas) {
    const col = Math.round(c.col)
    const row = Math.round(c.row)
    map.set(cellId(col, row), { col, row })
  }
  return [...map.values()]
}

/** Aristas exteriores del perímetro de un conjunto de celdas enteras (para preview de muros). */
export function aristasPerimetroCeldas(celdas: Cell[]): { x1: number; y1: number; x2: number; y2: number }[] {
  const enteras = normalizarCeldasEnteras(celdas)
  if (enteras.length === 0) return []
  const set = new Set(enteras.map((c) => cellId(c.col, c.row)))
  const lineas: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (const c of enteras) {
    const { x, y, w, h } = tileRectEnSvg(c.col, c.row)
    if (!set.has(cellId(c.col, c.row - 1))) lineas.push({ x1: x, y1: y, x2: x + w, y2: y })
    if (!set.has(cellId(c.col, c.row + 1))) lineas.push({ x1: x, y1: y + h, x2: x + w, y2: y + h })
    if (!set.has(cellId(c.col - 1, c.row))) lineas.push({ x1: x, y1: y, x2: x, y2: y + h })
    if (!set.has(cellId(c.col + 1, c.row))) lineas.push({ x1: x + w, y1: y, x2: x + w, y2: y + h })
  }
  return lineas
}

/** ¿Celda entera (col/row enteros) libre para un cuarto básico? */
export function celdaEnteraEsLibre(
  c: Cell,
  nivel: number,
  placed: Record<string, boolean>,
  cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
  niveles: Record<string, number>,
  zonas: ZonaPlano[],
  cuartoIds: string[],
  anchorDe: (id: string) => Cell | undefined,
): boolean {
  if (!Number.isInteger(c.col) || !Number.isInteger(c.row)) return false
  return tileEsLibre(c, nivel, placed, cells, footprints, niveles, zonas, cuartoIds, anchorDe)
}

/** Celdas absolutas de una zona → ancla + footprint relativo. */
export function zonaAnchorFootprint(celdas: Cell[]): { anchor: Cell; footprint: Footprint } {
  const minCol = Math.min(...celdas.map((c) => c.col))
  const minRow = Math.min(...celdas.map((c) => c.row))
  return {
    anchor: { col: minCol, row: minRow },
    footprint: celdas.map((c) => ({ col: c.col - minCol, row: c.row - minRow })),
  }
}

/** Ocupación del nivel incluyendo otras zonas (para muros 3D). */
export function ocupadoConZonas(
  nivel: number,
  ocupadoPorNivel: Map<number, Set<string>>,
  zonas: ZonaPlano[],
  exceptZonaId?: number,
): Set<string> {
  const occ = new Set(ocupadoPorNivel.get(nivel) ?? [])
  for (const z of zonas) {
    if (z.nivel !== nivel || z.id === exceptZonaId) continue
    for (const c of z.celdas) {
      for (const k of subCeldasDeTile(c.col, c.row)) occ.add(k)
    }
  }
  return occ
}

/** Celdas de zona trasladadas por delta del ancla. */
export function trasladarCeldasZona(celdas: Cell[], nuevoAncla: Cell): Cell[] {
  const { anchor } = zonaAnchorFootprint(celdas)
  const dc = nuevoAncla.col - anchor.col
  const dr = nuevoAncla.row - anchor.row
  return celdas.map((c) => ({ col: c.col + dc, row: c.row + dr }))
}

/** ¿El cuarto del registro puede anclarse aquí (incluye zonas del plano)? */
export function puedeMoverCuartoRegistro(opts: {
  roomId: string
  origen: Cell
  preview: Cell
  fp: Footprint
  nivel: number
  placed: Record<string, boolean>
  cells: Record<string, Cell>
  footprints: Record<string, Footprint>
  niveles: Record<string, number>
  zonas: ZonaPlano[]
}): boolean {
  const {
    roomId,
    origen,
    preview,
    fp,
    nivel,
    placed,
    cells,
    footprints,
    niveles,
    zonas,
  } = opts

  if (
    !esFootprintLibre(placed, cells, footprints, niveles, roomId, preview, fp, nivel)
  ) {
    return false
  }

  const origenKeys = new Set(
    footprintCells(origen, fp).map((c) => cellId(c.col, c.row)),
  )
  const otrasZonas = zonas.filter((z) => z.nivel === nivel)

  for (const c of footprintCells(preview, fp)) {
    const k = cellId(c.col, c.row)
    if (origenKeys.has(k)) continue
    if (zonaEnTile(otrasZonas, nivel, c)) return false
  }

  return true
}

/** ¿La zona puede ocupar estas celdas (sin solaparse con otros)? */
export function puedeMoverZona(
  nuevasCeldas: Cell[],
  zonaId: number,
  nivel: number,
  gridCols: number,
  gridRows: number,
  _placed: Record<string, boolean>,
  cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
  _niveles: Record<string, number>,
  zonas: ZonaPlano[],
  cuartoIds: string[],
  anchorDe: (id: string) => Cell | undefined,
): boolean {
  for (const c of nuevasCeldas) {
    if (c.col < 0 || c.row < 0 || c.col >= gridCols || c.row >= gridRows) return false
    if (cuartoIdEnTile(c, cuartoIds, cells, footprints, anchorDe)) return false
    const otras = zonas.filter((z) => z.id !== zonaId && z.nivel === nivel)
    if (zonaEnTile(otras, nivel, c)) return false
  }
  return true
}

/** Centro SVG de un tile (índice centro, igual que `cellToWorld`). */
export function centroTileSvg(col: number, row: number): { x: number; y: number } {
  const { x, y, w, h } = tileRectEnSvg(col, row)
  return { x: x + w / 2, y: y + h / 2 }
}

/** Centro SVG del footprint de un cuarto (alineado con `centroCuarto3D`). */
export function centroSvgFootprint(anchor: Cell, fp: Footprint): { x: number; y: number } {
  const rect = footprintBoundsRect(fp)
  const cx = anchor.col + rect.minCol + (rect.w - 1) / 2
  const cy = anchor.row + rect.minRow + (rect.h - 1) / 2
  return centroTileSvg(cx, cy)
}

/** Centro visual en SVG de un conjunto de celdas (alineado con centroCuarto3D). */
export function centroSvgZona(celdas: Cell[]): { x: number; y: number } {
  const { anchor, footprint } = zonaAnchorFootprint(celdas)
  return centroSvgFootprint(anchor, footprint)
}

/** Esquina SVG de una celda/tile (igual que cuartos del registro en el croquis). */
export function tileEsquinaSvg(col: number, row: number): { x: number; y: number } {
  return celdaASvg(col, row)
}

/**
 * Esquina superior-izquierda del tile cuyo **centro** está en índice centro
 * (mismo que `cellToWorld` / `worldToCell`). Cada +0.5 desplaza media celda en SVG.
 */
function esquinaSvgDesdeCentro(col: number, row: number): { x: number; y: number } {
  return {
    x: PLANO_PAD + col * PLANO_CELL_PX,
    y: PLANO_PAD + row * PLANO_CELL_PX,
  }
}

/** Rectángulo SVG del tile (índice centro, respeta snap ½ celda). */
export function tileRectEnSvg(col: number, row: number): { x: number; y: number; w: number; h: number } {
  const { x, y } = esquinaSvgDesdeCentro(col, row)
  return { x, y, w: PLANO_CELL_PX, h: PLANO_CELL_PX }
}

/** ¿Tile libre para cuarto básico o marcado en agrupar? */
export function tileEsLibre(
  c: Cell,
  nivel: number,
  placed: Record<string, boolean>,
  cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
  niveles: Record<string, number>,
  zonas: ZonaPlano[],
  cuartoIds: string[],
  anchorDe: (id: string) => Cell | undefined,
): boolean {
  if (cuartoIdEnTile(c, cuartoIds, cells, footprints, anchorDe)) return false
  if (zonaEnTile(zonas, nivel, c)) return false
  return puedeColocarCuartoBasico(c, nivel, placed, cells, footprints, niveles, zonas)
}

/** ¿La celda pertenece a alguna zona en el nivel? */
export function zonaEnCelda(
  zonas: ZonaPlano[],
  nivel: number,
  col: number,
  row: number,
): ZonaPlano | undefined {
  return zonaEnTile(zonas, nivel, { col, row })
}

/** ¿Celda del grid sin cuarto ni zona (piso exterior)? */
export function celdaEsExterior(
  col: number,
  row: number,
  nivel: number,
  cuartoIds: string[],
  cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
  zonas: ZonaPlano[],
  anchorDe: (id: string) => Cell | undefined,
): boolean {
  const c = { col, row }
  if (cuartoIdEnTile(c, cuartoIds, cells, footprints, anchorDe)) return false
  if (zonaEnCelda(zonas, nivel, col, row)) return false
  return true
}

/** Zona que ocupa este tile (detección por sub-celdas ½). */
export function zonaEnTile(
  zonas: ZonaPlano[],
  nivel: number,
  c: Cell,
): ZonaPlano | undefined {
  const clickSubs = new Set(subCeldasDeTile(c.col, c.row))
  for (const z of zonas) {
    if (z.nivel !== nivel) continue
    for (const cel of z.celdas) {
      for (const k of subCeldasDeTile(cel.col, cel.row)) {
        if (clickSubs.has(k)) return z
      }
    }
  }
  return undefined
}

/** Segmento SVG para una arista (lado de celda). */
export function aristaASegmento(
  anchor: Cell,
  e: EdgeInfo,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const absCol = anchor.col + e.off.col
  const absRow = anchor.row + e.off.row
  const { x, y, w, h } = tileRectEnSvg(absCol, absRow)
  switch (e.side) {
    case 'N':
      return { x1: x, y1: y, x2: x + w, y2: y }
    case 'S':
      return { x1: x, y1: y + h, x2: x + w, y2: y + h }
    case 'O':
      return { x1: x, y1: y, x2: x, y2: y + h }
    case 'E':
      return { x1: x + w, y1: y, x2: x + w, y2: y + h }
    default:
      return null
  }
}

export const COLOR_ARISTA: Record<WallState, string> = {
  pared: '#b45309',
  puerta: '#22c55e',
  abierto: '#38bdf8',
}

export const GROSOR_ARISTA = 4

/** Nivel máximo presente en el mapa (cuartos + accesos). */
export function nivelMaximo(
  placed: Record<string, boolean>,
  niveles: Record<string, number>,
  accesos: { nivel: number }[],
): number {
  let max = 0
  for (const [id, ok] of Object.entries(placed)) {
    if (!ok) continue
    max = Math.max(max, niveles[id] ?? 0)
  }
  for (const a of accesos) max = Math.max(max, a.nivel)
  return max
}

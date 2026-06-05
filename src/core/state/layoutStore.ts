import { create } from 'zustand'
import { db } from '../data/db'
import { rooms } from '../registry'
import {
  cellId,
  cabeEnRejilla,
  collidersForRoom,
  defaultCell,
  effectiveWall,
  footprintCells,
  roomCenter,
  COLS,
  ROWS,
  MAX_AREA,
  SIZE_DEFAULT,
  type AABB,
  type Cell,
  type Size,
  type SideKey,
  type WallState,
  type WallOverrides,
} from '../house/walls'

/**
 * Layout editable del mapa: qué cuartos están colocados, en qué CELDA y de qué
 * TAMAÑO (w×h). Data-driven: se pueden agregar/quitar, mover (drag) y redimensionar.
 * Puertas y colisiones se recalculan al cambiar.
 */

type Cells = Record<string, Cell>
type Sizes = Record<string, Size>
type Overrides = Record<string, WallOverrides>

const sizeDe = (sizes: Sizes, id: string): Size => sizes[id] ?? SIZE_DEFAULT

/** Posición del mundo (centro) de un cuarto según su celda y tamaño. */
function worldOf(cells: Cells, sizes: Sizes, id: string): [number, number, number] {
  const c = cells[id]
  if (!c) return [0, 0, 0]
  return roomCenter(c, sizeDe(sizes, id))
}

/** Deriva ocupación (footprints) y colliders de los cuartos colocados. */
function derivar(
  placed: Record<string, boolean>,
  cells: Cells,
  sizes: Sizes,
  wallOverrides: Overrides = {},
) {
  const colocados = rooms.filter((r) => placed[r.id] && cells[r.id])
  const ocupado = new Set<string>()
  for (const r of colocados)
    for (const c of footprintCells(cells[r.id], sizeDe(sizes, r.id)))
      ocupado.add(cellId(c.col, c.row))
  const wallColliders: AABB[] = colocados.flatMap((r) =>
    collidersForRoom(cells[r.id], sizeDe(sizes, r.id), ocupado, wallOverrides[r.id]),
  )
  return { ocupado, wallColliders }
}

const todos = (v: boolean) =>
  Object.fromEntries(rooms.map((r) => [r.id, v])) as Record<string, boolean>

const celdasDefault = (): Cells =>
  Object.fromEntries(rooms.map((r) => [r.id, defaultCell(r.posicion)]))

const tamanosDefault = (): Sizes =>
  Object.fromEntries(rooms.map((r) => [r.id, { ...SIZE_DEFAULT }]))

/** Acota la celda ancla para que el footprint quepa en la rejilla. */
function clampAnchor(cell: Cell, size: Size): Cell {
  return {
    col: Math.max(0, Math.min(cell.col, COLS - size.w)),
    row: Math.max(0, Math.min(cell.row, ROWS - size.h)),
  }
}

interface LayoutState {
  placed: Record<string, boolean>
  cells: Cells
  sizes: Sizes
  editMode: boolean
  editingRoomId: string | null
  ocupado: Set<string>
  wallColliders: AABB[]
  wallOverrides: Overrides
  draggingId: string | null
  previewCell: Cell | null
  cargado: boolean
  cargar: () => Promise<void>
  setEditMode: (v: boolean) => void
  editRoom: (id: string | null) => void
  toggleRoom: (id: string) => Promise<void>
  setAll: (v: boolean) => Promise<void>
  moveRoom: (id: string, cell: Cell) => Promise<void>
  resizeRoom: (id: string, size: Size) => Promise<void>
  cycleWall: (roomId: string, side: SideKey) => Promise<void>
  startDrag: (id: string) => void
  setPreview: (cell: Cell | null) => void
  endDrag: () => Promise<void>
}

export const useLayout = create<LayoutState>((set, get) => ({
  placed: todos(true),
  cells: celdasDefault(),
  sizes: tamanosDefault(),
  editMode: false,
  editingRoomId: null,
  wallOverrides: {},
  ...derivar(todos(true), celdasDefault(), tamanosDefault(), {}),
  draggingId: null,
  previewCell: null,
  cargado: false,

  cargar: async () => {
    const filas = await db.layout.toArray()
    let placed: Record<string, boolean>
    const cells = celdasDefault()
    const sizes = tamanosDefault()
    const wallOverrides: Overrides = {}
    if (filas.length === 0) {
      placed = todos(true)
      await db.layout.bulkAdd(
        rooms.map((r) => {
          const c = cells[r.id]
          return { roomId: r.id, placed: true, col: c.col, row: c.row, w: 1, h: 1 }
        }),
      )
    } else {
      placed = {}
      for (const r of rooms) {
        const f = filas.find((x) => x.roomId === r.id)
        placed[r.id] = f?.placed ?? true
        if (f && f.col !== undefined && f.row !== undefined) {
          cells[r.id] = { col: f.col, row: f.row }
        }
        if (f?.w && f?.h) sizes[r.id] = { w: f.w, h: f.h }
        if (f?.muros) wallOverrides[r.id] = f.muros
      }
    }
    set({
      placed,
      cells,
      sizes,
      wallOverrides,
      ...derivar(placed, cells, sizes, wallOverrides),
      cargado: true,
    })
  },

  setEditMode: (v) =>
    set({
      editMode: v,
      draggingId: null,
      previewCell: null,
      editingRoomId: v ? get().editingRoomId : null,
    }),

  editRoom: (id) =>
    set({ editMode: true, editingRoomId: id, draggingId: null, previewCell: null }),

  toggleRoom: async (id) => {
    const placed = { ...get().placed, [id]: !get().placed[id] }
    set({ placed, ...derivar(placed, get().cells, get().sizes, get().wallOverrides) })
    await upsert(id, { placed: placed[id] })
  },

  setAll: async (v) => {
    const placed = todos(v)
    set({ placed, ...derivar(placed, get().cells, get().sizes, get().wallOverrides) })
    await Promise.all(rooms.map((r) => upsert(r.id, { placed: v })))
  },

  moveRoom: async (id, cell) => {
    const cells = { ...get().cells, [id]: cell }
    set({ cells, ...derivar(get().placed, cells, get().sizes, get().wallOverrides) })
    await upsert(id, { col: cell.col, row: cell.row })
  },

  resizeRoom: async (id, size) => {
    const w = Math.max(1, Math.min(4, Math.round(size.w)))
    const h = Math.max(1, Math.min(4, Math.round(size.h)))
    if (w * h > MAX_AREA) return // máximo 4 veces el espacio estándar
    const { placed, cells, sizes } = get()
    if (!esFootprintLibre(placed, cells, sizes, id, cells[id], { w, h })) return
    const nuevos = { ...sizes, [id]: { w, h } }
    set({ sizes: nuevos, ...derivar(placed, cells, nuevos, get().wallOverrides) })
    await upsert(id, { w, h })
  },

  cycleWall: async (roomId, side) => {
    const orden: WallState[] = ['pared', 'puerta', 'abierto']
    const { cells, sizes, ocupado, wallOverrides } = get()
    const actual = effectiveWall(
      cells[roomId],
      sizeDe(sizes, roomId),
      ocupado,
      wallOverrides[roomId],
      side,
    )
    const siguiente = orden[(orden.indexOf(actual) + 1) % orden.length]
    const muros: WallOverrides = { ...(wallOverrides[roomId] ?? {}), [side]: siguiente }
    const nuevos = { ...wallOverrides, [roomId]: muros }
    set({ wallOverrides: nuevos, ...derivar(get().placed, cells, sizes, nuevos) })
    await upsert(roomId, { muros })
  },

  startDrag: (id) => set({ draggingId: id, previewCell: get().cells[id] }),

  setPreview: (cell) => {
    const { draggingId, placed, cells, sizes, wallOverrides } = get()
    if (!draggingId || !cell) {
      set(
        cell
          ? { previewCell: cell }
          : { previewCell: null, ...derivar(placed, cells, sizes, wallOverrides) },
      )
      return
    }
    const anclado = clampAnchor(cell, sizeDe(sizes, draggingId))
    const previewCells = { ...cells, [draggingId]: anclado }
    set({
      previewCell: anclado,
      ...derivar(placed, previewCells, sizes, wallOverrides),
    })
  },

  endDrag: async () => {
    const { draggingId, previewCell, placed, cells, sizes } = get()
    if (
      draggingId &&
      previewCell &&
      esFootprintLibre(placed, cells, sizes, draggingId, previewCell, sizeDe(sizes, draggingId))
    ) {
      await get().moveRoom(draggingId, previewCell)
    }
    const { placed: p, cells: c, sizes: s, wallOverrides: w } = get()
    set({ draggingId: null, previewCell: null, ...derivar(p, c, s, w) })
  },
}))

/** ¿El footprint (cell+size) cabe y no se solapa con otro cuarto colocado? */
export function esFootprintLibre(
  placed: Record<string, boolean>,
  cells: Cells,
  sizes: Sizes,
  exceptId: string,
  cell: Cell,
  size: Size,
): boolean {
  if (!cabeEnRejilla(cell, size)) return false
  const ocupadasOtros = new Set<string>()
  for (const r of rooms) {
    if (r.id === exceptId || !placed[r.id] || !cells[r.id]) continue
    for (const c of footprintCells(cells[r.id], sizeDe(sizes, r.id)))
      ocupadasOtros.add(cellId(c.col, c.row))
  }
  return footprintCells(cell, size).every(
    (c) => !ocupadasOtros.has(cellId(c.col, c.row)),
  )
}

/** Posición del mundo (centro) de un cuarto, fuera de React. */
export function roomWorldPos(id: string): [number, number, number] {
  return worldOf(useLayout.getState().cells, useLayout.getState().sizes, id)
}

async function upsert(
  roomId: string,
  patch: Partial<{
    placed: boolean
    col: number
    row: number
    w: number
    h: number
    muros: WallOverrides
  }>,
) {
  const fila = await db.layout.where('roomId').equals(roomId).first()
  if (fila?.id) await db.layout.update(fila.id, patch)
  else await db.layout.add({ roomId, placed: true, ...patch })
}

if (import.meta.env.DEV) {
  ;(window as unknown as { useLayout: typeof useLayout }).useLayout = useLayout
}

useLayout.getState().cargar()

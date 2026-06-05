import { create } from 'zustand'
import { db } from '../data/db'
import { rooms } from '../registry'
import {
  cellKey,
  cellToWorld,
  collidersForRoom,
  defaultCell,
  type AABB,
  type Cell,
} from '../house/walls'

/**
 * Layout editable del mapa: qué cuartos están colocados y en qué CELDA de la
 * rejilla. Es data-driven (no fijo en código): se pueden agregar/quitar y mover
 * (drag) los cuartos. Las puertas y colisiones se recalculan al cambiar.
 */

type Cells = Record<string, Cell>

/** Posición del mundo de un cuarto según su celda actual. */
function worldOf(cells: Cells, id: string): [number, number, number] {
  const c = cells[id]
  if (!c) return [0, 0, 0]
  return cellToWorld(c.col, c.row)
}

/** Deriva ocupación y colliders de los cuartos colocados en sus celdas. */
function derivar(placed: Record<string, boolean>, cells: Cells) {
  const colocados = rooms.filter((r) => placed[r.id])
  const ocupado = new Set(
    colocados.map((r) => {
      const [x, , z] = worldOf(cells, r.id)
      return cellKey(x, z)
    }),
  )
  const wallColliders: AABB[] = colocados.flatMap((r) =>
    collidersForRoom(worldOf(cells, r.id), ocupado),
  )
  return { ocupado, wallColliders }
}

const todos = (v: boolean) =>
  Object.fromEntries(rooms.map((r) => [r.id, v])) as Record<string, boolean>

const celdasDefault = (): Cells =>
  Object.fromEntries(rooms.map((r) => [r.id, defaultCell(r.posicion)]))

interface LayoutState {
  placed: Record<string, boolean>
  cells: Cells
  editMode: boolean
  /** Cuarto cuyos objetos se están editando (panel de recursos). */
  editingRoomId: string | null
  ocupado: Set<string>
  wallColliders: AABB[]
  /** Cuarto que se está arrastrando (modo edición). */
  draggingId: string | null
  /** Celda destino previa mientras se arrastra. */
  previewCell: Cell | null
  cargado: boolean
  cargar: () => Promise<void>
  setEditMode: (v: boolean) => void
  /** Entra a editar los objetos de un cuarto específico (con zoom). */
  editRoom: (id: string | null) => void
  toggleRoom: (id: string) => Promise<void>
  setAll: (v: boolean) => Promise<void>
  moveRoom: (id: string, cell: Cell) => Promise<void>
  startDrag: (id: string) => void
  setPreview: (cell: Cell | null) => void
  endDrag: () => Promise<void>
}

export const useLayout = create<LayoutState>((set, get) => ({
  placed: todos(true),
  cells: celdasDefault(),
  editMode: false,
  editingRoomId: null,
  ...derivar(todos(true), celdasDefault()),
  draggingId: null,
  previewCell: null,
  cargado: false,

  cargar: async () => {
    const filas = await db.layout.toArray()
    let placed: Record<string, boolean>
    const cells = celdasDefault()
    if (filas.length === 0) {
      placed = todos(true)
      await db.layout.bulkAdd(
        rooms.map((r) => {
          const c = cells[r.id]
          return { roomId: r.id, placed: true, col: c.col, row: c.row }
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
      }
    }
    set({ placed, cells, ...derivar(placed, cells), cargado: true })
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
    set({ placed, ...derivar(placed, get().cells) })
    await upsert(id, { placed: placed[id] })
  },

  setAll: async (v) => {
    const placed = todos(v)
    set({ placed, ...derivar(placed, get().cells) })
    await Promise.all(rooms.map((r) => upsert(r.id, { placed: v })))
  },

  moveRoom: async (id, cell) => {
    const cells = { ...get().cells, [id]: cell }
    set({ cells, ...derivar(get().placed, cells) })
    await upsert(id, { col: cell.col, row: cell.row })
  },

  startDrag: (id) => set({ draggingId: id, previewCell: get().cells[id] }),

  setPreview: (cell) => {
    const { draggingId, placed, cells } = get()
    if (!draggingId || !cell) {
      set(
        cell
          ? { previewCell: cell }
          : { previewCell: null, ...derivar(placed, cells) },
      )
      return
    }
    const previewCells = { ...cells, [draggingId]: cell }
    set({ previewCell: cell, ...derivar(placed, previewCells) })
  },

  endDrag: async () => {
    const { draggingId, previewCell, placed, cells } = get()
    if (draggingId && previewCell && esCeldaLibre(placed, cells, draggingId, previewCell)) {
      await get().moveRoom(draggingId, previewCell)
    }
    const { placed: p, cells: c } = get()
    set({ draggingId: null, previewCell: null, ...derivar(p, c) })
  },
}))

/** ¿La celda está libre (ningún otro cuarto colocado la ocupa)? */
export function esCeldaLibre(
  placed: Record<string, boolean>,
  cells: Cells,
  exceptId: string,
  cell: Cell,
): boolean {
  return !rooms.some(
    (r) =>
      r.id !== exceptId &&
      placed[r.id] &&
      cells[r.id]?.col === cell.col &&
      cells[r.id]?.row === cell.row,
  )
}

/** Posición del mundo de un cuarto (para navegación/cámara, fuera de React). */
export function roomWorldPos(id: string): [number, number, number] {
  return worldOf(useLayout.getState().cells, id)
}

async function upsert(roomId: string, patch: Partial<{ placed: boolean; col: number; row: number }>) {
  const fila = await db.layout.where('roomId').equals(roomId).first()
  if (fila?.id) await db.layout.update(fila.id, patch)
  else await db.layout.add({ roomId, placed: true, ...patch })
}

if (import.meta.env.DEV) {
  ;(window as unknown as { useLayout: typeof useLayout }).useLayout = useLayout
}

useLayout.getState().cargar()

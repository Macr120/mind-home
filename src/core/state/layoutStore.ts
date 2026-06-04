import { create } from 'zustand'
import { db } from '../data/db'
import { rooms } from '../registry'
import { cellKey, collidersForRoom, type AABB } from '../house/walls'

/**
 * Layout editable del mapa: qué cuartos están colocados. Es data-driven (no fijo
 * en código) para poder agregar/quitar cuartos en modo edición y, más adelante,
 * moverlos/redimensionarlos. Las colisiones se recalculan al cambiar.
 */

/** Deriva el conjunto de ocupación y los colliders a partir de los colocados. */
function derivar(placed: Record<string, boolean>) {
  const colocados = rooms.filter((r) => placed[r.id])
  const ocupado = new Set(
    colocados.map((r) => cellKey(r.posicion[0], r.posicion[2])),
  )
  const wallColliders: AABB[] = colocados.flatMap((r) =>
    collidersForRoom(r.posicion, ocupado),
  )
  return { ocupado, wallColliders }
}

const todos = (v: boolean) =>
  Object.fromEntries(rooms.map((r) => [r.id, v])) as Record<string, boolean>

interface LayoutState {
  /** placed[roomId] = está en el mapa 3D */
  placed: Record<string, boolean>
  editMode: boolean
  /** claves "x,z" de cuartos colocados (para las puertas) */
  ocupado: Set<string>
  /** colliders de pared actuales (los lee Character) */
  wallColliders: AABB[]
  cargado: boolean
  cargar: () => Promise<void>
  setEditMode: (v: boolean) => void
  toggleRoom: (id: string) => Promise<void>
  setAll: (v: boolean) => Promise<void>
}

export const useLayout = create<LayoutState>((set, get) => ({
  placed: todos(true),
  editMode: false,
  ...derivar(todos(true)),
  cargado: false,

  cargar: async () => {
    const filas = await db.layout.toArray()
    let placed: Record<string, boolean>
    if (filas.length === 0) {
      placed = todos(true)
      await db.layout.bulkAdd(rooms.map((r) => ({ roomId: r.id, placed: true })))
    } else {
      placed = Object.fromEntries(
        rooms.map((r) => [
          r.id,
          filas.find((f) => f.roomId === r.id)?.placed ?? true,
        ]),
      )
    }
    set({ placed, ...derivar(placed), cargado: true })
  },

  setEditMode: (v) => set({ editMode: v }),

  toggleRoom: async (id) => {
    const placed = { ...get().placed, [id]: !get().placed[id] }
    set({ placed, ...derivar(placed) })
    const fila = await db.layout.where('roomId').equals(id).first()
    if (fila?.id) await db.layout.update(fila.id, { placed: placed[id] })
    else await db.layout.add({ roomId: id, placed: placed[id] })
  },

  setAll: async (v) => {
    const placed = todos(v)
    set({ placed, ...derivar(placed) })
    const filas = await db.layout.toArray()
    await Promise.all(
      rooms.map(async (r) => {
        const f = filas.find((x) => x.roomId === r.id)
        if (f?.id) await db.layout.update(f.id, { placed: v })
        else await db.layout.add({ roomId: r.id, placed: v })
      }),
    )
  },
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useLayout: typeof useLayout }).useLayout = useLayout
}

useLayout.getState().cargar()

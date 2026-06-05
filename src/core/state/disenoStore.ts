import { create } from 'zustand'
import { db, type ObjetoCuarto } from '../data/db'
import { rooms } from '../registry'

/**
 * Colores del avatar por defecto (estilo Roblox).
 * Se sobreescriben con los datos guardados en DB.
 */
export const AVATAR_DEFAULT = {
  cabeza: '#ffd23b',
  torso: '#e23b3b',
  piernas: '#2f5fd0',
}

/**
 * Estado de diseño visual: colores de cuartos y avatar.
 * Lo leen Room3D y Character para pintar la escena 3D en tiempo real.
 * Se carga desde DB al iniciar y se persiste al cambiar.
 */
interface DisenoState {
  /** color por roomId, vacío = usar el default del módulo */
  roomColors: Record<string, string>
  /** nombres personalizados por roomId, vacío = usar el nombre del módulo */
  roomNames: Record<string, string>
  /** color del mueble principal por roomId, vacío = default */
  furnitureColors: Record<string, string>
  /** objetos de decoración colocados (todos los cuartos) */
  objetos: ObjetoCuarto[]
  /** objeto que se está arrastrando dentro de un cuarto (modo edición) */
  draggingObjeto: number | null
  avatar: { cabeza: string; torso: string; piernas: string }
  cargado: boolean
  cargar: () => Promise<void>
  setRoomColor: (roomId: string, color: string) => Promise<void>
  setRoomName: (roomId: string, nombre: string) => Promise<void>
  setFurnitureColor: (roomId: string, color: string) => Promise<void>
  addObjeto: (roomId: string, tipo: string, color: string) => Promise<void>
  setObjetoColor: (id: number, color: string) => Promise<void>
  /** Mueve un objeto a (x,z) relativo al centro del cuarto (solo estado). */
  setObjetoPos: (id: number, x: number, z: number) => void
  startObjetoDrag: (id: number) => void
  endObjetoDrag: () => Promise<void>
  removeObjeto: (id: number) => Promise<void>
  setAvatarColor: (
    parte: 'cabeza' | 'torso' | 'piernas',
    color: string,
  ) => Promise<void>
  resetRoom: (roomId: string) => Promise<void>
  resetAvatar: () => Promise<void>
}

/** Posición por defecto (local) de un objeto nuevo, según cuántos haya. */
function posDefault(n: number): { x: number; z: number } {
  return { x: ((n % 3) - 1) * 1.6, z: 1.4 - Math.floor(n / 3) * 1.6 }
}
export const MAX_OBJETOS = 8

export const useDiseño = create<DisenoState>((set, get) => ({
  roomColors: {},
  roomNames: {},
  furnitureColors: {},
  objetos: [],
  draggingObjeto: null,
  avatar: { ...AVATAR_DEFAULT },
  cargado: false,

  cargar: async () => {
    const [disenoRooms, disenoAvatars, objetos] = await Promise.all([
      db.disenoRooms.toArray(),
      db.disenoAvatar.toArray(),
      db.objetosCuarto.toArray(),
    ])
    const roomColors: Record<string, string> = {}
    const roomNames: Record<string, string> = {}
    const furnitureColors: Record<string, string> = {}
    for (const d of disenoRooms) {
      if (d.color) roomColors[d.roomId] = d.color
      if (d.nombre) roomNames[d.roomId] = d.nombre
      if (d.muebleColor) furnitureColors[d.roomId] = d.muebleColor
    }
    const av = disenoAvatars[0]
    set({
      roomColors,
      roomNames,
      furnitureColors,
      objetos,
      avatar: av
        ? { cabeza: av.cabeza, torso: av.torso, piernas: av.piernas }
        : { ...AVATAR_DEFAULT },
      cargado: true,
    })
  },

  setRoomColor: async (roomId, color) => {
    set((s) => ({ roomColors: { ...s.roomColors, [roomId]: color } }))
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { color })
    else await db.disenoRooms.add({ roomId, color, nombre: '' })
  },

  setRoomName: async (roomId, nombre) => {
    set((s) => ({ roomNames: { ...s.roomNames, [roomId]: nombre } }))
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { nombre })
    else {
      const defaultColor = rooms.find((r) => r.id === roomId)?.color ?? '#94a3b8'
      await db.disenoRooms.add({ roomId, color: defaultColor, nombre })
    }
  },

  setFurnitureColor: async (roomId, color) => {
    set((s) => ({ furnitureColors: { ...s.furnitureColors, [roomId]: color } }))
    const existing = await db.disenoRooms.where('roomId').equals(roomId).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { muebleColor: color })
    else {
      const base = rooms.find((r) => r.id === roomId)?.color ?? '#94a3b8'
      await db.disenoRooms.add({ roomId, color: base, nombre: '', muebleColor: color })
    }
  },

  addObjeto: async (roomId, tipo, color) => {
    const n = get().objetos.filter((o) => o.roomId === roomId).length
    if (n >= MAX_OBJETOS) return
    const { x, z } = posDefault(n)
    const item = { roomId, tipo, color, slot: 0, x, z }
    const id = await db.objetosCuarto.add(item)
    set((s) => ({ objetos: [...s.objetos, { id, ...item }] }))
  },

  setObjetoColor: async (id, color) => {
    set((s) => ({
      objetos: s.objetos.map((o) => (o.id === id ? { ...o, color } : o)),
    }))
    await db.objetosCuarto.update(id, { color })
  },

  setObjetoPos: (id, x, z) =>
    set((s) => ({
      objetos: s.objetos.map((o) => (o.id === id ? { ...o, x, z } : o)),
    })),

  startObjetoDrag: (id) => set({ draggingObjeto: id }),

  endObjetoDrag: async () => {
    const id = get().draggingObjeto
    set({ draggingObjeto: null })
    if (id == null) return
    const o = get().objetos.find((x) => x.id === id)
    if (o) await db.objetosCuarto.update(id, { x: o.x, z: o.z })
  },

  removeObjeto: async (id) => {
    set((s) => ({ objetos: s.objetos.filter((o) => o.id !== id) }))
    await db.objetosCuarto.delete(id)
  },

  setAvatarColor: async (parte, color) => {
    set((s) => ({ avatar: { ...s.avatar, [parte]: color } }))
    const { avatar } = get()
    const existing = await db.disenoAvatar.toArray()
    if (existing[0]?.id)
      await db.disenoAvatar.update(existing[0].id, { [parte]: color })
    else await db.disenoAvatar.add({ ...avatar, [parte]: color })
  },

  resetRoom: async (roomId) => {
    set((s) => {
      const rc = { ...s.roomColors }
      const rn = { ...s.roomNames }
      const fc = { ...s.furnitureColors }
      delete rc[roomId]
      delete rn[roomId]
      delete fc[roomId]
      return {
        roomColors: rc,
        roomNames: rn,
        furnitureColors: fc,
        objetos: s.objetos.filter((o) => o.roomId !== roomId),
      }
    })
    await db.disenoRooms.where('roomId').equals(roomId).delete()
    await db.objetosCuarto.where('roomId').equals(roomId).delete()
  },

  resetAvatar: async () => {
    set({ avatar: { ...AVATAR_DEFAULT } })
    await db.disenoAvatar.clear()
  },
}))

/**
 * Color y nombre EFECTIVOS de un cuarto = personalización del usuario si existe,
 * si no, los del registro. Fuente única para casa 3D, menú lateral y cabeceras.
 */
export function useRoomVisual(id: string, colorBase: string, nombreBase: string) {
  const color = useDiseño((s) => s.roomColors[id] ?? colorBase)
  const nombre = useDiseño((s) => s.roomNames[id] || nombreBase)
  return { color, nombre }
}

if (import.meta.env.DEV) {
  ;(window as unknown as { useDiseño: typeof useDiseño }).useDiseño = useDiseño
}

/** Carga el diseño una vez al arrancar la app. */
useDiseño.getState().cargar()

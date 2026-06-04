import { create } from 'zustand'
import { db } from '../data/db'
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
  avatar: { cabeza: string; torso: string; piernas: string }
  cargado: boolean
  cargar: () => Promise<void>
  setRoomColor: (roomId: string, color: string) => Promise<void>
  setRoomName: (roomId: string, nombre: string) => Promise<void>
  setAvatarColor: (
    parte: 'cabeza' | 'torso' | 'piernas',
    color: string,
  ) => Promise<void>
  resetRoom: (roomId: string) => Promise<void>
  resetAvatar: () => Promise<void>
}

export const useDiseño = create<DisenoState>((set, get) => ({
  roomColors: {},
  roomNames: {},
  avatar: { ...AVATAR_DEFAULT },
  cargado: false,

  cargar: async () => {
    const [disenoRooms, disenoAvatars] = await Promise.all([
      db.disenoRooms.toArray(),
      db.disenoAvatar.toArray(),
    ])
    const roomColors: Record<string, string> = {}
    const roomNames: Record<string, string> = {}
    for (const d of disenoRooms) {
      if (d.color) roomColors[d.roomId] = d.color
      if (d.nombre) roomNames[d.roomId] = d.nombre
    }
    const av = disenoAvatars[0]
    set({
      roomColors,
      roomNames,
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
      delete rc[roomId]
      delete rn[roomId]
      return { roomColors: rc, roomNames: rn }
    })
    await db.disenoRooms.where('roomId').equals(roomId).delete()
  },

  resetAvatar: async () => {
    set({ avatar: { ...AVATAR_DEFAULT } })
    await db.disenoAvatar.clear()
  },
}))

/** Carga el diseño una vez al arrancar la app. */
useDiseño.getState().cargar()

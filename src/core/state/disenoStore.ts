import { create } from 'zustand'
import { db, type ObjetoCuarto } from '../data/db'
import {
  MUEBLE_TIPO,
  MUEBLES_DEFAULT,
  esMueblePrincipal,
} from '../house/muebles'
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
  /** objetos colocados (muebles permanentes + decoración) */
  objetos: ObjetoCuarto[]
  /** objeto que se está arrastrando dentro de un cuarto (modo edición) */
  draggingObjeto: number | null
  avatar: { cabeza: string; torso: string; piernas: string }
  cargado: boolean
  cargar: () => Promise<void>
  setRoomColor: (roomId: string, color: string) => Promise<void>
  setRoomName: (roomId: string, nombre: string) => Promise<void>
  addObjeto: (roomId: string, tipo: string, color: string) => Promise<void>
  setObjetoColor: (id: number, color: string) => Promise<void>
  setObjetoRotacion: (id: number, rotY: number) => Promise<void>
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

/** Crea o actualiza el mueble permanente de cada cuarto en la BD. */
async function asegurarMuebles(
  objetos: ObjetoCuarto[],
  muebleColors: Record<string, string>,
): Promise<ObjetoCuarto[]> {
  const lista = [...objetos]
  for (const room of rooms) {
    const tipo = MUEBLE_TIPO(room.id)
    const def = MUEBLES_DEFAULT[room.id] ?? {
      x: 0,
      z: -1.2,
      color: '#7a5230',
      nombre: 'Mueble',
      icon: room.icon,
    }
    const color = muebleColors[room.id] ?? def.color
    let o = lista.find((x) => x.roomId === room.id && x.tipo === tipo)

    if (!o) {
      const item = {
        roomId: room.id,
        tipo,
        color,
        slot: 0,
        x: def.x,
        z: def.z,
        rotY: 0,
        permanente: true,
      }
      const id = await db.objetosCuarto.add(item)
      lista.push({ id, ...item })
      continue
    }

    const patch: Partial<ObjetoCuarto> = { permanente: true }
    if (o.x == null) patch.x = def.x
    if (o.z == null) patch.z = def.z
    if (o.rotY == null) patch.rotY = 0
    if (muebleColors[room.id] && o.color !== color) patch.color = color
    if (o.id != null && Object.keys(patch).length > 0) {
      await db.objetosCuarto.update(o.id, patch)
      o = { ...o, ...patch }
      const i = lista.findIndex((x) => x.id === o!.id)
      if (i >= 0) lista[i] = o
    }
  }
  return lista
}

export function objetosDecorativos(objetos: ObjetoCuarto[], roomId: string) {
  return objetos.filter((o) => o.roomId === roomId && !esMueblePrincipal(o))
}

export function muebleDeCuarto(objetos: ObjetoCuarto[], roomId: string) {
  return objetos.find(
    (o) => o.roomId === roomId && esMueblePrincipal(o),
  )
}

export const useDiseño = create<DisenoState>((set, get) => ({
  roomColors: {},
  roomNames: {},
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
    const muebleColors: Record<string, string> = {}
    for (const d of disenoRooms) {
      if (d.color) roomColors[d.roomId] = d.color
      if (d.nombre) roomNames[d.roomId] = d.nombre
      if (d.muebleColor) muebleColors[d.roomId] = d.muebleColor
    }
    const objetosConMuebles = await asegurarMuebles(objetos, muebleColors)
    const av = disenoAvatars[0]
    set({
      roomColors,
      roomNames,
      objetos: objetosConMuebles,
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

  addObjeto: async (roomId, tipo, color) => {
    const n = objetosDecorativos(get().objetos, roomId).length
    if (n >= MAX_OBJETOS) return
    const { x, z } = posDefault(n)
    const item = { roomId, tipo, color, slot: 0, x, z, rotY: 0 }
    const id = await db.objetosCuarto.add(item)
    set((s) => ({ objetos: [...s.objetos, { id, ...item }] }))
  },

  setObjetoRotacion: async (id, rotY) => {
    const grados = ((rotY % 360) + 360) % 360
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, rotY: grados } : x)),
    }))
    await db.objetosCuarto.update(id, { rotY: grados })
  },

  setObjetoColor: async (id, color) => {
    const o = get().objetos.find((x) => x.id === id)
    set((s) => ({
      objetos: s.objetos.map((x) => (x.id === id ? { ...x, color } : x)),
    }))
    await db.objetosCuarto.update(id, { color })
    if (o && esMueblePrincipal(o)) {
      const existing = await db.disenoRooms.where('roomId').equals(o.roomId).first()
      if (existing?.id) await db.disenoRooms.update(existing.id, { muebleColor: color })
      else {
        const base = rooms.find((r) => r.id === o.roomId)?.color ?? '#94a3b8'
        await db.disenoRooms.add({
          roomId: o.roomId,
          color: base,
          nombre: '',
          muebleColor: color,
        })
      }
    }
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
    if (o) await db.objetosCuarto.update(id, { x: o.x, z: o.z, rotY: o.rotY ?? 0 })
  },

  removeObjeto: async (id) => {
    const o = get().objetos.find((x) => x.id === id)
    if (!o || esMueblePrincipal(o)) return
    set((s) => ({ objetos: s.objetos.filter((x) => x.id !== id) }))
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
    const def = MUEBLES_DEFAULT[roomId]
    set((s) => {
      const rc = { ...s.roomColors }
      const rn = { ...s.roomNames }
      delete rc[roomId]
      delete rn[roomId]
      const objetos = s.objetos
        .filter((o) => o.roomId !== roomId || esMueblePrincipal(o))
        .map((o) =>
          o.roomId === roomId && esMueblePrincipal(o) && def
            ? { ...o, color: def.color, x: def.x, z: def.z, rotY: 0 }
            : o,
        )
      return { roomColors: rc, roomNames: rn, objetos }
    })
    await db.disenoRooms.where('roomId').equals(roomId).delete()
    const idsDecorativos = (
      await db.objetosCuarto.where('roomId').equals(roomId).toArray()
    )
      .filter((o) => !esMueblePrincipal(o))
      .map((o) => o.id!)
      .filter(Boolean)
    await db.objetosCuarto.bulkDelete(idsDecorativos)
    const m = muebleDeCuarto(get().objetos, roomId)
    if (m?.id != null && def) {
      await db.objetosCuarto.update(m.id, {
        color: def.color,
        x: def.x,
        z: def.z,
        rotY: 0,
      })
    }
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

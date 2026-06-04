import { create } from 'zustand'
import * as THREE from 'three'
import { getRoom } from '../registry'
import { estaEnPuerta } from '../house/navigation'
import { roomEntrance } from '../house/walls'

export { playerPos } from './playerPosition'

/**
 * Estado global de la casa: a dónde camina el personaje y qué cuarto está abierto.
 *
 * La posición VIVA del personaje está en `playerPos` (mutable, sin re-render).
 * El store guarda destino, selección y cuarto activo.
 */

interface HouseState {
  target: THREE.Vector3
  /** Incrementa al cambiar destino para forzar actualización en la escena 3D. */
  navTick: number
  /** Si el personaje ignora las paredes (al entrar desde el menú lateral). */
  freeMove: boolean
  setTarget: (x: number, z: number) => void
  /** Desde el menú: el avatar va al cuarto ignorando paredes y entra al instante. */
  enterFromMenu: (id: string) => void
  /** Cuarto elegido en el menú o con clic en la casa. */
  selectedRoomId: string | null
  /** Cuarto cuya puerta está al alcance (el más próximo gana). */
  nearRoomId: string | null
  setNearRoomId: (id: string | null) => void
  /** El cuarto seleccionado está en su puerta y se puede entrar. */
  canEnterSelected: boolean
  setCanEnterSelected: (v: boolean) => void
  activeRoom: string | null
  openRoom: (id: string) => void
  closeRoom: () => void
  goToRoom: (id: string) => void
  /** Selecciona el cuarto y camina a su puerta. */
  selectRoom: (id: string) => void
  /** Clic en casa: selecciona/ir; si ya está seleccionado y cerca, entra. */
  interactRoom: (id: string) => void
  /** Abre el cuarto si el personaje está en la puerta. */
  tryEnterRoom: (id: string) => void
}

export const useHouse = create<HouseState>((set, get) => ({
  target: new THREE.Vector3(-3, 0, 0),
  navTick: 0,
  freeMove: false,
  setTarget: (x, z) =>
    set((s) => ({
      target: new THREE.Vector3(x, 0, z),
      navTick: s.navTick + 1,
      freeMove: false,
    })),
  enterFromMenu: (id) => {
    const room = getRoom(id)
    if (!room) return
    const [x, , z] = room.posicion
    set((s) => ({
      selectedRoomId: id,
      target: new THREE.Vector3(x, 0, z),
      navTick: s.navTick + 1,
      freeMove: true,
      activeRoom: id,
    }))
  },
  selectedRoomId: null,
  nearRoomId: null,
  setNearRoomId: (id) =>
    set((s) => (s.nearRoomId === id ? s : { nearRoomId: id })),
  canEnterSelected: false,
  setCanEnterSelected: (v) =>
    set((s) => (s.canEnterSelected === v ? s : { canEnterSelected: v })),
  activeRoom: null,
  openRoom: (id) => set({ activeRoom: id }),
  closeRoom: () => set({ activeRoom: null, selectedRoomId: null }),
  goToRoom: (id) => {
    const room = getRoom(id)
    if (!room) return
    const [x, z] = roomEntrance(room.posicion)
    get().setTarget(x, z)
  },
  selectRoom: (id) => {
    const room = getRoom(id)
    if (!room) return
    const [x, z] = roomEntrance(room.posicion)
    set((s) => ({
      selectedRoomId: id,
      target: new THREE.Vector3(x, 0, z),
      navTick: s.navTick + 1,
    }))
  },
  interactRoom: (id) => {
    const room = getRoom(id)
    if (!room) return
    const { selectedRoomId } = get()
    if (selectedRoomId === id && estaEnPuerta(room.posicion)) get().openRoom(id)
    else get().selectRoom(id)
  },
  tryEnterRoom: (id: string) => {
    const room = getRoom(id)
    if (room && estaEnPuerta(room.posicion)) get().openRoom(id)
  },
}))

// Acceso a la store desde la consola en desarrollo (depuración/pruebas).
if (import.meta.env.DEV) {
  ;(window as unknown as { useHouse: typeof useHouse }).useHouse = useHouse
}

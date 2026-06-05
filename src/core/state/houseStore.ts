import { create } from 'zustand'
import * as THREE from 'three'
import { getRoom } from '../registry'
import { estaEnPuerta } from '../house/navigation'
import { roomEntrance } from '../house/walls'
import { roomWorldPos } from './layoutStore'
import { useInteractUi } from './interactUiStore'

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
  /** Clic en el cuarto 3D: solo camina a la puerta (no abre la mini-app). */
  interactRoom: (id: string) => void
  /** Abre el cuarto si el personaje está en la puerta. */
  tryEnterRoom: (id: string) => void
  /** Vista 3D con techo cerrado en cada cuarto. */
  conTecho: boolean
  toggleTecho: () => void
}

export const useHouse = create<HouseState>((set, get) => ({
  target: new THREE.Vector3(-3, 0, 0),
  navTick: 0,
  freeMove: false,
  setTarget: (x, z) =>
    set((s) => ({
      target: new THREE.Vector3(x, 0, z),
      navTick: s.navTick + 1,
      freeMove: true,
    })),
  enterFromMenu: (id) => {
    const room = getRoom(id)
    if (!room) return
    const [x, , z] = roomWorldPos(id)
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
  openRoom: (id) => {
    useInteractUi.getState().clear()
    set({ activeRoom: id, selectedRoomId: id })
  },
  closeRoom: () => {
    useInteractUi.getState().clear()
    set({ activeRoom: null, selectedRoomId: null })
  },
  goToRoom: (id) => {
    const room = getRoom(id)
    if (!room) return
    const [x, z] = roomEntrance(roomWorldPos(id))
    get().setTarget(x, z)
  },
  selectRoom: (id) => {
    const room = getRoom(id)
    if (!room) return
    const [x, z] = roomEntrance(roomWorldPos(id))
    set((s) => ({
      selectedRoomId: id,
      target: new THREE.Vector3(x, 0, z),
      navTick: s.navTick + 1,
      freeMove: false,
    }))
  },
  interactRoom: (id) => {
    if (!getRoom(id)) return
    get().selectRoom(id)
  },
  tryEnterRoom: (id: string) => {
    const room = getRoom(id)
    if (room && estaEnPuerta(roomWorldPos(id))) get().openRoom(id)
  },
  conTecho: false,
  toggleTecho: () => set((s) => ({ conTecho: !s.conTecho })),
}))

// Acceso a la store desde la consola en desarrollo (depuración/pruebas).
if (import.meta.env.DEV) {
  ;(window as unknown as { useHouse: typeof useHouse }).useHouse = useHouse
}

import { create } from 'zustand'
import * as THREE from 'three'

/**
 * Estado global de la casa: a dónde camina el personaje y qué cuarto está abierto.
 *
 * La posición VIVA del personaje se guarda en `playerPos` (un Vector3 mutable)
 * para no re-renderizar React en cada frame. El store solo guarda el destino y
 * el cuarto activo (cambian con poca frecuencia).
 */
export const playerPos = new THREE.Vector3(-3, 0, 0)

interface HouseState {
  target: THREE.Vector3
  setTarget: (x: number, z: number) => void
  activeRoom: string | null
  openRoom: (id: string) => void
  closeRoom: () => void
}

export const useHouse = create<HouseState>((set) => ({
  target: new THREE.Vector3(-3, 0, 0),
  setTarget: (x, z) => set({ target: new THREE.Vector3(x, 0, z) }),
  activeRoom: null,
  openRoom: (id) => set({ activeRoom: id }),
  closeRoom: () => set({ activeRoom: null }),
}))

// Acceso a la store desde la consola en desarrollo (depuración/pruebas).
if (import.meta.env.DEV) {
  ;(window as unknown as { useHouse: typeof useHouse }).useHouse = useHouse
}

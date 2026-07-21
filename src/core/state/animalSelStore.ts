import { create } from 'zustand'

/** Animal seleccionado con un toque (muestra su tarjeta de nombre + barras). */
interface AnimalSelState {
  animalId: number | null
  seleccionar: (id: number) => void
  limpiar: () => void
}

export const useAnimalSel = create<AnimalSelState>((set) => ({
  animalId: null,
  seleccionar: (animalId) => set({ animalId }),
  limpiar: () => set({ animalId: null }),
}))

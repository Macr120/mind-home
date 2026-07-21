import { create } from 'zustand'

/** Corral junto al que está el personaje (para la burbuja de cuidar en juego). */
interface GranjaCercaState {
  corralId: number | null
  set: (corralId: number | null) => void
}

export const useGranjaCerca = create<GranjaCercaState>((set) => ({
  corralId: null,
  set: (corralId) => set({ corralId }),
}))

import { create } from 'zustand'

/** Asistente junto al que está el personaje (para la burbuja de «Hablar»). */
interface AsistenteCercaState {
  asistenteId: string | null
  set: (asistenteId: string | null) => void
}

export const useAsistenteCerca = create<AsistenteCercaState>((set) => ({
  asistenteId: null,
  set: (asistenteId) => set({ asistenteId }),
}))

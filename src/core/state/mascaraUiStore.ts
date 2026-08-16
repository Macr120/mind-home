import { create } from 'zustand'

/**
 * Overlay de la máscara AR (marketing/mascara montada dentro de la app). Es
 * store global porque se abre desde el menú «+» del chat y el overlay vive en
 * la raíz (App.tsx), igual que el Wrapped.
 */
interface MascaraUiState {
  abierto: boolean
  abrir: () => void
  cerrar: () => void
}

export const useMascaraUi = create<MascaraUiState>((set) => ({
  abierto: false,
  abrir: () => set({ abierto: true }),
  cerrar: () => set({ abierto: false }),
}))

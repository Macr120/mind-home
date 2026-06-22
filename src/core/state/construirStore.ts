import { create } from 'zustand'

/** Controla el diálogo "¿dónde construyo este cuarto?" (planta baja o encima de otro). */
interface ConstruirState {
  roomId: string | null
  abrir: (id: string) => void
  cerrar: () => void
}

export const useConstruir = create<ConstruirState>((set) => ({
  roomId: null,
  abrir: (id) => set({ roomId: id }),
  cerrar: () => set({ roomId: null }),
}))

import { create } from 'zustand'

/**
 * Controla el diálogo «Enlace web» (`EnlaceObjetoDialog`): asignar, cambiar o
 * quitar el enlace de un objeto del mapa. Lo abre el menú de pulsación larga.
 */
interface EnlaceObjetoState {
  objetoId: number | null
  abrir: (objetoId: number) => void
  cerrar: () => void
}

export const useEnlaceObjeto = create<EnlaceObjetoState>((set) => ({
  objetoId: null,
  abrir: (objetoId) => set({ objetoId }),
  cerrar: () => set({ objetoId: null }),
}))

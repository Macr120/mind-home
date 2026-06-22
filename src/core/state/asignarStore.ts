import { create } from 'zustand'

/**
 * Controla el diálogo "Asignar app": elegir una plantilla del catálogo para un cuarto.
 * - `objetoId` definido: la plantilla se asigna a ESE objeto existente.
 * - `objetoId` null: se crea un objeto-app nuevo en el cuarto con la plantilla.
 */
interface AsignarState {
  cuartoId: string | null
  objetoId: number | null
  abrir: (cuartoId: string, objetoId?: number | null) => void
  cerrar: () => void
}

export const useAsignar = create<AsignarState>((set) => ({
  cuartoId: null,
  objetoId: null,
  abrir: (cuartoId, objetoId = null) => set({ cuartoId, objetoId }),
  cerrar: () => set({ cuartoId: null, objetoId: null }),
}))

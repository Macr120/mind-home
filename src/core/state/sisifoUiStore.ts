import { create } from 'zustand'

/**
 * Estado del overlay de la Montaña de Sísifo. Store global porque se abre desde
 * el card del personaje (botón y mini-montaña), no solo desde un componente.
 * El badge y el "marcar visto" viven en core/gamificacion/sisifo.ts (dependen
 * de la actividad real), aquí solo va la apertura/cierre.
 */
interface SisifoUiState {
  abierto: boolean
  abrir: () => void
  cerrar: () => void
}

export const useSisifoUi = create<SisifoUiState>((set) => ({
  abierto: false,
  abrir: () => set({ abierto: true }),
  cerrar: () => set({ abierto: false }),
}))

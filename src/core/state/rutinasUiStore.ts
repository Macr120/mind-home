import { create } from 'zustand'

/**
 * UI de rutinas: el botón ⏰ del RelojWidget abre el panel rápido (checklist)
 * y la hora/fecha del widget abre el calendario (día/semana/mes). Vive en un
 * store porque el widget y los paneles están en árboles distintos.
 */
interface RutinasUIState {
  panel: boolean
  calendario: boolean
  togglePanel: () => void
  abrirCalendario: () => void
  cerrarCalendario: () => void
  cerrarPanel: () => void
}

export const useRutinasUI = create<RutinasUIState>((set) => ({
  panel: false,
  calendario: false,
  togglePanel: () => set((s) => ({ panel: !s.panel, calendario: false })),
  abrirCalendario: () => set({ calendario: true, panel: false }),
  cerrarCalendario: () => set({ calendario: false }),
  cerrarPanel: () => set({ panel: false }),
}))

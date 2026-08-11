import { create } from 'zustand'

/**
 * UI de rutinas: el botón ⏰ del RelojWidget abre el panel rápido (checklist)
 * y la hora/fecha del widget abre el calendario (día/semana/mes). Vive en un
 * store porque el widget y los paneles están en árboles distintos.
 */

/** Las vistas del calendario ('cronograma' es la sección de Metas). */
export type VistaCalendario = 'dia' | 'semana' | 'mes' | 'anio' | 'cronograma'

interface RutinasUIState {
  panel: boolean
  calendario: boolean
  /**
   * Con qué vista abrirlo. La piden el chat («abre el cronograma») y los
   * tutoriales; sin ella el calendario abre donde siempre (Semana).
   */
  vistaCalendario?: VistaCalendario
  togglePanel: () => void
  abrirPanel: () => void
  abrirCalendario: (vista?: VistaCalendario) => void
  cerrarCalendario: () => void
  cerrarPanel: () => void
}

export const useRutinasUI = create<RutinasUIState>((set) => ({
  panel: false,
  calendario: false,
  togglePanel: () => set((s) => ({ panel: !s.panel, calendario: false })),
  abrirPanel: () => set({ panel: true, calendario: false }),
  abrirCalendario: (vista) => set({ calendario: true, panel: false, vistaCalendario: vista }),
  cerrarCalendario: () => set({ calendario: false, vistaCalendario: undefined }),
  cerrarPanel: () => set({ panel: false }),
}))

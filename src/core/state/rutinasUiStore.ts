import { create } from 'zustand'

/**
 * UI del calendario del reloj: la hora/fecha del RelojWidget lo abre a pantalla
 * completa (día/semana/mes/año y Misiones). Vive en un store porque el widget y
 * el panel están en árboles distintos. El panel rápido ⏰ que también vivía aquí
 * se retiró: crear rutinas es parte de Misiones (vista 'objetivos').
 */

/** Las vistas del calendario ('objetivos' es la checklist de hoy de toda la casa). */
export type VistaCalendario = 'dia' | 'semana' | 'mes' | 'anio' | 'objetivos'

interface RutinasUIState {
  calendario: boolean
  /**
   * Con qué vista abrirlo. La piden el chat («abre el cronograma») y los
   * tutoriales; sin ella el calendario abre donde siempre (Semana).
   */
  vistaCalendario?: VistaCalendario
  abrirCalendario: (vista?: VistaCalendario) => void
  cerrarCalendario: () => void
}

export const useRutinasUI = create<RutinasUIState>((set) => ({
  calendario: false,
  abrirCalendario: (vista) => set({ calendario: true, vistaCalendario: vista }),
  cerrarCalendario: () => set({ calendario: false, vistaCalendario: undefined }),
}))

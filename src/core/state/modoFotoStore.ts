import { create } from 'zustand'

/** Calidad de la foto trazada: resolución interna y muestras por píxel. */
export type CalidadFoto = 'rapida' | 'alta'

export const MUESTRAS_FOTO: Record<CalidadFoto, number> = { rapida: 96, alta: 384 }

/**
 * Modo foto con trazado de rayos (Configuraciones › Realismo). Mientras está
 * activo, el trazador toma el lienzo de la casa, congela la escena tal como
 * estaba y va sumando muestras; al terminar deja la imagen lista para bajar.
 */
interface ModoFotoState {
  activo: boolean
  calidad: CalidadFoto
  /** 'preparando' mientras se arma la escena del trazador (puede tardar un poco). */
  fase: 'preparando' | 'trazando' | 'lista' | 'error'
  muestras: number
  /** PNG de la foto terminada (data URL). */
  foto: string | null
  /** Pide terminar ya con las muestras que haya. */
  terminarYa: boolean
  abrir: () => void
  cerrar: () => void
  setCalidad: (c: CalidadFoto) => void
}

export const useModoFoto = create<ModoFotoState>((set) => ({
  activo: false,
  calidad: 'rapida',
  fase: 'preparando',
  muestras: 0,
  foto: null,
  terminarYa: false,
  abrir: () => set({ activo: true, fase: 'preparando', muestras: 0, foto: null, terminarYa: false }),
  cerrar: () => set({ activo: false, foto: null }),
  // Cambiar de calidad vuelve a empezar la foto.
  setCalidad: (calidad) => set({ calidad, fase: 'preparando', muestras: 0, foto: null, terminarYa: false }),
}))

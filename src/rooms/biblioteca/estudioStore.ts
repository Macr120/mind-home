import { useEffect } from 'react'
import { create } from 'zustand'
import { claveLS } from '../../core/edicion'
import { sesionesEstudioRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'

/** Sesión de estudio en curso: vive por timestamp, no por ticks acumulados. */
export interface SesionActiva {
  pilarId: string
  entradaId?: number
  duracionMin: number
  inicioMs: number
}

interface EstudioState {
  activa: SesionActiva | null
  iniciar: (s: Omit<SesionActiva, 'inicioMs'>) => void
  /** Cancela: acredita los minutos completos transcurridos si hay al menos 1. */
  cancelar: () => Promise<void>
  /** Completa (tiempo cumplido): guarda la duración completa. */
  completar: () => Promise<void>
}

// Persistida en localStorage para sobrevivir cerrar el cuarto y recargar la página.
const LS_ESTUDIO = claveLS('mh.estudioBiblio')

function leerSesionGuardada(): SesionActiva | null {
  try {
    const raw = localStorage.getItem(LS_ESTUDIO)
    if (!raw) return null
    const s = JSON.parse(raw) as SesionActiva
    if (typeof s.inicioMs !== 'number' || typeof s.duracionMin !== 'number' || !s.pilarId) return null
    return s
  } catch {
    return null
  }
}

export const useEstudio = create<EstudioState>((set, get) => ({
  activa: leerSesionGuardada(),
  iniciar: (s) => {
    const activa = { ...s, inicioMs: Date.now() }
    localStorage.setItem(LS_ESTUDIO, JSON.stringify(activa))
    set({ activa })
  },
  cancelar: async () => {
    const s = get().activa
    localStorage.removeItem(LS_ESTUDIO)
    set({ activa: null })
    if (!s) return
    const minutos = Math.min(s.duracionMin, Math.floor((Date.now() - s.inicioMs) / 60000))
    if (minutos >= 1) {
      await sesionesEstudioRepo.add({ pilarId: s.pilarId, entradaId: s.entradaId, minutos, fecha: fechaLocalISO() })
    }
  },
  completar: async () => {
    const s = get().activa
    localStorage.removeItem(LS_ESTUDIO)
    set({ activa: null })
    if (!s) return
    // Fecha del día en que TERMINÓ la sesión (no la de la rehidratación).
    const fecha = fechaLocalISO(new Date(s.inicioMs + s.duracionMin * 60000))
    await sesionesEstudioRepo.add({ pilarId: s.pilarId, entradaId: s.entradaId, minutos: s.duracionMin, fecha })
  },
}))

/** Milisegundos restantes de una sesión (negativo si ya venció). */
export function restanteMs(s: SesionActiva): number {
  return s.inicioMs + s.duracionMin * 60000 - Date.now()
}

/**
 * Guarda sola la sesión que venció con el cuarto cerrado (o mientras el
 * usuario está en otra pestaña de la app). Se monta una vez en BibliotecaApp.
 */
export function useAutoCierreEstudio() {
  const completar = useEstudio((s) => s.completar)
  useEffect(() => {
    const revisar = () => {
      const s = useEstudio.getState().activa
      if (s && restanteMs(s) <= 0) void completar()
    }
    revisar()
    const id = setInterval(revisar, 30_000)
    return () => clearInterval(id)
  }, [completar])
}

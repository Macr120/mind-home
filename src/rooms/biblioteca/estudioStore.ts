import { useEffect } from 'react'
import { create } from 'zustand'
import { claveLS } from '../../core/edicion'
import { sesionesEstudioRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'

/** Fase del ciclo pomodoro. Sin ciclo, una sesión es siempre 'trabajo'. */
export type FasePomodoro = 'trabajo' | 'corto' | 'largo'

/** Receta de un pomodoro: cuánto se trabaja, cuánto se descansa y cuántas tandas. */
export interface CicloPomodoro {
  trabajoMin: number
  cortoMin: number
  largoMin: number
  /** Cada cuántos tramos de trabajo toca el descanso largo. */
  cadaN: number
  /** Tramos de trabajo objetivo (0 = sin fin: para cuando tú quieras). */
  tandas: number
}

/**
 * Sesión de estudio en curso: vive por timestamp, no por ticks acumulados.
 *
 * Todo lo del pomodoro es OPCIONAL para que una sesión guardada por una versión
 * anterior se lea tal cual y siga comportándose como la sesión simple de antes.
 */
export interface SesionActiva {
  pilarId: string
  entradaId?: number
  /** Minutos de la FASE en curso (antes era la sesión entera). */
  duracionMin: number
  inicioMs: number
  ciclo?: CicloPomodoro
  /** Ausente = 'trabajo'. */
  fase?: FasePomodoro
  /** Tramos de trabajo ya cerrados en esta tanda. */
  completados?: number
  /** Milisegundos restantes congelados; ausente = corriendo. */
  pausadaMs?: number
}

/** Qué pasó al vencer una fase, para que la UI toque campana y repinte. */
export interface CambioFase {
  cerro: FasePomodoro
  /** Fase que arranca, o null si la sesión terminó. */
  siguiente: FasePomodoro | null
  /** Minutos acreditados (0 en los descansos). */
  minutos: number
}

interface EstudioState {
  activa: SesionActiva | null
  iniciar: (s: Omit<SesionActiva, 'inicioMs'>) => void
  /** Cancela: acredita los minutos completos transcurridos si hay al menos 1. */
  cancelar: () => Promise<void>
  /** Completa (tiempo cumplido): guarda la duración completa. */
  completar: () => Promise<void>
  /** Congela el tiempo restante sin perder la sesión. */
  pausar: () => void
  reanudar: () => void
  /** Se salta el descanso en curso y arranca el siguiente tramo de trabajo. */
  saltarDescanso: () => void
  /**
   * Cierra la fase si ya venció y arranca la siguiente. ATÓMICO: lo llaman el
   * tick de la pestaña y el poll de auto-cierre, y sin esto los dos podrían
   * acreditar el mismo tramo dos veces.
   */
  avanzarSiVencio: () => Promise<CambioFase | null>
}

// Persistida en localStorage para sobrevivir cerrar el cuarto y recargar la página.
const LS_ESTUDIO = claveLS('mh.estudioBiblio')

function leerSesionGuardada(): SesionActiva | null {
  try {
    const raw = localStorage.getItem(LS_ESTUDIO)
    if (!raw) return null
    const s = JSON.parse(raw) as SesionActiva
    if (typeof s.inicioMs !== 'number' || typeof s.duracionMin !== 'number' || !s.pilarId) return null
    // Un ciclo malformado se descarta SOLO él: invalidar la sesión entera le
    // costaría al usuario los minutos que ya lleva estudiados.
    if (s.ciclo && typeof s.ciclo.trabajoMin !== 'number') delete s.ciclo
    return s
  } catch {
    return null
  }
}

function guardar(s: SesionActiva | null) {
  if (s) localStorage.setItem(LS_ESTUDIO, JSON.stringify(s))
  else localStorage.removeItem(LS_ESTUDIO)
}

/** Minutos que dura una fase según el ciclo. */
function minutosDeFase(ciclo: CicloPomodoro, fase: FasePomodoro): number {
  if (fase === 'trabajo') return ciclo.trabajoMin
  return fase === 'largo' ? ciclo.largoMin : ciclo.cortoMin
}

export const useEstudio = create<EstudioState>((set, get) => ({
  activa: leerSesionGuardada(),
  iniciar: (s) => {
    const activa = { ...s, inicioMs: Date.now() }
    guardar(activa)
    set({ activa })
  },
  cancelar: async () => {
    const s = get().activa
    guardar(null)
    set({ activa: null })
    if (!s) return
    // En un descanso no hay nada que acreditar: descansar no es estudiar.
    if (s.fase && s.fase !== 'trabajo') return
    const corridoMs = s.pausadaMs != null ? s.duracionMin * 60000 - s.pausadaMs : Date.now() - s.inicioMs
    const minutos = Math.min(s.duracionMin, Math.floor(corridoMs / 60000))
    if (minutos >= 1) {
      await sesionesEstudioRepo.add({ pilarId: s.pilarId, entradaId: s.entradaId, minutos, fecha: fechaLocalISO() })
    }
  },
  completar: async () => {
    const s = get().activa
    guardar(null)
    set({ activa: null })
    if (!s) return
    if (s.fase && s.fase !== 'trabajo') return
    // Fecha del día en que TERMINÓ la sesión (no la de la rehidratación).
    const fecha = fechaLocalISO(new Date(s.inicioMs + s.duracionMin * 60000))
    await sesionesEstudioRepo.add({ pilarId: s.pilarId, entradaId: s.entradaId, minutos: s.duracionMin, fecha })
  },
  pausar: () => {
    const s = get().activa
    if (!s || s.pausadaMs != null) return
    const activa = { ...s, pausadaMs: Math.max(0, restanteMs(s)) }
    guardar(activa)
    set({ activa })
  },
  reanudar: () => {
    const s = get().activa
    if (!s || s.pausadaMs == null) return
    // El reloj sigue siendo un deadline: se recalcula el inicio para que queden
    // exactamente los milisegundos que estaban congelados.
    const activa = { ...s, inicioMs: Date.now() - (s.duracionMin * 60000 - s.pausadaMs), pausadaMs: undefined }
    guardar(activa)
    set({ activa })
  },
  saltarDescanso: () => {
    const s = get().activa
    if (!s?.ciclo || !s.fase || s.fase === 'trabajo') return
    const activa: SesionActiva = {
      ...s,
      fase: 'trabajo',
      duracionMin: s.ciclo.trabajoMin,
      inicioMs: Date.now(),
      pausadaMs: undefined,
    }
    guardar(activa)
    set({ activa })
  },
  avanzarSiVencio: async () => {
    const s = get().activa
    if (!s || s.pausadaMs != null || restanteMs(s) > 0) return null

    const fase = s.fase ?? 'trabajo'
    const finMs = s.inicioMs + s.duracionMin * 60000

    // Sin ciclo es la sesión simple de siempre: se cierra y punto.
    if (!s.ciclo) {
      guardar(null)
      set({ activa: null })
      if (fase !== 'trabajo') return { cerro: fase, siguiente: null, minutos: 0 }
      await sesionesEstudioRepo.add({
        pilarId: s.pilarId,
        entradaId: s.entradaId,
        minutos: s.duracionMin,
        fecha: fechaLocalISO(new Date(finMs)),
      })
      return { cerro: 'trabajo', siguiente: null, minutos: s.duracionMin }
    }

    const completados = (s.completados ?? 0) + (fase === 'trabajo' ? 1 : 0)
    if (fase === 'trabajo') {
      await sesionesEstudioRepo.add({
        pilarId: s.pilarId,
        entradaId: s.entradaId,
        minutos: s.duracionMin,
        fecha: fechaLocalISO(new Date(finMs)),
      })
    }

    // Tanda cumplida: se cierra la sesión entera.
    if (fase === 'trabajo' && s.ciclo.tandas > 0 && completados >= s.ciclo.tandas) {
      guardar(null)
      set({ activa: null })
      return { cerro: 'trabajo', siguiente: null, minutos: s.duracionMin }
    }

    const siguiente: FasePomodoro =
      fase === 'trabajo' ? (completados % s.ciclo.cadaN === 0 ? 'largo' : 'corto') : 'trabajo'
    const duracionMin = minutosDeFase(s.ciclo, siguiente)

    // Si la fase venció hace mucho (el cuarto estuvo cerrado toda la noche) la
    // siguiente arranca PAUSADA en vez de correr sola: acreditar pomodoros que
    // nadie hizo mentiría en el heatmap.
    const tarde = Date.now() - finMs > duracionMin * 60000
    const activa: SesionActiva = {
      ...s,
      fase: siguiente,
      completados,
      duracionMin,
      inicioMs: tarde ? Date.now() : finMs,
      pausadaMs: tarde ? duracionMin * 60000 : undefined,
    }
    guardar(activa)
    set({ activa })
    return { cerro: fase, siguiente, minutos: fase === 'trabajo' ? s.duracionMin : 0 }
  },
}))

/** Milisegundos restantes de una sesión (negativo si ya venció). */
export function restanteMs(s: SesionActiva): number {
  return s.pausadaMs ?? s.inicioMs + s.duracionMin * 60000 - Date.now()
}

/**
 * Guarda sola la sesión que venció con el cuarto cerrado (o mientras el
 * usuario está en otra pestaña de la app). Se monta una vez en BibliotecaApp.
 */
export function useAutoCierreEstudio() {
  const avanzar = useEstudio((s) => s.avanzarSiVencio)
  useEffect(() => {
    const revisar = () => {
      void avanzar()
    }
    revisar()
    const id = setInterval(revisar, 30_000)
    return () => clearInterval(id)
  }, [avanzar])
}

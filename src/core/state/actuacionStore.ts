import { create } from 'zustand'
import type { EmoteId } from '../house/emotes'
import { useAsistenteCerca } from './asistenteCercaStore'

/** Lo que un asistente hace a petición: un baile de la rueda o un ejercicio del gym. */
export type Actuacion = { tipo: 'emote'; emote: EmoteId } | { tipo: 'ejercicio'; nombre: string }
type ActuacionActiva = Actuacion & { hasta: number }

const DURACION_EMOTE_MS = 30000
const DURACION_EJERCICIO_MS = 15000

interface ActuacionState {
  /** Actuación en curso por asistente (id → qué y hasta cuándo, en `performance.now()`). */
  porAsistente: Record<string, ActuacionActiva>
  /** Selector abierto desde la burbuja de cercanía (qué baile / qué ejercicio). */
  selector: { asistenteId: string; tipo: Actuacion['tipo'] } | null
  actuar: (asistenteId: string, actuacion: Actuacion) => void
  parar: (asistenteId: string) => void
  abrirSelector: (asistenteId: string, tipo: Actuacion['tipo']) => void
  cerrarSelector: () => void
}

/**
 * Bailes y ejercicios de los asistentes (ver `house/AsistenteActuando`). No se
 * persiste: una actuación dura un rato (o hasta que el jugador se aleja) y el
 * asistente vuelve a su paseo.
 */
export const useActuacion = create<ActuacionState>((set, get) => ({
  porAsistente: {},
  selector: null,
  actuar: (asistenteId, actuacion) =>
    set((s) => ({
      porAsistente: {
        ...s.porAsistente,
        [asistenteId]: {
          ...actuacion,
          hasta: performance.now() + (actuacion.tipo === 'emote' ? DURACION_EMOTE_MS : DURACION_EJERCICIO_MS),
        },
      },
      selector: null,
    })),
  parar: (asistenteId) => {
    if (!get().porAsistente[asistenteId]) return
    set((s) => {
      const porAsistente = { ...s.porAsistente }
      delete porAsistente[asistenteId]
      return { porAsistente }
    })
  },
  abrirSelector: (asistenteId, tipo) => set({ selector: { asistenteId, tipo } }),
  cerrarSelector: () => set({ selector: null }),
}))

// Alejarse del asistente corta su actuación: «un rato, o hasta que te alejes».
useAsistenteCerca.subscribe((s, prev) => {
  if (prev.asistenteId && prev.asistenteId !== s.asistenteId) useActuacion.getState().parar(prev.asistenteId)
})

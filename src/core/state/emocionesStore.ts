import { create } from 'zustand'
import type { EmocionId } from '../chat/emociones'
import { EXPRESION_DE_EMOCION } from '../chat/emociones'
import type { ExpresionId } from '../house/apariencia'

/**
 * Reacción emocional efímera por asistente (la dispara el chat al responder).
 * La entrada se borra sola al vencer; los componentes 3D leen la emoción activa
 * para pintar cara/gesto/emoji y re-renderizan al expirar.
 */
interface EmocionesState {
  porAsistente: Record<string, { emocion: EmocionId; hasta: number }>
}

export const useEmociones = create<EmocionesState>(() => ({ porAsistente: {} }))

// Timeouts por asistente (módulo, no estado), como `tSaludo` del mascotaStore.
const timers: Record<string, ReturnType<typeof setTimeout>> = {}

/** Dispara la reacción del asistente durante `ms`; con null no hace nada. */
export function reaccionar(asistenteId: string, emocion: EmocionId | null, ms = 4000) {
  if (!emocion) return
  if (timers[asistenteId]) clearTimeout(timers[asistenteId])
  useEmociones.setState((s) => ({
    porAsistente: { ...s.porAsistente, [asistenteId]: { emocion, hasta: Date.now() + ms } },
  }))
  timers[asistenteId] = setTimeout(() => {
    delete timers[asistenteId]
    useEmociones.setState((s) => {
      const resto = { ...s.porAsistente }
      delete resto[asistenteId]
      return { porAsistente: resto }
    })
  }, ms)
}

/** Emoción activa del asistente (null si no está reaccionando). */
export function useEmocionActiva(asistenteId: string): EmocionId | null {
  return useEmociones((s) => s.porAsistente[asistenteId]?.emocion ?? null)
}

/** Expresión facial a pintar: la de la emoción activa o la base del personaje. */
export function useExpresionViva(asistenteId: string, base?: ExpresionId): ExpresionId | undefined {
  const emocion = useEmocionActiva(asistenteId)
  return emocion ? EXPRESION_DE_EMOCION[emocion] : base
}

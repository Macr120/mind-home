import { create } from 'zustand'

/**
 * Acción pendiente que NO pertenece a ninguna app: hoy, las tres del widget de
 * chat del launcher (abrir el chat, dictar o mandar una foto).
 *
 * Es un store y no una variable de módulo como `intencionApp` porque el
 * consumidor —`ChatBox`— puede llevar rato montado cuando la acción llega
 * (tocar el widget con la app viva en segundo plano): sin reactividad, un
 * efecto de montaje no se enteraría nunca. Caduca sola porque el chat puede
 * estar desmontado al llegar (dentro de un cuarto, en modo edición) y no debe
 * dispararse minutos después, cuando el usuario vuelva a la casa.
 */

export type AccionGlobal = 'chat' | 'chat-foto' | 'chat-voz'

const VIGENCIA_MS = 15_000

interface AccionGlobalState {
  pendiente: AccionGlobal | null
  creada: number
  lanzar(accion: AccionGlobal): void
  /** Devuelve la acción vigente y la retira (solo se ejecuta una vez). */
  consumir(): AccionGlobal | null
}

export const useAccionGlobal = create<AccionGlobalState>((set, get) => ({
  pendiente: null,
  creada: 0,
  lanzar: (accion) => set({ pendiente: accion, creada: Date.now() }),
  consumir: () => {
    const { pendiente, creada } = get()
    if (!pendiente) return null
    set({ pendiente: null, creada: 0 })
    return Date.now() - creada > VIGENCIA_MS ? null : pendiente
  },
}))

export const esAccionGlobal = (v: string): v is AccionGlobal =>
  v === 'chat' || v === 'chat-foto' || v === 'chat-voz'

/** Lanza la acción desde fuera de React (el puente de los widgets). */
export const lanzarAccionGlobal = (accion: AccionGlobal) => useAccionGlobal.getState().lanzar(accion)

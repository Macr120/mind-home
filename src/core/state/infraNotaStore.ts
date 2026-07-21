import { create } from 'zustand'

/**
 * Aviso del arquitecto DENTRO de un editor de infraestructura.
 *
 * Hace falta porque el ChatBox y la burbuja del asistente se desmontan mientras
 * un editor está activo (`construyendo` en App.tsx): una orden como «quiero
 * sembrar zanahorias» abre el editor y su respuesta nunca llegaría a verse.
 */
interface InfraNotaState {
  nota: string | null
  notar: (m: string) => void
  limpiar: () => void
}

let temporizador = 0

export const useInfraNota = create<InfraNotaState>((set) => ({
  nota: null,
  notar: (nota) => {
    set({ nota })
    window.clearTimeout(temporizador)
    temporizador = window.setTimeout(() => set({ nota: null }), 7000)
  },
  limpiar: () => {
    window.clearTimeout(temporizador)
    set({ nota: null })
  },
}))

/** Atajo para las tools del chat (fuera de React). */
export const infraNota = (m: string) => useInfraNota.getState().notar(m)

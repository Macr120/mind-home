import { create } from 'zustand'
import { MAPA_ROOM } from './disenoStore'
import { useCuartos } from './cuartosStore'
import { useLayout } from './layoutStore'

/**
 * Al crear o colocar un objeto se pregunta DÓNDE va: suelto en el mapa o dentro de
 * un cuarto ya construido. Este store guarda la elección pendiente mientras el
 * usuario decide en `DestinoObjetoDialog`.
 */
interface DestinoObjetoState {
  /** Resuelve la elección en curso; null = no hay diálogo abierto. */
  resolver: ((roomId: string | null) => void) | null
  /** Cierra el diálogo con el destino elegido (null = cancelar, no se crea nada). */
  elegir: (roomId: string | null) => void
}

export const useDestinoObjeto = create<DestinoObjetoState>((set, get) => ({
  resolver: null,
  elegir: (roomId) => {
    const resolver = get().resolver
    set({ resolver: null })
    resolver?.(roomId)
  },
}))

/** Cuartos ya construidos: los destinos posibles además del mapa. */
export function cuartosDestino() {
  const { placed } = useLayout.getState()
  return useCuartos.getState().cuartos.filter((c) => placed[c.id])
}

/**
 * Pregunta dónde va un objeto nuevo. Con la casa vacía no hay nada que preguntar:
 * va al mapa. Devuelve el destino elegido, o null si el usuario cancela.
 */
export function pedirDestinoObjeto(): Promise<string | null> {
  if (cuartosDestino().length === 0) return Promise.resolve(MAPA_ROOM)
  return new Promise((resolve) => useDestinoObjeto.setState({ resolver: resolve }))
}

import { create } from 'zustand'

/** Lo que puede despertar una pulsación larga en el mapa. */
export type Despierto =
  | { tipo: 'objeto'; id: number }
  | { tipo: 'cuarto'; id: string }

/**
 * Objeto o cuarto "despierto" por una pulsación larga: tiembla, se puede
 * arrastrar para moverlo y saca su menú de acciones. Solo hay uno a la vez.
 *
 * Mismo patrón que `interactUiStore`: el sujeto vive aquí y su posición en
 * pantalla la escribe cada frame `DespiertoAnchor` desde la escena 3D.
 */
interface DespiertoState {
  sujeto: Despierto | null
  screenX: number
  screenY: number
  despertar: (sujeto: Despierto) => void
  terminar: () => void
  setScreen: (x: number, y: number) => void
}

export const useDespierto = create<DespiertoState>((set) => ({
  sujeto: null,
  screenX: 0,
  screenY: 0,
  despertar: (sujeto) => set({ sujeto }),
  terminar: () => set({ sujeto: null }),
  setScreen: (screenX, screenY) => set({ screenX, screenY }),
}))

/** ¿Está despierto ESTE objeto? (selector para la lista de objetos del mapa). */
export const objetoDespierto = (s: DespiertoState, id?: number) =>
  id != null && s.sujeto?.tipo === 'objeto' && s.sujeto.id === id

/** ¿Está despierto ESTE cuarto? */
export const cuartoDespierto = (s: DespiertoState, id: string) =>
  s.sujeto?.tipo === 'cuarto' && s.sujeto.id === id

if (import.meta.env.DEV) {
  ;(window as unknown as { useDespierto: typeof useDespierto }).useDespierto = useDespierto
}

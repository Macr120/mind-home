import { create } from 'zustand'

/** Lo que puede despertar una pulsación larga en el mapa. */
type Despierto =
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
  // Se escribe por frame desde la escena: si no cambió, no se notifica a nadie.
  setScreen: (screenX, screenY) => set((s) => (s.screenX === screenX && s.screenY === screenY ? s : { screenX, screenY })),
}))

/** ¿Está despierto ESTE cuarto? */
export const cuartoDespierto = (s: DespiertoState, id: string) =>
  s.sujeto?.tipo === 'cuarto' && s.sujeto.id === id

if (import.meta.env.DEV) {
  ;(window as unknown as { useDespierto: typeof useDespierto }).useDespierto = useDespierto
}

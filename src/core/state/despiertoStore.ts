import { create } from 'zustand'

/** Lo que puede despertar una pulsación larga en el mapa. */
type Despierto =
  | { tipo: 'objeto'; id: number }
  | { tipo: 'cuarto'; id: string }
  /** Muro independiente; x/y/z = punto de mundo donde cuelga su menú (lo escribe la escena). */
  | { tipo: 'muro'; id: number; x: number; y: number; z: number }

/**
 * Objeto, cuarto o muro independiente "despierto" por una pulsación larga: tiembla, se puede
 * arrastrar para moverlo y saca su menú de acciones. Solo hay uno a la vez.
 *
 * Mismo patrón que `interactUiStore`: el sujeto vive aquí y su posición en
 * pantalla la escribe cada frame `DespiertoAnchor` desde la escena 3D.
 */
interface DespiertoState {
  sujeto: Despierto | null
  screenX: number
  screenY: number
  /** Se está arrastrando el muro despierto (la cámara no debe moverse con el dedo). */
  arrastrandoMuro: boolean
  despertar: (sujeto: Despierto) => void
  terminar: () => void
  setScreen: (x: number, y: number) => void
  setArrastrandoMuro: (v: boolean) => void
}

export const useDespierto = create<DespiertoState>((set) => ({
  sujeto: null,
  screenX: 0,
  screenY: 0,
  arrastrandoMuro: false,
  despertar: (sujeto) => set({ sujeto }),
  terminar: () => set({ sujeto: null, arrastrandoMuro: false }),
  setArrastrandoMuro: (arrastrandoMuro) => set({ arrastrandoMuro }),
  // Se escribe por frame desde la escena: si no cambió, no se notifica a nadie.
  setScreen: (screenX, screenY) => set((s) => (s.screenX === screenX && s.screenY === screenY ? s : { screenX, screenY })),
}))

/** ¿Está despierto ESTE cuarto? */
export const cuartoDespierto = (s: DespiertoState, id: string) =>
  s.sujeto?.tipo === 'cuarto' && s.sujeto.id === id

if (import.meta.env.DEV) {
  ;(window as unknown as { useDespierto: typeof useDespierto }).useDespierto = useDespierto
}

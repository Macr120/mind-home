import { create } from 'zustand'

/**
 * Posición 2D (proyectada desde 3D por `EditorAnchor`) del botón flotante para
 * salir del cuarto en edición. Mismo patrón que `interactUiStore`/`InteractAnchor`.
 */
interface EditorAnchorState {
  screenX: number
  screenY: number
  setScreen: (x: number, y: number) => void
}

export const useEditorAnchor = create<EditorAnchorState>((set) => ({
  screenX: 0,
  screenY: 0,
  // Se escribe por frame desde la escena: si no cambió, no se notifica a nadie.
  setScreen: (screenX, screenY) => set((s) => (s.screenX === screenX && s.screenY === screenY ? s : { screenX, screenY })),
}))

import { create } from 'zustand'

export interface InteractUiState {
  /** Cuarto cuyo mueble principal fue seleccionado (clic en el objeto). */
  focusRoomId: string | null
  screenX: number
  screenY: number
  /** Alterna selección del mueble; solo entonces se muestra el diálogo. */
  selectMueble: (roomId: string) => void
  setScreen: (x: number, y: number) => void
  clear: () => void
}

export const useInteractUi = create<InteractUiState>((set, get) => ({
  focusRoomId: null,
  screenX: 0,
  screenY: 0,
  selectMueble: (roomId) =>
    set({
      focusRoomId: get().focusRoomId === roomId ? null : roomId,
    }),
  setScreen: (screenX, screenY) => set({ screenX, screenY }),
  clear: () => set({ focusRoomId: null }),
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useInteractUi: typeof useInteractUi }).useInteractUi =
    useInteractUi
}

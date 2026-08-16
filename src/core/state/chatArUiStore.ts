import { create } from 'zustand'

/**
 * Overlay del Chat AR (cámara del dispositivo + asistente 3D encima para
 * conversar cara a cara). Es store global porque se abre desde el menú «+» del
 * chat (y por el tool `editor_chat_ar`) y el overlay vive en la raíz (App.tsx),
 * igual que la máscara AR.
 */
interface ChatArUiState {
  abierto: boolean
  abrir: () => void
  cerrar: () => void
}

export const useChatArUi = create<ChatArUiState>((set) => ({
  abierto: false,
  abrir: () => set({ abierto: true }),
  cerrar: () => set({ abierto: false }),
}))

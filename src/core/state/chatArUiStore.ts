import { create } from 'zustand'
import type { DestinoGrabacion } from '../grabacionPantalla'

/**
 * Overlay del Chat AR (cámara del dispositivo + asistente 3D encima para
 * conversar cara a cara). Es store global porque se abre desde el menú «+» del
 * chat (y por el tool `editor_chat_ar`) y el overlay vive en la raíz (App.tsx),
 * igual que la máscara AR.
 */
interface ChatArUiState {
  abierto: boolean
  /** Abierto desde el Studio de video: aparece el botón de grabar y la toma vuelve como clip a este proyecto. */
  destino: DestinoGrabacion | null
  abrir: () => void
  abrirParaStudio: (destino: DestinoGrabacion) => void
  cerrar: () => void
}

export const useChatArUi = create<ChatArUiState>((set) => ({
  abierto: false,
  destino: null,
  abrir: () => set({ abierto: true, destino: null }),
  abrirParaStudio: (destino) => set({ abierto: true, destino }),
  cerrar: () => set({ abierto: false, destino: null }),
}))

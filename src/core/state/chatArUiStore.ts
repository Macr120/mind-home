import { create } from 'zustand'
import type { DestinoGrabacion } from '../grabacionPantalla'

/**
 * Overlay del Chat AR (cámara del dispositivo + asistente 3D encima). Es store
 * global porque se abre desde el menú «+» del chat (y por el tool
 * `editor_chat_ar`) y el overlay vive en la raíz (App.tsx), igual que la
 * máscara AR. Desde el Studio de video se abre en modo «personaje»: solo el
 * asistente sobre la cámara, arrastrable, para grabarlo como clip.
 */
interface ChatArUiState {
  abierto: boolean
  /** 'chat' = conversar cara a cara; 'personaje' = solo el personaje sobre la cámara, sin chat ni voz. */
  modo: 'chat' | 'personaje'
  /** Abierto desde el Studio de video: aparece el botón de grabar y la toma vuelve como clip a este proyecto. */
  destino: DestinoGrabacion | null
  abrir: () => void
  abrirParaStudio: (destino: DestinoGrabacion) => void
  cerrar: () => void
}

export const useChatArUi = create<ChatArUiState>((set) => ({
  abierto: false,
  modo: 'chat',
  destino: null,
  abrir: () => set({ abierto: true, modo: 'chat', destino: null }),
  abrirParaStudio: (destino) => set({ abierto: true, modo: 'personaje', destino }),
  cerrar: () => set({ abierto: false, destino: null }),
}))

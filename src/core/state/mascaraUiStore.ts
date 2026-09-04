import { create } from 'zustand'
import type { DestinoGrabacion } from '../grabacionPantalla'

/**
 * Overlay de la máscara AR (marketing/mascara montada dentro de la app). Es
 * store global porque se abre desde el menú «+» del chat y el overlay vive en
 * la raíz (App.tsx), igual que el Wrapped.
 */
interface MascaraUiState {
  abierto: boolean
  /** Código del control remoto (llega por el QR `?mascara=`): la máscara abre conectándose como controlador. */
  codigoRemoto: string | null
  /** Abierta desde el Studio de video: la grabación vuelve como clip a este proyecto en vez de descargarse. */
  destino: DestinoGrabacion | null
  abrir: (codigoRemoto?: string) => void
  abrirParaStudio: (destino: DestinoGrabacion) => void
  cerrar: () => void
}

export const useMascaraUi = create<MascaraUiState>((set) => ({
  abierto: false,
  codigoRemoto: null,
  destino: null,
  abrir: (codigoRemoto) => set({ abierto: true, codigoRemoto: codigoRemoto ?? null, destino: null }),
  abrirParaStudio: (destino) => set({ abierto: true, codigoRemoto: null, destino }),
  cerrar: () => set({ abierto: false, codigoRemoto: null, destino: null }),
}))

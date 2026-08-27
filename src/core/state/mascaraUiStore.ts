import { create } from 'zustand'

/**
 * Overlay de la máscara AR (marketing/mascara montada dentro de la app). Es
 * store global porque se abre desde el menú «+» del chat y el overlay vive en
 * la raíz (App.tsx), igual que el Wrapped.
 */
interface MascaraUiState {
  abierto: boolean
  /** Código del control remoto (llega por el QR `?mascara=`): la máscara abre conectándose como controlador. */
  codigoRemoto: string | null
  abrir: (codigoRemoto?: string) => void
  cerrar: () => void
}

export const useMascaraUi = create<MascaraUiState>((set) => ({
  abierto: false,
  codigoRemoto: null,
  abrir: (codigoRemoto) => set({ abierto: true, codigoRemoto: codigoRemoto ?? null }),
  cerrar: () => set({ abierto: false, codigoRemoto: null }),
}))

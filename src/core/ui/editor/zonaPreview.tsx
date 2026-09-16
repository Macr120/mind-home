import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import { useMediaQuery } from '../useMediaQuery'

/**
 * Pantalla partida del editor: con sitio de sobra (escritorio o teléfono en
 * horizontal) la vista a pantalla completa pone los controles a la izquierda y
 * el preview a la derecha; por debajo —teléfono en vertical— el panel ocupa toda
 * la pantalla en una sola columna y el preview se queda donde siempre, fijo
 * arriba del scroll.
 */
const MEDIA_DOS_COLUMNAS = '(min-width: 42rem)'

export function useDosColumnas(): boolean {
  return useMediaQuery(MEDIA_DOS_COLUMNAS)
}

interface ZonaPreviewState {
  /** Contenedor de la columna derecha; null = no hay pantalla partida. */
  nodo: HTMLElement | null
  /** Previews viviendo en la columna (0 = vacía: el panel pinta la pista). */
  cuenta: number
  setNodo: (nodo: HTMLElement | null) => void
  registrar: () => () => void
}

export const useZonaPreview = create<ZonaPreviewState>((set) => ({
  nodo: null,
  cuenta: 0,
  setNodo: (nodo) => set({ nodo }),
  registrar: () => {
    set((s) => ({ cuenta: s.cuenta + 1 }))
    return () => set((s) => ({ cuenta: Math.max(0, s.cuenta - 1) }))
  },
}))

/**
 * ¿Este preview se está pintando en la columna de la derecha? Los previews la
 * usan para estirarse (alto completo) en vez de quedarse `sticky` con su alto
 * fijo dentro del panel angosto.
 */
export function useEnZonaPreview(): boolean {
  return useZonaPreview((s) => s.nodo != null)
}

/**
 * Envuelve el marco de un preview del editor: con la pantalla partida lo
 * teletransporta a la columna de la derecha (donde se estira), y si no lo deja
 * exactamente donde estaba. Varios previews a la vez se apilan en la columna.
 */
export function EnZonaPreview({ children }: { children: ReactNode }) {
  const nodo = useZonaPreview((s) => s.nodo)
  const registrar = useZonaPreview((s) => s.registrar)

  useEffect(() => {
    if (nodo) return registrar()
  }, [nodo, registrar])

  return nodo ? createPortal(<div className="min-h-0 flex-1">{children}</div>, nodo) : <>{children}</>
}

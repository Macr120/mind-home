import { create } from 'zustand'

/**
 * Preferencias del navegador de la app. Son ajustes del DISPOSITIVO (como los
 * de `ajustesStore`), así que viven en localStorage y no viajan por el sync.
 */

export type BuscadorId = 'duckduckgo' | 'google' | 'bing' | 'brave'

/** Buscadores que se pueden elegir; DuckDuckGo por defecto (no perfila). */
export const BUSCADORES: { id: BuscadorId; nombre: string; url: string }[] = [
  { id: 'duckduckgo', nombre: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { id: 'google', nombre: 'Google', url: 'https://www.google.com/search?q=' },
  { id: 'bing', nombre: 'Bing', url: 'https://www.bing.com/search?q=' },
  { id: 'brave', nombre: 'Brave', url: 'https://search.brave.com/search?q=' },
]

/** URL de resultados de `consulta` en el buscador elegido. */
export function urlBusqueda(consulta: string, buscador: BuscadorId): string {
  const b = BUSCADORES.find((x) => x.id === buscador) ?? BUSCADORES[0]
  return b.url + encodeURIComponent(consulta.trim())
}

const LS_BUSCADOR = 'mh.nav.buscador'
const LS_INACTIVO = 'mh.nav.inactivoSeg'
const LS_BORRAR_AL_CERRAR = 'mh.nav.borrarAlCerrar'

/** Segundos sin teclado ni ratón a partir de los que la visita deja de contar. */
export const INACTIVO_DEFAULT_SEG = 120

function leerBuscador(): BuscadorId {
  const v = localStorage.getItem(LS_BUSCADOR)
  return BUSCADORES.some((b) => b.id === v) ? (v as BuscadorId) : 'duckduckgo'
}

function leerInactivo(): number {
  const v = Number(localStorage.getItem(LS_INACTIVO))
  return Number.isFinite(v) && v >= 30 ? v : INACTIVO_DEFAULT_SEG
}

interface AjustesNavState {
  buscador: BuscadorId
  inactivoSeg: number
  /** Sin registro: mientras esté activo no se apuntan páginas ni visitas. Solo dura la sesión. */
  sinRegistro: boolean
  /** Al cerrar el navegador se borra el historial de páginas (las visitas por sitio quedan). */
  borrarAlCerrar: boolean
  setBuscador: (b: BuscadorId) => void
  setInactivoSeg: (seg: number) => void
  setSinRegistro: (v: boolean) => void
  setBorrarAlCerrar: (v: boolean) => void
}

export const useAjustesNav = create<AjustesNavState>((set) => ({
  buscador: leerBuscador(),
  inactivoSeg: leerInactivo(),
  sinRegistro: false,
  borrarAlCerrar: localStorage.getItem(LS_BORRAR_AL_CERRAR) === '1',
  setBuscador: (buscador) => {
    localStorage.setItem(LS_BUSCADOR, buscador)
    set({ buscador })
  },
  setInactivoSeg: (seg) => {
    const inactivoSeg = Math.max(30, Math.round(seg))
    localStorage.setItem(LS_INACTIVO, String(inactivoSeg))
    set({ inactivoSeg })
  },
  setSinRegistro: (sinRegistro) => set({ sinRegistro }),
  setBorrarAlCerrar: (borrarAlCerrar) => {
    localStorage.setItem(LS_BORRAR_AL_CERRAR, borrarAlCerrar ? '1' : '0')
    set({ borrarAlCerrar })
  },
}))

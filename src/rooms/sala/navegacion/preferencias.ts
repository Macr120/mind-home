import { create } from 'zustand'
import { MODOS_NAV, type ModoNav } from './modos'

/**
 * Preferencias de «Cómo llegar»: con qué modos arranca cada búsqueda y si la
 * voz va encendida al navegar. Son ajustes del DISPOSITIVO (como los del
 * navegador web), así que viven en localStorage y no viajan por el sync.
 */

const LS_MODOS = 'mh.lugares.modos'
const LS_VOZ = 'mh.lugares.voz'
const MODOS_DEFAULT: ModoNav[] = ['caminar', 'transporte']

function leerModos(): ModoNav[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LS_MODOS) ?? 'null')
    if (Array.isArray(v)) {
      const validos = v.filter((x): x is ModoNav => MODOS_NAV.some((m) => m.id === x))
      if (validos.length) return validos
    }
  } catch {
    // Valor corrupto: se vuelve a los modos de fábrica.
  }
  return MODOS_DEFAULT
}

interface PrefsNavegacionState {
  /** Modos marcados al abrir «Cómo llegar» (al menos uno). */
  modos: ModoNav[]
  /** Voz encendida desde el primer paso de la navegación en vivo. */
  voz: boolean
  setModos: (modos: ModoNav[]) => void
  setVoz: (voz: boolean) => void
}

export const usePrefsNavegacion = create<PrefsNavegacionState>((set) => ({
  modos: leerModos(),
  voz: localStorage.getItem(LS_VOZ) === '1',
  setModos: (modos) => {
    if (!modos.length) return
    localStorage.setItem(LS_MODOS, JSON.stringify(modos))
    set({ modos })
  },
  setVoz: (voz) => {
    localStorage.setItem(LS_VOZ, voz ? '1' : '0')
    set({ voz })
  },
}))

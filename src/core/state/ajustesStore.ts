import { create } from 'zustand'
import {
  aplicarTemaUI,
  TEMA_UI_DEFAULT,
  type TemaUIId,
} from '../ui/temasUI'
import {
  aplicarTipografia,
  TIPOGRAFIA_DEFAULT,
  type TipografiaId,
} from '../ui/tipografias'

/**
 * Preferencias de interfaz del usuario: idioma y tema visual del chrome.
 * Se persisten en localStorage (no en la BD de diseño, que es para la casa 3D)
 * porque son ajustes del dispositivo, no de la casa.
 */

export type Idioma = 'es' | 'en'

const LS_IDIOMA = 'mh.idioma'
const LS_TEMA_UI = 'mh.temaUI'
const LS_TIPOGRAFIA = 'mh.tipografia'

function leerIdioma(): Idioma {
  const v = localStorage.getItem(LS_IDIOMA)
  return v === 'en' ? 'en' : 'es'
}

function leerTemaUI(): TemaUIId {
  return (localStorage.getItem(LS_TEMA_UI) as TemaUIId) || TEMA_UI_DEFAULT
}

function leerTipografia(): TipografiaId {
  return (localStorage.getItem(LS_TIPOGRAFIA) as TipografiaId) || TIPOGRAFIA_DEFAULT
}

interface AjustesState {
  idioma: Idioma
  temaUI: TemaUIId
  tipografia: TipografiaId
  setIdioma: (idioma: Idioma) => void
  toggleIdioma: () => void
  setTemaUI: (tema: TemaUIId) => void
  setTipografia: (tipografia: TipografiaId) => void
}

export const useAjustes = create<AjustesState>((set, get) => ({
  idioma: leerIdioma(),
  temaUI: leerTemaUI(),
  tipografia: leerTipografia(),

  setIdioma: (idioma) => {
    localStorage.setItem(LS_IDIOMA, idioma)
    document.documentElement.lang = idioma
    set({ idioma })
  },

  toggleIdioma: () => get().setIdioma(get().idioma === 'es' ? 'en' : 'es'),

  setTemaUI: (tema) => {
    localStorage.setItem(LS_TEMA_UI, tema)
    aplicarTemaUI(tema)
    set({ temaUI: tema })
  },

  setTipografia: (tipografia) => {
    localStorage.setItem(LS_TIPOGRAFIA, tipografia)
    aplicarTipografia(tipografia)
    set({ tipografia })
  },
}))

// Aplica tema, tipografía e idioma guardados de inmediato al cargar el módulo.
aplicarTemaUI(useAjustes.getState().temaUI)
aplicarTipografia(useAjustes.getState().tipografia)
document.documentElement.lang = useAjustes.getState().idioma

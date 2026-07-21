import { create } from 'zustand'
import {
  aplicarTemaUI,
  aplicarVidrioUI,
  TEMA_UI_DEFAULT,
  MODO_UI_DEFAULT,
  VIDRIO_TRANSPARENCIA_DEFAULT,
  VIDRIO_INTENSIDAD_DEFAULT,
  type TemaUIId,
  type ModoUI,
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
/** Iconografía de la interfaz: emojis (clásica) o SVG de lucide (profesional). */
export type EstiloIconos = 'emoji' | 'profesional'

const LS_IDIOMA = 'mh.idioma'
const LS_TEMA_UI = 'mh.temaUI'
const LS_MODO_UI = 'mh.modoUI'
const LS_TIPOGRAFIA = 'mh.tipografia'
const LS_ESTILO_ICONOS = 'mh.estiloIconos'
const LS_VIDRIO_TRANSPARENCIA = 'mh.vidrio.transparencia'
const LS_VIDRIO_INTENSIDAD = 'mh.vidrio.intensidad'
const LS_NOTIF = 'mh.notif'
const LS_NOTIF_APPS = 'mh.notif.apps'
const LS_NOTIF_RUTINAS = 'mh.notif.rutinas'
const LS_NOTIF_METAS = 'mh.notif.metas'
const LS_NOTIF_HORA_METAS = 'mh.notif.horaMetas'
const LS_NOTIF_WRAPPED = 'mh.notif.wrapped'
const LS_MUSICA_VOLUMEN = 'mh.musica.volumen'
const LS_MUSICA_AMBIENTAL = 'mh.musica.ambiental'
const LS_MUSICA_FUENTE = 'mh.musica.fuente'
const LS_MUSICA_MOOD = 'mh.musica.mood'
const LS_MUSICA_PISTA = 'mh.musica.pista'
const LS_SFX_VOLUMEN = 'mh.sfx.volumen'

/** De dónde sale la música: generada con Web Audio, pistas subidas o el audio del sistema capturado. */
export type FuenteMusica = 'generada' | 'pistas' | 'sistema'
/** Ambiente de la música generada (los presets viven en core/audio/musicaGenerada.ts). */
export type MoodMusica =
  | 'calma'
  | 'festivo'
  | 'nocturno'
  | 'chiptune'
  | 'acogedor'
  | 'energia'
  | 'estudio'
  | 'arcade'
  | 'bosque'
  | 'viaje'
  | 'carrera'
  | 'cajita'

const MOODS: MoodMusica[] = [
  'calma',
  'festivo',
  'nocturno',
  'chiptune',
  'acogedor',
  'energia',
  'estudio',
  'arcade',
  'bosque',
  'viaje',
  'carrera',
  'cajita',
]

const ESTILO_ICONOS_DEFAULT: EstiloIconos = 'profesional'
/** Al caer la tarde: da margen para cumplir la meta antes de recordarla. */
const HORA_METAS_DEFAULT = '20:00'

function leerIdioma(): Idioma {
  const v = localStorage.getItem(LS_IDIOMA)
  return v === 'en' ? 'en' : 'es'
}

function leerTemaUI(): TemaUIId {
  return (localStorage.getItem(LS_TEMA_UI) as TemaUIId) || TEMA_UI_DEFAULT
}

function leerModoUI(): ModoUI {
  const v = localStorage.getItem(LS_MODO_UI)
  return v === 'claro' || v === 'transparente' ? v : MODO_UI_DEFAULT
}

function leerEstiloIconos(): EstiloIconos {
  const v = localStorage.getItem(LS_ESTILO_ICONOS)
  // Compara contra ambos valores explícitos para que cambiar el default
  // funcione aunque el usuario nunca haya tocado el ajuste.
  return v === 'profesional' || v === 'emoji' ? v : ESTILO_ICONOS_DEFAULT
}

function leerTipografia(): TipografiaId {
  return (localStorage.getItem(LS_TIPOGRAFIA) as TipografiaId) || TIPOGRAFIA_DEFAULT
}

/** Número 0..1 guardado; fuera de rango o ausente cae al default. */
function leer01(clave: string, def: number): number {
  const v = parseFloat(localStorage.getItem(clave) ?? '')
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : def
}

/** Los avisos nacen apagados: encenderlos es lo que pide permiso al navegador. */
const leerSiNo = (clave: string, def: boolean) => {
  const v = localStorage.getItem(clave)
  return v === 'si' ? true : v === 'no' ? false : def
}

/** Apps con el aviso apagado; ausente = encendida. */
function leerNotifApps(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS_NOTIF_APPS)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

interface AjustesState {
  idioma: Idioma
  temaUI: TemaUIId
  modoUI: ModoUI
  tipografia: TipografiaId
  estiloIconos: EstiloIconos
  /** Vidrio de la interfaz (0..1): qué tanto se transparentan los paneles flotantes. */
  vidrioTransparencia: number
  /** Vidrio de la interfaz (0..1): fuerza del desenfoque tras el panel. */
  vidrioIntensidad: number
  /** Interruptor general de los avisos: en 'no' no suena nada. */
  notif: boolean
  /** Avisos de las rutinas/eventos con hora. */
  notifRutinas: boolean
  /** Recordatorio de las metas del día que siguen sin cumplir. */
  notifMetas: boolean
  /** 'HH:mm' a la que se recuerdan las metas pendientes. */
  notifHoraMetas: string
  /** Apps con el aviso apagado (por id); ausente = encendida. */
  notifApps: Record<string, boolean>
  /** Aviso "tu wrapped está listo" al cerrar semana/mes/año. */
  notifWrapped: boolean
  /** Volumen maestro de la música (0..1). */
  musicaVolumen: number
  /** Música ambiental mientras se pasea por la casa. */
  musicaAmbiental: boolean
  musicaFuente: FuenteMusica
  musicaMood: MoodMusica
  /** Pista elegida (id de pistasMusica); null = todas en aleatorio. */
  musicaPistaId: number | null
  /** Volumen de los sonidos de acciones (0..1); 0 los apaga. */
  sfxVolumen: number
  setIdioma: (idioma: Idioma) => void
  toggleIdioma: () => void
  setTemaUI: (tema: TemaUIId) => void
  setModoUI: (modo: ModoUI) => void
  setTipografia: (tipografia: TipografiaId) => void
  setEstiloIconos: (estilo: EstiloIconos) => void
  setVidrioTransparencia: (v: number) => void
  setVidrioIntensidad: (v: number) => void
  setNotif: (v: boolean) => void
  setNotifRutinas: (v: boolean) => void
  setNotifMetas: (v: boolean) => void
  setNotifHoraMetas: (hora: string) => void
  setNotifApp: (plantillaId: string, v: boolean) => void
  setNotifWrapped: (v: boolean) => void
  setMusicaVolumen: (v: number) => void
  setMusicaAmbiental: (v: boolean) => void
  setMusicaFuente: (f: FuenteMusica) => void
  setMusicaMood: (m: MoodMusica) => void
  setMusicaPistaId: (id: number | null) => void
  setSfxVolumen: (v: number) => void
}

export const useAjustes = create<AjustesState>((set, get) => ({
  idioma: leerIdioma(),
  temaUI: leerTemaUI(),
  modoUI: leerModoUI(),
  tipografia: leerTipografia(),
  estiloIconos: leerEstiloIconos(),
  vidrioTransparencia: leer01(LS_VIDRIO_TRANSPARENCIA, VIDRIO_TRANSPARENCIA_DEFAULT),
  vidrioIntensidad: leer01(LS_VIDRIO_INTENSIDAD, VIDRIO_INTENSIDAD_DEFAULT),
  notif: leerSiNo(LS_NOTIF, false),
  notifRutinas: leerSiNo(LS_NOTIF_RUTINAS, true),
  notifMetas: leerSiNo(LS_NOTIF_METAS, true),
  notifHoraMetas: localStorage.getItem(LS_NOTIF_HORA_METAS) || HORA_METAS_DEFAULT,
  notifApps: leerNotifApps(),
  notifWrapped: leerSiNo(LS_NOTIF_WRAPPED, true),
  musicaVolumen: leer01(LS_MUSICA_VOLUMEN, 0.5),
  musicaAmbiental: leerSiNo(LS_MUSICA_AMBIENTAL, false),
  musicaFuente: ((): FuenteMusica => {
    const v = localStorage.getItem(LS_MUSICA_FUENTE)
    return v === 'pistas' || v === 'sistema' ? v : 'generada'
  })(),
  musicaMood: (MOODS as string[]).includes(localStorage.getItem(LS_MUSICA_MOOD) ?? '')
    ? (localStorage.getItem(LS_MUSICA_MOOD) as MoodMusica)
    : 'calma',
  musicaPistaId: (() => {
    const v = Number(localStorage.getItem(LS_MUSICA_PISTA))
    return Number.isFinite(v) && v > 0 ? v : null
  })(),
  sfxVolumen: leer01(LS_SFX_VOLUMEN, 0.6),

  setIdioma: (idioma) => {
    localStorage.setItem(LS_IDIOMA, idioma)
    document.documentElement.lang = idioma
    set({ idioma })
  },

  toggleIdioma: () => get().setIdioma(get().idioma === 'es' ? 'en' : 'es'),

  setTemaUI: (tema) => {
    localStorage.setItem(LS_TEMA_UI, tema)
    aplicarTemaUI(tema, get().modoUI)
    set({ temaUI: tema })
  },

  setModoUI: (modo) => {
    localStorage.setItem(LS_MODO_UI, modo)
    aplicarTemaUI(get().temaUI, modo)
    set({ modoUI: modo })
  },

  setTipografia: (tipografia) => {
    localStorage.setItem(LS_TIPOGRAFIA, tipografia)
    aplicarTipografia(tipografia)
    set({ tipografia })
  },

  setEstiloIconos: (estilo) => {
    localStorage.setItem(LS_ESTILO_ICONOS, estilo)
    document.documentElement.dataset.estiloIconos = estilo
    set({ estiloIconos: estilo })
  },

  setVidrioTransparencia: (v) => {
    localStorage.setItem(LS_VIDRIO_TRANSPARENCIA, String(v))
    aplicarVidrioUI(v, get().vidrioIntensidad)
    set({ vidrioTransparencia: v })
  },

  setVidrioIntensidad: (v) => {
    localStorage.setItem(LS_VIDRIO_INTENSIDAD, String(v))
    aplicarVidrioUI(get().vidrioTransparencia, v)
    set({ vidrioIntensidad: v })
  },

  setNotif: (v) => {
    localStorage.setItem(LS_NOTIF, v ? 'si' : 'no')
    set({ notif: v })
  },

  setNotifRutinas: (v) => {
    localStorage.setItem(LS_NOTIF_RUTINAS, v ? 'si' : 'no')
    set({ notifRutinas: v })
  },

  setNotifMetas: (v) => {
    localStorage.setItem(LS_NOTIF_METAS, v ? 'si' : 'no')
    set({ notifMetas: v })
  },

  setNotifHoraMetas: (hora) => {
    localStorage.setItem(LS_NOTIF_HORA_METAS, hora)
    set({ notifHoraMetas: hora })
  },

  setNotifApp: (plantillaId, v) => {
    const apps = { ...get().notifApps, [plantillaId]: v }
    localStorage.setItem(LS_NOTIF_APPS, JSON.stringify(apps))
    set({ notifApps: apps })
  },

  setNotifWrapped: (v) => {
    localStorage.setItem(LS_NOTIF_WRAPPED, v ? 'si' : 'no')
    set({ notifWrapped: v })
  },

  setMusicaVolumen: (v) => {
    localStorage.setItem(LS_MUSICA_VOLUMEN, String(v))
    set({ musicaVolumen: v })
  },

  setMusicaAmbiental: (v) => {
    localStorage.setItem(LS_MUSICA_AMBIENTAL, v ? 'si' : 'no')
    set({ musicaAmbiental: v })
  },

  setMusicaFuente: (f) => {
    localStorage.setItem(LS_MUSICA_FUENTE, f)
    set({ musicaFuente: f })
  },

  setMusicaMood: (m) => {
    localStorage.setItem(LS_MUSICA_MOOD, m)
    set({ musicaMood: m })
  },

  setMusicaPistaId: (id) => {
    if (id == null) localStorage.removeItem(LS_MUSICA_PISTA)
    else localStorage.setItem(LS_MUSICA_PISTA, String(id))
    set({ musicaPistaId: id })
  },

  setSfxVolumen: (v) => {
    localStorage.setItem(LS_SFX_VOLUMEN, String(v))
    set({ sfxVolumen: v })
  },

}))

/** ¿Está encendido el aviso de esta app? (fuera de React: lo usa el reloj de avisos). */
export const avisoActivo = (plantillaId?: string): boolean => {
  const s = useAjustes.getState()
  if (!s.notif) return false
  return plantillaId ? s.notifApps[plantillaId] !== false : true
}

// Aplica tema, tipografía e idioma guardados de inmediato al cargar el módulo.
aplicarTemaUI(useAjustes.getState().temaUI, useAjustes.getState().modoUI)
aplicarVidrioUI(useAjustes.getState().vidrioTransparencia, useAjustes.getState().vidrioIntensidad)
aplicarTipografia(useAjustes.getState().tipografia)
document.documentElement.lang = useAjustes.getState().idioma
document.documentElement.dataset.estiloIconos = useAjustes.getState().estiloIconos

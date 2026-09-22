import { create } from 'zustand'
import { MODOS_NAV, type ModoNav } from './modos'

/**
 * Preferencias de «Cómo llegar»: con qué modos arranca cada búsqueda y si la
 * voz va encendida al navegar. Son ajustes del DISPOSITIVO (como los del
 * navegador web), así que viven en localStorage y no viajan por el sync.
 */

const LS_MODOS = 'mh.lugares.modos'
const LS_VOZ = 'mh.lugares.voz'
const LS_ZONA = 'mh.lugares.zona'
const LS_OPTIMO = 'mh.lugares.optimo'
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

/**
 * Última zona por la que anduvo el usuario (un punto elegido, su ubicación o el
 * centro del mapa tras moverlo). Sesga el buscador: sin un punto de referencia,
 * HERE cae en la geocodificación de direcciones y «Zócalo» devuelve una calle
 * cualquiera en vez de la plaza. No es un dato del usuario, es una pista.
 */
function leerZona(): { lat: number; lng: number } | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LS_ZONA) ?? 'null')
    if (v && typeof v === 'object' && 'lat' in v && 'lng' in v) {
      const { lat, lng } = v as { lat: unknown; lng: unknown }
      if (typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) <= 85 && Math.abs(lng) <= 180) {
        return { lat, lng }
      }
    }
  } catch {
    // Valor corrupto: se busca sin sesgo, como antes.
  }
  return null
}

interface PrefsNavegacionState {
  /** Modos marcados al abrir «Cómo llegar» (al menos uno). */
  modos: ModoNav[]
  /** Voz encendida desde el primer paso de la navegación en vivo. */
  voz: boolean
  /** Arrancar comparando todos los modos («Óptimo») en vez de con unos fijos. */
  optimo: boolean
  /** Zona de referencia para las sugerencias (ver `leerZona`). */
  zona: { lat: number; lng: number } | null
  setModos: (modos: ModoNav[]) => void
  setVoz: (voz: boolean) => void
  setOptimo: (optimo: boolean) => void
  setZona: (zona: { lat: number; lng: number }) => void
}

export const usePrefsNavegacion = create<PrefsNavegacionState>((set) => ({
  modos: leerModos(),
  voz: localStorage.getItem(LS_VOZ) === '1',
  // De fábrica se abre en «Óptimo»: es la respuesta útil sin decidir nada.
  optimo: localStorage.getItem(LS_OPTIMO) !== '0',
  zona: leerZona(),
  setModos: (modos) => {
    if (!modos.length) return
    localStorage.setItem(LS_MODOS, JSON.stringify(modos))
    set({ modos })
  },
  setVoz: (voz) => {
    localStorage.setItem(LS_VOZ, voz ? '1' : '0')
    set({ voz })
  },
  setOptimo: (optimo) => {
    localStorage.setItem(LS_OPTIMO, optimo ? '1' : '0')
    set({ optimo })
  },
  setZona: (zona) => {
    // Coordenadas imposibles (un mapa arrastrado más allá del polo o del
    // antimeridiano) no sirven de pista y romperían la petición.
    if (Math.abs(zona.lat) > 85 || Math.abs(zona.lng) > 180) return
    const limpia = { lat: +zona.lat.toFixed(3), lng: +zona.lng.toFixed(3) }
    localStorage.setItem(LS_ZONA, JSON.stringify(limpia))
    set({ zona: limpia })
  },
}))

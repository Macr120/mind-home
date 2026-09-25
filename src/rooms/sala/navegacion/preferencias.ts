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
const LS_ANCHO_MAPA = 'mh.lugares.anchoMapa'
const LS_ALTO_MAPA = 'mh.lugares.altoMapa'
const LS_CATEGORIA = 'mh.lugares.categoria'
const LS_SUELTOS = 'mh.lugares.sueltos'
/** Con menos de esto el mapa no se ve y con más no cabe nada a su lado. */
const ANCHO_MIN = 30
const ANCHO_MAX = 100
/** Alto del mapa en píxeles cuando lo estira el usuario. */
const ALTO_MIN = 180
const ALTO_MAX = 900
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

/** Interruptores de la carpeta «Sin carpeta» (las de verdad los guardan en su fila y viajan por el sync). */
export interface VerEnMapa {
  pines: boolean
  rutas: boolean
}

function leerSueltos(): VerEnMapa {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LS_SUELTOS) ?? 'null')
    if (v && typeof v === 'object') {
      const o = v as Partial<VerEnMapa>
      return { pines: o.pines !== false, rutas: o.rutas === true }
    }
  } catch {
    // Valor corrupto: como de fábrica.
  }
  return { pines: true, rutas: false }
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
  /**
   * Cuánto del ancho se lleva el mapa cuando el panel da para dos columnas
   * (porcentaje). Lo arrastra el usuario por el tirador; al pasar de 85 ya no
   * cabe nada al lado y la vista vuelve a una sola columna.
   */
  anchoMapa: number
  /**
   * Alto del mapa en píxeles cuando el usuario lo estira con el tirador, o
   * `null` para dejarlo al tamaño que le toque por el ancho del panel.
   */
  altoMapa: number | null
  /**
   * Última categoría de lugares que escogió el usuario (la tocó, se la puso a
   * un lugar o fue a un lugar suyo): su pin es el del botón del menú del chat.
   */
  categoria: number | null
  /** Qué se ve en el mapa de los lugares y trayectos sin carpeta. */
  sueltos: VerEnMapa
  setSueltos: (v: VerEnMapa) => void
  setModos: (modos: ModoNav[]) => void
  setVoz: (voz: boolean) => void
  setOptimo: (optimo: boolean) => void
  setZona: (zona: { lat: number; lng: number }) => void
  setAnchoMapa: (ancho: number) => void
  setAltoMapa: (alto: number | null) => void
  setCategoria: (id: number | undefined) => void
}

export const usePrefsNavegacion = create<PrefsNavegacionState>((set) => ({
  modos: leerModos(),
  voz: localStorage.getItem(LS_VOZ) === '1',
  // De fábrica se abre en «Óptimo»: es la respuesta útil sin decidir nada.
  optimo: localStorage.getItem(LS_OPTIMO) !== '0',
  zona: leerZona(),
  anchoMapa: Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, Number(localStorage.getItem(LS_ANCHO_MAPA)) || 50)),
  altoMapa: Number(localStorage.getItem(LS_ALTO_MAPA)) || null,
  categoria: Number(localStorage.getItem(LS_CATEGORIA)) || null,
  sueltos: leerSueltos(),
  setSueltos: (sueltos) => {
    localStorage.setItem(LS_SUELTOS, JSON.stringify(sueltos))
    set({ sueltos })
  },
  setCategoria: (id) => {
    // Un lugar sin categoría no la cambia: el botón conserva el último pin.
    if (id == null) return
    localStorage.setItem(LS_CATEGORIA, String(id))
    set({ categoria: id })
  },
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
  setAnchoMapa: (ancho) => {
    const v = Math.round(Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, ancho)))
    localStorage.setItem(LS_ANCHO_MAPA, String(v))
    set({ anchoMapa: v })
  },
  setAltoMapa: (alto) => {
    if (alto == null) {
      localStorage.removeItem(LS_ALTO_MAPA)
      set({ altoMapa: null })
      return
    }
    const v = Math.round(Math.min(ALTO_MAX, Math.max(ALTO_MIN, alto)))
    localStorage.setItem(LS_ALTO_MAPA, String(v))
    set({ altoMapa: v })
  },
}))

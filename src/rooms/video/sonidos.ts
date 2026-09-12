import type { FuenteSonido, MedioVideo } from '../../core/data/db'
import type { TFunc } from '../../core/i18n/useT'
import { LS_SONIDOS_OCULTOS } from './constantes'

/**
 * La carpeta «sonidos» de fábrica del Studio de video: efectos cortos en
 * `public/sonidos/` (llegan tal cual a la APK y a Electron). Se referencian por
 * CLAVE, no por medio: el proyecto sincroniza y el sonido suena en cualquier
 * dispositivo. Los nombres van por `t()`; los de meme (AAA, Bruh, Sus…) son
 * nombres propios y quedan iguales en todos los idiomas.
 */
export interface SonidoFabrica {
  clave: string
  archivo: string
  claveNombre: string
  es: string
  /** Segundos (fija, solo para pintar «0,8 s» en el selector). */
  duracion: number
}

export const SONIDOS_FABRICA: readonly SonidoFabrica[] = [
  { clave: 'aaa', archivo: 'aaa.mp3', claveNombre: 'video.sonido.aaa', es: 'AAA', duracion: 5.3 },
  { clave: 'bruh', archivo: 'bruh.mp3', claveNombre: 'video.sonido.bruh', es: 'Bruh', duracion: 0.8 },
  { clave: 'click', archivo: 'click.mp3', claveNombre: 'video.sonido.click', es: 'Clic', duracion: 0.4 },
  { clave: 'faa', archivo: 'faa.mp3', claveNombre: 'video.sonido.faa', es: 'FAA', duracion: 1.8 },
  { clave: 'golpe', archivo: 'golpe.mp3', claveNombre: 'video.sonido.golpe', es: 'Golpe', duracion: 3.1 },
  { clave: 'jeje-boy', archivo: 'jeje-boy.mp3', claveNombre: 'video.sonido.jejeBoy', es: 'Jeje boy', duracion: 1.9 },
  { clave: 'sus', archivo: 'sus.mp3', claveNombre: 'video.sonido.sus', es: 'Sus', duracion: 2.9 },
  { clave: 'wow', archivo: 'wow.mp3', claveNombre: 'video.sonido.wow', es: 'Wow', duracion: 1.9 },
  { clave: 'nice', archivo: 'nice.mp3', claveNombre: 'video.sonido.nice', es: 'Nice', duracion: 3.1 },
]

export function sonidoFabrica(clave: string): SonidoFabrica | null {
  return SONIDOS_FABRICA.find((s) => s.clave === clave) ?? null
}

/** URL del MP3 de fábrica (patrón de `imagenesPreset`: BASE_URL + carpeta de public/). */
export function urlSonido(clave: string): string | null {
  const s = sonidoFabrica(clave)
  return s ? `${import.meta.env.BASE_URL}sonidos/${s.archivo}` : null
}

/** Nombre visible de una fuente: fábrica traducida, medio por su nombre, o «no disponible». */
export function nombreFuenteSonido(t: TFunc, f: FuenteSonido, porId: Map<number, MedioVideo>): string {
  if (f.tipo === 'fabrica') {
    const s = sonidoFabrica(f.clave)
    return s ? t(s.claveNombre, s.es) : f.clave
  }
  return porId.get(f.medioId)?.nombre ?? t('video.medios.noDisponible', 'Medio no disponible en este dispositivo')
}

/** Sonidos de fábrica que el usuario borró de la carpeta (claves). Solo se ocultan de la lista: los clips que ya los usan siguen sonando. */
export function leerSonidosOcultos(): Set<string> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LS_SONIDOS_OCULTOS) ?? '[]')
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

export function guardarSonidosOcultos(ocultos: Set<string>): void {
  try {
    if (ocultos.size) localStorage.setItem(LS_SONIDOS_OCULTOS, JSON.stringify([...ocultos]))
    else localStorage.removeItem(LS_SONIDOS_OCULTOS)
  } catch {
    /* almacenamiento bloqueado */
  }
}

import { nombrePlataforma } from './plataforma'

/**
 * Heurística de gama del dispositivo, para los DEFAULTS de rendimiento (nunca
 * pisa un ajuste ya persistido por el usuario): en un teléfono de pocos
 * recursos los efectos de postprocesado arrancan apagados y el render baja a
 * dpr 1; en uno de gama alta la casa se pinta a la resolución real de la pantalla.
 *
 * - `deviceMemory` solo existe en Chrome/Android (y Chrome lo topa en 8).
 * - iOS NO sirve con núcleos: WebKit reporta un `hardwareConcurrency` recortado
 *   a propósito (anti-huella), así que con la regla de núcleos TODO iPhone salía
 *   de gama baja y la casa se pintaba a 1× en pantallas 3×. Ahí decide la pantalla.
 */
export type Gama = 'baja' | 'normal' | 'alta'

/** iPhone/iPad, también el iPad en «modo escritorio» (se anuncia como Mac táctil). */
function esIOS(): boolean {
  if (nombrePlataforma() === 'ios') return true
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function calcularGama(): Gama {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'normal'
  const dpr = window.devicePixelRatio || 1
  const ladoCorto = Math.min(screen.width, screen.height)

  if (esIOS()) {
    // iPad: todos los que corren la app (iPadOS 15+) tienen GPU de sobra para 2×.
    if (/iPad/.test(navigator.userAgent) || /Macintosh/.test(navigator.userAgent)) return 'alta'
    // iPhone 3× de 390 pt o más: del iPhone 12 en adelante (y los Plus/Max
    // anteriores). Los mini y los de pantalla 2× (SE, 11, XR) quedan en normal.
    return dpr >= 3 && ladoCorto >= 390 ? 'alta' : 'normal'
  }

  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const nucleos = navigator.hardwareConcurrency ?? 4
  if ((mem !== undefined && mem <= 4) || nucleos <= 4) return 'baja'
  // Gama alta solo en táctiles (Android): el escritorio conserva su resolución de siempre.
  const tactil = window.matchMedia?.('(pointer: coarse)').matches ?? false
  if (tactil && mem !== undefined && mem >= 8 && nucleos >= 8) return 'alta'
  return 'normal'
}

let gama: Gama | null = null

/** Gama del dispositivo (se calcula una vez: no cambia durante la sesión). */
export function gamaDispositivo(): Gama {
  if (gama == null) gama = calcularGama()
  return gama
}

export function esGamaBaja(): boolean {
  return gamaDispositivo() === 'baja'
}

export function esGamaAlta(): boolean {
  return gamaDispositivo() === 'alta'
}

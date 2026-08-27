/**
 * El encuadre del fondo de pantalla del escritorio: dónde mira la cámara y con
 * cuánto zoom cuando la casa se pinta detrás de las ventanas.
 *
 * Vive aparte del resto de ajustes y en `localStorage` a propósito. El fondo es
 * una VENTANA distinta de la app, con su propio estado de cámara en memoria; lo
 * único que comparten las dos es el origen `app://mph`, y con él este almacén.
 * Así el fondo recuerda su encuadre entre arranques sin que nadie tenga que
 * sincronizar dos tiendas de Zustand entre ventanas.
 *
 * Quien lo MUEVE es la vista previa de Configuraciones › Interfaz: manda el
 * arrastre por el puente del shell, esta ventana lo aplica y lo guarda.
 */
import { lienzoCam, panFocusByPixels, useCam } from './state/cameraStore'

const CLAVE = 'mph.fondoEncuadre'

export interface EncuadreFondo {
  /** Punto al que mira la cámara, en unidades de mundo. */
  focus: [number, number, number]
  zoom: number
}

export function leerEncuadre(): EncuadreFondo | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const e = JSON.parse(crudo) as EncuadreFondo
    return Array.isArray(e?.focus) && e.focus.length === 3 && typeof e.zoom === 'number' ? e : null
  } catch {
    return null
  }
}

function guardar(e: EncuadreFondo): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(e))
  } catch {
    /* sin almacenamiento: el encuadre se pierde al cerrar, y ya */
  }
}

/** Devuelve la cámara al encuadre guardado. Sin nada guardado, no toca nada. */
export function aplicarEncuadre(): void {
  const e = leerEncuadre()
  if (e) useCam.setState({ focus: e.focus, zoom: e.zoom })
}

/**
 * Mueve el encuadre lo que se arrastró en la vista previa. El arrastre viene en
 * FRACCIÓN de la pantalla (−1..1) y no en píxeles, para que dé igual lo grande
 * que sea la vista previa; aquí se convierte a píxeles de ESTA ventana y se
 * delega en el mismo `panFocusByPixels` que usa el arrastre del mapa, con el
 * frustum real que publica CameraRig (`lienzoCam`). Así arrastrar media vista
 * previa mueve media pantalla de casa, ni más ni menos.
 */
export function moverEncuadre(fx: number, fy: number): void {
  const { az, zoom } = useCam.getState()
  const w = Math.max(1, window.innerWidth)
  const h = Math.max(1, window.innerHeight)
  panFocusByPixels(fx * w, fy * h, w, h, zoom, az, lienzoCam.fw || 20, lienzoCam.fh || 20)
  guardar({ focus: useCam.getState().focus, zoom })
}

/** Acerca (>1) o aleja (<1) el fondo, y lo guarda. */
export function acercarEncuadre(factor: number): void {
  const { focus, zoom } = useCam.getState()
  const nuevo = Math.min(56, Math.max(4, zoom * factor))
  useCam.setState({ zoom: nuevo })
  guardar({ focus, zoom: nuevo })
}

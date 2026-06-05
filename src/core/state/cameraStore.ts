import { create } from 'zustand'

export const ZOOM_DEFAULT = 17
const ZOOM_ROOM = 34 // zoom al agregar/enfocar cuarto en el mapa
export const ZOOM_ROOM_EDIT = 46 // zoom al editar un cuarto (panel derecho abierto)
/** Ancho CSS del panel de edición (Tailwind w-80). CameraRig compensa con viewport.dpr. */
export const EDIT_PANEL_PX = 320
/** Fracción del ancho del panel para centrar en el área visible (menor = cuarto más a la derecha). */
export const EDIT_FOCUS_PANEL_FRAC = 0.34
const ZOOM_MIN = 8
const ZOOM_MAX = 56

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

/** Azimut base de la cámara isométrica (debe coincidir con CameraRig). */
export const CAM_BASE_AZ = Math.PI / 4

/** Desplaza el foco de la cámara según arrastre en pantalla (pan). */
export function panFocusByPixels(
  dxPx: number,
  dyPx: number,
  viewW: number,
  viewH: number,
  zoom: number,
  azStep: number,
  frustumW = 20,
  frustumH = 20,
) {
  const w = Math.max(1, viewW)
  const h = Math.max(1, viewH)
  const halfW = frustumW / (2 * Math.max(zoom, 0.001))
  const halfH = frustumH / (2 * Math.max(zoom, 0.001))
  const wppX = (2 * halfW) / w
  const wppY = (2 * halfH) / h
  const a = CAM_BASE_AZ + azStep * (Math.PI / 2)
  const rightX = -Math.sin(a)
  const rightZ = Math.cos(a)
  const fwdX = -Math.cos(a)
  const fwdZ = -Math.sin(a)
  const { focus } = useCam.getState()
  useCam.setState({
    focus: [
      focus[0] + rightX * dxPx * wppX + fwdX * dyPx * wppY,
      focus[1] + rightZ * dxPx * wppX + fwdZ * dyPx * wppY,
    ],
  })
}

/**
 * Estado de la cámara isométrica (lo aplica CameraRig en la escena 3D):
 * - focus: punto [x,z] que la cámara mira (centro de la casa o un cuarto)
 * - azStep: pasos de rotación de 90° (las 4 esquinas)
 * - zoom: nivel de acercamiento (con topes)
 */
interface CamState {
  focus: [number, number]
  azStep: number
  zoom: number
  rotar: (dir: 1 | -1) => void
  zoomBy: (factor: number) => void
  zoomWheel: (deltaY: number) => void
  focusRoom: (pos: [number, number, number]) => void
  focusRoomEdit: (pos: [number, number, number]) => void
  reset: () => void
}

export const useCam = create<CamState>((set) => ({
  focus: [0, 0],
  azStep: 0,
  zoom: ZOOM_DEFAULT,
  rotar: (dir) => set((s) => ({ azStep: s.azStep + dir })),
  zoomBy: (factor) =>
    set((s) => ({ zoom: clamp(s.zoom * factor, ZOOM_MIN, ZOOM_MAX) })),
  /** Rueda del ratón / pinch (deltaY negativo = acercar). */
  zoomWheel: (deltaY: number) =>
    set((s) => ({
      zoom: clamp(s.zoom * Math.pow(0.998, deltaY), ZOOM_MIN, ZOOM_MAX),
    })),
  focusRoom: (pos) => set({ focus: [pos[0], pos[2]], zoom: ZOOM_ROOM }),
  focusRoomEdit: (pos) =>
    set({ focus: [pos[0], pos[2]], zoom: ZOOM_ROOM_EDIT }),
  reset: () => set({ focus: [0, 0], azStep: 0, zoom: ZOOM_DEFAULT }),
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useCam: typeof useCam }).useCam = useCam
}

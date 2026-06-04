import { create } from 'zustand'

export const ZOOM_DEFAULT = 17
const ZOOM_ROOM = 34 // zoom al enfocar un cuarto (ver detalles)
const ZOOM_MIN = 8
const ZOOM_MAX = 48

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

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
  focusRoom: (pos: [number, number, number]) => void
  reset: () => void
}

export const useCam = create<CamState>((set) => ({
  focus: [0, 0],
  azStep: 0,
  zoom: ZOOM_DEFAULT,
  rotar: (dir) => set((s) => ({ azStep: s.azStep + dir })),
  zoomBy: (factor) =>
    set((s) => ({ zoom: clamp(s.zoom * factor, ZOOM_MIN, ZOOM_MAX) })),
  focusRoom: (pos) => set({ focus: [pos[0], pos[2]], zoom: ZOOM_ROOM }),
  reset: () => set({ focus: [0, 0], azStep: 0, zoom: ZOOM_DEFAULT }),
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useCam: typeof useCam }).useCam = useCam
}

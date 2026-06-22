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

/** Azimut base de la cámara isométrica (esquina iso por defecto). */
export const CAM_BASE_AZ = Math.PI / 4

// ── Geometría de la órbita de la cámara (fuente única para CameraRig y ViewCube).
//    Coincide con la posición original [22,22,22] mirando al origen.
const R_H = Math.hypot(22, 22) // radio horizontal iso (31.113)
/** Elevación de la vista isométrica (≈ 35.26°). */
export const ISO_EL = Math.atan2(22, R_H)
/** Distancia total de la cámara al foco (constante en todas las vistas iso/planos). */
export const CAM_R = Math.hypot(R_H, 22)
const TOP_EL = Math.PI / 2 - 0.02 // planta: casi cenital (evita degenerar el lookAt)
const SIDE_EL = 0 // planos laterales: vista horizontal (alzado)
/** Elevación de las vistas de arista (entre alzado y planta): mirada elevada ~45°. */
export const EDGE_EL = Math.PI / 4

/**
 * Vistas seleccionables desde el cubo: 4 esquinas iso + 5 planos + 4 aristas elevadas.
 */
export type VistaCubo =
  | 'iso-0'
  | 'iso-1'
  | 'iso-2'
  | 'iso-3'
  | 'top'
  | 'right'
  | 'front'
  | 'left'
  | 'back'
  | 'edge-right'
  | 'edge-front'
  | 'edge-left'
  | 'edge-back'

/** Azimut/elevación objetivo de cada vista del cubo. */
export const VISTAS_CUBO: Record<VistaCubo, { az: number; el: number }> = {
  'iso-0': { az: Math.PI / 4, el: ISO_EL },
  'iso-1': { az: (3 * Math.PI) / 4, el: ISO_EL },
  'iso-2': { az: (5 * Math.PI) / 4, el: ISO_EL },
  'iso-3': { az: (7 * Math.PI) / 4, el: ISO_EL },
  top: { az: Math.PI / 4, el: TOP_EL },
  right: { az: 0, el: SIDE_EL },
  front: { az: Math.PI / 2, el: SIDE_EL },
  left: { az: Math.PI, el: SIDE_EL },
  back: { az: (3 * Math.PI) / 2, el: SIDE_EL },
  // Aristas: mismo azimut que su alzado, pero con la cámara elevada.
  'edge-right': { az: 0, el: EDGE_EL },
  'edge-front': { az: Math.PI / 2, el: EDGE_EL },
  'edge-left': { az: Math.PI, el: EDGE_EL },
  'edge-back': { az: (3 * Math.PI) / 2, el: EDGE_EL },
}

/**
 * Orientación ANIMADA de la cámara (az/el ya interpolados), fuera de Zustand para no
 * provocar re-renders cada frame. La escribe CameraRig y la lee el cubo (ViewCube)
 * para girar en sincronía con la escena.
 */
export const camAnim = { az: CAM_BASE_AZ, el: ISO_EL }

/**
 * Vistas de cámara: isométrica (por defecto), tercera/primera persona, e interior
 * (perspectiva DESDE EL CENTRO del cuarto en edición, mirando la pared de enfrente).
 */
export type Vista = 'iso' | 'tercera' | 'primera' | 'interior'

/** Yaw (orientación en planta) para mirar hacia la pared del azimut `a` del cubo. */
export const yawHaciaPared = (a: number) => Math.atan2(Math.cos(a), Math.sin(a))

/** Sensibilidad del arrastre para girar la cámara (radianes por píxel). */
const LOOK_SENS = 0.0045
/** Límites de inclinación (pitch) según la vista, para no voltearse ni meterse bajo el suelo. */
const PITCH_1P = { min: -1.3, max: 1.3 }
// En 3ª persona se mantiene elevada (por encima de los muros): no baja del piso ni se va cenital.
const PITCH_3P = { min: 0.15, max: 1.35 }
/** Inclinación inicial de cada vista: 3ª persona elevada (mira hacia abajo), 1ª horizontal. */
const PITCH_3P_INI = 0.5
/** Distancia de la cámara al personaje en tercera persona (sin tope superior). */
const DIST_3P_DEFAULT = 7
const DIST_3P_MIN = 0.3 // solo evita incrustar la cámara en el avatar
/** Campo de visión en primera persona (sin tope de zoom). */
const FOV_1P_DEFAULT = 70
const FOV_1P_MIN = 1 // solo evita FOV degenerado en Three.js
const FOV_1P_MAX = 179 // tope técnico de perspectiva (no límite de juego)
/** Altura de los ojos en la vista interior (de pie en el centro del cuarto). */
export const INTERIOR_EYE = 1.45
/** FOV de la vista interior: más abierto para ver bien la perspectiva del cuarto. */
const FOV_INTERIOR = 100
/** Límites de elevación manual en vista iso (clic derecho arriba/abajo). */
const EL_ISO_MIN = SIDE_EL
const EL_ISO_MAX = TOP_EL

/** Desplaza el foco de la cámara según arrastre en pantalla (pan). */
export function panFocusByPixels(
  dxPx: number,
  dyPx: number,
  viewW: number,
  viewH: number,
  zoom: number,
  az: number,
  frustumW = 20,
  frustumH = 20,
) {
  const w = Math.max(1, viewW)
  const h = Math.max(1, viewH)
  const halfW = frustumW / (2 * Math.max(zoom, 0.001))
  const halfH = frustumH / (2 * Math.max(zoom, 0.001))
  const wppX = (2 * halfW) / w
  const wppY = (2 * halfH) / h
  const a = az
  const rightX = -Math.sin(a)
  const rightZ = Math.cos(a)
  const fwdX = -Math.cos(a)
  const fwdZ = -Math.sin(a)
  const { focus } = useCam.getState()
  useCam.setState({
    focus: [
      focus[0] + rightX * dxPx * wppX + fwdX * dyPx * wppY,
      focus[1], // Y (altura del pivote) no cambia al desplazar
      focus[2] + rightZ * dxPx * wppX + fwdZ * dyPx * wppY,
    ],
  })
}

/**
 * Estado de la cámara isométrica (lo aplica CameraRig en la escena 3D):
 * - focus: punto [x,y,z] que la cámara mira y alrededor del cual ROTA. La Y permite
 *   enfocar/rotar cuartos en niveles elevados sin que se salgan del cuadro.
 * - az/el: azimut y elevación objetivo (las elige el cubo de navegación)
 * - zoom: nivel de acercamiento (con topes)
 */
interface CamState {
  focus: [number, number, number]
  /** Azimut y elevación objetivo de la cámara (radianes); los aplica CameraRig. */
  az: number
  el: number
  zoom: number
  /** Vista activa: isométrica, tercera o primera persona. */
  vista: Vista
  /** Orientación de la cámara en perspectiva (1ª/3ª persona). */
  yaw: number
  pitch: number
  /** Distancia al personaje en tercera persona (rueda del ratón). */
  dist3p: number
  /** Campo de visión en primera persona (rueda del ratón, rango acotado). */
  fov1p: number
  /** Centro [x,y,z] del cuarto en la vista interior (null = no estamos en interior). */
  interiorCenter: [number, number, number] | null
  /** Selecciona una vista del cubo (esquina iso o plano). */
  setVistaIso: (key: VistaCubo) => void
  /**
   * Entra a la vista INTERIOR: cámara en el centro del cuarto mirando la pared del
   * azimut de `key` (alzado del cubo). `center` = centro del cuarto en edición.
   */
  verParedInterior: (key: VistaCubo, center: [number, number, number]) => void
  /** Gira la vista isométrica 90° (⟲ / ⟳ bajo el cubo). */
  rotar: (dir: 1 | -1) => void
  /** Inclina la vista iso arriba/abajo (clic derecho + arrastre vertical). */
  inclinarIso: (dyPx: number) => void
  zoomBy: (factor: number) => void
  zoomWheel: (deltaY: number) => void
  focusRoom: (pos: [number, number, number]) => void
  focusRoomEdit: (pos: [number, number, number]) => void
  /** Centra el foco isométrico sin cambiar az/el (p. ej. centro del mapa). */
  centrarIso: (pos: [number, number, number]) => void
  reset: () => void
  /** Cambia de vista (iso/tercera/primera). */
  setVista: (v: Vista) => void
  /** Cicla a la siguiente vista (iso → tercera → primera → iso). */
  ciclarVista: () => void
  /** Arrastre para girar la cámara en perspectiva (acumula yaw/pitch). */
  orbit: (dxPx: number, dyPx: number) => void
  /** Rueda en tercera persona: acerca/aleja la cámara del personaje. */
  zoomDist: (deltaY: number) => void
  zoomDistBy: (ratio: number) => void
  /** Rueda en primera persona: acerca/aleja con FOV (rango limitado). */
  zoomFov: (deltaY: number) => void
  zoomFovBy: (ratio: number) => void
}

export const useCam = create<CamState>((set, get) => ({
  focus: [0, 0, 0],
  az: CAM_BASE_AZ,
  el: ISO_EL,
  zoom: ZOOM_DEFAULT,
  vista: 'iso',
  yaw: Math.PI, // mira hacia -Z al inicio (de frente a la casa)
  pitch: 0.25,
  dist3p: DIST_3P_DEFAULT,
  fov1p: FOV_1P_DEFAULT,
  interiorCenter: null,
  setVistaIso: (key) =>
    set((s) => {
      const v = VISTAS_CUBO[key]
      // Seleccionar una vista del cubo siempre vuelve a la cámara isométrica.
      const base = { vista: 'iso' as Vista, interiorCenter: null }
      if (key === 'top') {
        // Planta: sube la cámara y rota al múltiplo de 90° más cercano para que las
        // paredes queden alineadas horizontal/verticalmente (no en diagonal).
        const snapAz = Math.round(s.az / (Math.PI / 2)) * (Math.PI / 2)
        return { ...base, az: snapAz, el: v.el }
      }
      return { ...base, az: v.az, el: v.el }
    }),
  verParedInterior: (key, center) => {
    const a = VISTAS_CUBO[key].az
    camAnim.az = a
    camAnim.el = 0.18
    set({
      vista: 'interior',
      interiorCenter: center,
      yaw: yawHaciaPared(a),
      pitch: 0,
      fov1p: FOV_INTERIOR,
    })
  },
  rotar: (dir) =>
    set((s) =>
      // En interior, rota la mirada a la pared contigua (90°); en iso gira el azimut.
      s.vista === 'interior'
        ? { yaw: s.yaw + dir * (Math.PI / 2) }
        : { az: s.az + dir * (Math.PI / 2) },
    ),
  inclinarIso: (dyPx) =>
    set((s) => ({
      el: clamp(s.el - dyPx * LOOK_SENS, EL_ISO_MIN, EL_ISO_MAX),
    })),
  zoomBy: (factor) =>
    set((s) => ({ zoom: clamp(s.zoom * factor, ZOOM_MIN, ZOOM_MAX) })),
  /** Rueda del ratón / pinch (deltaY negativo = acercar). */
  zoomWheel: (deltaY: number) =>
    set((s) => ({
      zoom: clamp(s.zoom * Math.pow(0.998, deltaY), ZOOM_MIN, ZOOM_MAX),
    })),
  focusRoom: (pos) => set({ focus: [pos[0], pos[1], pos[2]], zoom: ZOOM_ROOM }),
  focusRoomEdit: (pos) =>
    set({ focus: [pos[0], pos[1], pos[2]], zoom: ZOOM_ROOM_EDIT }),
  centrarIso: (pos) =>
    set({ focus: [pos[0], pos[1], pos[2]], zoom: ZOOM_DEFAULT, vista: 'iso', interiorCenter: null }),
  reset: () =>
    set({ focus: [0, 0, 0], az: CAM_BASE_AZ, el: ISO_EL, zoom: ZOOM_DEFAULT, vista: 'iso', interiorCenter: null }),
  setVista: (v) =>
    // Cada vista arranca con su inclinación natural (3ª elevada, 1ª horizontal).
    set((s) => ({
      vista: v,
      interiorCenter: v === 'interior' ? s.interiorCenter : null,
      pitch: v === 'tercera' ? PITCH_3P_INI : v === 'primera' ? 0 : s.pitch,
      dist3p: v === 'tercera' ? DIST_3P_DEFAULT : s.dist3p,
      fov1p: v === 'primera' ? FOV_1P_DEFAULT : s.fov1p,
    })),
  ciclarVista: () => {
    const v = get().vista
    const base = v === 'interior' ? 'iso' : v
    get().setVista(base === 'iso' ? 'tercera' : base === 'tercera' ? 'primera' : 'iso')
  },
  orbit: (dxPx, dyPx) =>
    set((s) => {
      const lim = s.vista === 'primera' || s.vista === 'interior' ? PITCH_1P : PITCH_3P
      return {
        yaw: s.yaw - dxPx * LOOK_SENS,
        pitch: clamp(s.pitch - dyPx * LOOK_SENS, lim.min, lim.max),
      }
    }),
  zoomDist: (deltaY) =>
    set((s) => ({
      dist3p: Math.max(DIST_3P_MIN, s.dist3p * Math.pow(1.0015, deltaY)),
    })),
  zoomDistBy: (ratio) =>
    set((s) => ({
      dist3p: Math.max(DIST_3P_MIN, s.dist3p / Math.max(ratio, 0.01)),
    })),
  zoomFov: (deltaY) =>
    set((s) => ({
      fov1p: Math.min(
        FOV_1P_MAX,
        Math.max(FOV_1P_MIN, s.fov1p * Math.pow(1.001, deltaY)),
      ),
    })),
  zoomFovBy: (ratio) =>
    set((s) => ({
      fov1p: Math.min(
        FOV_1P_MAX,
        Math.max(FOV_1P_MIN, s.fov1p / Math.max(ratio, 0.01)),
      ),
    })),
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useCam: typeof useCam }).useCam = useCam
}

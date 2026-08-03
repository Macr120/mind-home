import { create } from 'zustand'
import { miraFrame } from './miraFrame'
import { playerPos } from './playerPosition'
import { WALL_H } from '../house/walls'

export const ZOOM_DEFAULT = 17
const ZOOM_ROOM = 34 // zoom al agregar/enfocar cuarto en el mapa
const ZOOM_ROOM_EDIT = 46 // zoom al editar un cuarto (panel derecho abierto)
/** Ancho CSS del panel de edición (Tailwind w-80). CameraRig compensa con viewport.dpr. */
export const EDIT_PANEL_PX = 320
/** Fracción del ancho del panel para centrar en el área visible (menor = cuarto más a la derecha). */
export const EDIT_FOCUS_PANEL_FRAC = 0.34
/** Tope normal de alejamiento; en mapas grandes se rebaja hasta `zoomAjuste` (ver `zoomMin`). */
const ZOOM_MIN = 8
const ZOOM_MAX = 56
/** Piso absoluto de alejamiento (evita zooms degenerados si el encuadre saliera raro). */
const ZOOM_PISO = 1

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

/**
 * Zoom con el que cabe TODO el mapa en pantalla. Lo recalcula CameraRig con las medidas
 * reales del lienzo (rejilla, tamaño de celda, giro de la cámara y ventana), así el
 * alejamiento máximo crece con el mapa en vez de quedarse en un tope fijo.
 */
// Arranca en ZOOM_MAX: hasta que CameraRig publique el primer encuadre, los topes se
// comportan como siempre (mínimo 8, "centrar mapa" a ZOOM_DEFAULT).
let zoomAjuste = ZOOM_MAX
export const setZoomAjuste = (z: number) => {
  zoomAjuste = clamp(z, ZOOM_PISO, ZOOM_MAX)
}
/** Zoom mínimo permitido: el de siempre o, si el mapa no cabe, el que lo encuadra entero. */
export const zoomMin = () => Math.min(ZOOM_MIN, zoomAjuste)
/** Zoom para "centrar el mapa": encuadra la casa completa sin acercarse más de lo normal. */
export const zoomEncuadre = () => Math.min(ZOOM_DEFAULT, zoomAjuste)

/** Margen alrededor de lo encuadrado (1 = pegado a los bordes). */
const MARGEN_ENCUADRE = 0.92
/**
 * Alto estimado de la casa para encuadrar: tres niveles de muro. Solo pesa en las
 * vistas casi cenitales o de alzado, donde la extensión del suelo se aplana.
 */
const ALTO_CASA = WALL_H * 3

/**
 * Frustum ÚTIL del lienzo (el ancho ya sin el panel de edición), publicado por
 * CameraRig cada frame. Fuera de Zustand, como `camAnim`: se lee al encuadrar, no
 * debe provocar re-renders.
 */
export const lienzoCam = { fw: 0, fh: 0 }

/**
 * Zoom con el que un rectángulo de suelo de `ancho`×`largo` cabe en el lienzo, según
 * el giro de la cámara: en isométrica el suelo se proyecta como un rombo y el eje
 * vertical queda comprimido por la elevación.
 */
export function zoomParaRect(
  ancho: number,
  largo: number,
  fw: number,
  fh: number,
  az: number,
  el: number,
): number {
  const extX = ancho * Math.abs(Math.sin(az)) + largo * Math.abs(Math.cos(az))
  const extY =
    Math.abs(Math.sin(el)) * (ancho * Math.abs(Math.cos(az)) + largo * Math.abs(Math.sin(az))) +
    Math.abs(Math.cos(el)) * ALTO_CASA
  return Math.min(fw / Math.max(extX, 0.001), fh / Math.max(extY, 0.001)) * MARGEN_ENCUADRE
}

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

/**
 * Vistas seleccionables desde el cubo: 4 esquinas iso + 5 planos.
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

/** Azimut/elevación objetivo de cada vista del cubo. */
const VISTAS_CUBO: Record<VistaCubo, { az: number; el: number }> = {
  'iso-0': { az: Math.PI / 4, el: ISO_EL },
  'iso-1': { az: (3 * Math.PI) / 4, el: ISO_EL },
  'iso-2': { az: (5 * Math.PI) / 4, el: ISO_EL },
  'iso-3': { az: (7 * Math.PI) / 4, el: ISO_EL },
  top: { az: Math.PI / 4, el: TOP_EL },
  right: { az: 0, el: SIDE_EL },
  front: { az: Math.PI / 2, el: SIDE_EL },
  left: { az: Math.PI, el: SIDE_EL },
  back: { az: (3 * Math.PI) / 2, el: SIDE_EL },
}

/**
 * Orientación ANIMADA de la cámara (az/el ya interpolados), fuera de Zustand para no
 * provocar re-renders cada frame. La escribe CameraRig y la lee el cubo (ViewCube)
 * para girar en sincronía con la escena.
 */
export const camAnim = { az: CAM_BASE_AZ, el: ISO_EL }

/**
 * Vistas de cámara: isométrica (por defecto), tercera/primera persona, interior
 * (perspectiva DESDE EL CENTRO del cuarto en edición, mirando la pared de enfrente),
 * grafiti (cámara fija encuadrando la cara del muro que se está pintando) y
 * diálogo (sobre el hombro del jugador mirando al asistente, estilo RPG).
 */
export type Vista = 'iso' | 'tercera' | 'primera' | 'interior' | 'grafiti' | 'dialogo'

/** Encuadre del modo grafiti: cara del muro (centro/orientación/tamaño en mundo). */
export interface GrafitiCam {
  centro: [number, number, number]
  /** Rotación Y del plano de la cara (normal = [sin(rotY), 0, cos(rotY)]). */
  rotY: number
  ancho: number
  alto: number
}

/** Encuadre del modo diálogo: cabeza del NPC con el que se conversa. */
export interface DialogoCam {
  npc: [number, number, number]
}

/** Yaw (orientación en planta) para mirar hacia la pared del azimut `a` del cubo. */
const yawHaciaPared = (a: number) => Math.atan2(Math.cos(a), Math.sin(a))

/** Sensibilidad del arrastre para girar la cámara (radianes por píxel). */
const LOOK_SENS = 0.0045
/** Límites de inclinación (pitch) según la vista, para no voltearse ni meterse bajo el suelo. */
const PITCH_1P = { min: -1.3, max: 1.3 }
// En 3ª persona se mantiene elevada (por encima de los muros): no baja del piso ni se va cenital.
const PITCH_3P = { min: 0.15, max: 1.35 }
/**
 * Apuntando en 3ª persona la cámara SÍ puede nivelarse (y mirar un poco hacia
 * arriba): con el tope normal el tiro siempre convergía en el suelo, unos metros
 * por delante, y no había forma de apuntarle a nadie.
 */
const PITCH_3P_MIRA = { min: -0.35, max: 1.2 }
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
  /** Cara del muro encuadrada en la vista grafiti (null = no estamos pintando). */
  grafitiCam: GrafitiCam | null
  /** Cabeza del NPC encuadrada en la vista diálogo (null = sin conversación cara a cara). */
  dialogoCam: DialogoCam | null
  /** Selecciona una vista del cubo (esquina iso o plano). */
  setVistaIso: (key: VistaCubo) => void
  /**
   * Entra a la vista INTERIOR: cámara en el centro del cuarto mirando la pared del
   * azimut de `key` (alzado del cubo). `center` = centro del cuarto en edición.
   */
  verParedInterior: (key: VistaCubo, center: [number, number, number]) => void
  /** Entra a la vista GRAFITI: cámara fija sobre la normal de la cara, encuadrándola. */
  enfocarGrafiti: (datos: GrafitiCam) => void
  /** Entra a la vista DIÁLOGO: cámara sobre el hombro del jugador mirando al NPC. */
  enfocarDialogo: (datos: DialogoCam) => void
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
  /**
   * Encuadra un rectángulo del suelo (cuadrante del mapa): centra el foco en él y
   * ajusta el zoom para que quepa. El tope de alejamiento no cambia, así que desde
   * un cuadrante siempre se puede volver a alejar hasta ver la casa completa.
   */
  enfocarZona: (centro: [number, number, number], ancho: number, largo: number) => void
  reset: () => void
  /** Cambia de vista (iso/tercera/primera). */
  setVista: (v: Vista) => void
  /** Cicla a la siguiente vista (iso → tercera → primera → iso). */
  ciclarVista: () => void
  /** Arrastre para girar la cámara en perspectiva (acumula yaw/pitch). */
  orbit: (dxPx: number, dyPx: number) => void
  /**
   * Al bajar la mira devuelve la inclinación al rango normal de 3ª persona: si
   * se apuntó nivelado (o hacia arriba), con la cámara otra vez lejos ese mismo
   * ángulo la metería bajo el suelo.
   */
  soltarMira: () => void
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
  grafitiCam: null,
  dialogoCam: null,
  setVistaIso: (key) =>
    set((s) => {
      const v = VISTAS_CUBO[key]
      // Seleccionar una vista del cubo siempre vuelve a la cámara isométrica.
      const base = { vista: 'iso' as Vista, interiorCenter: null, grafitiCam: null, dialogoCam: null }
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
  enfocarGrafiti: (datos) => set({ vista: 'grafiti', grafitiCam: datos }),
  enfocarDialogo: (datos) => set({ vista: 'dialogo', dialogoCam: datos }),
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
    set((s) => ({ zoom: clamp(s.zoom * factor, zoomMin(), ZOOM_MAX) })),
  /** Rueda del ratón / pinch (deltaY negativo = acercar). */
  zoomWheel: (deltaY: number) =>
    set((s) => ({
      zoom: clamp(s.zoom * Math.pow(0.998, deltaY), zoomMin(), ZOOM_MAX),
    })),
  focusRoom: (pos) => set({ focus: [pos[0], pos[1], pos[2]], zoom: ZOOM_ROOM }),
  focusRoomEdit: (pos) =>
    set({ focus: [pos[0], pos[1], pos[2]], zoom: ZOOM_ROOM_EDIT }),
  centrarIso: (pos) =>
    set({ focus: [pos[0], pos[1], pos[2]], zoom: zoomEncuadre(), vista: 'iso', interiorCenter: null, grafitiCam: null, dialogoCam: null }),
  enfocarZona: (centro, ancho, largo) =>
    set((s) => ({
      focus: [centro[0], centro[1], centro[2]],
      vista: 'iso',
      interiorCenter: null,
      grafitiCam: null,
      dialogoCam: null,
      // Antes del primer frame no hay medidas del lienzo: se conserva el zoom actual.
      zoom:
        lienzoCam.fw > 0
          ? clamp(
              zoomParaRect(ancho, largo, lienzoCam.fw, lienzoCam.fh, camAnim.az, camAnim.el),
              ZOOM_PISO,
              ZOOM_MAX,
            )
          : s.zoom,
    })),
  reset: () =>
    set({ focus: [0, 0, 0], az: CAM_BASE_AZ, el: ISO_EL, zoom: zoomEncuadre(), vista: 'iso', interiorCenter: null, grafitiCam: null, dialogoCam: null }),
  setVista: (v) =>
    // Cada vista arranca con su inclinación natural (3ª elevada, 1ª horizontal).
    set((s) => ({
      vista: v,
      // Volver a iso desde una vista que SÍ seguía al personaje (3ª/1ª): el foco
      // isométrico se queda donde estaba, así que tras andar lejos el mapa
      // aparecía fuera de cuadro. Se recoloca sobre el personaje.
      focus:
        v === 'iso' && s.vista !== 'iso'
          ? ([playerPos.x, playerPos.y, playerPos.z] as [number, number, number])
          : s.focus,
      interiorCenter: v === 'interior' ? s.interiorCenter : null,
      grafitiCam: v === 'grafiti' ? s.grafitiCam : null,
      dialogoCam: v === 'dialogo' ? s.dialogoCam : null,
      pitch: v === 'tercera' ? PITCH_3P_INI : v === 'primera' ? 0 : s.pitch,
      dist3p: v === 'tercera' ? DIST_3P_DEFAULT : s.dist3p,
      fov1p: v === 'primera' ? FOV_1P_DEFAULT : s.fov1p,
    })),
  ciclarVista: () => {
    const v = get().vista
    // Pintando o conversando cara a cara: la cámara está fija en su objetivo.
    if (v === 'grafiti' || v === 'dialogo') return
    const base = v === 'interior' ? 'iso' : v
    get().setVista(base === 'iso' ? 'tercera' : base === 'tercera' ? 'primera' : 'iso')
  },
  orbit: (dxPx, dyPx) =>
    set((s) => {
      const lim =
        s.vista === 'primera' || s.vista === 'interior'
          ? PITCH_1P
          : miraFrame.apuntando
            ? PITCH_3P_MIRA
            : PITCH_3P
      return {
        yaw: s.yaw - dxPx * LOOK_SENS,
        pitch: clamp(s.pitch - dyPx * LOOK_SENS, lim.min, lim.max),
      }
    }),
  soltarMira: () =>
    set((s) =>
      s.vista === 'tercera' && s.pitch < PITCH_3P.min ? { pitch: PITCH_3P.min } : {},
    ),
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

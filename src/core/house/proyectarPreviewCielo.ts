import * as THREE from 'three'
import {
  CAM_BASE_AZ,
  CAM_R,
  EDIT_FOCUS_PANEL_FRAC,
  EDIT_PANEL_PX,
  ISO_EL,
  ZOOM_DEFAULT,
} from '../state/cameraStore'

/**
 * Proyector 2D que replica EXACTAMENTE la cámara isométrica del canvas:
 * recibe un punto del mundo (x,y,z) y devuelve su píxel dentro de un viewport
 * de `vpW`×`vpH`. Usado por la vista previa para dibujar la silueta del mapa
 * en las mismas coordenadas que el cielo 3D real.
 */
export function crearProyectorCielo(vpW: number, vpH: number, editMode: boolean) {
  const cam = new THREE.OrthographicCamera(-vpW / 2, vpW / 2, vpH / 2, -vpH / 2, -100, 300)
  cam.zoom = ZOOM_DEFAULT
  cam.updateProjectionMatrix()

  const focus = new THREE.Vector3(0, 0, 0)
  if (editMode) {
    const dpr = Math.min((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1, 1.5)
    const worldPerPx = 1 / ZOOM_DEFAULT
    const shift = EDIT_PANEL_PX * dpr * EDIT_FOCUS_PANEL_FRAC * worldPerPx
    focus.x -= -Math.sin(CAM_BASE_AZ) * shift
    focus.z -= Math.cos(CAM_BASE_AZ) * shift
  }

  const ce = Math.cos(ISO_EL)
  const se = Math.sin(ISO_EL)
  cam.position.set(
    focus.x + CAM_R * ce * Math.cos(CAM_BASE_AZ),
    focus.y + CAM_R * se,
    focus.z + CAM_R * ce * Math.sin(CAM_BASE_AZ),
  )
  cam.lookAt(focus)
  cam.updateMatrixWorld(true)

  return (wx: number, wy: number, wz: number) => {
    const v = new THREE.Vector3(wx, wy, wz).project(cam)
    return {
      x: ((v.x + 1) / 2) * vpW,
      y: ((1 - v.y) / 2) * vpH,
    }
  }
}

/**
 * Ancho del canvas 3D. El canvas ocupa TODA la ventana (el panel de edición se
 * superpone encima), así que la imagen de fondo se dibuja a lo ancho completo:
 * la vista previa usa el mismo ancho para coincidir con el render real.
 */
export function anchoCanvasVisible(): number {
  if (typeof window === 'undefined') return 800
  return Math.max(400, window.innerWidth)
}

export function altoCanvasVisible(): number {
  if (typeof window === 'undefined') return 600
  return Math.max(300, window.innerHeight)
}

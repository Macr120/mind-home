import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  useCam,
  camAnim,
  EDIT_PANEL_PX,
  EDIT_FOCUS_PANEL_FRAC,
  CAM_BASE_AZ,
  ISO_EL,
  CAM_R,
  setZoomAjuste,
  zoomParaRect,
  lienzoCam,
} from '../state/cameraStore'
import { useLayout } from '../state/layoutStore'
import { SPACING } from './walls'

/**
 * Publica las medidas del encuadre: el frustum útil del lienzo (`lienzoCam`) y el zoom
 * con el que la rejilla completa cabe en pantalla (`setZoomAjuste`). Con eso la rueda
 * puede alejarse tanto como haga falta en mapas grandes y los cuadrantes saben
 * encuadrarse solos.
 */
function publicarEncuadre(cam: THREE.OrthographicCamera, anchoCss: number, a: number, e: number) {
  const { gridCols, gridRows, editMode } = useLayout.getState()
  let fw = cam.right - cam.left
  const fh = cam.top - cam.bottom
  // Con el panel de edición abierto solo se ve el mapa a su izquierda.
  if (editMode) fw = Math.max(1, fw - EDIT_PANEL_PX * (fw / Math.max(1, anchoCss)))
  lienzoCam.fw = fw
  lienzoCam.fh = fh
  setZoomAjuste(zoomParaRect(gridCols * SPACING, gridRows * SPACING, fw, fh, a, e))
}

/** Interpola un ángulo tomando siempre el camino corto (maneja el salto en ±π). */
function lerpAngulo(actual: number, objetivo: number, t: number) {
  let d = objetivo - actual
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return actual + d * t
}

/**
 * Mueve la cámara ortográfica de forma suave según el estado de useCam: gira al
 * azimut/elevación objetivo (los elige el cubo de navegación), hace zoom y enfoca
 * cuartos. La elevación va de las esquinas iso a la planta (cenital) o a los alzados
 * laterales. Publica la orientación animada en `camAnim` para que el cubo gire igual.
 *
 * Con el panel de edición abierto (`editMode`), desplaza el enfoque a la izquierda
 * para centrar el mapa/cuarto en el área visible (panel derecho w-80).
 */
export function CameraRig() {
  const cam = useThree((s) => s.camera) as THREE.OrthographicCamera
  const size = useThree((s) => s.size)
  const viewport = useThree((s) => s.viewport)
  const focusRef = useRef(new THREE.Vector3(0, 0, 0))
  const azRef = useRef(CAM_BASE_AZ)
  const elRef = useRef(ISO_EL)
  const tmp = useRef(new THREE.Vector3())

  useFrame(() => {
    const { focus, az, el, zoom, vista } = useCam.getState()
    // En primera/tercera persona la cámara la conduce FollowCamera (perspectiva).
    if (vista !== 'iso') return
    // Guarda de seguridad: si la cámara activa en R3F todavía es la perspectiva (transición),
    // no la tocamos — aplicar zoom ortográfico a una PerspectiveCamera destruye su FOV.
    if (!(cam instanceof THREE.OrthographicCamera)) return
    const editMode = useLayout.getState().editMode

    if (cam.view) cam.clearViewOffset()

    azRef.current = lerpAngulo(azRef.current, az, 0.14)
    elRef.current += (el - elRef.current) * 0.14
    const a = azRef.current
    const e = elRef.current
    // Publica la orientación animada para el cubo de navegación.
    camAnim.az = a
    camAnim.el = e
    publicarEncuadre(cam, size.width, a, e)

    tmp.current.set(focus[0], focus[1], focus[2])
    if (editMode) {
      const w = Math.max(1, size.width)
      const dpr = viewport.dpr || 1
      // Desplaza el enfoque para centrar en el área libre (izq. del panel w-80).
      const shiftPx = EDIT_PANEL_PX * dpr * EDIT_FOCUS_PANEL_FRAC
      const halfW = (cam.right - cam.left) / (2 * Math.max(cam.zoom, 0.001))
      const worldPerPx = (2 * halfW) / w
      const shift = shiftPx * worldPerPx
      const rightX = -Math.sin(a)
      const rightZ = Math.cos(a)
      tmp.current.x -= rightX * shift
      tmp.current.z -= rightZ * shift
    }

    focusRef.current.lerp(tmp.current, 0.12)

    const ce = Math.cos(e)
    const se = Math.sin(e)
    cam.position.set(
      focusRef.current.x + CAM_R * ce * Math.cos(a),
      focusRef.current.y + CAM_R * se,
      focusRef.current.z + CAM_R * ce * Math.sin(a),
    )
    cam.lookAt(focusRef.current)

    const nz = THREE.MathUtils.lerp(cam.zoom, zoom, 0.15)
    if (Math.abs(nz - cam.zoom) > 0.001) {
      cam.zoom = nz
      cam.updateProjectionMatrix()
    }
  })

  return null
}

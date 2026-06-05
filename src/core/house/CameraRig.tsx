import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  useCam,
  EDIT_PANEL_PX,
  EDIT_FOCUS_PANEL_FRAC,
  CAM_BASE_AZ,
} from '../state/cameraStore'
import { useLayout } from '../state/layoutStore'

// Geometría isométrica fija: radio horizontal y altura de la cámara.
// (Coincide con la posición inicial [22,22,22] mirando al origen.)
const R_H = 31.113 // sqrt(22^2 + 22^2)
const H = 22
const BASE_AZ = CAM_BASE_AZ

/**
 * Mueve la cámara ortográfica de forma suave según el estado de useCam:
 * rota entre las 4 esquinas, hace zoom y enfoca cuartos. El ángulo vertical
 * es fijo, así que nunca se voltea de cabeza ni baja del piso.
 *
 * Con el panel de edición abierto (`editMode`), desplaza el enfoque a la izquierda
 * para centrar el mapa/cuarto en el área visible (panel derecho w-80).
 */
export function CameraRig() {
  const cam = useThree((s) => s.camera) as THREE.OrthographicCamera
  const size = useThree((s) => s.size)
  const viewport = useThree((s) => s.viewport)
  const focusRef = useRef(new THREE.Vector3(0, 0, 0))
  const azRef = useRef(BASE_AZ)
  const tmp = useRef(new THREE.Vector3())

  useFrame(() => {
    const { focus, azStep, zoom } = useCam.getState()
    const editMode = useLayout.getState().editMode

    if (cam.view) cam.clearViewOffset()

    const desiredAz = BASE_AZ + azStep * (Math.PI / 2)
    azRef.current += (desiredAz - azRef.current) * 0.14
    const a = azRef.current

    tmp.current.set(focus[0], 0, focus[1])
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

    cam.position.set(
      focusRef.current.x + R_H * Math.cos(a),
      H,
      focusRef.current.z + R_H * Math.sin(a),
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

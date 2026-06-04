import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCam } from '../state/cameraStore'

// Geometría isométrica fija: radio horizontal y altura de la cámara.
// (Coincide con la posición inicial [22,22,22] mirando al origen.)
const R_H = 31.113 // sqrt(22^2 + 22^2)
const H = 22
const BASE_AZ = Math.PI / 4 // 45° → esquina inicial

/**
 * Mueve la cámara ortográfica de forma suave según el estado de useCam:
 * rota entre las 4 esquinas, hace zoom y enfoca cuartos. El ángulo vertical
 * es fijo, así que nunca se voltea de cabeza ni baja del piso.
 */
export function CameraRig() {
  const cam = useThree((s) => s.camera) as THREE.OrthographicCamera
  const focusRef = useRef(new THREE.Vector3(0, 0, 0))
  const azRef = useRef(BASE_AZ)
  const tmp = useRef(new THREE.Vector3())

  useFrame(() => {
    const { focus, azStep, zoom } = useCam.getState()

    // Enfoque (lerp suave al cuarto/centro)
    focusRef.current.lerp(tmp.current.set(focus[0], 0, focus[1]), 0.12)

    // Rotación (lerp del ángulo hacia la esquina objetivo)
    const desiredAz = BASE_AZ + azStep * (Math.PI / 2)
    azRef.current += (desiredAz - azRef.current) * 0.14
    const a = azRef.current

    cam.position.set(
      focusRef.current.x + R_H * Math.cos(a),
      H,
      focusRef.current.z + R_H * Math.sin(a),
    )
    cam.lookAt(focusRef.current)

    // Zoom (lerp suave)
    const nz = THREE.MathUtils.lerp(cam.zoom, zoom, 0.15)
    if (Math.abs(nz - cam.zoom) > 0.001) {
      cam.zoom = nz
      cam.updateProjectionMatrix()
    }
  })

  return null
}

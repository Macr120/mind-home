import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  useCam,
  camAnim,
  INTERIOR_EYE,
  EDIT_PANEL_PX,
  EDIT_FOCUS_PANEL_FRAC,
} from '../state/cameraStore'
import { playerPos } from '../state/playerPosition'
import { lookPad } from './lookInput'

/** Velocidad del joystick de vista (px-equivalentes por frame que recibe `orbit`). */
const LOOK_PAD_K = 7

// Temporales reutilizables (una sola cámara en escena).
const _fwd = new THREE.Vector3()
const _head = new THREE.Vector3()
const _look = new THREE.Vector3()
const _pos = new THREE.Vector3()

const ALTURA_OJOS = 1.5 // altura de la cabeza del avatar (primera persona)
const ALTURA_OBJETIVO = 1.2 // punto al que mira la cámara en tercera persona

/**
 * Cámara en perspectiva que sigue al personaje en primera y tercera persona.
 * - Toma el control de la cámara activa (vía `set` de R3F) cuando la vista no es iso,
 *   y restaura la ortográfica al volver. (Gestión manual, más fiable que makeDefault.)
 * - Se orienta con yaw/pitch: clic DERECHO + arrastre (PC) o arrastrar con un dedo
 *   (móvil/tablet); también el joystick de vista (`lookPad`).
 * - Tercera persona: detrás y por encima del personaje; distancia fija (sin zoom auto al entrar cuartos).
 * - Primera persona: en la cabeza, mirando hacia adelante.
 */
export function FollowCamera() {
  const vista = useCam((s) => s.vista)
  const activa = vista !== 'iso'
  const gl = useThree((s) => s.gl)
  const set = useThree((s) => s.set)
  const get = useThree((s) => s.get)
  const camActual = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  // DEV: permite leer la cámara activa de R3F desde la consola (depuración).
  if (import.meta.env.DEV) {
    ;(window as unknown as { __r3fGet?: typeof get }).__r3fGet = get
  }

  // Cámara perspectiva persistente (creada una vez) y referencia a la ortográfica original.
  const perspRef = useRef<THREE.PerspectiveCamera | null>(null)
  if (!perspRef.current) {
    perspRef.current = new THREE.PerspectiveCamera(70, 1, 0.1, 600)
  }
  const orthoRef = useRef<THREE.OrthographicCamera | null>(null)

  // Guarda la ortográfica del Canvas para restaurarla al volver a iso (StrictMode / cambios de vista).
  useEffect(() => {
    if (vista === 'iso' && camActual instanceof THREE.OrthographicCamera) {
      orthoRef.current = camActual
    }
  }, [vista, camActual])

  // Activa/desactiva la cámara perspectiva como cámara por defecto de la escena.
  useEffect(() => {
    if (!activa) {
      if (orthoRef.current) set({ camera: orthoRef.current })
      return
    }
    const cam = perspRef.current!
    // Resetear zoom antes de activar: CameraRig puede haberlo contaminado si corrió
    // un frame con vista='iso' mientras la cámara activa aún era la perspectiva.
    cam.zoom = 1
    cam.aspect = size.width / Math.max(1, size.height)
    cam.updateProjectionMatrix()
    set({ camera: cam })
    return () => {
      if (orthoRef.current) set({ camera: orthoRef.current })
    }
    // size se gestiona en su propio efecto; aquí solo importa el cambio de vista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa, set])

  // Mantiene el aspect ratio de la perspectiva al redimensionar la ventana.
  useEffect(() => {
    const cam = perspRef.current!
    cam.aspect = size.width / Math.max(1, size.height)
    cam.updateProjectionMatrix()
  }, [size])

  // Arrastre para girar la cámara (clic derecho/dedo); rueda/pinch = zoom en 1ª y 3ª persona.
  useEffect(() => {
    if (!activa) return
    const el = gl.domElement

    // PC: clic DERECHO + arrastre orbita. mousedown/mousemove es más fiable que
    // pointerdown en Windows (el menú contextual puede cancelar el pointer antes de mover).
    let mouseOn = false
    let mx = 0, my = 0
    const downMouse = (e: MouseEvent) => {
      if (e.button !== 2) return
      mouseOn = true; mx = e.clientX; my = e.clientY
    }
    const moveMouse = (e: MouseEvent) => {
      if (!mouseOn) return
      useCam.getState().orbit(e.clientX - mx, e.clientY - my)
      mx = e.clientX; my = e.clientY
    }
    const upMouse = (e: MouseEvent) => { if (e.button === 2) mouseOn = false }

    // Móvil/tablet: un dedo = orbitar; dos dedos = zoom (pinch).
    let tid = -1, tx = 0, ty = 0
    let pinchOn = false
    let pinchDist = 0
    const downTouch = (e: TouchEvent) => {
      if (e.touches.length !== 1 || tid !== -1) return
      const t = e.touches[0]
      tid = t.identifier; tx = t.clientX; ty = t.clientY
    }
    const moveTouch = (e: TouchEvent) => {
      if (pinchOn || e.touches.length !== 1 || tid === -1) return
      const t = Array.from(e.touches).find((t) => t.identifier === tid)
      if (!t) return
      useCam.getState().orbit(t.clientX - tx, t.clientY - ty)
      tx = t.clientX; ty = t.clientY
    }
    const endTouch = (e: TouchEvent) => {
      if (Array.from(e.changedTouches).some((t) => t.identifier === tid)) tid = -1
    }

    const wheel = (e: WheelEvent) => {
      const vista = useCam.getState().vista
      if (vista === 'iso') return
      e.preventDefault()
      // Interior y 1ª persona hacen zoom con FOV; 3ª persona acerca/aleja la cámara.
      if (vista === 'tercera') useCam.getState().zoomDist(e.deltaY)
      else useCam.getState().zoomFov(e.deltaY)
    }

    const pinchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      pinchOn = true
      tid = -1
      const [a, b] = [e.touches[0], e.touches[1]]
      pinchDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    }
    const pinchMove = (e: TouchEvent) => {
      if (!pinchOn || e.touches.length !== 2) return
      e.preventDefault()
      const [a, b] = [e.touches[0], e.touches[1]]
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      const ratio = d / Math.max(pinchDist, 1)
      if (Math.abs(ratio - 1) < 0.002) return
      const vista = useCam.getState().vista
      if (vista === 'tercera') useCam.getState().zoomDistBy(ratio)
      else if (vista === 'primera' || vista === 'interior') useCam.getState().zoomFovBy(ratio)
      pinchDist = d
    }
    const pinchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchOn = false
    }
    // Evita el menú contextual del clic derecho mientras se orbita en perspectiva.
    const ctx = (e: MouseEvent) => e.preventDefault()

    el.addEventListener('mousedown', downMouse)
    window.addEventListener('mousemove', moveMouse)
    window.addEventListener('mouseup', upMouse)
    el.addEventListener('touchstart', downTouch, { passive: true })
    el.addEventListener('touchstart', pinchStart, { passive: true })
    window.addEventListener('touchmove', moveTouch)
    window.addEventListener('touchmove', pinchMove, { passive: false })
    window.addEventListener('touchend', endTouch)
    window.addEventListener('touchend', pinchEnd)
    window.addEventListener('touchcancel', endTouch)
    window.addEventListener('touchcancel', pinchEnd)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('contextmenu', ctx)
    return () => {
      el.removeEventListener('mousedown', downMouse)
      window.removeEventListener('mousemove', moveMouse)
      window.removeEventListener('mouseup', upMouse)
      el.removeEventListener('touchstart', downTouch)
      el.removeEventListener('touchstart', pinchStart)
      window.removeEventListener('touchmove', moveTouch)
      window.removeEventListener('touchmove', pinchMove)
      window.removeEventListener('touchend', endTouch)
      window.removeEventListener('touchend', pinchEnd)
      window.removeEventListener('touchcancel', endTouch)
      window.removeEventListener('touchcancel', pinchEnd)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('contextmenu', ctx)
    }
  }, [activa, gl])

  useFrame(() => {
    if (!activa) return
    const cam = perspRef.current!
    // Joystick de vista: gira la cámara de forma continua mientras se sostiene.
    if (lookPad.x !== 0 || lookPad.y !== 0) {
      useCam.getState().orbit(lookPad.x * LOOK_PAD_K, lookPad.y * LOOK_PAD_K)
    }
    const st = useCam.getState()
    const { yaw, pitch, dist3p, fov1p } = st
    const ce = Math.cos(pitch)
    const se = Math.sin(pitch)

    // El desplazamiento de viewport solo aplica en interior; en 1ª/3ª se limpia.
    if (st.vista !== 'interior' && cam.view?.enabled) cam.clearViewOffset()

    if (st.vista === 'interior' && st.interiorCenter) {
      // De pie en el CENTRO del cuarto, mirando la pared de enfrente (yaw/pitch).
      if (cam.fov !== fov1p) {
        cam.fov = fov1p
        cam.updateProjectionMatrix()
      }
      // Compensa el panel de edición (derecha, w-80): desplaza la imagen a la
      // izquierda para centrar la pared en el área visible (sin deformar ni hacer zoom).
      const offX = EDIT_PANEL_PX * EDIT_FOCUS_PANEL_FRAC
      cam.setViewOffset(size.width, size.height, offX, 0, size.width, size.height)
      const c = st.interiorCenter
      _head.set(c[0], c[1] + INTERIOR_EYE, c[2])
      cam.position.lerp(_head, 0.4)
      _fwd.set(Math.sin(yaw) * ce, se, Math.cos(yaw) * ce)
      _look.copy(cam.position).add(_fwd)
      cam.lookAt(_look)
      // Mantiene el cubo de navegación orientado a la pared que se mira.
      camAnim.az = Math.atan2(Math.cos(yaw), Math.sin(yaw))
      camAnim.el = 0.18
      cam.updateMatrixWorld()
      return
    }

    if (st.vista === 'primera') {
      if (cam.fov !== fov1p) {
        cam.fov = fov1p
        cam.updateProjectionMatrix()
      }
      // Cámara en la cabeza, mirando hacia adelante (pitch>0 = arriba).
      _head.set(playerPos.x, playerPos.y + ALTURA_OJOS, playerPos.z)
      cam.position.lerp(_head, 0.5)
      _fwd.set(Math.sin(yaw) * ce, se, Math.cos(yaw) * ce)
      _look.copy(cam.position).add(_fwd)
      cam.lookAt(_look)
    } else {
      if (cam.fov !== 70) {
        cam.fov = 70
        cam.updateProjectionMatrix()
      }
      // Tercera persona: cámara orbitando la cabeza, ELEVADA (pitch>0 = por encima),
      // a distancia dist3p; mira hacia abajo al personaje.
      _head.set(playerPos.x, playerPos.y + ALTURA_OBJETIVO, playerPos.z)
      const dx = Math.sin(yaw) * ce
      const dy = se
      const dz = Math.cos(yaw) * ce
      _pos.set(
        _head.x + dx * dist3p,
        _head.y + dy * dist3p,
        _head.z + dz * dist3p,
      )
      cam.position.lerp(_pos, 0.35)
      cam.lookAt(_head)
    }
    cam.updateMatrixWorld()
  })

  return null
}

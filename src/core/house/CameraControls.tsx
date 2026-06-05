import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useCam, panFocusByPixels } from '../state/cameraStore'
import { useDiseño } from '../state/disenoStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'

const dist2 = (a: Touch, b: Touch) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

/**
 * Controles de cámara en el canvas:
 * - Ratón: rueda = zoom, botón central + arrastre = pan, doble clic central = centrar mapa
 * - Táctil: dos dedos = pan; separar/juntar = zoom
 */
export function CameraControls() {
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera

  const panMouse = useRef<{ on: boolean; x: number; y: number }>({
    on: false,
    x: 0,
    y: 0,
  })
  const touch = useRef<{
    on: boolean
    dist: number
    midX: number
    midY: number
  }>({ on: false, dist: 0, midX: 0, midY: 0 })

  useEffect(() => {
    const el = gl.domElement

    const arrastrandoAlgo = () =>
      useLayout.getState().draggingId != null ||
      useDiseño.getState().draggingObjeto != null

    const frustum = () => ({
      w: camera.right - camera.left,
      h: camera.top - camera.bottom,
    })

    const aplicarPan = (dx: number, dy: number) => {
      const { zoom, azStep } = useCam.getState()
      const { w, h } = frustum()
      panFocusByPixels(dx, dy, size.width, size.height, zoom, azStep, w, h)
    }

    const centrarMapa = () => {
      const editingRoomId = useLayout.getState().editingRoomId
      if (editingRoomId) {
        useCam.getState().focusRoomEdit(roomWorldPos(editingRoomId))
      } else {
        useCam.getState().reset()
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      useCam.getState().zoomWheel(e.deltaY)
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return
      e.preventDefault()
      if (e.detail >= 2) {
        panMouse.current.on = false
        document.body.style.cursor = ''
        centrarMapa()
        return
      }
      panMouse.current = { on: true, x: e.clientX, y: e.clientY }
      document.body.style.cursor = 'grabbing'
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!panMouse.current.on) return
      e.preventDefault()
      const dx = e.clientX - panMouse.current.x
      const dy = e.clientY - panMouse.current.y
      panMouse.current.x = e.clientX
      panMouse.current.y = e.clientY
      aplicarPan(dx, dy)
    }

    const finPanMouse = () => {
      if (!panMouse.current.on) return
      panMouse.current.on = false
      document.body.style.cursor = ''
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      touch.current.on = true
      touch.current.dist = dist2(e.touches[0], e.touches[1])
      touch.current.midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      touch.current.midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touch.current.on || e.touches.length !== 2) return
      if (arrastrandoAlgo()) return
      e.preventDefault()
      const d = dist2(e.touches[0], e.touches[1])
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const ratio = d / Math.max(touch.current.dist, 1)
      if (Math.abs(ratio - 1) > 0.002) {
        useCam.getState().zoomBy(ratio)
        touch.current.dist = d
      }
      aplicarPan(midX - touch.current.midX, midY - touch.current.midY)
      touch.current.midX = midX
      touch.current.midY = midY
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) touch.current.on = false
    }

    const onContextMenu = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', finPanMouse)
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    el.addEventListener('contextmenu', onContextMenu)

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', finPanMouse)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('contextmenu', onContextMenu)
      document.body.style.cursor = ''
    }
  }, [gl, size.width, size.height, camera])

  return null
}

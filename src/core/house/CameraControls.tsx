import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useCam, panFocusByPixels } from '../state/cameraStore'
import { useDiseño } from '../state/disenoStore'
import { useLayout, mapFocusPos } from '../state/layoutStore'

const dist2 = (a: Touch, b: Touch) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

/**
 * Controles de cámara en el canvas:
 * - Ratón: rueda = zoom, botón central + arrastre = pan, doble clic central = centrar mapa
 * - Iso: clic derecho + arrastre vertical = inclinar vista arriba/abajo
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
  const tiltMouse = useRef<{ on: boolean; y: number }>({ on: false, y: 0 })

  useEffect(() => {
    const el = gl.domElement

    const quitarFocoCampos = () => {
      const active = document.activeElement as HTMLElement | null
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          active.isContentEditable)
      ) {
        active.blur()
      }
    }
    el.addEventListener('pointerdown', quitarFocoCampos)

    const arrastrandoAlgo = () =>
      useLayout.getState().draggingId != null ||
      useDiseño.getState().draggingObjeto != null

    const frustum = () => ({
      w: camera.right - camera.left,
      h: camera.top - camera.bottom,
    })

    const aplicarPan = (dx: number, dy: number) => {
      const { zoom, az } = useCam.getState()
      const { w, h } = frustum()
      panFocusByPixels(dx, dy, size.width, size.height, zoom, az, w, h)
    }

    const centrarMapa = () => {
      useCam.getState().centrarIso(mapFocusPos())
    }

    // En 1ª/3ª persona el zoom/pan los gestiona FollowCamera (perspectiva).
    const enIso = () => useCam.getState().vista === 'iso'

    const onWheel = (e: WheelEvent) => {
      if (!enIso()) return
      e.preventDefault()
      useCam.getState().zoomWheel(e.deltaY)
    }

    const onMouseDown = (e: MouseEvent) => {
      if (!enIso()) return
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
      if (!enIso()) return
      if (e.touches.length !== 2) return
      touch.current.on = true
      touch.current.dist = dist2(e.touches[0], e.touches[1])
      touch.current.midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      touch.current.midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!enIso()) return
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

    const onRightDown = (e: MouseEvent) => {
      if (!enIso()) return
      if (e.button !== 2) return
      e.preventDefault()
      tiltMouse.current = { on: true, y: e.clientY }
    }

    const onRightMove = (e: MouseEvent) => {
      if (!tiltMouse.current.on) return
      e.preventDefault()
      const dy = e.clientY - tiltMouse.current.y
      tiltMouse.current.y = e.clientY
      useCam.getState().inclinarIso(dy)
    }

    const finTiltMouse = (e: MouseEvent) => {
      if (e.button === 2) tiltMouse.current.on = false
    }

    const onContextMenu = (e: MouseEvent) => {
      if (enIso() || e.button === 1) e.preventDefault()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('mousedown', onRightDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mousemove', onRightMove)
    window.addEventListener('mouseup', finPanMouse)
    window.addEventListener('mouseup', finTiltMouse)
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    el.addEventListener('contextmenu', onContextMenu)

    return () => {
      el.removeEventListener('pointerdown', quitarFocoCampos)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('mousedown', onRightDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousemove', onRightMove)
      window.removeEventListener('mouseup', finPanMouse)
      window.removeEventListener('mouseup', finTiltMouse)
      tiltMouse.current.on = false
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

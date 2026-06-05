import { useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useLayout } from '../state/layoutStore'
import { worldToCell } from './walls'

const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _ray = new THREE.Raycaster()
const _hit = new THREE.Vector3()

/**
 * Mientras se arrastra un cuarto (modo edición), proyecta el cursor sobre el
 * piso, lo ajusta a la celda más cercana y actualiza la vista previa. Al soltar
 * (pointerup en cualquier parte), confirma el movimiento.
 */
export function RoomDragController() {
  const camera = useThree((s) => s.camera)
  const pointer = useThree((s) => s.pointer)
  const setPreview = useLayout((s) => s.setPreview)
  const endDrag = useLayout((s) => s.endDrag)

  useFrame(() => {
    if (!useLayout.getState().draggingId) return
    document.body.style.cursor = 'grabbing'
    _ray.setFromCamera(pointer, camera)
    if (_ray.ray.intersectPlane(_plane, _hit)) {
      const cell = worldToCell(_hit.x, _hit.z)
      const prev = useLayout.getState().previewCell
      if (!prev || prev.col !== cell.col || prev.row !== cell.row) {
        setPreview(cell)
      }
    }
  })

  useEffect(() => {
    const soltar = () => {
      if (useLayout.getState().draggingId) {
        endDrag()
        document.body.style.cursor = 'default'
      }
    }
    window.addEventListener('pointerup', soltar)
    return () => window.removeEventListener('pointerup', soltar)
  }, [endDrag])

  return null
}

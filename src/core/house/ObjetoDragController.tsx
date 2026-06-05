import { useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDiseño } from '../state/disenoStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { SIZE, SIZE_DEFAULT } from './walls'

const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _ray = new THREE.Raycaster()
const _hit = new THREE.Vector3()
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/**
 * Mientras se arrastra un objeto de decoración (modo edición), proyecta el
 * cursor al piso y mueve el objeto libremente DENTRO de su cuarto (acotado a las
 * paredes). Al soltar, guarda la posición.
 */
export function ObjetoDragController() {
  const camera = useThree((s) => s.camera)
  const pointer = useThree((s) => s.pointer)
  const setObjetoPos = useDiseño((s) => s.setObjetoPos)
  const endObjetoDrag = useDiseño((s) => s.endObjetoDrag)

  useFrame(() => {
    const id = useDiseño.getState().draggingObjeto
    if (id == null) return
    const o = useDiseño.getState().objetos.find((x) => x.id === id)
    if (!o) return
    _ray.setFromCamera(pointer, camera)
    if (_ray.ray.intersectPlane(_plane, _hit)) {
      const [cx, , cz] = roomWorldPos(o.roomId)
      const size = useLayout.getState().sizes[o.roomId] ?? SIZE_DEFAULT
      const halfW = (size.w * SIZE) / 2 - 0.7
      const halfH = (size.h * SIZE) / 2 - 0.7
      setObjetoPos(
        id,
        clamp(_hit.x - cx, -halfW, halfW),
        clamp(_hit.z - cz, -halfH, halfH),
      )
    }
  })

  useEffect(() => {
    const soltar = () => {
      if (useDiseño.getState().draggingObjeto != null) endObjetoDrag()
    }
    window.addEventListener('pointerup', soltar)
    return () => window.removeEventListener('pointerup', soltar)
  }, [endObjetoDrag])

  return null
}

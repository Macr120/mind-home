import { useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDiseño, esObjetoMapa } from '../state/disenoStore'
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
    const state = useDiseño.getState()
    const id = state.draggingObjeto
    if (id == null) return
    const o = state.objetos.find((x) => x.id === id)
    if (!o) return
    _ray.setFromCamera(pointer, camera)
    if (!_ray.ray.intersectPlane(_plane, _hit)) return

    // Calcula la nueva posición del objeto primario.
    let newX: number, newZ: number
    if (esObjetoMapa(o)) {
      newX = _hit.x
      newZ = _hit.z
    } else {
      const [cx, , cz] = roomWorldPos(o.roomId)
      const size = useLayout.getState().sizes[o.roomId] ?? SIZE_DEFAULT
      const halfW = (size.w * SIZE) / 2 - 0.7
      const halfH = (size.h * SIZE) / 2 - 0.7
      newX = clamp(_hit.x - cx, -halfW, halfW)
      newZ = clamp(_hit.z - cz, -halfH, halfH)
    }
    setObjetoPos(id, newX, newZ)

    // Mueve el resto del grupo usando los offsets calculados al iniciar el drag.
    if (o.grupoId) {
      const offsets = state.dragGroupOffsets
      for (const m of state.objetos) {
        if (m.grupoId !== o.grupoId || m.id === id || m.id == null) continue
        const off = offsets[m.id] ?? { x: 0, z: 0 }
        if (esObjetoMapa(m)) {
          setObjetoPos(m.id, newX + off.x, newZ + off.z)
        } else {
          // newX ya está en coordenadas locales del cuarto; el offset también.
          const ms = useLayout.getState().sizes[m.roomId] ?? SIZE_DEFAULT
          const mhW = (ms.w * SIZE) / 2 - 0.7
          const mhH = (ms.h * SIZE) / 2 - 0.7
          setObjetoPos(m.id, clamp(newX + off.x, -mhW, mhW), clamp(newZ + off.z, -mhH, mhH))
        }
      }
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

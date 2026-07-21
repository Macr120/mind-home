import { useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { dragChar } from './characterDrag'

const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _ray = new THREE.Raycaster()
const _hit = new THREE.Vector3()

/**
 * Mientras se arrastra un personaje (pestaña Personajes del editor), proyecta el
 * cursor al piso y guarda el punto en `dragChar` (cada `Character`/`Asistente3D`
 * lee ese punto en su propio frame y se coloca ahí). Al soltar, el asistente
 * activo fija su destino para quedarse donde lo dejaste.
 */
export function CharacterDragController() {
  const camera = useThree((s) => s.camera)
  const pointer = useThree((s) => s.pointer)

  useFrame(() => {
    if (dragChar.id == null) return
    _ray.setFromCamera(pointer, camera)
    if (_ray.ray.intersectPlane(_plane, _hit)) {
      dragChar.x = _hit.x
      dragChar.z = _hit.z
    }
  })

  useEffect(() => {
    const soltar = () => {
      const id = dragChar.id
      if (id == null) return
      dragChar.id = null
      document.body.style.cursor = 'default'
      // El asistente activo vuelve a su destino con lerp: fíjalo donde se soltó.
      const lista = useAsistentes.getState().lista
      const activoId = lista.find((a) => a.id === useMascota.getState().mascota)?.id ?? lista[0]?.id
      if (id === activoId) useMascota.getState().irA(dragChar.x, dragChar.z)
    }
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    return () => {
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
  }, [])

  return null
}

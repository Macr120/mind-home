import { useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDiseño, esObjetoMapa } from '../state/disenoStore'
import { useHouse } from '../state/houseStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { SIZE, SIZE_DEFAULT, nivelBaseY } from './walls'
import { apoyoEn, NIVEL_SUELO } from './apoyos'

const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _ray = new THREE.Raycaster()
const _hit = new THREE.Vector3()
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** El arrastre en curso: su plano, el desfase entre el objeto y el punto tocado y de dónde salió. */
let arrastreId: number | null = null
let agarreX = 0
let agarreZ = 0
let salioX = 0
let salioZ = 0

/**
 * Mientras se arrastra un objeto de decoración (editor o despierto por una
 * pulsación larga), proyecta el cursor a un plano a la ALTURA del objeto (un
 * libro en la repisa de arriba, un cuarto del primer piso) y lo mueve libremente
 * DENTRO de su cuarto (acotado a las paredes), conservando el punto por donde se
 * agarró: no salta bajo el dedo. Al soltar, guarda la posición.
 */
export function ObjetoDragController() {
  const camera = useThree((s) => s.camera)
  const pointer = useThree((s) => s.pointer)
  const setObjetoPos = useDiseño((s) => s.setObjetoPos)
  const endObjetoDrag = useDiseño((s) => s.endObjetoDrag)

  useFrame(() => {
    const state = useDiseño.getState()
    const id = state.draggingObjeto
    // Cargarlo caminando lo mueve `CargaController` con el personaje, no el puntero.
    if (id == null || state.arrastreElevado) {
      arrastreId = null
      return
    }
    const o = state.objetos.find((x) => x.id === id)
    if (!o) return
    const enMapa = esObjetoMapa(o)
    const [cx, , cz] = enMapa ? [0, 0, 0] : roomWorldPos(o.roomId)
    if (arrastreId !== id) {
      // Arranque: el plano pasa por la base del objeto (el piso del cuarto en
      // su nivel, más su altura) y se recuerda dónde se tocó.
      arrastreId = id
      const piso = enMapa
        ? 0
        : nivelBaseY(useLayout.getState().niveles[o.roomId] ?? 0, !useHouse.getState().explotado)
      _plane.constant = -(piso + 0.2 + (o.y ?? 0))
      _ray.setFromCamera(pointer, camera)
      const toco = _ray.ray.intersectPlane(_plane, _hit)
      agarreX = toco ? cx + (o.x ?? 0) - _hit.x : 0
      agarreZ = toco ? cz + (o.z ?? 0) - _hit.z : 0
      salioX = o.x ?? 0
      salioZ = o.z ?? 0
    }
    _ray.setFromCamera(pointer, camera)
    if (!_ray.ray.intersectPlane(_plane, _hit)) return
    const hx = _hit.x + agarreX
    const hz = _hit.z + agarreZ

    // Calcula la nueva posición del objeto primario.
    let newX: number, newZ: number
    if (enMapa) {
      newX = hx
      newZ = hz
    } else {
      const size = useLayout.getState().sizes[o.roomId] ?? SIZE_DEFAULT
      const halfW = (size.w * SIZE) / 2 - 0.7
      const halfH = (size.h * SIZE) / 2 - 0.7
      newX = clamp(hx - cx, -halfW, halfW)
      newZ = clamp(hz - cz, -halfH, halfH)
    }
    const offsets = state.dragGroupOffsets
    // Solo (sin grupo ni carga encima), sube en vivo al mueble que tenga debajo.
    let apoyo: Parameters<typeof setObjetoPos>[3]
    if (Object.keys(offsets).length === 0) {
      const ap = apoyoEn(state.objetos, o, newX, newZ)
      // Lo que va en el suelo junto a su base (el banco del piano) sigue siendo suyo
      // mientras no se mueva de verdad: despertarlo no lo separa.
      const quieto = o.apoyoNivel === NIVEL_SUELO && Math.hypot(newX - salioX, newZ - salioZ) < 0.05
      apoyo = ap ?? (o.apoyoId != null && !quieto ? { y: 0, apoyoId: undefined, apoyoNivel: undefined } : undefined)
    }
    setObjetoPos(id, newX, newZ, apoyo)

    // Mueve lo que viaja con él (su grupo y lo apoyado encima) con los offsets del inicio.
    for (const m of state.objetos) {
      if (m.id == null || !(m.id in offsets)) continue
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
  })

  useEffect(() => {
    const soltar = () => {
      // Durante la carga, soltar el joystick o un clic cualquiera no deben soltarlo.
      const s = useDiseño.getState()
      if (s.draggingObjeto != null && !s.arrastreElevado) endObjetoDrag()
    }
    window.addEventListener('pointerup', soltar)
    return () => window.removeEventListener('pointerup', soltar)
  }, [endObjetoDrag])

  return null
}

import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getCuarto } from '../state/cuartosStore'
import { useHouse } from '../state/houseStore'
import { useDiseño, objetosDeCuartoIdx, objetoPorId, esObjetoMapa } from '../state/disenoStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useInteractUi } from '../state/interactUiStore'
import { nivelBaseY } from './walls'
import { altoDeTipo } from './catalogo'
import { esMueblePrincipal } from './muebles'

const _world = new THREE.Vector3()
const ALTURA = 3.1

/** Proyecta el objeto seleccionado (mueble principal o enlace) al 2D para su burbuja. */
export function InteractAnchor() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const focusRoomId = useInteractUi((s) => s.focusRoomId)
  const focusEnlaceId = useInteractUi((s) => s.focusEnlaceId)
  const setScreen = useInteractUi((s) => s.setScreen)
  const activeRoom = useHouse((s) => s.activeRoom)
  const editMode = useLayout((s) => s.editMode)

  useFrame(() => {
    if (editMode || activeRoom) return

    if (focusRoomId) {
      if (!getCuarto(focusRoomId)) return
      const [rx, , rz] = roomWorldPos(focusRoomId)
      // Lectura en el frame (sin suscripción): mover objetos no re-renderiza este anchor.
      // Por el índice memoizado: `muebleDeCuarto` filtraba todos los objetos de la casa por frame.
      const delCuarto = objetosDeCuartoIdx(useDiseño.getState().objetos, focusRoomId)
      const mueble = delCuarto.find(esMueblePrincipal) ?? delCuarto[0]
      const ox = mueble?.x ?? 0
      const oz = mueble?.z ?? 0
      // Altura del nivel del cuarto (la burbuja sigue al cuarto aunque esté elevado).
      const y0 = nivelBaseY(useLayout.getState().niveles[focusRoomId] ?? 0, !useHouse.getState().explotado)
      _world.set(rx + ox, y0 + ALTURA, rz + oz)
    } else if (focusEnlaceId != null) {
      const o = objetoPorId(useDiseño.getState().objetos, focusEnlaceId)
      if (!o) return
      // La burbuja flota justo sobre el objeto: su alto por catálogo × su escala.
      const alto = altoDeTipo(o.tipo) * (o.escala ?? 1) + 1.1 + (o.y ?? 0)
      if (esObjetoMapa(o)) {
        _world.set(o.x ?? 0, alto, o.z ?? 0)
      } else {
        const [rx, , rz] = roomWorldPos(o.roomId)
        const y0 = nivelBaseY(useLayout.getState().niveles[o.roomId] ?? 0, !useHouse.getState().explotado)
        _world.set(rx + (o.x ?? 0), y0 + alto, rz + (o.z ?? 0))
      }
    } else {
      return
    }

    _world.project(camera)

    const x = (_world.x * 0.5 + 0.5) * size.width
    const y = (-_world.y * 0.5 + 0.5) * size.height

    if (!Number.isFinite(x) || !Number.isFinite(y)) return

    setScreen(x, y)
  })

  return null
}

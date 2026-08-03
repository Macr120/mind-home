import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getCuarto } from '../state/cuartosStore'
import { useHouse } from '../state/houseStore'
import { useDiseño, muebleDeCuarto } from '../state/disenoStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useInteractUi } from '../state/interactUiStore'
import { nivelBaseY } from './walls'

const _world = new THREE.Vector3()
const ALTURA = 3.1

/** Proyecta el mueble seleccionado al espacio 2D para el diálogo de interacción. */
export function InteractAnchor() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const focusRoomId = useInteractUi((s) => s.focusRoomId)
  const setScreen = useInteractUi((s) => s.setScreen)
  const activeRoom = useHouse((s) => s.activeRoom)
  const editMode = useLayout((s) => s.editMode)

  useFrame(() => {
    if (editMode || activeRoom || !focusRoomId || !getCuarto(focusRoomId)) return

    const [rx, , rz] = roomWorldPos(focusRoomId)
    // Lectura en el frame (sin suscripción): mover objetos no re-renderiza este anchor.
    const mueble = muebleDeCuarto(useDiseño.getState().objetos, focusRoomId)
    const ox = mueble?.x ?? 0
    const oz = mueble?.z ?? 0
    // Altura del nivel del cuarto (la burbuja sigue al cuarto aunque esté elevado).
    const y0 = nivelBaseY(useLayout.getState().niveles[focusRoomId] ?? 0, !useHouse.getState().explotado)

    _world.set(rx + ox, y0 + ALTURA, rz + oz)
    _world.project(camera)

    const x = (_world.x * 0.5 + 0.5) * size.width
    const y = (-_world.y * 0.5 + 0.5) * size.height

    if (!Number.isFinite(x) || !Number.isFinite(y)) return

    setScreen(x, y)
  })

  return null
}

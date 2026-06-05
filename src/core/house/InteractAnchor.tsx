import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getRoom } from '../registry'
import { useHouse } from '../state/houseStore'
import { useDiseño, muebleDeCuarto } from '../state/disenoStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useInteractUi } from '../state/interactUiStore'
import { MUEBLES_DEFAULT } from './muebles'

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
  const objetos = useDiseño((s) => s.objetos)

  useFrame(() => {
    if (editMode || activeRoom || !focusRoomId || !getRoom(focusRoomId)) return

    const [rx, , rz] = roomWorldPos(focusRoomId)
    const mueble = muebleDeCuarto(objetos, focusRoomId)
    const def = MUEBLES_DEFAULT[focusRoomId]
    const ox = mueble?.x ?? def?.x ?? 0
    const oz = mueble?.z ?? def?.z ?? 0

    _world.set(rx + ox, ALTURA, rz + oz)
    _world.project(camera)

    const x = (_world.x * 0.5 + 0.5) * size.width
    const y = (-_world.y * 0.5 + 0.5) * size.height

    if (!Number.isFinite(x) || !Number.isFinite(y)) return

    setScreen(x, y)
  })

  return null
}

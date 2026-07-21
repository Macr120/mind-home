import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getCuarto } from '../state/cuartosStore'
import { useHouse } from '../state/houseStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useEditorAnchor } from '../state/editorAnchorStore'
import { nivelBaseY, WALL_H } from './walls'

const _world = new THREE.Vector3()
/** Altura sobre el piso del cuarto a la que flota el botón: por encima del techo. */
const ALTURA = WALL_H + 1.6

/** Proyecta el centro del cuarto en edición al espacio 2D, para el botón flotante "Salir del cuarto". */
export function EditorAnchor() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const setScreen = useEditorAnchor((s) => s.setScreen)

  useFrame(() => {
    if (!editingRoomId || !getCuarto(editingRoomId)) return

    const [rx, , rz] = roomWorldPos(editingRoomId)
    const y0 = nivelBaseY(useLayout.getState().niveles[editingRoomId] ?? 0, !useHouse.getState().explotado)

    _world.set(rx, y0 + ALTURA, rz)
    _world.project(camera)

    const x = (_world.x * 0.5 + 0.5) * size.width
    const y = (-_world.y * 0.5 + 0.5) * size.height

    if (!Number.isFinite(x) || !Number.isFinite(y)) return

    setScreen(x, y)
  })

  return null
}

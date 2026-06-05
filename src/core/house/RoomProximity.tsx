import { useFrame } from '@react-three/fiber'
import { rooms } from '../registry'
import { distanciaAPuerta, ENTRAR_DIST_PUERTA } from './navigation'
import { useHouse } from '../state/houseStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'

/** Actualiza qué puerta está al alcance y si el cuarto seleccionado puede abrirse. */
export function RoomProximity() {
  const setNearRoomId = useHouse((s) => s.setNearRoomId)
  const setCanEnterSelected = useHouse((s) => s.setCanEnterSelected)

  useFrame(() => {
    const placed = useLayout.getState().placed
    let mejor: { id: string; d: number } | null = null
    for (const room of rooms) {
      if (!placed[room.id]) continue
      const d = distanciaAPuerta(roomWorldPos(room.id))
      if (d <= ENTRAR_DIST_PUERTA && (!mejor || d < mejor.d)) {
        mejor = { id: room.id, d }
      }
    }
    setNearRoomId(mejor?.id ?? null)

    const selectedId = useHouse.getState().selectedRoomId
    if (!selectedId || !placed[selectedId]) {
      setCanEnterSelected(false)
      return
    }
    setCanEnterSelected(
      distanciaAPuerta(roomWorldPos(selectedId)) <= ENTRAR_DIST_PUERTA,
    )
  })

  return null
}

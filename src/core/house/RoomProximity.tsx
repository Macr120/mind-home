import { useFrame } from '@react-three/fiber'
import { rooms, getRoom } from '../registry'
import { distanciaAPuerta, ENTRAR_DIST_PUERTA } from './navigation'
import { useHouse } from '../state/houseStore'

/** Actualiza qué puerta está al alcance y si el cuarto seleccionado puede abrirse. */
export function RoomProximity() {
  const setNearRoomId = useHouse((s) => s.setNearRoomId)
  const setCanEnterSelected = useHouse((s) => s.setCanEnterSelected)

  useFrame(() => {
    let mejor: { id: string; d: number } | null = null
    for (const room of rooms) {
      const d = distanciaAPuerta(room.posicion)
      if (d <= ENTRAR_DIST_PUERTA && (!mejor || d < mejor.d)) {
        mejor = { id: room.id, d }
      }
    }
    setNearRoomId(mejor?.id ?? null)

    const selectedId = useHouse.getState().selectedRoomId
    if (!selectedId) {
      setCanEnterSelected(false)
      return
    }
    const selected = getRoom(selectedId)
    setCanEnterSelected(
      Boolean(selected && distanciaAPuerta(selected.posicion) <= ENTRAR_DIST_PUERTA),
    )
  })

  return null
}

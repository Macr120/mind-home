import { useFrame } from '@react-three/fiber'
import { useCuartos } from '../state/cuartosStore'
import { distanciaAPuerta, ENTRAR_DIST_PUERTA } from './navigation'
import { useHouse } from '../state/houseStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'

/** Actualiza qué puerta está al alcance y si el cuarto seleccionado puede abrirse. */
let accRooms = 0
export function RoomProximity() {
  const setNearRoomId = useHouse((s) => s.setNearRoomId)
  const setCanEnterSelected = useHouse((s) => s.setCanEnterSelected)

  useFrame((_st3f, delta) => {
    // Sondeo ~5 veces/s: recorrer todos los cuartos a 60 Hz sumaba en móviles.
    accRooms += delta
    if (accRooms < 0.2) return
    accRooms = 0
    const placed = useLayout.getState().placed
    const niveles = useLayout.getState().niveles
    // Solo cuartos del nivel actual del personaje (evita detectar pisos equivocados).
    const playerLevel = useHouse.getState().playerLevel
    let mejor: { id: string; d: number } | null = null
    for (const room of useCuartos.getState().cuartos) {
      if (!placed[room.id]) continue
      if ((niveles[room.id] ?? 0) !== playerLevel) continue
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
    // El cuarto seleccionado también debe estar en el nivel del personaje.
    if ((niveles[selectedId] ?? 0) !== playerLevel) {
      setCanEnterSelected(false)
      return
    }
    setCanEnterSelected(
      distanciaAPuerta(roomWorldPos(selectedId)) <= ENTRAR_DIST_PUERTA,
    )
  })

  return null
}

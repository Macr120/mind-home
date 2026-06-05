import { Html } from '@react-three/drei'
import { useHouse } from '../state/houseStore'
import type { RoomModule } from '../registry'

/**
 * Etiqueta sobre el cuarto: siempre clicable.
 * Clic en el icono: camina a la puerta del cuarto (entrar solo por menú o Interactuar).
 */
export function RoomMarker({ room }: { room: RoomModule }) {
  const nearRoomId = useHouse((s) => s.nearRoomId)
  const selectedRoomId = useHouse((s) => s.selectedRoomId)
  const interactRoom = useHouse((s) => s.interactRoom)
  const cerca = nearRoomId === room.id
  const seleccionado = selectedRoomId === room.id
  const destacar = seleccionado || cerca

  return (
    <group position={[room.posicion[0], 3, room.posicion[2]]}>
      <Html center distanceFactor={14} zIndexRange={[50, 0]}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            interactRoom(room.id)
          }}
          title={room.nombre}
          style={{
            textAlign: 'center',
            userSelect: 'none',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: cerca ? '4px 8px' : '10px 12px',
            borderRadius: 12,
            outline: destacar ? `2px solid ${room.color}` : 'none',
            boxShadow: destacar ? `0 0 16px ${room.color}55` : 'none',
          }}
        >
          {cerca || seleccionado ? (
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                whiteSpace: 'nowrap',
                textShadow: '0 1px 4px #000, 0 0 2px #000',
              }}
            >
              {room.icon} {room.nombre.split(' · ')[0]}
            </span>
          ) : (
            <span
              style={{
                fontSize: 26,
                lineHeight: 1,
                display: 'block',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.8))',
              }}
            >
              {room.icon}
            </span>
          )}
        </button>
      </Html>
    </group>
  )
}

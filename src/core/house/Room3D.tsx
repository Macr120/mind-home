import { type ThreeEvent } from '@react-three/fiber'
import { useHouse } from '../state/houseStore'
import { localWallSegments, WALL_H, SIZE } from './walls'
import { Furniture } from './Furniture'

function lighten(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amt))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt))
  const b = Math.min(255, Math.max(0, (n & 255) + amt))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

/**
 * Estructura 3D de un cuarto estilo Roblox: piso de color, paredes chunky con
 * puerta (geometría tomada de walls.ts) y un mueble temático.
 */
export function Room3D({
  id,
  position,
  color,
}: {
  id: string
  position: [number, number, number]
  color: string
}) {
  const segs = localWallSegments(position)
  const floorColor = lighten(color, 35)
  const interactRoom = useHouse((s) => s.interactRoom)
  const selectedRoomId = useHouse((s) => s.selectedRoomId)
  const nearRoomId = useHouse((s) => s.nearRoomId)
  const seleccionado = selectedRoomId === id
  const cerca = nearRoomId === id

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    interactRoom(id)
  }

  return (
    <group position={position}>
      {/* Piso del cuarto (clic: ir o entrar) */}
      <mesh
        position={[0, 0.1, 0]}
        receiveShadow
        onClick={onFloorClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
        }}
      >
        <boxGeometry args={[SIZE - 0.1, 0.2, SIZE - 0.1]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.85}
          emissive={color}
          emissiveIntensity={
            cerca ? 0.35 : seleccionado ? 0.18 : 0
          }
        />
      </mesh>

      {/* Paredes */}
      {segs.map((s, i) => (
        <mesh
          key={i}
          position={[s.cx, WALL_H / 2, s.cz]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[s.sx, WALL_H, s.sz]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      ))}

      {/* Mueble temático */}
      <Furniture id={id} />
    </group>
  )
}

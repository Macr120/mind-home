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

  return (
    <group position={position}>
      {/* Piso del cuarto */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[SIZE - 0.1, 0.2, SIZE - 0.1]} />
        <meshStandardMaterial color={floorColor} roughness={0.85} />
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

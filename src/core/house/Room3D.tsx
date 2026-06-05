import { type ThreeEvent } from '@react-three/fiber'
import { useHouse } from '../state/houseStore'
import { useDiseño, OBJETO_SLOTS } from '../state/disenoStore'
import { esCeldaLibre, useLayout } from '../state/layoutStore'
import { localWallSegments, WALL_H, SIZE } from './walls'
import { Furniture } from './Furniture'
import { ObjetoView } from './catalogo'

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
  const ocupado = useLayout((s) => s.ocupado)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const editMode = useLayout((s) => s.editMode)
  const draggingId = useLayout((s) => s.draggingId)
  const previewCell = useLayout((s) => s.previewCell)
  const startDrag = useLayout((s) => s.startDrag)
  const segs = localWallSegments(position, ocupado)
  const floorColor = lighten(color, 35)
  const interactRoom = useHouse((s) => s.interactRoom)
  const selectedRoomId = useHouse((s) => s.selectedRoomId)
  const nearRoomId = useHouse((s) => s.nearRoomId)
  const seleccionado = selectedRoomId === id
  const cerca = nearRoomId === id
  const arrastrando = draggingId === id
  const celdaValida =
    !arrastrando ||
    !previewCell ||
    esCeldaLibre(placed, cells, id, previewCell)
  // Personalización de muebles y decoración del cuarto.
  const muebleColor = useDiseño((s) => s.furnitureColors[id])
  const objetos = useDiseño((s) => s.objetos)
  const objetosCuarto = objetos.filter((o) => o.roomId === id)

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (editMode) return // en edición el clic no navega
    e.stopPropagation()
    interactRoom(id)
  }

  const onFloorDown = (e: ThreeEvent<PointerEvent>) => {
    if (!editMode) return // arrastrar cuartos solo en modo edición
    e.stopPropagation()
    startDrag(id)
  }

  return (
    <group position={position}>
      {/* Piso del cuarto (clic: ir/entrar · en edición: arrastrar) */}
      <mesh
        position={[0, 0.1, 0]}
        receiveShadow
        onClick={onFloorClick}
        onPointerDown={onFloorDown}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (!editMode) document.body.style.cursor = 'pointer'
          else if (!arrastrando) document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          if (!useLayout.getState().draggingId) document.body.style.cursor = 'default'
        }}
      >
        <boxGeometry args={[SIZE - 0.1, 0.2, SIZE - 0.1]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.85}
          emissive={arrastrando && !celdaValida ? '#ef4444' : color}
          emissiveIntensity={
            arrastrando ? (celdaValida ? 0.5 : 0.35) : cerca ? 0.35 : seleccionado ? 0.18 : 0
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

      {/* Mueble temático (recolorable) */}
      <Furniture id={id} color={muebleColor} />

      {/* Objetos de decoración colocados por el usuario */}
      {objetosCuarto.map((o) => {
        const [sx, sz] = OBJETO_SLOTS[o.slot] ?? [0, 0]
        return (
          <group key={o.id} position={[sx, 0.2, sz]}>
            <ObjetoView tipo={o.tipo} color={o.color} />
          </group>
        )
      })}
    </group>
  )
}

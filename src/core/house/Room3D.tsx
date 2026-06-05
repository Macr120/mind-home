import { type ThreeEvent } from '@react-three/fiber'
import { useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { esFootprintLibre, useLayout } from '../state/layoutStore'
import { roomWallSegments, WALL_H, SIZE, SIZE_DEFAULT } from './walls'
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
 * puertas (de walls.ts), mueble temático y decoración. Soporta tamaño w×h.
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
  const overrides = useLayout((s) => s.wallOverrides[id])
  const doorPos = useLayout((s) => s.doorPos[id])
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const sizes = useLayout((s) => s.sizes)
  const editMode = useLayout((s) => s.editMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const draggingId = useLayout((s) => s.draggingId)
  const previewCell = useLayout((s) => s.previewCell)
  const startDrag = useLayout((s) => s.startDrag)

  const size = sizes[id] ?? SIZE_DEFAULT
  const W = size.w * SIZE
  const H = size.h * SIZE
  const segs = roomWallSegments(cells[id], size, ocupado, overrides, doorPos)
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
    esFootprintLibre(placed, cells, sizes, id, previewCell, size)
  const muebleColor = useDiseño((s) => s.furnitureColors[id])
  const objetos = useDiseño((s) => s.objetos)
  const draggingObjeto = useDiseño((s) => s.draggingObjeto)
  const startObjetoDrag = useDiseño((s) => s.startObjetoDrag)
  const objetosCuarto = objetos.filter((o) => o.roomId === id)
  const objetosEditables = editMode && editingRoomId === id

  /** Posición de una ranura de decoración (esquinas del footprint). */
  const slotPos = (slot: number): [number, number] => [
    (slot % 2 === 0 ? -1 : 1) * (W / 2 - 1.4),
    (slot < 2 ? -1 : 1) * (H / 2 - 1.4),
  ]

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (editMode) return
    e.stopPropagation()
    interactRoom(id)
  }
  const onFloorDown = (e: ThreeEvent<PointerEvent>) => {
    if (!editMode) return
    e.stopPropagation()
    startDrag(id)
  }

  return (
    <group position={position}>
      {/* Piso del cuarto */}
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
        <boxGeometry args={[W - 0.1, 0.2, H - 0.1]} />
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
        <mesh key={i} position={[s.cx, WALL_H / 2, s.cz]} castShadow receiveShadow>
          <boxGeometry args={[s.sx, WALL_H, s.sz]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      ))}

      {/* Mueble temático (recolorable) */}
      <Furniture id={id} color={muebleColor} />

      {/* Decoración (posición libre · arrastrable al editar el cuarto) */}
      {objetosCuarto.map((o) => {
        const ox = o.x ?? slotPos(o.slot)[0]
        const oz = o.z ?? slotPos(o.slot)[1]
        const drag = draggingObjeto === o.id
        return (
          <group
            key={o.id}
            position={[ox, drag ? 0.6 : 0.2, oz]}
            onPointerDown={
              objetosEditables
                ? (e) => {
                    e.stopPropagation()
                    if (o.id != null) startObjetoDrag(o.id)
                  }
                : undefined
            }
            onPointerOver={
              objetosEditables
                ? (e) => {
                    e.stopPropagation()
                    document.body.style.cursor = 'grab'
                  }
                : undefined
            }
          >
            <ObjetoView tipo={o.tipo} color={o.color} />
          </group>
        )
      })}
    </group>
  )
}

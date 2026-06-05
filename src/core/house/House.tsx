import { useEffect } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { useLayout } from '../state/layoutStore'
import { rooms } from '../registry'
import { Character } from './Character'
import { RoomProximity } from './RoomProximity'
import { Room3D } from './Room3D'
import { CameraRig } from './CameraRig'
import { RoomDragController } from './RoomDragController'
import { cellToWorld } from './walls'
import { NavControls } from '../ui/NavControls'
import { EditPanel } from '../ui/EditPanel'

/** Reactiva la sombra estática cuando cambia el layout (agregar/quitar/mover). */
function ShadowUpdater() {
  const gl = useThree((s) => s.gl)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  useEffect(() => {
    gl.shadowMap.needsUpdate = true
  }, [gl, placed, cells])
  return null
}

/** Suelo base de la casa: al hacer clic, el personaje camina a ese punto. */
function BaseFloor() {
  const setTarget = useHouse((s) => s.setTarget)
  const editMode = useLayout((s) => s.editMode)
  const floorColor = useDiseño((s) => s.roomColors['__piso__']) ?? '#0c0e13'
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (editMode) return // en edición el clic no mueve al avatar
    e.stopPropagation()
    setTarget(e.point.x, e.point.z)
  }
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onClick={onClick}
      receiveShadow
    >
      <planeGeometry args={[40, 36]} />
      <meshStandardMaterial color={floorColor} />
    </mesh>
  )
}

export function House() {
  const roomColors = useDiseño((s) => s.roomColors)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const draggingId = useLayout((s) => s.draggingId)
  const previewCell = useLayout((s) => s.previewCell)
  return (
    <>
      <Canvas
        shadows
        orthographic
        camera={{ position: [22, 22, 22], zoom: 17, near: -100, far: 300 }}
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          // La casa es estática: renderiza la sombra UNA vez y congélala.
          // (gran ahorro: no recalcular sombras de ~150 mallas cada frame)
          gl.shadowMap.autoUpdate = false
          gl.shadowMap.needsUpdate = true
        }}
      >
        <color attach="background" args={['#0f1115']} />
        <CameraRig />
        <ShadowUpdater />
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[18, 28, 12]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={0.1}
        shadow-camera-far={90}
      />

      <BaseFloor />

      {rooms
        .filter((room) => placed[room.id])
        .map((room) => {
          const arrastrando = draggingId === room.id
          const cell =
            arrastrando && previewCell ? previewCell : cells[room.id]
          const [x, , z] = cellToWorld(cell.col, cell.row)
          return (
            <Room3D
              key={room.id}
              id={room.id}
              position={[x, arrastrando ? 0.8 : 0, z]}
              color={roomColors[room.id] ?? room.color}
            />
          )
        })}

      <RoomProximity />
      <RoomDragController />
      <Character />
      </Canvas>
      <NavControls />
      <EditPanel />
    </>
  )
}

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
import { CameraControls } from './CameraControls'
import { RoomDragController } from './RoomDragController'
import { ObjetoDragController } from './ObjetoDragController'
import { roomCenter, SIZE_DEFAULT } from './walls'
import { NavControls } from '../ui/NavControls'
import { EditPanel } from '../ui/EditPanel'
import { InteractAnchor } from './InteractAnchor'
import { useInteractUi } from '../state/interactUiStore'

/** En modo edición las sombras quedan congeladas y dejan “fantasmas” al mover objetos. */
function ShadowMode() {
  const gl = useThree((s) => s.gl)
  const editMode = useLayout((s) => s.editMode)
  useEffect(() => {
    gl.shadowMap.enabled = !editMode
    if (!editMode) gl.shadowMap.needsUpdate = true
  }, [editMode, gl])
  return null
}

/** Reactiva la sombra estática cuando cambia el layout (solo fuera de edición). */
function ShadowUpdater() {
  const gl = useThree((s) => s.gl)
  const editMode = useLayout((s) => s.editMode)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const conTecho = useHouse((s) => s.conTecho)
  useEffect(() => {
    if (editMode) return
    gl.shadowMap.needsUpdate = true
  }, [gl, editMode, placed, cells, editingRoomId, conTecho])
  return null
}

function SceneLight() {
  const editMode = useLayout((s) => s.editMode)
  return (
    <directionalLight
      position={[18, 28, 12]}
      intensity={1.0}
      castShadow={!editMode}
      shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-24}
      shadow-camera-right={24}
      shadow-camera-top={24}
      shadow-camera-bottom={-24}
      shadow-camera-near={0.1}
      shadow-camera-far={90}
    />
  )
}

/** Suelo base de la casa: al hacer clic, el personaje camina a ese punto. */
function BaseFloor() {
  const setTarget = useHouse((s) => s.setTarget)
  const editMode = useLayout((s) => s.editMode)
  const floorColor = useDiseño((s) => s.roomColors['__piso__']) ?? '#0c0e13'
  const clearInteract = useInteractUi((s) => s.clear)
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (editMode) return // en edición el clic no mueve al avatar
    e.stopPropagation()
    clearInteract()
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
  const sizes = useLayout((s) => s.sizes)
  const draggingId = useLayout((s) => s.draggingId)
  const previewCell = useLayout((s) => s.previewCell)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const aislarCuarto = Boolean(editingRoomId)
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
        <CameraControls />
        <ShadowMode />
        <ShadowUpdater />
      <ambientLight intensity={0.8} />
      <SceneLight />

      <BaseFloor />
      {/* Cuadrícula muy sutil sobre el piso (celdas de 6 unidades) */}
      <gridHelper
        args={[36, 6, '#ffffff', '#ffffff']}
        position={[0, 0.02, 0]}
        material-transparent
        material-opacity={0.05}
      />

      {rooms
        .filter(
          (room) =>
            placed[room.id] && (!aislarCuarto || room.id === editingRoomId),
        )
        .map((room) => {
          const arrastrando = draggingId === room.id
          const cell =
            arrastrando && previewCell ? previewCell : cells[room.id]
          const [x, , z] = roomCenter(cell, sizes[room.id] ?? SIZE_DEFAULT)
          return (
            <Room3D
              key={room.id}
              id={room.id}
              position={[x, arrastrando ? 0.8 : 0, z]}
              color={roomColors[room.id] ?? room.color}
            />
          )
        })}

      {!aislarCuarto && <RoomProximity />}
      {!aislarCuarto && <InteractAnchor />}
      {!aislarCuarto && <RoomDragController />}
      <ObjetoDragController />
      {!aislarCuarto && <Character />}
      </Canvas>
      <NavControls />
      <EditPanel />
    </>
  )
}

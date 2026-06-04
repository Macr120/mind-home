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
import { NavControls } from '../ui/NavControls'
import { EditPanel } from '../ui/EditPanel'

/** Reactiva la sombra estática una vez cuando cambia el layout (agregar/quitar). */
function ShadowUpdater() {
  const gl = useThree((s) => s.gl)
  const placed = useLayout((s) => s.placed)
  useEffect(() => {
    gl.shadowMap.needsUpdate = true
  }, [gl, placed])
  return null
}

/** Suelo base de la casa: al hacer clic, el personaje camina a ese punto. */
function BaseFloor() {
  const setTarget = useHouse((s) => s.setTarget)
  const onClick = (e: ThreeEvent<MouseEvent>) => {
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
      <meshStandardMaterial color="#0c0e13" />
    </mesh>
  )
}

export function House() {
  const roomColors = useDiseño((s) => s.roomColors)
  const placed = useLayout((s) => s.placed)
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
        .map((room) => (
          <Room3D
            key={room.id}
            id={room.id}
            position={room.posicion}
            color={roomColors[room.id] ?? room.color}
          />
        ))}

      <RoomProximity />
      <Character />
      </Canvas>
      <NavControls />
      <EditPanel />
    </>
  )
}

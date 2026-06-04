import { useRef } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { rooms } from '../registry'
import { Character } from './Character'
import { RoomMarker } from './RoomMarker'
import { RoomProximity } from './RoomProximity'
import { Room3D } from './Room3D'
import { NavControls } from '../ui/NavControls'

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
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  return (
    <>
      <Canvas
        shadows
        orthographic
        camera={{ position: [22, 22, 22], zoom: 17, near: -100, far: 300 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#0f1115']} />
        <OrbitControls
          ref={controls}
          makeDefault
          target={[0, 0, 0]}
          enablePan={false}
          enableDamping
          dampingFactor={0.12}
          minZoom={8}
          maxZoom={45}
          minPolarAngle={Math.PI / 10}
          maxPolarAngle={Math.PI / 2.3}
          rotateSpeed={0.6}
        />
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[18, 28, 12]}
        intensity={1.05}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={0.1}
        shadow-camera-far={90}
      />

      <BaseFloor />

      {rooms.map((room) => (
        <Room3D
          key={room.id}
          id={room.id}
          position={room.posicion}
          color={roomColors[room.id] ?? room.color}
        />
      ))}
      {rooms.map((room) => (
        <RoomMarker key={room.id} room={room} />
      ))}

      <RoomProximity />
      <Character />
      </Canvas>
      <NavControls controlsRef={controls} />
    </>
  )
}

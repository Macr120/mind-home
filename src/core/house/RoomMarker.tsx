import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useHouse, playerPos } from '../state/houseStore'
import type { RoomModule } from '../registry'

const ENTRAR_DIST = 2.6

/**
 * Lejos: solo un icono flotante (evita encimar 12 etiquetas).
 * Cerca: nombre del cuarto + botón "Entrar".
 */
export function RoomMarker({ room }: { room: RoomModule }) {
  const [cerca, setCerca] = useState(false)
  const pos = useRef(new THREE.Vector3(...room.posicion))
  const openRoom = useHouse((s) => s.openRoom)

  useFrame(() => {
    const d = playerPos.distanceTo(pos.current)
    const ahoraCerca = d < ENTRAR_DIST
    setCerca((prev) => (prev !== ahoraCerca ? ahoraCerca : prev))
  })

  return (
    <group position={[room.posicion[0], 3, room.posicion[2]]}>
      <Html center distanceFactor={14}>
        <div
          style={{
            textAlign: 'center',
            userSelect: 'none',
            pointerEvents: cerca ? 'auto' : 'none',
          }}
        >
          {cerca ? (
            <>
              <div
                style={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 4px #000, 0 0 2px #000',
                }}
              >
                {room.icon} {room.nombre}
              </div>
              <button
                onClick={() => openRoom(room.id)}
                style={{
                  marginTop: 5,
                  padding: '5px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: room.color,
                  color: '#0f1115',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(0,0,0,.5)',
                }}
              >
                Entrar ›
              </button>
            </>
          ) : (
            <div
              style={{
                fontSize: 22,
                lineHeight: 1,
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.7))',
              }}
            >
              {room.icon}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

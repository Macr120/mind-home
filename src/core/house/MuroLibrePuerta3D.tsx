import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerPos } from '../state/playerPosition'
import { useHouse } from '../state/houseStore'
import {
  ABRE_ANG,
  PUERTA_GROSOR,
  PUERTA_BASE_Y,
  hojasDeAbertura,
  HojaPuertaMesh,
  MontanteVanoMesh,
  type RemateHoja,
} from './puertaHojas'
import type { AberturaMundo } from './murosLibre'

type TipoPuerta = 'recta' | 'doble' | 'porton' | 'corredera'

/**
 * Puerta sólida de un muro independiente, con apertura animada al acercarse el avatar:
 * recta/doble giran sobre su bisagra, corredera desliza, portón sube. Decorativa (sin colisión).
 * Con `remate` (vano en arco/pico), las hojas batientes toman esa forma; en corredera y
 * portón el remate lo llena un montante fijo (la hoja rectangular se mueve por debajo).
 */
export function MuroLibrePuerta3D({
  ab,
  baseY,
  alto,
  tipo,
  color,
  nivel,
  mundoOffset,
  remate,
}: {
  ab: AberturaMundo
  /** Y de la base del muro. */
  baseY: number
  /** Alto de la hoja en metros. */
  alto: number
  tipo: TipoPuerta
  color: string
  /** Nivel del muro: la hoja se abre cuando el avatar está en ese piso. */
  nivel: number
  /** Offset (mundo) del grupo padre cuando `ab` viene en coords LOCALES (muros de cuarto). */
  mundoOffset?: { x: number; z: number }
  /** Remate del vano (arco/pico) que la puerta debe llenar. */
  remate?: RemateHoja
}) {
  const hojasRefs = useRef<(THREE.Group | null)[]>([])
  const correderaRef = useRef<THREE.Group | null>(null)
  const portonRef = useRef<THREE.Group | null>(null)
  const apertura = useRef(0)
  const hojas = useMemo(
    () => hojasDeAbertura(ab.cx, ab.cz, ab.dirx, ab.dirz, ab.ancho, ab.nx, ab.nz, tipo === 'doble'),
    [ab, tipo],
  )
  // Yaw para alinear las losas (corredera/portón) a lo largo de la pared.
  const yaw = Math.atan2(-ab.dirz, ab.dirx)

  useFrame(() => {
    const lvl = useHouse.getState().playerLevel
    const cerca =
      lvl === nivel &&
      Math.hypot(
        playerPos.x - (ab.cx + (mundoOffset?.x ?? 0)),
        playerPos.z - (ab.cz + (mundoOffset?.z ?? 0)),
      ) < 2.4
    apertura.current = THREE.MathUtils.lerp(apertura.current, cerca ? 1 : 0, 0.18)
    const a = apertura.current
    if (tipo === 'corredera') {
      const g = correderaRef.current
      if (g) {
        const slide = ab.ancho * 0.92 * a
        g.position.set(ab.cx + ab.dirx * slide, baseY, ab.cz + ab.dirz * slide)
      }
    } else if (tipo === 'porton') {
      const g = portonRef.current
      if (g) g.position.y = baseY + PUERTA_BASE_Y + alto / 2 + alto * 0.96 * a
    } else {
      for (let i = 0; i < hojas.length; i++) {
        const g = hojasRefs.current[i]
        if (g) g.rotation.y = hojas[i].closedYaw + hojas[i].signo * ABRE_ANG * a
      }
    }
  })

  // Montante fijo del remate (corredera/portón): tapa el arco/pico mientras la hoja se mueve.
  const montante = remate && remate.forma !== 'recta' && remate.extra > 0.02 && (
    <group position={[ab.cx, baseY + alto, ab.cz]} rotation={[0, yaw, 0]}>
      <MontanteVanoMesh ancho={ab.ancho} remate={remate} color={color} />
    </group>
  )

  if (tipo === 'corredera') {
    return (
      <group>
        {montante}
        <group ref={correderaRef} position={[ab.cx, baseY, ab.cz]}>
          <group rotation={[0, yaw, 0]}>
            <mesh position={[0, PUERTA_BASE_Y + alto / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[ab.ancho - 0.06, alto, PUERTA_GROSOR]} />
              <meshStandardMaterial color={color} roughness={0.35} metalness={0.4} />
            </mesh>
          </group>
        </group>
      </group>
    )
  }

  if (tipo === 'porton') {
    return (
      <group>
        {montante}
        <group ref={portonRef} position={[ab.cx, baseY + PUERTA_BASE_Y + alto / 2, ab.cz]}>
          <group rotation={[0, yaw, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[ab.ancho - 0.06, alto, PUERTA_GROSOR]} />
              <meshStandardMaterial color={color} roughness={0.3} metalness={0.55} />
            </mesh>
          </group>
        </group>
      </group>
    )
  }

  // Batientes: la hoja lleva el remate integrado (media silueta por hoja en la doble).
  return (
    <group>
      {hojas.map((h, i) => (
        <group
          key={i}
          ref={(el) => { hojasRefs.current[i] = el }}
          position={[h.hingeX, baseY, h.hingeZ]}
          rotation={[0, h.closedYaw, 0]}
        >
          <HojaPuertaMesh
            width={h.width}
            color={color}
            alto={alto}
            remate={remate}
            un0={tipo === 'doble' ? (i === 0 ? -1 : 1) : -1}
            un1={tipo === 'doble' ? 0 : 1}
          />
        </group>
      ))}
    </group>
  )
}

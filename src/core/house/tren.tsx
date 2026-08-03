import { useEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { VACIO, caminosRepo } from '../data/repository'
import { useTren, trenFrame, setRedRieles, type TipoRiel } from '../state/trenStore'
import { monturaFrame } from '../state/monturaStore'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { playerPos } from '../state/playerPosition'
import { cellToWorld } from './walls'

/** Distancia máxima al centro de una celda de riel para ofrecer montar. */
const RADIO_MONTAR = 4.4

/**
 * Publica la celda de riel/montaña rusa al alcance (para el botón "Montar") y
 * mantiene sincronizada la red de vías con db.caminos.
 */
let accTren = 0
export function TrenProximity() {
  const filas = caminosRepo.useAll() ?? VACIO
  useEffect(() => setRedRieles(filas), [filas])

  useFrame((_st3f, delta) => {
    // Sin rieles no hay nada que ofrecer; y el sondeo va a ~4 veces/s
    // (recorrer los caminos a 60 Hz era caro en móviles).
    if (filas.length === 0) return
    accTren += delta
    if (accTren < 0.25) return
    accTren = 0
    const st = useTren.getState()
    if (st.montado) return
    const casa = useHouse.getState()
    if (
      monturaFrame.montado ||
      casa.transicion ||
      casa.playerLevel !== 0 ||
      useLayout.getState().editMode
    ) {
      st.setCerca(null)
      return
    }
    let mejor: { col: number; row: number; tipo: TipoRiel; d: number } | null = null
    for (const f of filas) {
      if (f.tipo === 'pista') continue
      const [x, , z] = cellToWorld(f.col, f.row)
      const d = Math.hypot(playerPos.x - x, playerPos.z - z)
      if (d <= RADIO_MONTAR && (!mejor || d < mejor.d))
        mejor = { col: f.col, row: f.row, tipo: f.tipo, d }
    }
    st.setCerca(mejor ? { col: mejor.col, row: mejor.row, tipo: mejor.tipo } : null)
  })
  return null
}

/** Rueda del vagón (gira con la distancia rodada). */
function Rueda({ x, z, r }: { x: number; z: number; r: number }) {
  const m = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (m.current) m.current.rotation.x = trenFrame.faseRueda / r
  })
  return (
    <mesh ref={m} position={[x, r, z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[r, r, 0.12, 10]} />
      <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
    </mesh>
  )
}

/**
 * Vagón bajo el avatar mientras recorre la vía: locomotora en rieles, carrito
 * abierto en la montaña rusa. El avatar (children) va de pie sobre la plataforma.
 */
export function TrenMontado({ tipo, children }: { tipo: TipoRiel; children: ReactNode }) {
  if (tipo === 'riel') {
    return (
      <group>
        <group position={[0, -0.05, 0]}>
          {/* Plataforma + caldera + cabina + chimenea. */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[1.3, 0.26, 2.5]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.62, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 1.1, 12]} />
            <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.98, 1.05]}>
            <cylinderGeometry args={[0.09, 0.13, 0.35, 8]} />
            <meshStandardMaterial color="#111827" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.72, -0.85]}>
            <boxGeometry args={[1.1, 0.85, 0.7]} />
            <meshStandardMaterial color="#991b1b" roughness={0.6} />
          </mesh>
          <Rueda x={-0.62} z={0.7} r={0.26} />
          <Rueda x={0.62} z={0.7} r={0.26} />
          <Rueda x={-0.62} z={-0.7} r={0.26} />
          <Rueda x={0.62} z={-0.7} r={0.26} />
        </group>
        {/* El maquinista va de pie sobre la plataforma. */}
        <group position={[0, 0.4, -0.1]}>{children}</group>
      </group>
    )
  }
  // Carrito de montaña rusa: caja abierta con ruedas pequeñas.
  return (
    <group>
      <group position={[0, -0.12, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[1.0, 0.12, 1.5]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.55} />
        </mesh>
        {[-0.47, 0.47].map((x) => (
          <mesh key={x} position={[x, 0.34, 0]}>
            <boxGeometry args={[0.08, 0.4, 1.5]} />
            <meshStandardMaterial color="#dc2626" roughness={0.55} />
          </mesh>
        ))}
        {[-0.71, 0.71].map((z) => (
          <mesh key={z} position={[0, 0.34, z]}>
            <boxGeometry args={[1.0, 0.4, 0.08]} />
            <meshStandardMaterial color="#dc2626" roughness={0.55} />
          </mesh>
        ))}
        <Rueda x={-0.45} z={0.5} r={0.14} />
        <Rueda x={0.45} z={0.5} r={0.14} />
        <Rueda x={-0.45} z={-0.5} r={0.14} />
        <Rueda x={0.45} z={-0.5} r={0.14} />
      </group>
      <group position={[0, 0.12, 0]}>{children}</group>
    </group>
  )
}

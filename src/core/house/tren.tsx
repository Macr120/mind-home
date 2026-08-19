import { useEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { VACIO, caminosRepo } from '../data/repository'
import {
  useTren,
  trenFrame,
  setRedRieles,
  avanzarTren,
  flota,
  type TipoRiel,
  type PoseTren,
  type TrenAutonomo,
} from '../state/trenStore'
import { monturaFrame } from '../state/monturaStore'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { usePaintball } from '../state/paintballStore'
import { useAsistentes, getAsistente } from '../state/asistentesStore'
import { playerPos } from '../state/playerPosition'
import { posAsistentes } from '../state/posAsistentes'
import { ModeloMascota } from './Asistente3D'
import { Prendas } from './Prendas'
import { anclasDe } from './apariencia'
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

/** Rueda del vagón (gira con la distancia rodada de SU tren). */
function Rueda({ x, z, r, pose }: { x: number; z: number; r: number; pose?: PoseTren }) {
  const m = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (m.current) m.current.rotation.x = (pose ?? trenFrame).faseRueda / r
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
 * Sin `pose` gira sus ruedas con las del jugador; los trenes de la flota pasan
 * la suya, que es la única forma de que cada uno ruede a su ritmo.
 */
export function TrenMontado({
  tipo,
  pose,
  children,
}: {
  tipo: TipoRiel
  pose?: PoseTren
  children: ReactNode
}) {
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
          <Rueda x={-0.62} z={0.7} r={0.26} pose={pose} />
          <Rueda x={0.62} z={0.7} r={0.26} pose={pose} />
          <Rueda x={-0.62} z={-0.7} r={0.26} pose={pose} />
          <Rueda x={0.62} z={-0.7} r={0.26} pose={pose} />
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
        <Rueda x={-0.45} z={0.5} r={0.14} pose={pose} />
        <Rueda x={0.45} z={0.5} r={0.14} pose={pose} />
        <Rueda x={-0.45} z={-0.5} r={0.14} pose={pose} />
        <Rueda x={0.45} z={-0.5} r={0.14} pose={pose} />
      </group>
      <group position={[0, 0.12, 0]}>{children}</group>
    </group>
  )
}

/** El asistente que va de maquinista (mismo molde que el rival de las carreras). */
function Conductor({ id }: { id: string }) {
  const brazo = useRef<THREE.Group>(null)
  const a = getAsistente(id)
  return (
    <group scale={a.escala ?? 1}>
      <ModeloMascota
        forma={a.forma}
        color={a.color}
        modelo3d={a.modelo3d}
        modeloGlb={a.modeloGlb}
        cuerpoPresetId={a.cuerpoPresetId}
        brazoRef={brazo}
        anim={a.animacion}
        estado={{ velocidad: 0, fase: 0 }}
      />
      <Prendas ropa={a.ropa} anclas={anclasDe(a)} />
    </group>
  )
}

/** Un vagón de la flota: el grupo lo coloca cada frame `TrenesAutonomos`. */
function TrenAutonomo3D({ tren }: { tren: TrenAutonomo }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    const gr = g.current
    if (!gr) return
    gr.position.copy(tren.pos)
    gr.rotation.set(0, tren.pose.heading, 0)
  })
  return (
    <group ref={g}>
      <TrenMontado tipo={tren.tipo} pose={tren.pose}>
        {tren.conductorId ? <Conductor id={tren.conductorId} /> : null}
      </TrenMontado>
    </group>
  )
}

/**
 * Los trenes que dan vueltas sin nadie a bordo: uno por vía (los arma
 * `trenStore` al sincronizar la red). Un solo `useFrame` los mueve a todos
 * — cada hijo solo copia su pose —, como hacen `ContextoProximity` y las
 * canchas con sus bucles.
 */
export function TrenesAutonomos() {
  // `version` sube al nacer o morir un tren y al cambiar el modo de una vía.
  useTren((s) => s.version)
  // Reacciona a que editen o borren al asistente que va conduciendo.
  useAsistentes((s) => s.lista)
  const fasePaintball = usePaintball((s) => s.fase)

  useFrame((_st, delta) => {
    // En el editor los trenes se quedan quietos (pero se siguen viendo: hace
    // falta saber por dónde va el que estás a punto de partir con una celda).
    if (useLayout.getState().editMode) return
    for (const t of flota) {
      if (t.detenido) continue
      avanzarTren(t.via, t.tipo, t.pos, t.pose, delta)
      // Que se pueda hablar con el maquinista cuando pasa por el andén.
      if (t.conductorId) posAsistentes[t.conductorId] = { x: t.pos.x, z: t.pos.z }
    }
  })

  // En una batalla el campo se despeja (mismo criterio que `Asistente3D`).
  if (fasePaintball === 'cuenta' || fasePaintball === 'jugando' || fasePaintball === 'fin')
    return null
  return (
    <>
      {flota.map((t) => (
        <TrenAutonomo3D key={t.viaId} tren={t} />
      ))}
    </>
  )
}

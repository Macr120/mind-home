import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDiseño, esObjetoMapa } from '../state/disenoStore'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { playerPos } from '../state/playerPosition'
import { useMontura, monturaFrame } from '../state/monturaStore'
import { trenFrame } from '../state/trenStore'
import { dragChar } from './characterDrag'

/**
 * Vehículos montables: datos, modelos 3D (primitivas, frente hacia +Z como el
 * avatar) y detección de proximidad para el prompt "Subirte". La mecánica de
 * conducción vive en `Character.tsx`; el estado de montura en `monturaStore.ts`.
 */

export type TipoVehiculo = 'bicicleta' | 'motocicleta' | 'automovil' | 'ovni'

export interface VehiculoJugable {
  tipo: TipoVehiculo
  nombre: string
  icono: string
  defaultColor: string
  /** Multiplicador sobre la velocidad a pie (SPEED de Character). */
  velocidad: number
  /** Giro del rumbo en radianes por frame a input pleno. */
  giro: number
  /** Offset local del avatar sentado sobre el vehículo. */
  asiento: [number, number, number]
  /** Radio de colisión al conducir (a pie es 0.4). */
  radio: number
}

export const VEHICULOS_JUGABLES: VehiculoJugable[] = [
  { tipo: 'bicicleta', nombre: 'Bicicleta', icono: '🚲', defaultColor: '#ef4444', velocidad: 1.5, giro: 0.045, asiento: [0, 0.42, -0.38], radio: 0.4 },
  { tipo: 'motocicleta', nombre: 'Motocicleta', icono: '🏍️', defaultColor: '#8b5cf6', velocidad: 2.1, giro: 0.05, asiento: [0, 0.24, -0.26], radio: 0.45 },
  { tipo: 'automovil', nombre: 'Automóvil', icono: '🚗', defaultColor: '#3b82f6', velocidad: 2.6, giro: 0.035, asiento: [0, 0.26, -0.45], radio: 0.6 },
  { tipo: 'ovni', nombre: 'Platillo OVNI', icono: '🛸', defaultColor: '#22c55e', velocidad: 2.3, giro: 0.055, asiento: [0, 0.08, 0], radio: 1.0 },
]

export const esVehiculo = (tipo: string): tipo is TipoVehiculo =>
  VEHICULOS_JUGABLES.some((v) => v.tipo === tipo)

export const vehiculoDe = (tipo: TipoVehiculo): VehiculoJugable =>
  VEHICULOS_JUGABLES.find((v) => v.tipo === tipo)!

// Colores fijos de las partes (el color elegido pinta cuadro/carrocería/platillo).
const LLANTA = '#1f2937'
const RIN = '#9ca3af'
const METAL = '#374151'
const ASIENTO = '#111827'
const VIDRIO = '#93c5fd'

/** Rueda: llanta + rin, con eje sobre X (girarla en `rotation.x` la hace rodar). */
function Rueda({
  p,
  r,
  ancho,
  innerRef,
}: {
  p: [number, number, number]
  r: number
  ancho: number
  innerRef?: (g: THREE.Group | null) => void
}) {
  return (
    <group ref={innerRef} position={p}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r, r, ancho, 18]} />
        <meshStandardMaterial color={LLANTA} roughness={0.9} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 0.55, r * 0.55, ancho + 0.02, 12]} />
        <meshStandardMaterial color={RIN} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  )
}

/**
 * Geometría pura de la bicicleta (sin hooks): la usan tanto el catálogo/mapa
 * (siempre estática) como el extractor de piezas (`piezasDesdeObjeto`, que
 * necesita poder EJECUTAR la función fuera de React para bajar a sus mallas).
 * `BicicletaModelo` la envuelve para animar ruedas/pedales al conducir.
 */
function BicicletaForma({
  color,
  refRueda,
  refPedales,
}: {
  color: string
  refRueda?: (i: number, g: THREE.Group | null) => void
  refPedales?: (g: THREE.Group | null) => void
}) {
  return (
    <group>
      <Rueda p={[0, 0.3, -0.55]} r={0.3} ancho={0.06} innerRef={(g) => refRueda?.(0, g)} />
      <Rueda p={[0, 0.3, 0.55]} r={0.3} ancho={0.06} innerRef={(g) => refRueda?.(1, g)} />
      {/* cuadro: tubo principal + tubo del asiento + horquilla */}
      <mesh position={[0, 0.62, 0.05]} rotation={[-0.25, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.06, 1.0]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.72, -0.44]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.6, 0.52]} rotation={[0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.65, 0.06]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* asiento */}
      <mesh position={[0, 0.98, -0.42]} castShadow>
        <boxGeometry args={[0.24, 0.08, 0.34]} />
        <meshStandardMaterial color={ASIENTO} />
      </mesh>
      {/* manubrio: poste + barra */}
      <mesh position={[0, 0.98, 0.48]} castShadow>
        <boxGeometry args={[0.05, 0.22, 0.05]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <mesh position={[0, 1.08, 0.48]} castShadow>
        <boxGeometry args={[0.5, 0.05, 0.07]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      {/* pedales: eje + bielas opuestas (giran con la marcha) */}
      <group ref={(g) => refPedales?.(g)} position={[0, 0.32, -0.05]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.38, 8]} />
          <meshStandardMaterial color={METAL} />
        </mesh>
        <group position={[-0.19, 0, 0]}>
          <mesh position={[0, 0.09, 0]}>
            <boxGeometry args={[0.04, 0.22, 0.04]} />
            <meshStandardMaterial color={METAL} />
          </mesh>
          <mesh position={[-0.04, 0.2, 0]}>
            <boxGeometry args={[0.12, 0.04, 0.14]} />
            <meshStandardMaterial color={ASIENTO} />
          </mesh>
        </group>
        <group position={[0.19, 0, 0]}>
          <mesh position={[0, -0.09, 0]}>
            <boxGeometry args={[0.04, 0.22, 0.04]} />
            <meshStandardMaterial color={METAL} />
          </mesh>
          <mesh position={[0.04, -0.2, 0]}>
            <boxGeometry args={[0.12, 0.04, 0.14]} />
            <meshStandardMaterial color={ASIENTO} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

export function BicicletaModelo({ color, animado = false }: { color: string; animado?: boolean }) {
  const ruedas = useRef<(THREE.Group | null)[]>([])
  const pedales = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!animado) return
    const ang = monturaFrame.faseRueda / 0.3
    for (const r of ruedas.current) if (r) r.rotation.x = ang
    if (pedales.current) pedales.current.rotation.x = monturaFrame.faseRueda * 2.5
  })
  return (
    <BicicletaForma
      color={color}
      refRueda={(i, g) => (ruedas.current[i] = g)}
      refPedales={(g) => (pedales.current = g)}
    />
  )
}

/** Geometría pura de la moto (sin hooks) — ver comentario de `BicicletaForma`. */
function MotoForma({ color, refRueda }: { color: string; refRueda?: (i: number, g: THREE.Group | null) => void }) {
  return (
    <group>
      <Rueda p={[0, 0.32, -0.62]} r={0.32} ancho={0.16} innerRef={(g) => refRueda?.(0, g)} />
      <Rueda p={[0, 0.32, 0.62]} r={0.32} ancho={0.14} innerRef={(g) => refRueda?.(1, g)} />
      {/* cuerpo/tanque */}
      <mesh position={[0, 0.6, 0.05]} castShadow>
        <boxGeometry args={[0.3, 0.28, 1.1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* asiento */}
      <mesh position={[0, 0.76, -0.32]} castShadow>
        <boxGeometry args={[0.3, 0.1, 0.55]} />
        <meshStandardMaterial color={ASIENTO} />
      </mesh>
      {/* horquilla + manubrio */}
      <mesh position={[0, 0.62, 0.55]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.08, 0.6, 0.08]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <mesh position={[0, 0.92, 0.44]} castShadow>
        <boxGeometry args={[0.55, 0.05, 0.06]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      {/* faro */}
      <mesh position={[0, 0.76, 0.62]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.7} />
      </mesh>
      {/* escape */}
      <mesh position={[0.17, 0.36, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.55, 10]} />
        <meshStandardMaterial color={RIN} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

export function MotoModelo({ color, animado = false }: { color: string; animado?: boolean }) {
  const ruedas = useRef<(THREE.Group | null)[]>([])
  useFrame(() => {
    if (!animado) return
    const ang = monturaFrame.faseRueda / 0.32
    for (const r of ruedas.current) if (r) r.rotation.x = ang
  })
  return <MotoForma color={color} refRueda={(i, g) => (ruedas.current[i] = g)} />
}

/** Geometría pura del auto (sin hooks) — ver comentario de `BicicletaForma`. */
function AutoForma({ color, refRueda }: { color: string; refRueda?: (i: number, g: THREE.Group | null) => void }) {
  return (
    <group>
      {([[-0.6, 0.95], [0.6, 0.95], [-0.6, -0.95], [0.6, -0.95]] as const).map(([x, z], i) => (
        <Rueda key={i} p={[x, 0.3, z]} r={0.3} ancho={0.18} innerRef={(g) => refRueda?.(i, g)} />
      ))}
      {/* carrocería (descapotable: se ve al conductor) */}
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[1.25, 0.42, 2.85]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* piso de la cabina + respaldo */}
      <mesh position={[0, 0.74, -0.45]}>
        <boxGeometry args={[1.0, 0.06, 1.3]} />
        <meshStandardMaterial color={ASIENTO} />
      </mesh>
      <mesh position={[0, 0.92, -0.88]} castShadow>
        <boxGeometry args={[0.95, 0.35, 0.15]} />
        <meshStandardMaterial color={ASIENTO} />
      </mesh>
      {/* parabrisas */}
      <mesh position={[0, 0.95, 0.35]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[1.1, 0.45, 0.04]} />
        <meshStandardMaterial color={VIDRIO} transparent opacity={0.45} />
      </mesh>
      {/* faros y defensas */}
      {[-0.4, 0.4].map((x, i) => (
        <mesh key={i} position={[x, 0.6, 1.43]}>
          <boxGeometry args={[0.18, 0.12, 0.04]} />
          <meshStandardMaterial color="#fef9c3" emissive="#fde047" emissiveIntensity={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.35, 1.44]}>
        <boxGeometry args={[1.3, 0.14, 0.08]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <mesh position={[0, 0.35, -1.44]}>
        <boxGeometry args={[1.3, 0.14, 0.08]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
    </group>
  )
}

export function AutoModelo({ color, animado = false }: { color: string; animado?: boolean }) {
  const ruedas = useRef<(THREE.Group | null)[]>([])
  useFrame(() => {
    if (!animado) return
    const ang = monturaFrame.faseRueda / 0.3
    for (const r of ruedas.current) if (r) r.rotation.x = ang
  })
  return <AutoForma color={color} refRueda={(i, g) => (ruedas.current[i] = g)} />
}

/** Geometría pura del OVNI (sin hooks) — ver comentario de `BicicletaForma`. */
function OvniForma({
  color,
  refDisco,
  refCuerpo,
}: {
  color: string
  refDisco?: (g: THREE.Group | null) => void
  refCuerpo?: (g: THREE.Group | null) => void
}) {
  return (
    <group ref={(g) => refCuerpo?.(g)}>
      <group ref={(g) => refDisco?.(g)}>
        {/* platillo */}
        <mesh castShadow scale={[1, 0.22, 1]} position={[0, 0.38, 0]}>
          <sphereGeometry args={[1.05, 24, 16]} />
          <meshStandardMaterial color={color} metalness={0.55} roughness={0.3} />
        </mesh>
        {/* luces del borde (giran con el platillo) */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.78, 0.38, Math.sin(a) * 0.78]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={1.2} />
            </mesh>
          )
        })}
      </group>
      {/* cúpula transparente */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.9, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={VIDRIO} transparent opacity={0.28} />
      </mesh>
      {/* base inferior */}
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.4, 0.3, 0.14, 16]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
    </group>
  )
}

export function OvniModelo({ color, animado = false }: { color: string; animado?: boolean }) {
  const disco = useRef<THREE.Group>(null)
  const cuerpo = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!animado) return
    // El platillo gira siempre (más rápido al avanzar) y flota con un bob suave.
    if (disco.current) disco.current.rotation.y += 0.05 + Math.min(0.12, Math.abs(monturaFrame.vel) * 4)
    if (cuerpo.current) cuerpo.current.position.y = Math.sin(state.clock.elapsedTime * 2.2) * 0.06
  })
  return (
    <OvniForma color={color} refDisco={(g) => (disco.current = g)} refCuerpo={(g) => (cuerpo.current = g)} />
  )
}

/** Geometría pura por tipo (sin hooks): la usan el catálogo/mapa y el extractor de piezas. */
export const FORMA_VEHICULO: Record<TipoVehiculo, (p: { color: string }) => React.ReactElement> = {
  bicicleta: BicicletaForma,
  motocicleta: MotoForma,
  automovil: AutoForma,
  ovni: OvniForma,
}

const MODELO_VEHICULO: Record<TipoVehiculo, (p: { color: string; animado?: boolean }) => React.ReactElement> = {
  bicicleta: BicicletaModelo,
  motocicleta: MotoModelo,
  automovil: AutoModelo,
  ovni: OvniModelo,
}

/**
 * Vehículo que se está conduciendo, dentro del grupo del Character: modelo
 * animado + inclinación al girar (y cabeceo del OVNI) + el avatar sentado
 * (children) en el asiento del vehículo.
 */
export function VehiculoMontado({
  tipo,
  color,
  children,
}: {
  tipo: TipoVehiculo
  color: string
  children: React.ReactNode
}) {
  const def = vehiculoDe(tipo)
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!g.current) return
    g.current.rotation.z = monturaFrame.lean
    g.current.rotation.x = tipo === 'ovni' ? Math.max(-0.18, Math.min(0.18, monturaFrame.vel * 5)) : 0
  })
  const Modelo = MODELO_VEHICULO[tipo]
  return (
    <group ref={g}>
      <Modelo color={color} animado />
      <group position={def.asiento}>{children}</group>
    </group>
  )
}

/** Distancia al vehículo (su centro) para ofrecer subirse. */
const RADIO_MONTAR = 2.2

/**
 * Detecta el vehículo del mapa más cercano al jugador (a pie, en planta baja,
 * sin editor ni transición) y lo publica para el prompt 2D "Subirte".
 */
let accVehiculo = 0
export function VehiculoProximity() {
  const setCerca = useMontura((s) => s.setCerca)
  useFrame((_st3f, delta) => {
    // Sondeo ~4 veces/s: recorrer todos los objetos a 60 Hz era carísimo en móviles.
    accVehiculo += delta
    if (accVehiculo < 0.25) return
    accVehiculo = 0
    if (useMontura.getState().instanciaId != null || monturaFrame.montado) return // conduciendo: no buscar
    if (trenFrame.montado) {
      setCerca(null, null) // arriba del tren no se ofrece otro vehículo
      return
    }
    const { transicion, playerLevel } = useHouse.getState()
    if (transicion || playerLevel !== 0 || useLayout.getState().editMode || dragChar.id) {
      setCerca(null, null)
      return
    }
    let mejor: { id: number; tipo: TipoVehiculo; d: number } | null = null
    for (const o of useDiseño.getState().objetos) {
      if (o.id == null || !esObjetoMapa(o) || !esVehiculo(o.tipo)) continue
      const d = Math.hypot(playerPos.x - (o.x ?? 0), playerPos.z - (o.z ?? 0))
      if (d <= RADIO_MONTAR && (!mejor || d < mejor.d)) mejor = { id: o.id, tipo: o.tipo, d }
    }
    setCerca(mejor?.id ?? null, mejor?.tipo ?? null)
  })
  return null
}

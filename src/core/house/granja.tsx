import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { animalesRepo, corralesRepo } from '../data/repository'
import {
  useGranja,
  estaHambriento,
  estaAburrido,
  estaEnfermo,
  corralSucio,
  mimarAnimal,
  revisarGranja,
  type HerramientaGranja,
} from '../state/granjaStore'
import { useLayout } from '../state/layoutStore'
import { useHouse, playerPos } from '../state/houseStore'
import { useMontura } from '../state/monturaStore'
import { trenFrame } from '../state/trenStore'
import { useGranjaCerca } from '../state/granjaCercaStore'
import { useAnimalSel } from '../state/animalSelStore'
import { dragChar } from './characterDrag'
import { celdaEnteraBajoCursor } from './arrastreCelda'
import { cellToWorld, SIZE } from './walls'
import { ContornoCelda } from './caminos'
import { registrarAncla, quitarAncla } from './etiquetasMapa'
import type { AnimalGranja, TipoAccesorio, TipoAnimal } from '../data/db'

/** Tope de la loseta exterior (~0.19; los objetos de mapa van a 0.2). */
const Y = 0.2
/** Margen entre la cerca y el área donde vagan los animales. */
const MARGEN_PASEO = 1.1

/** Velocidad de paseo por especie (unidades/segundo). */
const VEL: Record<TipoAnimal, number> = {
  gallina: 1.0,
  cerdo: 0.7,
  cabra: 0.9,
  oveja: 0.6,
  vaca: 0.45,
  caballo: 1.3,
}

/** Altura del ancla de la etiqueta de nombre (sobre el signo de hambre). */
const ALTURA_NOMBRE: Record<TipoAnimal, number> = {
  gallina: 2.05,
  cerdo: 2.05,
  cabra: 2.15,
  oveja: 2.05,
  vaca: 2.45,
  caballo: 2.6,
}

/** Tinte del animal decaído (sin comida ni mimos). */
const GRIS_DECAIDO = new THREE.Color('#9ca3af')
/** Tinte del animal enfermo: verdoso apagado, distinto del gris del decaído. */
const VERDE_ENFERMO = new THREE.Color('#7d8f6a')

/** Lejos de este radio el vagabundeo corre a ~4 ticks/s (ahorro con muchos animales). */
const RADIO_VIVO = 26
const _posMundo = new THREE.Vector3()

/** Accesorio de un corral en coordenadas locales (relativas al centro del rect). */
interface AccesorioLocal {
  tipo: TipoAccesorio
  x: number
  z: number
}

/** Un lado de la cerca: postes repartidos cada ≤2.8 u + dos travesaños. */
function Cerca({ largo }: { largo: number }) {
  const n = Math.max(1, Math.ceil(largo / 2.8))
  const postes = Array.from({ length: n + 1 }, (_, i) => -largo / 2 + (largo * i) / n)
  return (
    <group>
      {postes.map((x) => (
        <mesh key={x} position={[x, Y + 0.45, 0]}>
          <boxGeometry args={[0.12, 0.9, 0.12]} />
          <meshStandardMaterial color="#8a5a33" roughness={0.9} />
        </mesh>
      ))}
      {[0.32, 0.68].map((h) => (
        <mesh key={h} position={[0, Y + h, 0]}>
          <boxGeometry args={[largo + 0.12, 0.09, 0.07]} />
          <meshStandardMaterial color="#a06b3d" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/** Manchas del corral sucio, repartidas por la paja (proporción fija al tamaño). */
const MANCHAS: [number, number, number][] = [
  [-0.3, -0.25, 0.5],
  [0.28, 0.12, 0.42],
  [0.05, -0.38, 0.3],
  [-0.15, 0.34, 0.36],
]

/** Cerca de madera y piso de paja del corral (rectángulo de ancho×alto celdas). */
function Corral({ ancho, alto, sucio }: { ancho: number; alto: number; sucio: boolean }) {
  const hx = (ancho * SIZE) / 2 - 0.2
  const hz = (alto * SIZE) / 2 - 0.2
  return (
    <group>
      {/* Piso de paja del corral (apagado y manchado cuando toca limpiarlo). */}
      <mesh position={[0, Y + 0.03, 0]}>
        <boxGeometry args={[hx * 2 - 0.1, 0.06, hz * 2 - 0.1]} />
        <meshStandardMaterial color={sucio ? '#6b5a38' : '#9a8250'} roughness={0.95} />
      </mesh>
      {sucio &&
        MANCHAS.map(([fx, fz, r]) => (
          <mesh key={`${fx},${fz}`} position={[hx * 2 * fx, Y + 0.07, hz * 2 * fz]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[r, 10]} />
            <meshStandardMaterial color="#4a3c22" roughness={1} />
          </mesh>
        ))}
      {[-hz, hz].map((z) => (
        <group key={`z${z}`} position={[0, 0, z]}>
          <Cerca largo={hx * 2} />
        </group>
      ))}
      {[-hx, hx].map((x) => (
        <group key={`x${x}`} position={[x, 0, 0]} rotation-y={Math.PI / 2}>
          <Cerca largo={hz * 2} />
        </group>
      ))}
    </group>
  )
}

/** Juguete del corral: charco de lodo, tina de baño o pelota. */
function Accesorio3D({ tipo }: { tipo: TipoAccesorio }) {
  if (tipo === 'lodo') {
    return (
      <group>
        <mesh position={[0, Y + 0.05, 0]}>
          <cylinderGeometry args={[1.15, 1.35, 0.1, 12]} />
          <meshStandardMaterial color="#7a5230" roughness={1} />
        </mesh>
        {[
          [-0.4, 0.3],
          [0.35, -0.25],
        ].map(([x, z]) => (
          <mesh key={`${x},${z}`} position={[x, Y + 0.11, z]}>
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshStandardMaterial color="#8a6238" roughness={1} />
          </mesh>
        ))}
      </group>
    )
  }
  if (tipo === 'tina') {
    return (
      <group position={[0, Y, 0]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.9, 0.8, 0.5, 14]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.88, 0.05, 8, 18]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.44, 0]}>
          <cylinderGeometry args={[0.82, 0.82, 0.04, 14]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.2} transparent opacity={0.8} />
        </mesh>
      </group>
    )
  }
  // Pelota.
  return (
    <group position={[0, Y + 0.35, 0]}>
      <mesh>
        <sphereGeometry args={[0.35, 12, 10]} />
        <meshStandardMaterial color="#ef4444" roughness={0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.35, 0.045, 8, 20]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
    </group>
  )
}

/** Cuerpo del animal por especie (primitivas estilo Roblox, mirando a +z). */
function CuerpoAnimal({ tipo, hambriento }: { tipo: TipoAnimal; hambriento: boolean }) {
  // Cabeza baja cuando tiene hambre (todo el cuerpo se inclina un poco).
  const inclinacion = hambriento ? 0.22 : 0

  if (tipo === 'gallina') {
    return (
      <group rotation-x={inclinacion}>
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 0.12, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.24, 6]} />
            <meshStandardMaterial color="#eab308" roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[0, 0.34, 0]} scale={[1, 0.9, 1.15]}>
          <sphereGeometry args={[0.24, 10, 8]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.58, 0.18]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.72, 0.18]}>
          <boxGeometry args={[0.06, 0.1, 0.14]} />
          <meshStandardMaterial color="#dc2626" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.57, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.05, 0.12, 6]} />
          <meshStandardMaterial color="#f97316" roughness={0.6} />
        </mesh>
      </group>
    )
  }

  const patas = (dx: number, dz: number, alto: number, color: string) =>
    [
      [-dx, -dz],
      [dx, -dz],
      [-dx, dz],
      [dx, dz],
    ].map(([px, pz]) => (
      <mesh key={`${px},${pz}`} position={[px, alto / 2, pz]}>
        <boxGeometry args={[0.11, alto, 0.11]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    ))

  if (tipo === 'cerdo') {
    return (
      <group rotation-x={inclinacion}>
        {patas(0.26, 0.26, 0.28, '#e8a0a8')}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.55, 0.48, 0.9]} />
          <meshStandardMaterial color="#f2b7bd" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.58, 0.55]}>
          <boxGeometry args={[0.38, 0.36, 0.3]} />
          <meshStandardMaterial color="#f2b7bd" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.55, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.08, 8]} />
          <meshStandardMaterial color="#e8919b" roughness={0.7} />
        </mesh>
        {[-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, 0.79, 0.5]} rotation={[0.3, 0, x > 0 ? -0.3 : 0.3]}>
            <coneGeometry args={[0.07, 0.14, 4]} />
            <meshStandardMaterial color="#e8a0a8" roughness={0.8} />
          </mesh>
        ))}
      </group>
    )
  }

  if (tipo === 'cabra') {
    return (
      <group rotation-x={inclinacion}>
        {patas(0.24, 0.26, 0.36, '#9aa0a6')}
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.46, 0.44, 0.82]} />
          <meshStandardMaterial color="#b9bec4" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.82, 0.5]}>
          <boxGeometry args={[0.28, 0.34, 0.3]} />
          <meshStandardMaterial color="#b9bec4" roughness={0.85} />
        </mesh>
        {[-0.1, 0.1].map((x) => (
          <mesh key={x} position={[x, 1.04, 0.42]} rotation={[-0.6, 0, 0]}>
            <coneGeometry args={[0.045, 0.22, 6]} />
            <meshStandardMaterial color="#6b7280" roughness={0.7} />
          </mesh>
        ))}
      </group>
    )
  }

  if (tipo === 'oveja') {
    return (
      <group rotation-x={inclinacion}>
        {patas(0.24, 0.24, 0.3, '#3f3f46')}
        <mesh position={[0, 0.62, 0]} scale={[1, 0.85, 1.2]}>
          <sphereGeometry args={[0.42, 10, 8]} />
          <meshStandardMaterial color="#f1f0ea" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.72, 0.52]}>
          <boxGeometry args={[0.24, 0.26, 0.28]} />
          <meshStandardMaterial color="#3f3f46" roughness={0.8} />
        </mesh>
      </group>
    )
  }

  if (tipo === 'caballo') {
    return (
      <group rotation-x={inclinacion}>
        {patas(0.26, 0.44, 0.66, '#6b4a2f')}
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[0.56, 0.58, 1.24]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.85} />
        </mesh>
        {/* Cuello inclinado hacia delante, con la crin encima. */}
        <mesh position={[0, 1.42, 0.5]} rotation-x={-0.45}>
          <boxGeometry args={[0.3, 0.62, 0.32]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.62, 0.44]} rotation-x={-0.45}>
          <boxGeometry args={[0.12, 0.6, 0.1]} />
          <meshStandardMaterial color="#3f3f46" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.68, 0.78]} rotation-x={0.25}>
          <boxGeometry args={[0.24, 0.26, 0.5]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.6, 1.0]}>
          <boxGeometry args={[0.2, 0.18, 0.12]} />
          <meshStandardMaterial color="#5b3a1c" roughness={0.8} />
        </mesh>
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 1.86, 0.66]} rotation={[0, 0, x > 0 ? -0.2 : 0.2]}>
            <coneGeometry args={[0.05, 0.16, 5]} />
            <meshStandardMaterial color="#8b5a2b" roughness={0.85} />
          </mesh>
        ))}
        {/* Cola. */}
        <mesh position={[0, 1.14, -0.66]} rotation-x={0.5}>
          <boxGeometry args={[0.12, 0.5, 0.12]} />
          <meshStandardMaterial color="#3f3f46" roughness={0.9} />
        </mesh>
      </group>
    )
  }

  // Vaca.
  return (
    <group rotation-x={inclinacion}>
      {patas(0.34, 0.42, 0.45, '#e5e0d8')}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.68, 0.62, 1.3]} />
        <meshStandardMaterial color="#f3efe7" roughness={0.85} />
      </mesh>
      {/* Manchas. */}
      <mesh position={[0.24, 0.95, -0.3]}>
        <boxGeometry args={[0.24, 0.3, 0.4]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.85} />
      </mesh>
      <mesh position={[-0.22, 0.75, 0.25]}>
        <boxGeometry args={[0.28, 0.34, 0.34]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.02, 0.78]}>
        <boxGeometry args={[0.36, 0.4, 0.36]} />
        <meshStandardMaterial color="#f3efe7" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.98, 0.98]}>
        <boxGeometry args={[0.2, 0.14, 0.1]} />
        <meshStandardMaterial color="#d9a0a8" roughness={0.8} />
      </mesh>
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 1.24, 0.72]} rotation={[0, 0, x > 0 ? -0.9 : 0.9]}>
          <coneGeometry args={[0.045, 0.16, 6]} />
          <meshStandardMaterial color="#d6cfc2" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/** Corazones que suben y se desvanecen tras un mimo. */
function Corazones() {
  const g = useRef<THREE.Group>(null)
  const t0 = useRef<number | null>(null)
  useFrame((state) => {
    if (!g.current) return
    if (t0.current == null) t0.current = state.clock.elapsedTime
    const t = state.clock.elapsedTime - t0.current
    if (t > 1.5) {
      g.current.visible = false
      return
    }
    g.current.position.y = 1.5 + t * 0.9
    g.current.scale.setScalar(Math.max(0.01, 1 - t / 1.5))
  })
  return (
    <group ref={g} position={[0, 1.5, 0]}>
      {[-0.24, 0, 0.24].map((x, i) => (
        <group key={x} position={[x, i === 1 ? 0.2 : 0, 0]}>
          {[-0.055, 0.055].map((dx) => (
            <mesh key={dx} position={[dx, 0.05, 0]}>
              <sphereGeometry args={[0.07, 8, 6]} />
              <meshStandardMaterial color="#fb7185" emissive="#e11d48" emissiveIntensity={0.5} />
            </mesh>
          ))}
          <mesh position={[0, -0.04, 0]} rotation-z={Math.PI}>
            <coneGeometry args={[0.1, 0.18, 4]} />
            <meshStandardMaterial color="#fb7185" emissive="#e11d48" emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * Animal que vaga por su corral; hambriento se queda quieto y cabizbajo,
 * aburrido anda lento con un signo «…», y a veces va a jugar a un accesorio.
 * Enfermo (mucho tiempo sin comer) se agacha verdoso con una cruz encima.
 */
function AnimalVivo({
  fila,
  hambriento,
  aburrido,
  enfermo,
  paseoX,
  paseoZ,
  accesorios,
}: {
  fila: AnimalGranja
  hambriento: boolean
  aburrido: boolean
  enfermo: boolean
  paseoX: number
  paseoZ: number
  accesorios: AccesorioLocal[]
}) {
  const g = useRef<THREE.Group>(null)
  const cuerpo = useRef<THREE.Group>(null)
  const gotas = useRef<THREE.Group>(null)
  const ancla = useRef(new THREE.Vector3())
  const st = useRef({
    x: (Math.random() - 0.5) * paseoX,
    z: (Math.random() - 0.5) * paseoZ,
    tx: 0,
    tz: 0,
    pausa: Math.random() * 2,
    heading: Math.random() * Math.PI * 2,
    fase: Math.random() * 10,
    /** Accesorio al que va caminando ahora mismo. */
    accTipo: null as TipoAccesorio | null,
    /** Accesorio con el que está jugando + segundos que le quedan. */
    jugando: null as TipoAccesorio | null,
    resta: 0,
    /** Gate de distancia: lejos del jugador el animal solo tickea de a ratos. */
    accDist: Math.random() * 0.5,
    lejos: false,
    accTick: 0,
  })

  // Ancla de la etiqueta de nombre (posición mundial actualizada por frame).
  useEffect(() => {
    if (fila.id == null) return
    const id = `animal:${fila.id}`
    registrarAncla(id, () => ancla.current)
    return () => quitarAncla(id)
  }, [fila.id])

  // Decaído (sin comida NI mimos): más pequeño y con los colores agrisados. La
  // enfermedad manda sobre el decaimiento (tinte verdoso y aún más encogido).
  const decaido = hambriento && aburrido
  useEffect(() => {
    const c = cuerpo.current
    if (!c) return
    c.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (!m?.color) return
      const data = o.userData as { colorOrig?: THREE.Color }
      if (enfermo || decaido) {
        data.colorOrig ??= m.color.clone()
        m.color.lerpColors(data.colorOrig, enfermo ? VERDE_ENFERMO : GRIS_DECAIDO, enfermo ? 0.7 : 0.55)
      } else if (data.colorOrig) {
        m.color.copy(data.colorOrig)
      }
    })
  }, [decaido, enfermo])

  useFrame((_, dt) => {
    if (!g.current) return
    const s = st.current
    // Lejos del jugador el animal no se aprecia: su física corre a ~4 ticks/s
    // en vez de cada frame (la distancia se re-mide ~2 veces/s, escalonada).
    s.accDist += dt
    if (s.accDist >= 0.5) {
      s.accDist = 0
      g.current.getWorldPosition(_posMundo)
      s.lejos = Math.hypot(playerPos.x - _posMundo.x, playerPos.z - _posMundo.z) > RADIO_VIVO
    }
    if (s.lejos) {
      s.accTick += dt
      if (s.accTick < 0.25) return
      dt = s.accTick
      s.accTick = 0
    }
    const d = Math.min(dt, 0.1)
    if (!hambriento) {
      if (s.jugando) {
        s.resta -= d
        s.fase += d * 6
        if (s.resta <= 0) {
          const fin = s.jugando
          s.jugando = null
          s.pausa = 1 + Math.random() * 2
          // Jugar cuenta como mimo (una escritura por sesión de juego).
          if (fila.id != null && Date.now() - (fila.mimadoEn ?? 0) > 60_000) void mimarAnimal(fila.id)
          if (fin === 'lodo') s.heading += Math.random() - 0.5
        }
      } else if (s.pausa > 0) {
        s.pausa -= d
        if (s.pausa <= 0) {
          // A veces el destino es un accesorio (el cerdo prefiere el lodo).
          const acc =
            accesorios.length > 0 && Math.random() < 0.35
              ? (fila.tipo === 'cerdo' && accesorios.find((a) => a.tipo === 'lodo')) ||
                accesorios[Math.floor(Math.random() * accesorios.length)]
              : null
          if (acc) {
            s.accTipo = acc.tipo
            s.tx = acc.x
            s.tz = acc.z
          } else {
            s.accTipo = null
            s.tx = (Math.random() - 0.5) * 2 * paseoX
            s.tz = (Math.random() - 0.5) * 2 * paseoZ
          }
        }
      } else {
        const dx = s.tx - s.x
        const dz = s.tz - s.z
        const dist = Math.hypot(dx, dz)
        if (dist < (s.accTipo ? 0.45 : 0.08)) {
          if (s.accTipo) {
            s.jugando = s.accTipo
            s.accTipo = null
            s.resta = 3 + Math.random() * 2
          } else {
            s.pausa = 1 + Math.random() * 3
          }
        } else {
          const vel = VEL[fila.tipo] * (aburrido ? 0.5 : 1)
          s.x += (dx / dist) * vel * d
          s.z += (dz / dist) * vel * d
          const objetivo = Math.atan2(dx, dz)
          // Giro suave hacia el destino (por el camino corto del ángulo).
          let delta = objetivo - s.heading
          while (delta > Math.PI) delta -= Math.PI * 2
          while (delta < -Math.PI) delta += Math.PI * 2
          s.heading += delta * Math.min(1, d * 6)
          s.fase += d * vel * 9
        }
      }
    }
    // Posición y postura según lo que hace.
    let y = Y + 0.06
    let rotZ = 0
    if (s.jugando === 'lodo') {
      rotZ = Math.sin(s.fase * 6) * 0.5 // revolcarse
      y -= 0.04
    } else if (s.jugando === 'tina') {
      y += Math.abs(Math.sin(s.fase * 8)) * 0.12 // chapoteo
    } else if (s.jugando === 'pelota') {
      s.heading += Math.sin(s.fase * 5) * d * 2 // empujones a un lado y otro
    } else if (s.pausa <= 0 && !hambriento) {
      y += Math.abs(Math.sin(s.fase)) * 0.05
    }
    g.current.position.set(s.x, y, s.z)
    g.current.rotation.y = s.heading
    g.current.rotation.z = rotZ
    if (gotas.current) gotas.current.visible = s.jugando === 'tina'
    g.current.getWorldPosition(ancla.current)
    ancla.current.y += ALTURA_NOMBRE[fila.tipo]
  })

  const mimoReciente = Date.now() - (fila.mimadoEn ?? 0) < 3000

  return (
    <group
      ref={g}
      onClick={(e) => {
        if (e.delta > 6) return // fue arrastre de cámara
        if (useGranja.getState().activo || useLayout.getState().editMode) return
        e.stopPropagation()
        if (fila.id != null) useAnimalSel.getState().seleccionar(fila.id)
      }}
    >
      <group ref={cuerpo} scale={enfermo ? 0.78 : decaido ? 0.85 : 1}>
        <CuerpoAnimal tipo={fila.tipo} hambriento={hambriento} />
      </group>
      {/* Enfermo: cruz pálida (manda sobre los avisos de hambre y aburrimiento). */}
      {enfermo && (
        <group position={[0, 1.75, 0]}>
          <mesh>
            <boxGeometry args={[0.3, 0.1, 0.1]} />
            <meshStandardMaterial color="#fca5a5" emissive="#b91c1c" emissiveIntensity={0.5} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.1, 0.3, 0.1]} />
            <meshStandardMaterial color="#fca5a5" emissive="#b91c1c" emissiveIntensity={0.5} />
          </mesh>
        </group>
      )}
      {/* Aviso de hambre: signo flotante ámbar. */}
      {!enfermo && hambriento && (
        <group position={[0, 1.75, 0]}>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.09, 0.26, 0.09]} />
            <meshStandardMaterial color="#fbbf24" emissive="#b45309" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color="#fbbf24" emissive="#b45309" emissiveIntensity={0.5} />
          </mesh>
        </group>
      )}
      {/* Aburrido (sin hambre): «…» gris. */}
      {!enfermo && !hambriento && aburrido && (
        <group position={[0, 1.75, 0]}>
          {[-0.16, 0, 0.16].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <boxGeometry args={[0.09, 0.09, 0.09]} />
              <meshStandardMaterial color="#9ca3af" emissive="#4b5563" emissiveIntensity={0.4} />
            </mesh>
          ))}
        </group>
      )}
      {/* Gotas de chapoteo (solo visibles jugando en la tina). */}
      <group ref={gotas} visible={false}>
        {[
          [-0.45, 0.5, 0.2],
          [0.4, 0.65, -0.15],
          [0.1, 0.8, 0.4],
        ].map(([x, y2, z]) => (
          <mesh key={`${x},${z}`} position={[x, y2, z]}>
            <sphereGeometry args={[0.05, 6, 5]} />
            <meshStandardMaterial color="#7dd3fc" emissive="#0284c7" emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>
      {mimoReciente && <Corazones key={fila.mimadoEn} />}
    </group>
  )
}

/** Granja construida en el mapa (siempre montada; reacciona a db.corrales/animales). */
export function Granja3D() {
  const corrales = corralesRepo.useAll() ?? []
  const filas = animalesRepo.useAll() ?? []
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const activo = useGranja((s) => s.activo)
  // Reloj de render: hambre y aburrimiento se derivan de timestamps al pintar.
  // El mismo tick vigila la salud del rebaño (sellar enfermedad y plazo de muerte).
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    void revisarGranja()
    const id = window.setInterval(() => {
      setAhora(Date.now())
      void revisarGranja()
    }, activo ? 10_000 : 30_000)
    return () => window.clearInterval(id)
  }, [activo])
  return (
    <group>
      {corrales
        .filter((c) => c.col + c.ancho <= gridCols && c.row + c.alto <= gridRows)
        .map((c) => {
          const [x0, , z0] = cellToWorld(c.col, c.row)
          const [x1, , z1] = cellToWorld(c.col + c.ancho - 1, c.row + c.alto - 1)
          const cx = (x0 + x1) / 2
          const cz = (z0 + z1) / 2
          const accesorios: AccesorioLocal[] = (c.accesorios ?? []).map((a) => {
            const [ax, , az] = cellToWorld(a.col, a.row)
            return { tipo: a.tipo, x: ax - cx, z: az - cz }
          })
          const sucio = corralSucio(c, ahora)
          return (
            <group key={c.id} position={[cx, 0, cz]}>
              <Corral ancho={c.ancho} alto={c.alto} sucio={sucio} />
              {accesorios.map((a) => (
                <group key={`${a.x},${a.z}`} position={[a.x, 0, a.z]}>
                  <Accesorio3D tipo={a.tipo} />
                </group>
              ))}
              {filas
                .filter((f) => f.corralId === c.id)
                .map((f) => (
                  <AnimalVivo
                    key={f.id}
                    fila={f}
                    hambriento={estaHambriento(f, ahora)}
                    aburrido={estaAburrido(f, ahora, sucio)}
                    enfermo={estaEnfermo(f, ahora)}
                    paseoX={(c.ancho * SIZE) / 2 - MARGEN_PASEO}
                    paseoZ={(c.alto * SIZE) / 2 - MARGEN_PASEO}
                    accesorios={accesorios}
                  />
                ))}
            </group>
          )
        })}
    </group>
  )
}

/**
 * Detecta el corral junto al personaje (a pie, planta baja, sin editores) para
 * la burbuja de cuidar en juego, con histéresis para no parpadear en el borde.
 */
let accGranja = 0
export function GranjaProximity() {
  const corrales = corralesRepo.useAll() ?? []
  useFrame((_st3f, delta) => {
    // Sin corrales no hay nada que detectar; y el sondeo va a ~5 veces/s.
    if (corrales.length === 0) return
    accGranja += delta
    if (accGranja < 0.2) return
    accGranja = 0
    const st = useGranjaCerca.getState()
    const { transicion, playerLevel } = useHouse.getState()
    const bloqueado =
      useGranja.getState().activo ||
      useMontura.getState().instanciaId != null ||
      trenFrame.montado ||
      transicion ||
      playerLevel !== 0 ||
      useLayout.getState().editMode ||
      dragChar.id != null
    if (bloqueado) {
      if (st.corralId != null) st.set(null)
      return
    }
    let dentro: number | null = null
    for (const c of corrales) {
      if (c.id == null) continue
      // Ya mostrado: se mantiene hasta alejarse un poco más (histéresis).
      const margen = c.id === st.corralId ? 1.8 : 1.2
      const [xa, , za] = cellToWorld(c.col, c.row)
      const [xb, , zb] = cellToWorld(c.col + c.ancho - 1, c.row + c.alto - 1)
      if (
        playerPos.x >= Math.min(xa, xb) - SIZE / 2 - margen &&
        playerPos.x <= Math.max(xa, xb) + SIZE / 2 + margen &&
        playerPos.z >= Math.min(za, zb) - SIZE / 2 - margen &&
        playerPos.z <= Math.max(za, zb) + SIZE / 2 + margen
      ) {
        dentro = c.id
        if (c.id === st.corralId) break
      }
    }
    if (dentro !== st.corralId) st.set(dentro)
  })
  return null
}

/** Color del fantasma según la herramienta activa. */
const COLOR_HERRAMIENTA: Record<HerramientaGranja, string> = {
  corral: '#a06b3d',
  animal: '#f59e0b',
  alimentar: '#84cc16',
  mimar: '#f472b6',
  curar: '#fca5a5',
  limpiar: '#c4b5fd',
  accesorio: '#22d3ee',
  nombrar: '#38bdf8',
  quitar: '#f87171',
}

/**
 * Con el editor activo: clic en una celda aplica la herramienta (un arrastre
 * mayor a 6 px es cámara). Esc deselecciona el corral de nombrar, o sale.
 */
export function GranjaController() {
  const activo = useGranja((s) => s.activo)
  return activo ? <GranjaControllerActivo /> : null
}

function GranjaControllerActivo() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const herramienta = useGranja((s) => s.herramienta)
  const aplicarEnCelda = useGranja((s) => s.aplicarEnCelda)
  const salir = useGranja((s) => s.salir)
  const apilado = !useHouse((s) => s.explotado)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const [hover, setHover] = useState<{ col: number; row: number } | null>(null)

  useEffect(() => {
    const dom = gl.domElement
    let downX = 0
    let downY = 0
    const opts = { canvas: dom, camera, nivel: 0, apilado, gridCols, gridRows }
    const onDown = (ev: PointerEvent) => {
      downX = ev.clientX
      downY = ev.clientY
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) return // fue arrastre de cámara
      const c = celdaEnteraBajoCursor(ev.clientX, ev.clientY, opts)
      if (c) void aplicarEnCelda(Math.round(c.col), Math.round(c.row))
    }
    const onMove = (ev: PointerEvent) => {
      const c = celdaEnteraBajoCursor(ev.clientX, ev.clientY, opts)
      setHover(c ? { col: Math.round(c.col), row: Math.round(c.row) } : null)
    }
    const onLeave = () => setHover(null)
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        const g = useGranja.getState()
        if (g.corralSel != null) g.seleccionarCorral(null)
        else salir()
      }
    }
    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointerup', onUp)
    dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerleave', onLeave)
    window.addEventListener('keydown', onKey)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('keydown', onKey)
      setHover(null)
    }
  }, [gl, camera, apilado, gridCols, gridRows, aplicarEnCelda, salir])

  if (!hover) return null
  const [hx, , hz] = cellToWorld(hover.col, hover.row)
  return (
    <ContornoCelda
      cx={hx}
      cz={hz}
      y={Y + 0.25}
      lado={SIZE - 0.15}
      color={COLOR_HERRAMIENTA[herramienta]}
    />
  )
}

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { actualizarEnergia, type AnimacionModelo } from './animacion'
import { AvatarModelo } from './AvatarModelo'
import { CAL, texturaMes } from './hojaMes'
import { playerPos, useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { useAjustes } from '../state/ajustesStore'
import { localeActual } from '../i18n/useT'
import { fechaLocalISO } from '../fechaLocal'
import { useLayout } from '../state/layoutStore'
import { useParque } from '../state/parqueStore'
import { useMontura } from '../state/monturaStore'
import { useAccionCuarto, accionCuartoFrame, RADIO_ACCION, type TipoAccionCuarto } from '../state/accionCuartoStore'
import { dragChar } from './characterDrag'
import {
  TIPO_OLLA, TIPO_DESPERTADOR, TIPO_LIBRERO_LIBRO, TIPO_GLOBO, TIPO_ESTANTERIA_HERR, TIPO_REPISA_JUEGOS,
  TIPO_CAMINADORA, TIPO_PERIODICO, TIPO_LAPTOP, TIPO_TAPETE, TIPO_GUITARRA, TIPO_PLANTA_REGAR, TIPO_LIBRETA,
  TIPO_SILLON, TIPO_CALENDARIO,
} from './especialesPlantillaMeta'

export { esEspecialPlantilla } from './especialesPlantillaMeta'

/**
 * Objetos PRINCIPALES temáticos de cada plantilla (carpeta "Principales" del
 * inventario): el objeto que encarna una app y le da vida al cuarto. Como los
 * especiales de `especiales.tsx`, viven fuera de CATALOGO/RECURSOS y se despachan
 * por `tipo` literal (`ObjetoView` los dibuja con estos componentes; la siembra
 * los coloca como el principal del cuarto, ver SIEMBRA/plantillaBundle).
 *
 * Dos familias:
 * - AMBIENTALES (olla, despertador, librero, globo, estantería, repisa): se
 *   animan solos al pasar el personaje cerca (energía por proximidad, patrón
 *   `actualizarEnergia`); el globo gira siempre.
 * - USABLES (caminadora, periódico, laptop, tapete, guitarra, planta, libreta):
 *   el objeto es casi estático y el personaje ejecuta la acción (poses en
 *   `accionCuartoStore`); `useAbordarAccion` lo activa al acercarse (sin botón).
 * Con `simple` (miniaturas: canvas sin frameloop) quedan quietos.
 */

/** Anim de proximidad reutilizada para `actualizarEnergia` (enciende al acercarse). */
const PROX: AnimacionModelo = { activacion: 'proximidad' }

// ---------------------------------------------------------------------------
// Objetos ambientales
// ---------------------------------------------------------------------------

/** Altura del tope de la barra central (recurso:2 de cocina): la olla se sienta encima. */
const ALTO_BARRA = 1.0

/** Olla sobre la barra (sin hornilla propia: se coloca en la misma posición que la
 *  barra/isla de la cocina): la tapa tabletea y sale vapor cuando el jugador se acerca. */
export function Olla({ color, simple = false, nivel = null }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const tapa = useRef<THREE.Group>(null!)
  const vapor = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia)
    if (e === 0) return // en reposo no hay nada que animar
    const t = clock.elapsedTime
    if (tapa.current) {
      tapa.current.position.y = 0.1 + Math.abs(Math.sin(t * 9)) * 0.03 * e
      tapa.current.rotation.z = Math.sin(t * 13) * 0.05 * e
    }
    if (vapor.current) {
      vapor.current.visible = e > 0.05
      vapor.current.children.forEach((c, i) => {
        const q = (t * 0.5 + i / vapor.current.children.length) % 1
        c.position.y = 0.2 + q * 0.6
        c.scale.setScalar((0.6 + q * 0.8) * e)
      })
    }
  })
  return (
    <group ref={raiz} position={[0, ALTO_BARRA, 0]}>
      {/* Cuerpo de la olla */}
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.33, 0.29, 0.34, 22]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Asas */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.37, 0.19, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.07, 0.02, 8, 12, Math.PI]} />
          <meshStandardMaterial color="#27272a" />
        </mesh>
      ))}
      {/* Tapa (se mueve) */}
      <group ref={tapa} position={[0, 0.27, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.05, 22]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color="#27272a" />
        </mesh>
      </group>
      {/* Vapor */}
      <group ref={vapor} visible={false}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[(i - 1) * 0.08, 0.4, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#e5e7eb" transparent opacity={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Altura del tope del buró real (recurso:39 de recámara): el reloj se sienta encima. */
const ALTO_BURO = 0.7

/** Despertador de dos campanas: se coloca en la misma posición que un buró real
 *  (recurso:39) para quedar encima; vibra y golpea las campanas al acercarse. */
export function Despertador({ color, simple = false, nivel = null }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const reloj = useRef<THREE.Group>(null!)
  const martillo = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia)
    if (e === 0) return // en reposo no hay nada que animar
    const t = clock.elapsedTime
    if (reloj.current) {
      reloj.current.position.x = Math.sin(t * 34) * 0.02 * e
      reloj.current.rotation.z = Math.sin(t * 30) * 0.06 * e
    }
    if (martillo.current) martillo.current.rotation.z = Math.sin(t * 38) * 0.5 * e
  })
  return (
    <group ref={raiz} position={[0, ALTO_BURO, 0]}>
      {/* Reloj (vibra) */}
      <group ref={reloj} position={[0, 0.21, 0]}>
        {/* Patas */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.12, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.1, 8]} />
            <meshStandardMaterial color="#3f3f46" />
          </mesh>
        ))}
        {/* Cara */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.14, 24]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.075]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.02, 24]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        {/* Manecillas */}
        <mesh position={[0, 0.05, 0.09]}>
          <boxGeometry args={[0.02, 0.11, 0.01]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh position={[0.05, 0, 0.09]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.02, 0.09, 0.01]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        {/* Campanas */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.19, 0.22, 0]} castShadow>
            <sphereGeometry args={[0.1, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
          </mesh>
        ))}
        {/* Martillo entre campanas */}
        <group ref={martillo} position={[0, 0.24, 0]}>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.02, 0.12, 0.02]} />
            <meshStandardMaterial color="#3f3f46" />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/** Librero: en el estante, un libro sale y se abre cuando el jugador se acerca. */
export function LibreroLibro({ color, simple = false, nivel = null }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const libro = useRef<THREE.Group>(null!)
  const tapaIzq = useRef<THREE.Group>(null!)
  const tapaDer = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  const lomos = ['#b91c1c', '#1d4ed8', '#15803d', '#a16207', '#7c3aed', '#0f766e']
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia)
    if (e === 0) return // en reposo no hay nada que animar
    const t = clock.elapsedTime
    if (libro.current) {
      libro.current.position.z = -0.02 + e * 0.4
      libro.current.position.y = 1.02 + e * 0.35 + Math.sin(t * 2) * 0.02 * e
      libro.current.rotation.x = e * 0.5
    }
    const ap = e * (Math.PI / 2.4)
    if (tapaIzq.current) tapaIzq.current.rotation.y = ap
    if (tapaDer.current) tapaDer.current.rotation.y = -ap
  })
  return (
    <group ref={raiz}>
      {/* Cuerpo del librero */}
      <mesh position={[0, 0.9, -0.15]} castShadow>
        <boxGeometry args={[1.02, 1.8, 0.36]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Hueco (fondo más oscuro) y estantes */}
      <mesh position={[0, 0.9, -0.02]}>
        <boxGeometry args={[0.9, 1.66, 0.04]} />
        <meshStandardMaterial color="#5b3a1a" roughness={0.9} />
      </mesh>
      {[0.35, 0.9, 1.45].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[0.9, 0.04, 0.32]} />
          <meshStandardMaterial color="#6b4423" />
        </mesh>
      ))}
      {/* Hileras de lomos en dos estantes */}
      {[0.5, 1.6].map((base, fila) =>
        lomos.map((c, i) => (
          <mesh key={`${fila}-${i}`} position={[-0.36 + i * 0.14, base, 0.02]} castShadow>
            <boxGeometry args={[0.1, 0.42, 0.24]} />
            <meshStandardMaterial color={c} roughness={0.7} />
          </mesh>
        )),
      )}
      {/* Libro protagonista (sale y se abre) */}
      <group ref={libro} position={[0, 1.02, -0.02]}>
        {/* Lomo */}
        <mesh castShadow>
          <boxGeometry args={[0.04, 0.3, 0.22]} />
          <meshStandardMaterial color="#a16207" roughness={0.6} />
        </mesh>
        <group ref={tapaIzq} position={[-0.02, 0, 0]}>
          <mesh position={[-0.11, 0, 0]} castShadow>
            <boxGeometry args={[0.22, 0.3, 0.015]} />
            <meshStandardMaterial color="#a16207" roughness={0.6} />
          </mesh>
        </group>
        <group ref={tapaDer} position={[0.02, 0, 0]}>
          <mesh position={[0.11, 0, 0]} castShadow>
            <boxGeometry args={[0.22, 0.3, 0.015]} />
            <meshStandardMaterial color="#a16207" roughness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/** Altura del tope de la mesa de centro (recurso:67 de sala): el globo se sienta encima. */
const ALTO_MESA_SALA = 0.32

/** Globo terráqueo sobre la mesa de centro: gira solo cuando el personaje está cerca. */
export function GloboTerraqueo({ color, simple = false, nivel = null }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const esfera = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame((_, dt) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia)
    if (e === 0) return // en reposo no hay nada que animar
    if (esfera.current) esfera.current.rotation.y += dt * 0.5 * e
  })
  const continentes: [number, number, number][] = [
    [0.25, 0.2, 0.28],
    [-0.2, -0.1, 0.3],
    [0.1, 0.35, -0.22],
    [-0.28, 0.05, -0.2],
  ]
  return (
    <group ref={raiz} position={[0, ALTO_MESA_SALA, 0]}>
      {/* Base */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.3, 0.2, 20]} />
        <meshStandardMaterial color="#5b3a1a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.22, 10]} />
        <meshStandardMaterial color="#7c5a2a" />
      </mesh>
      {/* Aro meridiano inclinado */}
      <mesh position={[0, 0.72, 0]} rotation={[0, 0, 0.4]}>
        <torusGeometry args={[0.46, 0.025, 10, 32, Math.PI * 1.25]} />
        <meshStandardMaterial color="#a16207" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Esfera (gira) con eje inclinado */}
      <group position={[0, 0.72, 0]} rotation={[0, 0, 0.41]}>
        <group ref={esfera}>
          <mesh castShadow>
            <sphereGeometry args={[0.4, 28, 28]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          {continentes.map((p, i) => (
            <mesh key={i} position={new THREE.Vector3(...p).setLength(0.4)}>
              <sphereGeometry args={[0.13, 12, 12]} />
              <meshStandardMaterial color="#15803d" roughness={0.7} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

/** Estantería de herramientas: dos puertas que se abren y muestran las herramientas al acercarse. */
export function EstanteriaHerramientas({ color, simple = false, nivel = null }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const puertaIzq = useRef<THREE.Group>(null!)
  const puertaDer = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(() => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia)
    if (e === 0) return // en reposo no hay nada que animar
    const ap = e * (Math.PI / 2.1)
    if (puertaIzq.current) puertaIzq.current.rotation.y = ap
    if (puertaDer.current) puertaDer.current.rotation.y = -ap
  })
  return (
    <group ref={raiz}>
      {/* Caja del gabinete (fondo, lados, techo, piso) */}
      <mesh position={[0, 0.8, -0.18]} castShadow>
        <boxGeometry args={[0.9, 1.5, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {[-0.44, 0.44].map((x) => (
        <mesh key={x} position={[x, 0.8, -0.02]} castShadow>
          <boxGeometry args={[0.06, 1.5, 0.36]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
      {[0.08, 1.52].map((y) => (
        <mesh key={y} position={[0, y, -0.02]} castShadow>
          <boxGeometry args={[0.9, 0.06, 0.36]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
      {/* Panel perforado del fondo */}
      <mesh position={[0, 0.8, -0.14]}>
        <boxGeometry args={[0.78, 1.36, 0.02]} />
        <meshStandardMaterial color="#374151" roughness={0.9} />
      </mesh>
      {/* Herramientas colgadas */}
      {/* Martillo */}
      <group position={[-0.24, 1.05, -0.1]}>
        <mesh castShadow>
          <boxGeometry args={[0.03, 0.34, 0.03]} />
          <meshStandardMaterial color="#7c2d12" />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.16, 0.07, 0.07]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
      {/* Llave */}
      <mesh position={[0.02, 0.95, -0.1]} rotation={[0, 0, 0.3]} castShadow>
        <boxGeometry args={[0.05, 0.34, 0.03]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Desarmador */}
      <group position={[0.26, 0.9, -0.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.18, 10]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        <mesh position={[0, -0.16, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.16, 8]} />
          <meshStandardMaterial color="#d1d5db" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      {/* Puertas (se abren) */}
      <group ref={puertaIzq} position={[-0.44, 0.8, 0.16]}>
        <mesh position={[0.22, 0, 0]} castShadow>
          <boxGeometry args={[0.44, 1.42, 0.05]} />
          <meshStandardMaterial color={color} metalness={0.2} roughness={0.7} />
        </mesh>
        <mesh position={[0.4, 0, 0.04]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#e5e7eb" metalness={0.6} />
        </mesh>
      </group>
      <group ref={puertaDer} position={[0.44, 0.8, 0.16]}>
        <mesh position={[-0.22, 0, 0]} castShadow>
          <boxGeometry args={[0.44, 1.42, 0.05]} />
          <meshStandardMaterial color={color} metalness={0.2} roughness={0.7} />
        </mesh>
        <mesh position={[-0.4, 0, 0.04]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#e5e7eb" metalness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

/** Repisa con cajas de juegos: la caja de arriba se menea un poco al acercarse. */
export function RepisaJuegos({ color, simple = false, nivel = null }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const cima = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  const cajas = ['#dc2626', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0ea5e9']
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia)
    if (e === 0) return // en reposo no hay nada que animar
    if (cima.current) cima.current.rotation.z = Math.sin(clock.elapsedTime * 6) * 0.05 * e
  })
  return (
    <group ref={raiz}>
      {/* Estructura de la repisa */}
      <mesh position={[0, 0.85, -0.16]} castShadow>
        <boxGeometry args={[1.0, 1.7, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {[-0.47, 0.47].map((x) => (
        <mesh key={x} position={[x, 0.85, 0]} castShadow>
          <boxGeometry args={[0.06, 1.7, 0.36]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ))}
      {[0.05, 0.62, 1.2, 1.68].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[1.0, 0.05, 0.36]} />
          <meshStandardMaterial color="#6b4423" />
        </mesh>
      ))}
      {/* Cajas de juegos apiladas planas en los estantes */}
      {[0.16, 0.24, 0.32].map((y, i) => (
        <mesh key={`b-${i}`} position={[-0.15, y, 0.02]} rotation={[0, i * 0.15, 0]} castShadow>
          <boxGeometry args={[0.5, 0.07, 0.3]} />
          <meshStandardMaterial color={cajas[i]} roughness={0.6} />
        </mesh>
      ))}
      {/* Cajas paradas en el estante de en medio */}
      {[0, 1, 2].map((i) => (
        <mesh key={`p-${i}`} position={[-0.28 + i * 0.24, 0.86, 0.02]} castShadow>
          <boxGeometry args={[0.2, 0.4, 0.28]} />
          <meshStandardMaterial color={cajas[i + 3]} roughness={0.6} />
        </mesh>
      ))}
      {/* Caja de la cima (se menea) */}
      <group ref={cima} position={[0.1, 1.3, 0.02]}>
        <mesh castShadow>
          <boxGeometry args={[0.46, 0.09, 0.3]} />
          <meshStandardMaterial color={cajas[0]} roughness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Objetos usables: casi estáticos; la acción la ejecuta el personaje.
// `useAbordarAccion` los activa al caminar cerca (sin botón), como el parque.
// ---------------------------------------------------------------------------

const _wpAcc = new THREE.Vector3()
const _wqAcc = new THREE.Quaternion()
const _weAcc = new THREE.Euler()

/** Al caminar cerca (a pie, sin editor/montura/otro juego), pide usar la acción. */
function useAbordarAccion(tipo: TipoAccionCuarto, objetoId: number | undefined, ref: { current: THREE.Group | null }) {
  // Sondeo ~5 veces/s escalonado: un getWorldPosition por usable cada frame sumaba en móviles.
  const acc = useRef(Math.random() * 0.2)
  useFrame((_st3f, delta) => {
    acc.current += delta
    if (acc.current < 0.2) return
    acc.current = 0
    if (objetoId == null || !ref.current) return
    if (useAccionCuarto.getState().instanciaId != null) return
    if (useParque.getState().instanciaId != null || useMontura.getState().instanciaId != null) return
    if (useHouse.getState().transicion || useLayout.getState().editMode || dragChar.id) return
    ref.current.getWorldPosition(_wpAcc)
    const d = Math.hypot(playerPos.x - _wpAcc.x, playerPos.z - _wpAcc.z)
    if (objetoId === accionCuartoFrame.recienId) {
      if (d > RADIO_ACCION + 0.9) accionCuartoFrame.recienId = null // se alejó del último usado
      return
    }
    if (d <= RADIO_ACCION && Math.abs(playerPos.y - _wpAcc.y) < 1.5) {
      ref.current.getWorldQuaternion(_wqAcc)
      _weAcc.setFromQuaternion(_wqAcc, 'YXZ')
      useAccionCuarto.getState().usar(objetoId, _wpAcc.x, _wpAcc.z, _weAcc.y, tipo)
    }
  })
}

/** Patas de una mesa/mueble rectangular (4 cilindros). */
function Patas({ w, d, h, color }: { w: number; d: number; h: number; color: string }) {
  return (
    <>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}-${sz}`} position={[(sx * w) / 2, h / 2, (sz * d) / 2]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, h, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )),
      )}
    </>
  )
}

/** Caminadora: el personaje sube a la banda y camina en el sitio (marchaAvatar). */
export function Caminadora({ color, objetoId }: UsableProps) {
  const raiz = useRef<THREE.Group>(null)
  useAbordarAccion(TIPO_CAMINADORA, objetoId, raiz)
  return (
    <group ref={raiz}>
      {/* Base y banda */}
      <mesh position={[0, 0.07, 0.15]} castShadow>
        <boxGeometry args={[0.72, 0.14, 1.5]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.15, 0.2]}>
        <boxGeometry args={[0.58, 0.03, 1.3]} />
        <meshStandardMaterial color="#111827" roughness={0.6} />
      </mesh>
      {/* Rieles laterales */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.36, 0.16, 0.2]} castShadow>
          <boxGeometry args={[0.05, 0.06, 1.3]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      {/* Consola */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.3, 0.6, -0.62]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.9, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 1.05, -0.6]} rotation={[-0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.66, 0.34, 0.05]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 1.06, -0.58]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.5, 0.22, 0.01]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

/** Sillón de lectura gris: el personaje se sienta encima a leer el periódico (accesorio en mano). */
export function SillonLectura({ color, objetoId }: UsableProps) {
  const raiz = useRef<THREE.Group>(null)
  useAbordarAccion(TIPO_SILLON, objetoId, raiz)
  return (
    <group ref={raiz}>
      {/* Asiento (el personaje se sienta en el origen) */}
      <mesh position={[0, 0.35, 0.04]} castShadow>
        <boxGeometry args={[0.74, 0.3, 0.66]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Respaldo (atrás, en -z) */}
      <mesh position={[0, 0.72, -0.28]} castShadow>
        <boxGeometry args={[0.74, 0.7, 0.16]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Descansabrazos */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.39, 0.52, 0.02]} castShadow>
          <boxGeometry args={[0.16, 0.36, 0.62]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ))}
      {/* Cojín del asiento */}
      <mesh position={[0, 0.52, 0.06]} castShadow>
        <boxGeometry args={[0.62, 0.12, 0.56]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
      </mesh>
      {/* Patitas */}
      {[
        [-0.3, -0.24],
        [0.3, -0.24],
        [-0.3, 0.32],
        [0.3, 0.32],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.1, z]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.2, 8]} />
          <meshStandardMaterial color="#3f3f46" />
        </mesh>
      ))}
    </group>
  )
}

/** Escritorio de noticias (con periódico): pulsa cuando el personaje pasa cerca (ambiental). */
export function EscritorioNoticias({ color, simple = false, nivel = null }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const cuerpo = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia)
    if (e === 0) return // en reposo no hay nada que animar
    if (cuerpo.current) cuerpo.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.06 * e)
  })
  return (
    <group ref={raiz}>
      <group ref={cuerpo}>
        {/* Cubierta */}
        <mesh position={[0, 0.75, 0]} castShadow>
          <boxGeometry args={[1.2, 0.06, 0.6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        {/* Cajonera a la derecha */}
        <mesh position={[0.42, 0.37, 0]} castShadow>
          <boxGeometry args={[0.34, 0.7, 0.56]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        {[0.55, 0.32].map((y) => (
          <mesh key={y} position={[0.42, y, 0.29]}>
            <boxGeometry args={[0.16, 0.03, 0.03]} />
            <meshStandardMaterial color="#3f3f46" metalness={0.5} />
          </mesh>
        ))}
        {/* Patas del lado izquierdo */}
        {[-0.24, 0.24].map((z) => (
          <mesh key={z} position={[-0.52, 0.35, z]} castShadow>
            <boxGeometry args={[0.08, 0.7, 0.08]} />
            <meshStandardMaterial color="#5b3a1a" roughness={0.85} />
          </mesh>
        ))}
        {/* Periódico doblado encima */}
        <mesh position={[-0.15, 0.795, 0]} rotation={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.44, 0.04, 0.32]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.85} />
        </mesh>
        {[-0.08, 0, 0.08].map((z) => (
          <mesh key={z} position={[-0.15, 0.818, z]} rotation={[0, 0.2, 0]}>
            <boxGeometry args={[0.3, 0.005, 0.015]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Escritorio con computadora y teclado: el personaje se sienta en la silla y teclea. */
export function Laptop({ color, objetoId }: UsableProps) {
  const raiz = useRef<THREE.Group>(null)
  useAbordarAccion(TIPO_LAPTOP, objetoId, raiz)
  return (
    <group ref={raiz}>
      {/* Escritorio */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.1, 0.05, 0.6]} />
        <meshStandardMaterial color="#6b4423" roughness={0.8} />
      </mesh>
      <Patas w={1.0} d={0.5} h={0.75} color="#5b3a1a" />
      {/* Monitor GRANDE (pantalla hacia +z, donde se sienta el personaje) */}
      <mesh position={[0, 0.79, -0.16]} castShadow>
        <boxGeometry args={[0.34, 0.03, 0.2]} />
        <meshStandardMaterial color="#1f2937" metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.95, -0.18]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.34, 10]} />
        <meshStandardMaterial color="#1f2937" metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.4, -0.2]} castShadow>
        <boxGeometry args={[1.1, 0.68, 0.05]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.4, -0.172]}>
        <boxGeometry args={[1.0, 0.58, 0.005]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.5} />
      </mesh>
      {/* Teclado */}
      <mesh position={[0, 0.785, 0.14]} castShadow>
        <boxGeometry args={[0.42, 0.03, 0.15]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.6} />
      </mesh>
      {[-0.04, 0, 0.04].map((z) => (
        <mesh key={z} position={[0, 0.802, 0.14 + z]}>
          <boxGeometry args={[0.36, 0.003, 0.012]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      ))}
      {/* Mouse */}
      <mesh position={[0.28, 0.785, 0.14]} castShadow>
        <boxGeometry args={[0.06, 0.025, 0.1]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.6} />
      </mesh>
    </group>
  )
}

/** Tapete de yoga: el personaje se sienta encima a meditar. */
export function TapeteYoga({ color, objetoId }: UsableProps) {
  const raiz = useRef<THREE.Group>(null)
  useAbordarAccion(TIPO_TAPETE, objetoId, raiz)
  return (
    <group ref={raiz}>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.04, 1.9]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.041, 0]}>
        <boxGeometry args={[0.15, 0.005, 1.78]} />
        <meshStandardMaterial color="#f0fdfa" roughness={0.9} />
      </mesh>
      {/* Cojín en un extremo */}
      <mesh position={[0, 0.09, -0.7]} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.12, 16]} />
        <meshStandardMaterial color="#0f766e" roughness={0.85} />
      </mesh>
    </group>
  )
}

/** Piano doméstico (vertical) con banco: tiembla cuando el personaje pasa cerca. */
export function PianoObj({ color, simple = false, nivel = null }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const piano = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia)
    if (e === 0) return // en reposo no hay nada que animar
    if (!piano.current) return
    const t = clock.elapsedTime
    piano.current.position.x = Math.sin(t * 30) * 0.02 * e
    piano.current.rotation.z = Math.sin(t * 34) * 0.02 * e
  })
  return (
    <group ref={raiz}>
      <group ref={piano}>
        {/* Cuerpo vertical */}
        <mesh position={[0, 0.72, -0.08]} castShadow>
          <boxGeometry args={[1.1, 1.4, 0.35]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
        </mesh>
        {/* Tapa superior */}
        <mesh position={[0, 1.44, -0.02]} castShadow>
          <boxGeometry args={[1.16, 0.06, 0.44]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
        {/* Repisa del teclado */}
        <mesh position={[0, 0.74, 0.18]} castShadow>
          <boxGeometry args={[1.02, 0.12, 0.24]} />
          <meshStandardMaterial color="#1c1917" roughness={0.5} />
        </mesh>
        {/* Teclas blancas */}
        <mesh position={[0, 0.8, 0.26]}>
          <boxGeometry args={[0.96, 0.03, 0.13]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        {/* Teclas negras */}
        {[-0.36, -0.24, -0.06, 0.06, 0.24, 0.36].map((x, i) => (
          <mesh key={i} position={[x, 0.82, 0.22]}>
            <boxGeometry args={[0.03, 0.02, 0.07]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
        ))}
        {/* Patas */}
        {[-0.5, 0.5].map((x) => (
          <mesh key={x} position={[x, 0.1, -0.08]} castShadow>
            <boxGeometry args={[0.1, 0.2, 0.3]} />
            <meshStandardMaterial color={color} roughness={0.4} />
          </mesh>
        ))}
      </group>
      {/* Banco */}
      <mesh position={[0, 0.42, 0.62]} castShadow>
        <boxGeometry args={[0.6, 0.08, 0.26]} />
        <meshStandardMaterial color="#5b3a1a" roughness={0.7} />
      </mesh>
      {[
        [-0.24, 0.52],
        [0.24, 0.52],
        [-0.24, 0.72],
        [0.24, 0.72],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.2, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.38, 8]} />
          <meshStandardMaterial color="#3f3f46" />
        </mesh>
      ))}
    </group>
  )
}

/** Árbol en maceta: tiembla cuando el personaje pasa cerca (sin acción, solo ambiental). */
export function Arbol({ color, simple = false, nivel = null }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const planta = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia)
    if (e === 0) return // en reposo no hay nada que animar
    if (!planta.current) return
    const t = clock.elapsedTime
    planta.current.rotation.y = Math.sin(t * 28) * 0.06 * e
    planta.current.position.x = Math.sin(t * 31) * 0.025 * e
  })
  return (
    <group ref={raiz}>
      <group ref={planta}>
        {/* Maceta */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.16, 0.4, 16]} />
          <meshStandardMaterial color="#b45309" roughness={0.85} />
        </mesh>
        {/* Tallo */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.5, 8]} />
          <meshStandardMaterial color="#4d7c2a" />
        </mesh>
        {/* Follaje */}
        {[
          [0, 1.0, 0, 0.26],
          [0.16, 0.85, 0.05, 0.18],
          [-0.15, 0.9, -0.05, 0.16],
          [0.05, 1.15, -0.05, 0.15],
        ].map((p, i) => (
          <mesh key={i} position={[p[0], p[1], p[2]]} castShadow>
            <sphereGeometry args={[p[3], 12, 12]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Libreta abierta en una mesa baja: el personaje se sienta y escribe. */
export function Libreta({ color, objetoId }: UsableProps) {
  const raiz = useRef<THREE.Group>(null)
  useAbordarAccion(TIPO_LIBRETA, objetoId, raiz)
  return (
    <group ref={raiz}>
      {/* Mesa baja */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[0.8, 0.05, 0.48]} />
        <meshStandardMaterial color="#6b4423" roughness={0.8} />
      </mesh>
      <Patas w={0.7} d={0.4} h={0.32} color="#5b3a1a" />
      {/* Libreta abierta */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.11, 0.355, 0.05]} rotation={[0, 0, s * 0.06]} castShadow>
          <boxGeometry args={[0.22, 0.015, 0.28]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.352, 0.05]} castShadow>
        <boxGeometry args={[0.03, 0.02, 0.28]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Pluma */}
      <mesh position={[0.16, 0.37, 0.12]} rotation={[0.4, 0, -0.5]}>
        <cylinderGeometry args={[0.008, 0.008, 0.16, 8]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Calendario de pared
// ---------------------------------------------------------------------------

/** Alto que ocupa el personaje dentro de la foto. */
const CAL_AVATAR = 0.42
/** Alto de un avatar a escala 1: encaja al personaje en la foto sea cual sea su tamaño. */
const ALTO_AVATAR = 1.75

/**
 * Calendario de pared (app `calendario`): la hoja del mes en curso con el día de
 * hoy marcado y, en la foto de arriba, TU personaje (el avatar de la casa, así
 * que sigue tus cambios de apariencia). Cuelga a la altura de la vista.
 */
export function CalendarioPared({ color }: EspProps) {
  const av = useDiseño((s) => s.avatar)
  useAjustes((s) => s.idioma) // suscripción: la hoja sigue al conmutador de idioma
  const locale = localeActual()
  const iso = fechaLocalISO()
  const tex = useMemo(() => texturaMes(iso, locale, color), [iso, locale, color])
  useEffect(() => () => tex.dispose(), [tex])

  const alto = CAL.foto + CAL.mes
  const tope = CAL.base + alto
  const frente = CAL.grosor / 2
  const escAvatar = CAL_AVATAR / (ALTO_AVATAR * (av.escala || 1))

  return (
    <group>
      {/* Clavo y cordón de colgar */}
      <mesh position={[0, tope + 0.14, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.04, 8]} />
        <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * CAL.w) / 4, tope + 0.07, -0.01]} rotation={[0, 0, s * 0.5]}>
          <cylinderGeometry args={[0.004, 0.004, 0.17, 6]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.9} />
        </mesh>
      ))}

      {/* Cartón de respaldo */}
      <mesh position={[0, CAL.base + alto / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[CAL.w, alto, CAL.grosor]} />
        <meshStandardMaterial color="#e7e2d8" roughness={0.95} />
      </mesh>

      {/* Foto del mes: fondo + el personaje dentro del marco */}
      <mesh position={[0, CAL.base + CAL.mes + CAL.foto / 2, frente + 0.001]}>
        <planeGeometry args={[CAL.w - 0.06, CAL.foto - 0.05]} />
        <meshStandardMaterial color="#cfe4f5" roughness={0.9} />
      </mesh>
      <group position={[0, CAL.base + CAL.mes + 0.035, frente + 0.05]} rotation={[0, 0.4, 0]} scale={escAvatar}>
        <AvatarModelo av={av} />
      </group>
      {/* Molduras de la foto */}
      {[
        { p: [0, CAL.base + CAL.mes + CAL.foto - 0.015, frente], s: [CAL.w, 0.03, 0.012] },
        { p: [0, CAL.base + CAL.mes + 0.015, frente], s: [CAL.w, 0.03, 0.012] },
        { p: [-CAL.w / 2 + 0.015, CAL.base + CAL.mes + CAL.foto / 2, frente], s: [0.03, CAL.foto, 0.012] },
        { p: [CAL.w / 2 - 0.015, CAL.base + CAL.mes + CAL.foto / 2, frente], s: [0.03, CAL.foto, 0.012] },
      ].map((m, i) => (
        <mesh key={i} position={m.p as [number, number, number]}>
          <boxGeometry args={m.s as [number, number, number]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      ))}

      {/* Hoja del mes */}
      <mesh position={[0, CAL.base + CAL.mes / 2, frente + 0.002]}>
        <planeGeometry args={[CAL.w, CAL.mes]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>

      {/* Espiral que une la foto con la hoja del mes */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh
          key={i}
          position={[-CAL.w / 2 + 0.06 + i * ((CAL.w - 0.12) / 8), CAL.base + CAL.mes, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <torusGeometry args={[0.018, 0.005, 6, 12]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Accesorio en la mano del avatar mientras dura una acción (patrón de `arma.tsx`:
 * offset por `escala`, geometría a tamaño fijo). Se renderiza dentro del avatar.
 */
export function AccesorioAccion({ escala }: { escala: number }) {
  const tipo = useAccionCuarto((s) => s.tipo)
  if (tipo === TIPO_SILLON) {
    // Periódico abierto en la mano derecha (el personaje lee sentado).
    return (
      <group position={[0.34 * escala, 1.02 * escala, 0.34 * escala]} rotation={[0.35, 0.35, -0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.28, 0.34, 0.012]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.9} />
        </mesh>
        {[-0.1, 0, 0.1].map((y) => (
          <mesh key={y} position={[0, y * 1, 0.008]}>
            <boxGeometry args={[0.22, 0.006, 0.001]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
        ))}
      </group>
    )
  }
  if (tipo === TIPO_LIBRETA) {
    return (
      <group position={[0, 0.78 * escala, 0.34 * escala]} rotation={[1.1, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.24, 0.3, 0.02]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.9} />
        </mesh>
      </group>
    )
  }
  return null
}

interface EspProps {
  color: string
  simple?: boolean
  /** Piso del objeto para la activación por proximidad (null = ignorar nivel). */
  nivel?: number | null
}

type UsableProps = { color: string; objetoId?: number }

/** Despacha el componente del objeto principal según su `tipo` (o null si no es especial). */
export function EspecialPlantilla({
  tipo,
  color,
  simple = false,
  nivel = null,
  objetoId,
}: EspProps & { tipo: string; objetoId?: number }) {
  switch (tipo) {
    case TIPO_OLLA:
      return <Olla color={color} simple={simple} nivel={nivel} />
    case TIPO_DESPERTADOR:
      return <Despertador color={color} simple={simple} nivel={nivel} />
    case TIPO_LIBRERO_LIBRO:
      return <LibreroLibro color={color} simple={simple} nivel={nivel} />
    case TIPO_GLOBO:
      return <GloboTerraqueo color={color} simple={simple} nivel={nivel} />
    case TIPO_ESTANTERIA_HERR:
      return <EstanteriaHerramientas color={color} simple={simple} nivel={nivel} />
    case TIPO_REPISA_JUEGOS:
      return <RepisaJuegos color={color} simple={simple} nivel={nivel} />
    case TIPO_CAMINADORA:
      return <Caminadora color={color} objetoId={objetoId} />
    case TIPO_PERIODICO:
      return <EscritorioNoticias color={color} simple={simple} nivel={nivel} />
    case TIPO_SILLON:
      return <SillonLectura color={color} objetoId={objetoId} />
    case TIPO_LAPTOP:
      return <Laptop color={color} objetoId={objetoId} />
    case TIPO_TAPETE:
      return <TapeteYoga color={color} objetoId={objetoId} />
    case TIPO_GUITARRA:
      return <PianoObj color={color} simple={simple} nivel={nivel} />
    case TIPO_PLANTA_REGAR:
      return <Arbol color={color} simple={simple} nivel={nivel} />
    case TIPO_LIBRETA:
      return <Libreta color={color} objetoId={objetoId} />
    case TIPO_CALENDARIO:
      return <CalendarioPared color={color} />
    default:
      return null
  }
}

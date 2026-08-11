import { useEffect, useMemo, useRef, type ReactNode } from 'react'
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
import { useCargar } from '../state/cargarStore'
import {
  useAccionCuarto, accionCuartoFrame, RADIO_ACCION, type GrupoAccion,
} from '../state/accionCuartoStore'
import { dragChar } from './characterDrag'
import {
  TIPO_OLLA, TIPO_DESPERTADOR, TIPO_LIBRERO_LIBRO, TIPO_GLOBO, TIPO_ESTANTERIA_HERR, TIPO_REPISA_JUEGOS,
  TIPO_CAMINADORA, TIPO_PERIODICO, TIPO_LAPTOP, TIPO_TAPETE, TIPO_GUITARRA, TIPO_PLANTA_REGAR, TIPO_LIBRETA,
  TIPO_SILLON, TIPO_CALENDARIO, TIPO_PIZARRA, TIPO_AGENDA, TIPO_CAJA_FUERTE, TIPO_ESTACION_COMPUTO,
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
 *   `accionCuartoStore`); se abordan con el botón «Usar» del hueco del cubo,
 *   que ofrece `ContextoProximity` al acercarte.
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
export function Olla({ color, simple = false, nivel = null, objetoId }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const tapa = useRef<THREE.Group>(null!)
  const vapor = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia, objetoId)
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

/** Posición y color de las notas adhesivas fijas de la pizarra de ideas. */
const NOTAS_PIZARRA: { x: number; y: number; rot: number; c: string }[] = [
  { x: -0.32, y: 0.18, rot: 0.08, c: '#fda4af' },
  { x: -0.06, y: 0.21, rot: -0.1, c: '#86efac' },
  { x: 0.24, y: 0.16, rot: 0.06, c: '#93c5fd' },
  { x: -0.3, y: -0.16, rot: -0.07, c: '#c4b5fd' },
]

/** Pizarra de ideas sobre caballete: notas adhesivas y un mini-mapa mental
 *  dibujado; al acercarse, el foco de arriba se enciende y la nota recién
 *  pegada oscila como si acabara de caer. */
export function PizarraIdeas({ color, simple = false, nivel = null, objetoId }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const foco = useRef<THREE.MeshStandardMaterial>(null!)
  const nota = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia, objetoId)
    if (foco.current) foco.current.emissiveIntensity = 1.4 * e
    if (e === 0) return // en reposo no hay nada más que animar
    if (nota.current) nota.current.rotation.z = 0.06 + Math.sin(clock.elapsedTime * 10) * 0.12 * e
  })
  return (
    <group ref={raiz}>
      {/* Patas del caballete */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.34, 0.55, 0.06]} rotation={[0.18, 0, s * 0.14]} castShadow>
          <boxGeometry args={[0.05, 1.15, 0.05]} />
          <meshStandardMaterial color="#7a5230" roughness={0.9} />
        </mesh>
      ))}
      {/* Tablero inclinado: marco del color del usuario + lienzo claro */}
      <group position={[0, 0.82, 0]} rotation={[-0.16, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.05, 0.75, 0.04]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <boxGeometry args={[0.95, 0.65, 0.03]} />
          <meshStandardMaterial color="#f4f1e8" roughness={0.85} />
        </mesh>
        {/* Mini-mapa mental dibujado: nodo central y tres ramas */}
        <mesh position={[0.05, 0.02, 0.03]}>
          <boxGeometry args={[0.07, 0.07, 0.005]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {[0.5, 2.2, 3.9].map((r) => (
          <mesh
            key={r}
            position={[0.05 + Math.cos(r) * 0.11, 0.02 + Math.sin(r) * 0.09, 0.03]}
            rotation={[0, 0, r]}
          >
            <boxGeometry args={[0.15, 0.012, 0.005]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
        ))}
        {/* Notas adhesivas fijas */}
        {NOTAS_PIZARRA.map((n) => (
          <mesh key={`${n.x}-${n.y}`} position={[n.x, n.y, 0.03]} rotation={[0, 0, n.rot]}>
            <boxGeometry args={[0.13, 0.13, 0.006]} />
            <meshStandardMaterial color={n.c} roughness={0.8} />
          </mesh>
        ))}
        {/* Nota recién pegada (la que oscila al acercarse) */}
        <group ref={nota} position={[0.3, -0.17, 0.03]}>
          <mesh>
            <boxGeometry args={[0.13, 0.13, 0.006]} />
            <meshStandardMaterial color="#fde047" roughness={0.8} />
          </mesh>
        </group>
      </group>
      {/* Foco sobre la pizarra (se enciende por proximidad) */}
      <mesh position={[0, 1.28, 0.02]}>
        <cylinderGeometry args={[0.015, 0.015, 0.14, 8]} />
        <meshStandardMaterial color="#27272a" />
      </mesh>
      <mesh position={[0, 1.38, 0.02]} castShadow>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial ref={foco} color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0} />
      </mesh>
    </group>
  )
}

/** Renglones dibujados en las dos páginas de la agenda abierta. */
const RENGLONES = [0.06, 0.02, -0.02, -0.06]

/** Agenda de escritorio: un planificador abierto sobre una mesita, con el frasco
 *  de pastillas, el portarretratos y la pluma de las tres secciones. Al acercarse,
 *  la página derecha se levanta como si alguien pasara la hoja y la lucecita del
 *  frasco (el recordatorio de la toma) empieza a latir. */
export function AgendaEscritorio({ color, simple = false, nivel = null, objetoId }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const hoja = useRef<THREE.Group>(null!)
  const aviso = useRef<THREE.MeshStandardMaterial>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia, objetoId)
    if (aviso.current) aviso.current.emissiveIntensity = (0.6 + Math.sin(clock.elapsedTime * 3) * 0.4) * e
    if (e === 0) return // en reposo la hoja se queda plana
    if (hoja.current) hoja.current.rotation.y = -Math.abs(Math.sin(clock.elapsedTime * 1.6)) * 1.5 * e
  })
  return (
    <group ref={raiz}>
      {/* Mesita */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.06, 0.6]} />
        <meshStandardMaterial color="#7a5230" roughness={0.85} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.42, 0.25, sz * 0.25]} castShadow>
            <boxGeometry args={[0.05, 0.5, 0.05]} />
            <meshStandardMaterial color="#5c3d24" roughness={0.9} />
          </mesh>
        )),
      )}

      {/* Planificador abierto: tapa del color del usuario y dos páginas claras */}
      <group position={[0, 0.54, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.62, 0.42, 0.02]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[-0.15, 0, 0.015]}>
          <boxGeometry args={[0.28, 0.37, 0.01]} />
          <meshStandardMaterial color="#f6f3ea" roughness={0.9} />
        </mesh>
        {RENGLONES.map((y) => (
          <mesh key={y} position={[-0.15, y, 0.021]}>
            <boxGeometry args={[0.22, 0.008, 0.002]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
        ))}
        {/* Página derecha: la que se levanta al acercarse (gira desde el lomo) */}
        <group ref={hoja} position={[0, 0, 0.015]}>
          <mesh position={[0.15, 0, 0]}>
            <boxGeometry args={[0.28, 0.37, 0.01]} />
            <meshStandardMaterial color="#f6f3ea" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {RENGLONES.map((y) => (
            <mesh key={y} position={[0.15, y, 0.006]}>
              <boxGeometry args={[0.22, 0.008, 0.002]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
          ))}
        </group>
      </group>

      {/* Frasco de pastillas con su lucecita de recordatorio (Salud) */}
      <mesh position={[0.36, 0.61, -0.16]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.14, 12]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[0.36, 0.69, -0.16]}>
        <cylinderGeometry args={[0.052, 0.052, 0.03, 12]} />
        <meshStandardMaterial ref={aviso} color="#14b8a6" emissive="#14b8a6" emissiveIntensity={0} />
      </mesh>

      {/* Portarretratos inclinado (Personas) */}
      <group position={[-0.34, 0.63, -0.15]} rotation={[0, 0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.18, 0.015]} />
          <meshStandardMaterial color="#fb923c" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[0.12, 0.14, 0.005]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
        </mesh>
      </group>

      {/* Pluma cruzada sobre la mesa (Trabajo) */}
      <mesh position={[0.06, 0.55, 0.25]} rotation={[0, 0.35, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.011, 0.008, 0.24, 8]} />
        <meshStandardMaterial color="#6366f1" roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  )
}

/** Altura del tope del buró real (recurso:39 de recámara): el reloj se sienta encima. */
const ALTO_BURO = 0.7

/** Despertador de dos campanas: se coloca en la misma posición que un buró real
 *  (recurso:39) para quedar encima; vibra y golpea las campanas al acercarse. */
export function Despertador({ color, simple = false, nivel = null, objetoId }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const reloj = useRef<THREE.Group>(null!)
  const martillo = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia, objetoId)
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
export function LibreroLibro({ color, simple = false, nivel = null, objetoId }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const libro = useRef<THREE.Group>(null!)
  const tapaIzq = useRef<THREE.Group>(null!)
  const tapaDer = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  const lomos = ['#b91c1c', '#1d4ed8', '#15803d', '#a16207', '#7c3aed', '#0f766e']
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia, objetoId)
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
export function GloboTerraqueo({ color, simple = false, nivel = null, objetoId }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const esfera = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame((_, dt) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia, objetoId)
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
export function EstanteriaHerramientas({ color, simple = false, nivel = null, objetoId }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const puertaIzq = useRef<THREE.Group>(null!)
  const puertaDer = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(() => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia, objetoId)
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
export function RepisaJuegos({ color, simple = false, nivel = null, objetoId }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const cima = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  const cajas = ['#dc2626', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0ea5e9']
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia, objetoId)
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
// Se abordan con el botón «Usar» del hueco del cubo, igual que las sillas
// genéricas: los ofrece `ContextoProximity` al acercarte. Antes se activaban
// SOLOS al pasar cerca, lo que te sentaba sin querer y chocaba con el resto de
// botones contextuales del mismo radio.
// ---------------------------------------------------------------------------

const _wpAcc = new THREE.Vector3()
const _wqAcc = new THREE.Quaternion()
const _weAcc = new THREE.Euler()

const _boxAcc = new THREE.Box3()
const _rayAcc = new THREE.Raycaster()
const _rayOrigenAcc = new THREE.Vector3()
const _RAY_ABAJO = new THREE.Vector3(0, -1, 0)

/**
 * Objeto GENÉRICO con `grupoAccion` (silla del catálogo, piezas de IA/usuario):
 * a diferencia de los usables de arriba (que se activan solos), este publica
 * "cerca" en `useAccionCuarto` — el panel del cubo (`ControlHerramienta`) ofrece
 * Sentarte/Acostarte y el jugador confirma con el botón. Mide la SUPERFICIE real
 * del objeto (rayo hacia abajo desde el centro de su caja envolvente, no solo el
 * punto más alto — un respaldo alto no debe "flotar" al personaje en el aire) en
 * vez de un número tabulado por tipo, así cualquier geometría (puf bajo, banco
 * con respaldo) queda razonablemente bien al sentarse.
 * Ver `grupoAccionDe`/`ObjetoView` en `catalogo.tsx`.
 */
export function AccionGenerica({
  grupo,
  objetoId,
  children,
}: {
  grupo: GrupoAccion
  objetoId: number | undefined
  children: ReactNode
}) {
  const raiz = useRef<THREE.Group>(null)
  const acc = useRef(Math.random() * 0.2)
  useFrame((_st3f, delta) => {
    acc.current += delta
    if (acc.current < 0.2) return
    acc.current = 0
    if (objetoId == null || !raiz.current) return
    if (useAccionCuarto.getState().instanciaId != null) return
    if (useParque.getState().instanciaId != null || useMontura.getState().instanciaId != null) return
    if (useHouse.getState().transicion || useLayout.getState().editMode || dragChar.id) return
    if (useCargar.getState().sujeto) return // lo que se lleva cargado se dibuja en alto: no se ofrece sentarse en ello
    raiz.current.getWorldPosition(_wpAcc)
    const d = Math.hypot(playerPos.x - _wpAcc.x, playerPos.z - _wpAcc.z)
    if (objetoId === accionCuartoFrame.recienId) {
      if (d > RADIO_ACCION + 0.9) accionCuartoFrame.recienId = null
      return
    }
    if (d <= RADIO_ACCION && Math.abs(playerPos.y - _wpAcc.y) < 1.5) {
      raiz.current.getWorldQuaternion(_wqAcc)
      _weAcc.setFromQuaternion(_wqAcc, 'YXZ')
      _boxAcc.setFromObject(raiz.current)
      // Centro real en XZ de la geometría (no el origen local, que puede no
      // estar centrado) y altura de la superficie justo AHÍ debajo (rayo desde
      // arriba de toda la caja): así un respaldo alto a un lado no hace que la
      // medición tome su punto más alto en vez del asiento real.
      const cx = (_boxAcc.min.x + _boxAcc.max.x) / 2
      const cz = (_boxAcc.min.z + _boxAcc.max.z) / 2
      _rayOrigenAcc.set(cx, _boxAcc.max.y + 0.5, cz)
      _rayAcc.set(_rayOrigenAcc, _RAY_ABAJO)
      const hit = _rayAcc.intersectObject(raiz.current, true)[0]
      // Se publica la Y ABSOLUTA de mundo: así la pose no depende del offset con
      // que se dibujan los objetos, ni de su `y`, ni de la escala del grupo, ni
      // del nivel del cuarto. El alto sobre la base solo sirve para ACOTAR (un
      // puf muy bajo sigue valiendo; una pieza con el origen corrido no dispara
      // al avatar al cielo): se CLAMPEA en vez de descartar la medición.
      const alto = (hit?.point.y ?? _boxAcc.max.y) - _wpAcc.y
      useAccionCuarto.getState().setCerca({
        id: objetoId,
        grupo,
        wx: cx,
        wz: cz,
        rotY: _weAcc.y,
        superficieY: Number.isFinite(alto) ? _wpAcc.y + Math.min(Math.max(alto, 0.05), 2) : undefined,
      })
    } else if (useAccionCuarto.getState().cercaId === objetoId) {
      useAccionCuarto.getState().setCerca(null)
    }
  })
  return <group ref={raiz}>{children}</group>
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
export function Caminadora({ color }: UsableProps) {
  return (
    <group>
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
export function SillonLectura({ color }: UsableProps) {
  return (
    <group>
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
export function EscritorioNoticias({ color, simple = false, nivel = null, objetoId }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const cuerpo = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia, objetoId)
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
export function Laptop({ color }: UsableProps) {
  return (
    <group>
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
export function TapeteYoga({ color }: UsableProps) {
  return (
    <group>
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
export function PianoObj({ color, simple = false, nivel = null, objetoId }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const piano = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia, objetoId)
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
export function Arbol({ color, simple = false, nivel = null, objetoId }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const planta = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia, objetoId)
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
export function Libreta({ color }: UsableProps) {
  return (
    <group>
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

/**
 * Caja fuerte del despacho: al acercarse, el dial gira y la puerta se entreabre
 * dejando ver lo que guarda. Es AMBIENTAL y no usable a propósito: el despacho
 * conserva la laptop, que ya es usable, y dos «Usar» dentro del mismo radio se
 * pisan; además no hay pose de avatar que le pegue a abrir una caja fuerte.
 */
export function CajaFuerte({ color, simple = false, nivel = null, objetoId }: EspProps) {
  const raiz = useRef<THREE.Group>(null!)
  const puerta = useRef<THREE.Group>(null!)
  const dial = useRef<THREE.Group>(null!)
  const tesoro = useRef<THREE.Group>(null!)
  const energia = useRef(0)
  useFrame(({ clock }) => {
    if (simple || !raiz.current) return
    const e = actualizarEnergia(raiz.current, PROX, nivel, energia, objetoId)
    if (dial.current) dial.current.rotation.y = clock.elapsedTime * 2.2 * e
    // Suavizado: la puerta arranca y frena despacio en vez de dar un tirón.
    if (puerta.current) puerta.current.rotation.y = -1.05 * (e * e * (3 - 2 * e))
    if (tesoro.current) tesoro.current.visible = e > 0.12
  })
  return (
    <group ref={raiz}>
      {/* Zócalo y cuerpo */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.18, 0.1, 0.98]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.62, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 1.05, 0.9]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.35} />
      </mesh>
      {/* Remaches del frente */}
      {[
        [-0.46, 0.28],
        [0.46, 0.28],
        [-0.46, 0.96],
        [0.46, 0.96],
      ].map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, 0.44]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
      {/* Hueco interior: se ve al abrirse */}
      <mesh position={[0, 0.62, -0.06]}>
        <boxGeometry args={[0.94, 0.9, 0.78]} />
        <meshStandardMaterial color="#0b1020" roughness={1} />
      </mesh>
      <group ref={tesoro} visible={false}>
        <mesh position={[0, 0.58, -0.05]}>
          <boxGeometry args={[0.9, 0.03, 0.6]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
        {[-0.24, 0, 0.24].map((x) => (
          <mesh key={x} position={[x, 0.66, -0.05]} rotation={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[0.2, 0.09, 0.13]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.25} />
          </mesh>
        ))}
        {[-0.18, 0.18].map((x) => (
          <mesh key={x} position={[x, 0.3, -0.05]}>
            <boxGeometry args={[0.24, 0.07, 0.12]} />
            <meshStandardMaterial color="#22c55e" roughness={0.85} />
          </mesh>
        ))}
      </group>
      {/* PUERTA: el grupo tiene la bisagra en su borde izquierdo */}
      <group ref={puerta} position={[-0.5, 0.62, 0.43]}>
        <mesh position={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[1.0, 1.0, 0.09]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Dial de combinación */}
        <group ref={dial} position={[0.66, 0.02, 0.08]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.05, 20]} />
            <meshStandardMaterial color="#e5e7eb" metalness={0.8} roughness={0.2} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[0, 0, 0.03]} rotation={[0, 0, (i * Math.PI) / 4]}>
              <boxGeometry args={[0.32, 0.02, 0.02]} />
              <meshStandardMaterial color="#6b7280" metalness={0.7} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.05]}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.9} />
          </mesh>
        </group>
        {/* Manija */}
        <mesh position={[0.28, -0.06, 0.08]} castShadow>
          <boxGeometry args={[0.05, 0.3, 0.05]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.8} />
        </mesh>
        {/* Bisagras */}
        {[-0.36, 0.36].map((y) => (
          <mesh key={y} position={[0.02, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 0.14, 8]} />
            <meshStandardMaterial color="#4b5563" metalness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/**
 * Estación de cómputo de la sala de cómputo: torre, dos monitores y teclado. El
 * personaje se sienta enfrente y teclea — misma pose que la laptop, así que no
 * hace falta ninguna nueva.
 */
export function EstacionComputo({ color }: UsableProps) {
  const PANTALLA = '#22d3ee'
  return (
    <group>
      {/* Escritorio ancho */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.06, 0.72]} />
        <meshStandardMaterial color="#4b5563" roughness={0.7} />
      </mesh>
      <Patas w={1.48} d={0.6} h={0.75} color="#374151" />
      {/* Torre en el suelo, a la derecha */}
      <mesh position={[0.95, 0.36, -0.1]} castShadow>
        <boxGeometry args={[0.34, 0.72, 0.62]} />
        <meshStandardMaterial color="#1f2937" metalness={0.45} roughness={0.35} />
      </mesh>
      {[-0.18, -0.06, 0.06, 0.18].map((y) => (
        <mesh key={y} position={[0.95, 0.5 + y, 0.215]}>
          <boxGeometry args={[0.24, 0.02, 0.01]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ))}
      <mesh position={[0.95, 0.66, 0.215]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color={PANTALLA} emissive={PANTALLA} emissiveIntensity={1.4} />
      </mesh>
      {/* Base y brazo compartido de los monitores */}
      <mesh position={[0, 0.79, -0.22]} castShadow>
        <boxGeometry args={[0.4, 0.03, 0.2]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.98, -0.24]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.4, 10]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.19, -0.24]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 1.24, 10]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} />
      </mesh>
      {/* Dos monitores, girados hacia el asiento (+z) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.44, 1.34, -0.2]} rotation={[0, -s * 0.28, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.82, 0.5, 0.045]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.026]}>
            <boxGeometry args={[0.76, 0.44, 0.004]} />
            <meshStandardMaterial color={PANTALLA} emissive={PANTALLA} emissiveIntensity={0.55} />
          </mesh>
          {/* Izquierdo: el trazo de una gráfica. Derecho: una rejilla de hoja. */}
          {s < 0
            ? [
                [-0.26, -0.12],
                [-0.08, 0.02],
                [0.1, -0.04],
                [0.28, 0.14],
              ].map(([x, y], i) => (
                <mesh key={`${x}`} position={[x, y, 0.03]} rotation={[0, 0, 0.5 - i * 0.28]}>
                  <boxGeometry args={[0.2, 0.014, 0.002]} />
                  <meshStandardMaterial color="#0b1020" />
                </mesh>
              ))
            : [-0.12, 0, 0.12].map((y) => (
                <mesh key={y} position={[0, y, 0.03]}>
                  <boxGeometry args={[0.68, 0.01, 0.002]} />
                  <meshStandardMaterial color="#0b1020" />
                </mesh>
              ))}
        </group>
      ))}
      {/* Teclado, mousepad y ratón */}
      <mesh position={[-0.06, 0.79, 0.18]} castShadow>
        <boxGeometry args={[0.56, 0.035, 0.18]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.6} />
      </mesh>
      {[-0.05, 0, 0.05].map((z) => (
        <mesh key={z} position={[-0.06, 0.808, 0.18 + z]}>
          <boxGeometry args={[0.5, 0.004, 0.014]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      ))}
      <mesh position={[0.4, 0.782, 0.2]}>
        <boxGeometry args={[0.26, 0.006, 0.2]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>
      <mesh position={[0.4, 0.795, 0.2]} castShadow>
        <boxGeometry args={[0.07, 0.026, 0.11]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.6} />
      </mesh>
      {/* Cuadernos apilados: le dan vida al escritorio */}
      {[0, 1].map((i) => (
        <mesh key={i} position={[-0.62, 0.795 + i * 0.03, 0.1]} rotation={[0, 0.18 * i, 0]} castShadow>
          <boxGeometry args={[0.26, 0.028, 0.19]} />
          <meshStandardMaterial color={i ? '#a78bfa' : '#34d399'} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

interface EspProps {
  color: string
  simple?: boolean
  /** Piso del objeto para la activación por proximidad (null = ignorar nivel). */
  nivel?: number | null
  /**
   * Instancia: la necesitan los AMBIENTALES para que el botón «Interactuar» les
   * encienda la animación (`pulsarAnimacion`) aunque el jugador esté lejos, sin
   * esperar a que la cercanía los despierte.
   */
  objetoId?: number
}

type UsableProps = { color: string }

/** Despacha el componente del objeto principal según su `tipo` (o null si no es especial). */
export function EspecialPlantilla({
  tipo,
  color,
  simple = false,
  nivel = null,
  objetoId,
}: EspProps & { tipo: string }) {
  switch (tipo) {
    case TIPO_OLLA:
      return <Olla color={color} simple={simple} nivel={nivel} objetoId={objetoId} />
    case TIPO_PIZARRA:
      return <PizarraIdeas color={color} simple={simple} nivel={nivel} objetoId={objetoId} />
    case TIPO_AGENDA:
      return <AgendaEscritorio color={color} simple={simple} nivel={nivel} objetoId={objetoId} />
    case TIPO_DESPERTADOR:
      return <Despertador color={color} simple={simple} nivel={nivel} objetoId={objetoId} />
    case TIPO_LIBRERO_LIBRO:
      return <LibreroLibro color={color} simple={simple} nivel={nivel} objetoId={objetoId} />
    case TIPO_GLOBO:
      return <GloboTerraqueo color={color} simple={simple} nivel={nivel} objetoId={objetoId} />
    case TIPO_ESTANTERIA_HERR:
      return <EstanteriaHerramientas color={color} simple={simple} nivel={nivel} objetoId={objetoId} />
    case TIPO_REPISA_JUEGOS:
      return <RepisaJuegos color={color} simple={simple} nivel={nivel} objetoId={objetoId} />
    case TIPO_CAMINADORA:
      return <Caminadora color={color} />
    case TIPO_PERIODICO:
      return <EscritorioNoticias color={color} simple={simple} nivel={nivel} objetoId={objetoId} />
    case TIPO_SILLON:
      return <SillonLectura color={color} />
    case TIPO_LAPTOP:
      return <Laptop color={color} />
    case TIPO_TAPETE:
      return <TapeteYoga color={color} />
    case TIPO_GUITARRA:
      return <PianoObj color={color} simple={simple} nivel={nivel} objetoId={objetoId} />
    case TIPO_PLANTA_REGAR:
      return <Arbol color={color} simple={simple} nivel={nivel} objetoId={objetoId} />
    case TIPO_LIBRETA:
      return <Libreta color={color} />
    case TIPO_CALENDARIO:
      return <CalendarioPared color={color} />
    case TIPO_CAJA_FUERTE:
      return <CajaFuerte color={color} simple={simple} nivel={nivel} objetoId={objetoId} />
    case TIPO_ESTACION_COMPUTO:
      return <EstacionComputo color={color} />
    default:
      return null
  }
}

import { Suspense, useRef, type RefObject } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { playerPos, useHouse } from '../state/houseStore'
import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { useLayout } from '../state/layoutStore'
import { useEditorUi } from '../state/editorUiStore'
import { useDialogo } from '../state/dialogoStore'
import { useMontura } from '../state/monturaStore'
import { trenFrame } from '../state/trenStore'
import { useAsistenteCerca } from '../state/asistenteCercaStore'
import { posAsistentes } from '../state/posAsistentes'
import { SPACING, subId, worldToSubCell } from './walls'
import { COLOR_FORMA, type MascotaId, type Asistente, type Pieza3D } from '../chat/mascotas'
import { ModeloPiezas, ModeloGLB } from './modeloPersonalizado'
import { GrupoAnimado, ModeloPiezasAnimado } from './Animado'
import type { AnimacionModelo } from './animacion'
import { Prendas } from './Prendas'
import { ANCLAS_FORMA } from './apariencia'
import { dragChar } from './characterDrag'

/**
 * Los asistentes (mago/gato/perro/…) como personajes EN el mapa 3D.
 *
 * - El ACTIVO no sigue al avatar: aparece en un punto aleatorio al abrir el
 *   mapa y se reubica al último lugar donde le pediste algo (estado `destino`).
 * - Siempre miran al jugador (cara +Z apuntando al player).
 * - No salen de los límites del mapa.
 * - El activo levanta la mano cuando el usuario manda un mensaje (`saludando`)
 *   y proyecta su cabeza a coordenadas de pantalla para anclar la burbuja 2D.
 * - Los demás asistentes con `enMapa` aparecen como compañeros que solo flotan.
 */

export const ALTURA_FLOTE = 1.0
const _screen = new THREE.Vector3()

// ----- Paseo libre: los asistentes deambulan por el exterior del mapa -----

const VEL_PASEO = 1.1 // u/s: velocidad constante (con lerp frenarían asintóticamente)

/** Estado de paseo de un asistente (vive en un ref de su componente). */
interface Paseo {
  destino: { x: number; z: number } | null
  /** Descansa hasta este instante (clock.elapsedTime) antes de volver a caminar. */
  descansaHasta: number
}

/** ¿El punto cae fuera de cualquier cuarto de planta baja? (pasean por el exterior). */
function puntoLibre(x: number, z: number): boolean {
  const ocupado = useLayout.getState().ocupadoPorNivel.get(0)
  if (!ocupado || ocupado.size === 0) return true
  const { sc, sr } = worldToSubCell(x, z)
  return !ocupado.has(subId(sc, sr))
}

/**
 * Avanza el paseo un frame a velocidad constante y devuelve la dirección de
 * avance (para orientar al personaje), o null si está quieto/descansando.
 * Al llegar descansa 2–6 s; el siguiente destino es 80% un punto cercano y
 * 20% uno global, rechazando hasta 5 intentos dentro de cuartos.
 */
function tickPaseo(
  p: Paseo,
  g: THREE.Group,
  dt: number,
  t: number,
  halfW: number,
  halfH: number,
): { dx: number; dz: number } | null {
  if (!p.destino) {
    if (t < p.descansaHasta) return null
    for (let i = 0; i < 5; i++) {
      const local = Math.random() < 0.8
      const nx = local ? g.position.x + (Math.random() * 2 - 1) * 6 : (Math.random() * 2 - 1) * halfW
      const nz = local ? g.position.z + (Math.random() * 2 - 1) * 6 : (Math.random() * 2 - 1) * halfH
      const cx = Math.max(-halfW, Math.min(halfW, nx))
      const cz = Math.max(-halfH, Math.min(halfH, nz))
      if (Math.hypot(cx - g.position.x, cz - g.position.z) < 1.5) continue
      if (!puntoLibre(cx, cz)) continue
      p.destino = { x: cx, z: cz }
      break
    }
    if (!p.destino) {
      p.descansaHasta = t + 2
      return null
    }
  }
  const dx = p.destino.x - g.position.x
  const dz = p.destino.z - g.position.z
  const dist = Math.hypot(dx, dz)
  if (dist < 0.25) {
    p.destino = null
    p.descansaHasta = t + 2 + Math.random() * 4
    return null
  }
  const paso = Math.min(dist, VEL_PASEO * dt)
  g.position.x += (dx / dist) * paso
  g.position.z += (dz / dist) * paso
  return { dx, dz }
}

/** Giro suave hacia un ángulo objetivo, sin saltos al cruzar ±π. */
function girarHacia(g: THREE.Group, objetivo: number, factor: number) {
  g.rotation.y += Math.atan2(Math.sin(objetivo - g.rotation.y), Math.cos(objetivo - g.rotation.y)) * factor
}

/**
 * Props de evento al tocar un asistente en el 3D:
 * - En juego normal, abre la conversación cara a cara (modo diálogo).
 * - En modo edición (sin cuarto), lo selecciona y, en la pestaña Personajes,
 *   permite arrastrarlo para reubicarlo.
 */
function useSeleccionarEnEditor(id: string) {
  const editMode = useLayout((s) => s.editMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const editarPersonaje = useEditorUi((s) => s.editarPersonaje)
  const setPersonajeSel = useEditorUi((s) => s.setPersonajeSel)
  const tab = useEditorUi((s) => s.tab)
  if (!editMode) {
    return {
      onClick: (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        useDialogo.getState().entrar(id)
      },
      onPointerDown: undefined,
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      },
      onPointerOut: () => {
        document.body.style.cursor = 'default'
      },
    }
  }
  if (editingRoomId) return undefined
  const arrastrable = tab === 'personajes'
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      editarPersonaje(id)
    },
    onPointerDown: arrastrable
      ? (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setPersonajeSel(id)
          dragChar.id = id
          document.body.style.cursor = 'grabbing'
        }
      : undefined,
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      document.body.style.cursor = arrastrable ? 'grab' : 'pointer'
    },
    onPointerOut: () => {
      document.body.style.cursor = 'default'
    },
  }
}

export function Asistente3D() {
  const mascotaId = useMascota((s) => s.mascota)
  const lista = useAsistentes((s) => s.lista)
  const activo = lista.find((a) => a.id === mascotaId) ?? lista[0]
  return (
    <>
      {activo && <AsistenteActivo asistente={activo} />}
      {lista
        .filter((a) => a.enMapa && a.id !== activo?.id)
        .map((a) => (
          <Companero key={a.id} asistente={a} />
        ))}
    </>
  )
}

/** Radio para ofrecer «Hablar»; ya ofrecido aguanta un poco más (histéresis). */
const CERCA_HABLAR = 2.6
const CERCA_HABLAR_SALIR = 3.4

/**
 * Detecta el asistente junto al personaje (a pie, planta baja, sin editores)
 * para la burbuja de «Hablar». Solo mira a los que están en el mapa: en
 * `posAsistentes` puede quedar la última posición de uno ya retirado.
 */
export function AsistenteProximity() {
  useFrame(() => {
    const st = useAsistenteCerca.getState()
    const { transicion, playerLevel, activeRoom } = useHouse.getState()
    const bloqueado =
      useDialogo.getState().asistenteId != null ||
      useMontura.getState().instanciaId != null ||
      trenFrame.montado ||
      transicion ||
      !!activeRoom ||
      playerLevel !== 0 ||
      useLayout.getState().editMode ||
      dragChar.id != null
    if (bloqueado) {
      if (st.asistenteId != null) st.set(null)
      return
    }
    const activoId = useMascota.getState().mascota
    let mejor: string | null = null
    let mejorD = Infinity
    for (const a of useAsistentes.getState().lista) {
      if (a.id !== activoId && !a.enMapa) continue
      const p = posAsistentes[a.id]
      if (!p) continue
      const d = Math.hypot(playerPos.x - p.x, playerPos.z - p.z)
      const margen = a.id === st.asistenteId ? CERCA_HABLAR_SALIR : CERCA_HABLAR
      if (d <= margen && d < mejorD) {
        mejor = a.id
        mejorD = d
      }
    }
    if (mejor !== st.asistenteId) st.set(mejor)
  })
  return null
}

function AsistenteActivo({ asistente }: { asistente: Asistente }) {
  const group = useRef<THREE.Group>(null)
  const brazo = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const seleccionar = useSeleccionarEnEditor(asistente.id)
  // Con un preset activo, el preset manda: se apaga el flote integrado (el saludo sigue).
  const presetOn = !!asistente.animacion?.preset && asistente.animacion.activacion !== 'apagado'

  // Selectores puntuales: el store cambia mucho al editar (previewCell, drag).
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const colocado = useRef(false)
  const paseo = useRef<Paseo>({ destino: null, descansaHasta: 0 })

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const st = useMascota.getState()

    // Límites reales del mapa (media extensión de la cuadrícula menos margen).
    const halfW = (gridCols * SPACING) / 2 - 1.0
    const halfH = (gridRows * SPACING) / 2 - 1.0

    // Primera vez: aparecer en un punto aleatorio del mapa.
    if (!colocado.current) {
      const rx = (Math.random() * 2 - 1) * halfW
      const rz = (Math.random() * 2 - 1) * halfH
      g.position.set(rx, ALTURA_FLOTE, rz)
      colocado.current = true
    }

    // Posición viva compartida (mutada en sitio; la lee el modo diálogo).
    const pos = (posAsistentes[asistente.id] ??= { x: 0, z: 0 })
    pos.x = g.position.x
    pos.z = g.position.z

    // Arrastre en el editor: el asistente sigue al cursor (sin lerp ni destino).
    if (dragChar.id === asistente.id) {
      g.position.x = Math.max(-halfW, Math.min(halfW, dragChar.x))
      g.position.z = Math.max(-halfH, Math.min(halfH, dragChar.z))
      g.position.y = presetOn ? ALTURA_FLOTE : ALTURA_FLOTE + Math.sin(t * 2) * 0.12
      g.rotation.y = Math.atan2(playerPos.x - g.position.x, playerPos.z - g.position.z)
      return
    }

    // ¿Este asistente está hablando/pensando ahora? (pausa el paseo y ancla la mirada)
    const hablando = (st.hablanteId ?? st.mascota) === asistente.id && (!!st.mensaje || st.pensando)

    // Prioridad: diálogo cara a cara > destino pedido por chat > paseo libre.
    const dlg = useDialogo.getState()
    const enDialogo = dlg.asistenteId === asistente.id && !!dlg.punto
    const dest = st.destino
    let avance: { dx: number; dz: number } | null = null
    if (enDialogo) {
      g.position.x = THREE.MathUtils.lerp(g.position.x, dlg.punto!.x, 0.06)
      g.position.z = THREE.MathUtils.lerp(g.position.z, dlg.punto!.z, 0.06)
    } else if (dest) {
      const tx = Math.max(-halfW, Math.min(halfW, dest.x))
      const tz = Math.max(-halfH, Math.min(halfH, dest.z))
      g.position.x = THREE.MathUtils.lerp(g.position.x, tx, 0.05)
      g.position.z = THREE.MathUtils.lerp(g.position.z, tz, 0.05)
      // Al llegar queda libre para volver a pasear.
      if (Math.hypot(tx - g.position.x, tz - g.position.z) < 0.15) st.llegoADestino()
    } else {
      const pausado =
        useLayout.getState().editMode || hablando || st.conversacion === asistente.id
      if (!pausado) avance = tickPaseo(paseo.current, g, delta, t, halfW, halfH)
    }
    g.position.y = presetOn ? ALTURA_FLOTE : ALTURA_FLOTE + Math.sin(t * 2) * 0.12

    // Mirada: al jugador si conversa contigo, está cerca, habla o va hacia ti.
    const cerca = Math.hypot(playerPos.x - g.position.x, playerPos.z - g.position.z) < 3
    if (enDialogo || cerca || hablando || st.saludando || dest) {
      girarHacia(g, Math.atan2(playerPos.x - g.position.x, playerPos.z - g.position.z), 0.2)
    } else if (avance) {
      girarHacia(g, Math.atan2(avance.dx, avance.dz), 0.12)
    }

    // Levantar la mano al saludar (lerp del ángulo + vaivén).
    if (brazo.current) {
      const objetivo = st.saludando ? 2.4 : 0.1
      const vaiven = st.saludando ? Math.sin(t * 12) * 0.18 : 0
      brazo.current.rotation.z = THREE.MathUtils.lerp(
        brazo.current.rotation.z,
        objetivo + vaiven,
        0.25,
      )
    }

    // Proyectar la cabeza a pantalla SOLO si este asistente es quien habla o piensa.
    if ((st.mensaje || st.pensando) && (st.hablanteId ?? st.mascota) === asistente.id) {
      _screen.set(g.position.x, g.position.y + 1.5, g.position.z)
      _screen.project(camera)
      const x = (_screen.x * 0.5 + 0.5) * size.width
      const y = (-_screen.y * 0.5 + 0.5) * size.height
      const visible = _screen.z < 1 && Number.isFinite(x) && Number.isFinite(y)
      st.setScreen(x, y, visible)
    }
  })

  return (
    <group ref={group} {...seleccionar}>
      <GrupoAnimado anim={asistente.animacion}>
        <group scale={asistente.escala ?? 1}>
          <ModeloMascota
            forma={asistente.forma}
            color={asistente.color}
            modelo3d={asistente.modelo3d}
            modeloGlb={asistente.modeloGlb}
            brazoRef={brazo}
            anim={asistente.animacion}
          />
          <Prendas ropa={asistente.ropa} anclas={ANCLAS_FORMA[asistente.forma]} />
        </group>
      </GrupoAnimado>
    </group>
  )
}

/** Compañero en el mapa (asistente con `enMapa` que no es el activo): solo flota y mira al jugador. */
function Companero({ asistente }: { asistente: Asistente }) {
  const group = useRef<THREE.Group>(null)
  const brazo = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const seleccionar = useSeleccionarEnEditor(asistente.id)
  const colocado = useRef(false)
  const paseo = useRef<Paseo>({ destino: null, descansaHasta: 0 })
  // Con un preset activo, el preset manda: se apaga el flote integrado.
  const presetOn = !!asistente.animacion?.preset && asistente.animacion.activacion !== 'apagado'

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const halfW = (gridCols * SPACING) / 2 - 1.0
    const halfH = (gridRows * SPACING) / 2 - 1.0
    if (!colocado.current) {
      g.position.set((Math.random() * 2 - 1) * halfW, ALTURA_FLOTE, (Math.random() * 2 - 1) * halfH)
      colocado.current = true
    }

    // Posición viva compartida (mutada en sitio; la lee el modo diálogo).
    const pos = (posAsistentes[asistente.id] ??= { x: 0, z: 0 })
    pos.x = g.position.x
    pos.z = g.position.z

    const st = useMascota.getState()
    const arrastrado = dragChar.id === asistente.id
    // Arrastre en el editor: el compañero sigue al cursor y se queda donde se suelta.
    if (arrastrado) {
      g.position.x = Math.max(-halfW, Math.min(halfW, dragChar.x))
      g.position.z = Math.max(-halfH, Math.min(halfH, dragChar.z))
    }

    // Diálogo cara a cara: se planta frente al jugador (gana al paseo).
    const dlg = useDialogo.getState()
    const enDialogo = dlg.asistenteId === asistente.id && !!dlg.punto
    if (enDialogo) {
      g.position.x = THREE.MathUtils.lerp(g.position.x, dlg.punto!.x, 0.06)
      g.position.z = THREE.MathUtils.lerp(g.position.z, dlg.punto!.z, 0.06)
    }

    // Paseo libre (pausado al hablar, en diálogo, con su conversación abierta, en el editor o arrastrado).
    const hablando = st.hablanteId === asistente.id && (!!st.mensaje || st.pensando)
    const pausado =
      arrastrado || hablando || enDialogo || useLayout.getState().editMode || st.conversacion === asistente.id
    const avance = pausado ? null : tickPaseo(paseo.current, g, delta, t, halfW, halfH)

    // Desfase por posición para que no floten todos al unísono.
    g.position.y = presetOn
      ? ALTURA_FLOTE
      : ALTURA_FLOTE + Math.sin(t * 2 + g.position.x) * 0.12

    // Mirada: al jugador si conversa contigo, está cerca o hablando; si no, adonde camina.
    const cerca = Math.hypot(playerPos.x - g.position.x, playerPos.z - g.position.z) < 3
    if (enDialogo || cerca || hablando) {
      girarHacia(g, Math.atan2(playerPos.x - g.position.x, playerPos.z - g.position.z), 0.2)
    } else if (avance) {
      girarHacia(g, Math.atan2(avance.dx, avance.dz), 0.12)
    }

    // Si este compañero es quien habla o piensa, ancla la burbuja a su cabeza.
    if ((st.mensaje || st.pensando) && st.hablanteId === asistente.id) {
      _screen.set(g.position.x, g.position.y + 1.5, g.position.z)
      _screen.project(camera)
      const x = (_screen.x * 0.5 + 0.5) * size.width
      const y = (-_screen.y * 0.5 + 0.5) * size.height
      const visible = _screen.z < 1 && Number.isFinite(x) && Number.isFinite(y)
      st.setScreen(x, y, visible)
    }
  })

  return (
    <group ref={group} {...seleccionar}>
      <GrupoAnimado anim={asistente.animacion}>
        <group scale={asistente.escala ?? 1}>
          <ModeloMascota
            forma={asistente.forma}
            color={asistente.color}
            modelo3d={asistente.modelo3d}
            modeloGlb={asistente.modeloGlb}
            brazoRef={brazo}
            anim={asistente.animacion}
          />
          <Prendas ropa={asistente.ropa} anclas={ANCLAS_FORMA[asistente.forma]} />
        </group>
      </GrupoAnimado>
    </group>
  )
}

/**
 * Modelo 3D del asistente. Prioridad: .glb subido por el usuario →
 * piezas generadas por IA → forma base integrada (mago/gato/…).
 */
export function ModeloMascota({
  forma,
  color,
  modelo3d,
  modeloGlb,
  brazoRef,
  anim,
}: {
  forma: MascotaId
  color?: string
  modelo3d?: Pieza3D[]
  modeloGlb?: Blob
  brazoRef: RefObject<THREE.Group | null>
  /** Animación del personaje: activa las poses en cuerpos de piezas. */
  anim?: AnimacionModelo
}) {
  if (modeloGlb) {
    return (
      <Suspense fallback={null}>
        <ModeloGLB blob={modeloGlb} />
      </Suspense>
    )
  }
  if (modelo3d && modelo3d.length > 0) {
    if (anim && anim.activacion !== 'apagado' && (anim.poses?.length ?? 0) >= 2) {
      return <ModeloPiezasAnimado piezas={modelo3d} anim={anim} />
    }
    return <ModeloPiezas piezas={modelo3d} />
  }
  switch (forma) {
    case 'gato':
      return <Gato color={color} brazoRef={brazoRef} />
    case 'perro':
      return <Perro color={color} brazoRef={brazoRef} />
    case 'buho':
      return <Buho color={color} brazoRef={brazoRef} />
    case 'robot':
      return <Robot color={color} brazoRef={brazoRef} />
    default:
      return <Mago color={color} brazoRef={brazoRef} />
  }
}

/** Brazo articulado genérico: grupo con pivote en el hombro; al rotar en Z se levanta. */
function Brazo({
  brazoRef,
  hombro,
  color,
  mano,
}: {
  brazoRef: RefObject<THREE.Group | null>
  hombro: [number, number, number]
  color: string
  mano?: React.ReactNode
}) {
  return (
    <group ref={brazoRef} position={hombro}>
      <mesh position={[0, -0.22, 0]} castShadow>
        <boxGeometry args={[0.14, 0.44, 0.14]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {mano && <group position={[0, -0.46, 0]}>{mano}</group>}
    </group>
  )
}

const PIEL = '#f2c79a'

interface PropsModelo {
  brazoRef: RefObject<THREE.Group | null>
  /** Color principal del cuerpo (vacío = el de la forma). */
  color?: string
}

function Mago({ brazoRef, color }: PropsModelo) {
  const tunica = color || COLOR_FORMA.mago
  return (
    <group>
      {/* Túnica cónica */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <coneGeometry args={[0.46, 1.0, 10]} />
        <meshStandardMaterial color={tunica} />
      </mesh>
      {/* Cabeza */}
      <mesh position={[0, 1.12, 0]} castShadow>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshStandardMaterial color={PIEL} />
      </mesh>
      {/* Barba */}
      <mesh position={[0, 0.92, 0.12]}>
        <coneGeometry args={[0.16, 0.34, 8]} />
        <meshStandardMaterial color="#e8e8ee" />
      </mesh>
      {/* Sombrero: ala + cono */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.05, 12]} />
        <meshStandardMaterial color={tunica} />
      </mesh>
      <mesh position={[0, 1.62, 0]} castShadow>
        <coneGeometry args={[0.26, 0.7, 12]} />
        <meshStandardMaterial color={tunica} />
      </mesh>
      {/* Ojos */}
      <Ojos />
      {/* Brazo izquierdo fijo */}
      <mesh position={[-0.32, 0.7, 0]}>
        <boxGeometry args={[0.14, 0.44, 0.14]} />
        <meshStandardMaterial color={tunica} />
      </mesh>
      {/* Brazo derecho articulado con orbe mágico */}
      <Brazo
        brazoRef={brazoRef}
        hombro={[0.32, 0.92, 0]}
        color={tunica}
        mano={
          <mesh>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color="#7ee0ff" emissive="#39bfff" emissiveIntensity={0.7} />
          </mesh>
        }
      />
    </group>
  )
}

function Gato({ brazoRef, color }: PropsModelo) {
  const pelaje = color || COLOR_FORMA.gato
  return (
    <group>
      {/* Cuerpo */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.5, 0.62, 0.42]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      {/* Cabeza */}
      <mesh position={[0, 1.08, 0.02]} castShadow>
        <boxGeometry args={[0.46, 0.42, 0.4]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      {/* Orejas */}
      <mesh position={[-0.16, 1.36, 0]}>
        <coneGeometry args={[0.1, 0.2, 4]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      <mesh position={[0.16, 1.36, 0]}>
        <coneGeometry args={[0.1, 0.2, 4]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      {/* Cola */}
      <mesh position={[0, 0.7, -0.3]} rotation={[0.6, 0, 0]}>
        <boxGeometry args={[0.1, 0.5, 0.1]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      <Ojos y={1.08} z={0.21} />
      {/* Pata izquierda fija */}
      <mesh position={[-0.28, 0.36, 0.1]}>
        <boxGeometry args={[0.14, 0.4, 0.14]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      {/* Pata derecha articulada (saluda) */}
      <Brazo brazoRef={brazoRef} hombro={[0.28, 0.62, 0.1]} color={pelaje} />
    </group>
  )
}

function Perro({ brazoRef, color }: PropsModelo) {
  const pelaje = color || COLOR_FORMA.perro
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.54, 0.62, 0.46]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      <mesh position={[0, 1.06, 0.04]} castShadow>
        <boxGeometry args={[0.48, 0.44, 0.44]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      {/* Hocico */}
      <mesh position={[0, 0.98, 0.3]}>
        <boxGeometry args={[0.22, 0.2, 0.18]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      {/* Orejas caídas */}
      <mesh position={[-0.26, 1.18, 0.02]}>
        <boxGeometry args={[0.1, 0.32, 0.16]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      <mesh position={[0.26, 1.18, 0.02]}>
        <boxGeometry args={[0.1, 0.32, 0.16]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      <Ojos y={1.12} z={0.23} />
      <mesh position={[-0.28, 0.36, 0.1]}>
        <boxGeometry args={[0.15, 0.4, 0.15]} />
        <meshStandardMaterial color={pelaje} />
      </mesh>
      <Brazo brazoRef={brazoRef} hombro={[0.28, 0.62, 0.1]} color={pelaje} />
    </group>
  )
}

function Buho({ brazoRef, color }: PropsModelo) {
  const plumas = color || COLOR_FORMA.buho
  return (
    <group>
      {/* Cuerpo ovoide */}
      <mesh position={[0, 0.7, 0]} scale={[1, 1.25, 1]} castShadow>
        <sphereGeometry args={[0.42, 16, 16]} />
        <meshStandardMaterial color={plumas} />
      </mesh>
      {/* Ojos grandes */}
      <mesh position={[-0.16, 0.92, 0.34]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#fdfdf5" />
      </mesh>
      <mesh position={[0.16, 0.92, 0.34]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#fdfdf5" />
      </mesh>
      <mesh position={[-0.16, 0.92, 0.45]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.16, 0.92, 0.45]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* Pico */}
      <mesh position={[0, 0.78, 0.42]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.07, 0.18, 4]} />
        <meshStandardMaterial color="#e0a73a" />
      </mesh>
      {/* Ala izquierda fija */}
      <mesh position={[-0.42, 0.7, 0]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.12, 0.5, 0.3]} />
        <meshStandardMaterial color={plumas} />
      </mesh>
      {/* Ala derecha articulada (saluda) */}
      <Brazo brazoRef={brazoRef} hombro={[0.42, 0.85, 0]} color={plumas} />
    </group>
  )
}

function Robot({ brazoRef, color }: PropsModelo) {
  const metal = color || COLOR_FORMA.robot
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.36]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.44, 0.4, 0.36]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Antena */}
      <mesh position={[0, 1.34, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.16, 6]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.46, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ff5d5d" emissive="#ff2d2d" emissiveIntensity={0.6} />
      </mesh>
      {/* Visor de ojos */}
      <mesh position={[0, 1.06, 0.19]}>
        <boxGeometry args={[0.3, 0.12, 0.02]} />
        <meshStandardMaterial color="#0c1014" emissive="#39bfff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.34, 0.7, 0]}>
        <boxGeometry args={[0.13, 0.44, 0.13]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.3} />
      </mesh>
      <Brazo brazoRef={brazoRef} hombro={[0.32, 0.85, 0]} color={metal} />
    </group>
  )
}

/** Par de ojitos mirando al frente (−Z). */
function Ojos({ y = 1.14, z = 0.2 }: { y?: number; z?: number }) {
  return (
    <group>
      <mesh position={[-0.09, y, z]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.09, y, z]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  )
}

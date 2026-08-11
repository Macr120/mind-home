import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { Pieza3D } from '../chat/mascotas'
import { ModeloPiezas, ModeloPiezasConMarcha } from './modeloPersonalizado'
import {
  actualizarEnergia,
  aplicarPreset,
  factorPulso,
  girarHacia,
  RADIO_VIDA_DEFAULT,
  type AnimacionModelo,
  type EstadoMarcha,
} from './animacion'
import { marchaDePersonaje } from './cuerpos'
import { nuevoPaseoVida, posObjetosVivos, tickVida, RADIO_VIVO_OBJETO } from './vidaObjeto'
import { Corazones, SenalAburrido, SenalHambre } from './senalesVida'
import { estaAburridoVida, tieneHambreVida } from '../state/vidaObjetoStore'
import { registrarAncla, quitarAncla } from './etiquetasMapa'
import { useDiseño } from '../state/disenoStore'
import { playerPos, useHouse } from '../state/houseStore'
import type { ObjetoCuarto } from '../data/db'

/**
 * Reproducción de animaciones en la escena (presets de conjunto). Todo muta
 * refs en useFrame — nunca estado de React — siguiendo el patrón de
 * VanoFachada/Brazo. Los componentes solo se montan cuando hay animación.
 */

/**
 * Envuelve el contenido en un grupo animado por el preset de `anim`. Sin
 * preset activo devuelve los children tal cual (cero useFrame en objetos
 * estáticos); al quitar el preset el grupo se desmonta y el transform
 * vuelve solo a su base.
 */
export function GrupoAnimado({
  anim,
  nivel = null,
  objetoId,
  children,
}: {
  anim?: AnimacionModelo
  /** Piso del objeto para el modo 'proximidad' (null = ignorar nivel). */
  nivel?: number | null
  /** Instancia, para que «Interactuar» pueda encenderle la animación. */
  objetoId?: number
  children: React.ReactNode
}) {
  if (!anim?.preset || anim.activacion === 'apagado') return <>{children}</>
  // «Dale vida» desplaza el grupo con su propia máquina de estados: se
  // intercepta ANTES de `aplicarPreset`, que escribe la posición absoluta.
  if (anim.preset === 'vida') {
    return (
      <GrupoVida anim={anim} nivel={nivel} objetoId={objetoId}>
        {children}
      </GrupoVida>
    )
  }
  return (
    <GrupoPresetActivo anim={anim} nivel={nivel} objetoId={objetoId}>
      {children}
    </GrupoPresetActivo>
  )
}

/** Cada cuánto se recalculan hambre y ánimo (ms): decaen en horas, no en segundos. */
const MS_RELOJ_VIDA = 30_000
/** Altura sobre el objeto donde se ancla su barra de estado. */
const ALTURA_ETIQUETA_VIDA = 1.2

/**
 * Objeto con vida: deambula por un círculo alrededor de su sitio, se planta con
 * hambre y anda a media marcha aburrido. Mismo espíritu que `AnimalVivo` de la
 * granja, en coordenadas locales y sin corral que lo encierre.
 */
function GrupoVida({
  anim,
  nivel,
  objetoId,
  children,
}: {
  anim: AnimacionModelo
  nivel: number | null
  objetoId?: number
  children: React.ReactNode
}) {
  const radio = anim.radio ?? RADIO_VIDA_DEFAULT
  const group = useRef<THREE.Group>(null)
  const st = useRef(nuevoPaseoVida(radio))
  const ancla = useRef(new THREE.Vector3())

  // Selectores PRIMITIVOS: la función corre en cada cambio del store, pero el
  // re-render solo llega cuando cambian estas dos marcas (nunca al mover un
  // objeto). Suscribirse a `s.objetos` crudo repintaría medio mapa por frame.
  const comidaEn = useDiseño((s) => s.objetos.find((o) => o.id === objetoId)?.vidaComidaEn)
  const mimoEn = useDiseño((s) => s.objetos.find((o) => o.id === objetoId)?.vidaMimoEn)

  // Hambre y ánimo decaen en horas: basta re-evaluarlas cada medio minuto.
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), MS_RELOJ_VIDA)
    return () => window.clearInterval(id)
  }, [])

  const fila = { vidaComidaEn: comidaEn, vidaMimoEn: mimoEn } as ObjetoCuarto
  const hambre = tieneHambreVida(fila, ahora)
  const aburrido = estaAburridoVida(fila, ahora)
  // El useFrame los lee sin re-crearse en cada render.
  const gesto = useRef({ hambre, aburrido })
  gesto.current = { hambre, aburrido }

  useEffect(() => {
    if (objetoId == null) return
    const id = `vida:${objetoId}`
    registrarAncla(id, () => ancla.current)
    return () => {
      quitarAncla(id)
      delete posObjetosVivos[objetoId]
    }
  }, [objetoId])

  useFrame((_st, delta) => {
    const g = group.current
    if (!g) return
    const s = st.current
    let dt = delta

    // Lejos del jugador el paseo no se aprecia: pasa a ~4 ticks/s. En el mismo
    // muestreo se publica la posición viva, que es contra la que mide el
    // detector de proximidad (la guardada se quedó donde lo dejaste).
    s.accDist += dt
    if (s.accDist >= 0.5) {
      s.accDist = 0
      g.getWorldPosition(ancla.current)
      s.lejos = Math.hypot(playerPos.x - ancla.current.x, playerPos.z - ancla.current.z) > RADIO_VIVO_OBJETO
      if (objetoId != null) posObjetosVivos[objetoId] = { x: ancla.current.x, z: ancla.current.z }
    }
    if (s.lejos) {
      s.accTick += dt
      if (s.accTick < 0.25) return
      dt = s.accTick
      s.accTick = 0
    }

    // En otro piso se queda quieto (no se ve, y la etiqueta tampoco aplica).
    if (nivel != null && useHouse.getState().playerLevel !== nivel) return

    const vel = (anim.velocidad ?? 1) * (gesto.current.aburrido ? 0.5 : 1)
    const y = tickVida(s, dt, radio, vel, gesto.current.hambre)
    g.position.set(s.x, y, s.z)
    girarHacia(g, s.heading, 1)
    g.getWorldPosition(ancla.current)
    ancla.current.y += ALTURA_ETIQUETA_VIDA
  })

  return (
    <group ref={group}>
      {children}
      {hambre && <SenalHambre />}
      {!hambre && aburrido && <SenalAburrido />}
      {mimoEn != null && Date.now() - mimoEn < 3000 && <Corazones key={mimoEn} />}
    </group>
  )
}

function GrupoPresetActivo({
  anim,
  nivel,
  objetoId,
  children,
}: {
  anim: AnimacionModelo
  nivel: number | null
  objetoId?: number
  children: React.ReactNode
}) {
  const group = useRef<THREE.Group>(null)
  const energia = useRef(0)
  const acum = useRef({ ang: 0 })

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const e = actualizarEnergia(g, anim, nivel, energia, objetoId)
    // Con energía 0 las fórmulas dejan el transform en reposo (girar se congela
    // en su ángulo actual en vez de saltar a 0).
    aplicarPreset(g, anim, state.clock.elapsedTime, dt, e * factorPulso(objetoId), acum.current)
  })

  return <group ref={group}>{children}</group>
}

/**
 * Modelo de piezas con animación de poses: interpola cíclicamente (con
 * suavizado) entre los snapshots de `anim.poses`, mezclados con la pose base
 * por la energía (así 'proximidad' enciende y apaga con suavidad). Tolera
 * poses con longitud distinta al modelo: pieza sin entrada = transform base.
 * El caller garantiza `anim.poses.length >= 2`.
 */
export function ModeloPiezasAnimado({
  piezas,
  anim,
  nivel = null,
  objetoId,
}: {
  piezas: Pieza3D[]
  anim: AnimacionModelo
  nivel?: number | null
  /** Instancia, para que «Interactuar» pueda encenderle la animación. */
  objetoId?: number
}) {
  const grupo = useRef<THREE.Group>(null)
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const energia = useRef(0)

  useFrame((state) => {
    const g = grupo.current
    const poses = anim.poses
    if (!g || !poses || poses.length < 2) return
    // Aquí la energía MEZCLA base→pose, así que el refuerzo del pulso se acota:
    // pasarse de 1 sobre-extiende la pose en vez de exagerar el movimiento.
    const e = Math.min(actualizarEnergia(g, anim, nivel, energia, objetoId) * factorPulso(objetoId), 1.35)
    const vel = anim.velocidad ?? 1
    const dur = anim.duracionPose ?? 1
    const n = poses.length
    // Fase 0..n sobre el ciclo completo; q = progreso suavizado dentro del tramo.
    const f = ((state.clock.elapsedTime * vel) % (n * dur)) / dur
    const i = Math.floor(f)
    const q0 = f - i
    const q = q0 * q0 * (3 - 2 * q0)
    const A = poses[i % n]
    const B = poses[(i + 1) % n]
    for (let j = 0; j < piezas.length; j++) {
      const m = meshes.current[j]
      if (!m) continue
      const base = piezas[j]
      const a = A[j] ?? base
      const b = B[j] ?? base
      const ra = a.rot ?? [0, 0, 0]
      const rb = b.rot ?? [0, 0, 0]
      const rBase = base.rot ?? [0, 0, 0]
      // Interpola A→B y mezcla el resultado con la base por energía.
      m.position.set(
        base.pos[0] + (a.pos[0] + (b.pos[0] - a.pos[0]) * q - base.pos[0]) * e,
        base.pos[1] + (a.pos[1] + (b.pos[1] - a.pos[1]) * q - base.pos[1]) * e,
        base.pos[2] + (a.pos[2] + (b.pos[2] - a.pos[2]) * q - base.pos[2]) * e,
      )
      m.rotation.set(
        rBase[0] + (ra[0] + (rb[0] - ra[0]) * q - rBase[0]) * e,
        rBase[1] + (ra[1] + (rb[1] - ra[1]) * q - rBase[1]) * e,
        rBase[2] + (ra[2] + (rb[2] - ra[2]) * q - rBase[2]) * e,
      )
    }
  })

  return (
    <group ref={grupo}>
      <ModeloPiezas piezas={piezas} meshRefs={meshes} />
    </group>
  )
}

/**
 * Piezas de un cuerpo (avatar o asistente): poses manuales si las hay (ganan
 * siempre), si no la marcha real de un preset reconocido (`cuerpos.ts`), o el
 * dibujo fijo de siempre. Único punto que decide entre los 3 sistemas, para
 * que `AvatarModelo`/`Asistente3D` no dupliquen la lógica.
 */
export function CuerpoDePiezas({
  piezas,
  anim,
  personaje,
  estado,
}: {
  piezas: Pieza3D[]
  anim?: AnimacionModelo
  personaje: { cuerpoPresetId?: string }
  estado: EstadoMarcha
}) {
  if (anim && anim.activacion !== 'apagado' && (anim.poses?.length ?? 0) >= 2) {
    return <ModeloPiezasAnimado piezas={piezas} anim={anim} />
  }
  const marcha = marchaDePersonaje(personaje)
  if (marcha) return <ModeloPiezasConMarcha piezas={piezas} marcha={marcha} estado={estado} />
  return <ModeloPiezas piezas={piezas} />
}

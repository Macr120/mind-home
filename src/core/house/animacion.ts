import * as THREE from 'three'
import type { Pieza3D } from '../chat/mascotas'
import { playerPos } from '../state/playerPosition'
import { useHouse } from '../state/houseStore'

/**
 * Motor de animación de objetos y personajes: tipos persistidos, presets de
 * conjunto (animan el grupo contenedor completo) y poses por pieza (solo
 * modelos de piezas). La reproducción vive en `Animado.tsx` (useFrame).
 */

/** Preset de conjunto: anima el grupo contenedor completo (cualquier tipo de objeto). */
export type PresetAnimacionId = 'girar' | 'flotar' | 'pulsar' | 'mecerse' | 'rebotar' | 'temblar'

/** Cuándo se reproduce: apagado | siempre | proximidad (jugador cerca, como las puertas). */
export type ActivacionAnimacion = 'apagado' | 'siempre' | 'proximidad'

/** Pos/rot de UNA pieza dentro de una pose (mismo formato que Pieza3D). */
export interface PosePieza {
  pos: [number, number, number]
  rot?: [number, number, number]
}

/**
 * Una pose: snapshot por índice de pieza. Solo captura pos/rot (recolorear o
 * redimensionar el modelo nunca rompe poses). Tolera longitudes distintas al
 * modelo actual: pieza sin entrada = se queda en su transform base.
 */
export type Pose = PosePieza[]

/** Animación guardada de un objeto o personaje. */
export interface AnimacionModelo {
  activacion: ActivacionAnimacion
  preset?: PresetAnimacionId
  /** Multiplicador de velocidad 0.25–3 (1 = normal). Afecta preset y poses. */
  velocidad?: number
  /** Amplitud del preset 0.25–3 (1 = normal). */
  intensidad?: number
  /** Solo modelos de piezas: 2+ poses se interpolan cíclicamente. */
  poses?: Pose[]
  /** Segundos por tramo entre poses (0.2–5, default 1). */
  duracionPose?: number
}

export const PRESETS_ANIMACION: { id: PresetAnimacionId; emoji: string; nombre: string }[] = [
  { id: 'girar', emoji: '🔄', nombre: 'Girar' },
  { id: 'flotar', emoji: '🎈', nombre: 'Flotar' },
  { id: 'pulsar', emoji: '💗', nombre: 'Pulsar' },
  { id: 'mecerse', emoji: '🌊', nombre: 'Mecerse' },
  { id: 'rebotar', emoji: '⚽', nombre: 'Rebotar' },
  { id: 'temblar', emoji: '⚡', nombre: 'Temblar' },
]

/** Distancia al jugador que enciende una animación en modo 'proximidad'. */
export const UMBRAL_PROXIMIDAD_ANIM = 3.5

/** ¿Hay algo que reproducir en el mapa? (preset o 2+ poses, y no está apagada). */
export function tieneAnimacion(a?: AnimacionModelo | null): a is AnimacionModelo {
  return !!a && a.activacion !== 'apagado' && (!!a.preset || (a.poses?.length ?? 0) >= 2)
}

/** Copia con activación 'siempre' para el botón ▶ de los previews (undefined si no hay nada que reproducir). */
export function forzarSiempre(a?: AnimacionModelo): AnimacionModelo | undefined {
  if (!a || (!a.preset && (a.poses?.length ?? 0) < 2)) return undefined
  return { ...a, activacion: 'siempre' }
}

/** Snapshot de pos/rot de las piezas actuales como una pose nueva. */
export function capturarPose(piezas: Pieza3D[]): Pose {
  return piezas.map((p) => ({
    pos: [...p.pos] as [number, number, number],
    ...(p.rot ? { rot: [...p.rot] as [number, number, number] } : {}),
  }))
}

/** Deja las piezas en la pose dada (para retocarla con el editor de piezas). */
export function aplicarPose(piezas: Pieza3D[], pose: Pose): Pieza3D[] {
  return piezas.map((p, i) => {
    const e = pose[i]
    if (!e) return p
    return {
      ...p,
      pos: [...e.pos] as [number, number, number],
      rot: e.rot ? ([...e.rot] as [number, number, number]) : undefined,
    }
  })
}

const _mundo = new THREE.Vector3()

/**
 * Energía 0..1 de la animación (patrón VanoFachada): 1 con 'siempre', lerp
 * hacia 1/0 según cercanía del jugador con 'proximidad'. `nivel` = piso del
 * objeto para comparar con el del jugador (null = ignorar nivel).
 */
export function actualizarEnergia(
  obj: THREE.Object3D,
  anim: AnimacionModelo,
  nivel: number | null,
  energia: { current: number },
): number {
  let objetivo = 0
  if (anim.activacion === 'siempre') objetivo = 1
  else if (anim.activacion === 'proximidad') {
    const nivelOk = nivel == null || useHouse.getState().playerLevel === nivel
    if (nivelOk) {
      obj.getWorldPosition(_mundo)
      if (Math.hypot(playerPos.x - _mundo.x, playerPos.z - _mundo.z) < UMBRAL_PROXIMIDAD_ANIM) {
        objetivo = 1
      }
    }
  }
  energia.current = THREE.MathUtils.lerp(energia.current, objetivo, 0.15)
  // Corte a 0 exacto para que el useFrame pueda saltarse el trabajo en reposo.
  if (objetivo === 0 && energia.current < 0.005) energia.current = 0
  return energia.current
}

/**
 * Escribe el transform del grupo según el preset. Escribe SIEMPRE pos/rot/scale
 * completos (valores absolutos) para no dejar residuos al cambiar de preset.
 * `acum.ang` acumula el giro para que la velocidad no cambie la amplitud.
 */
export function aplicarPreset(
  g: THREE.Group,
  anim: AnimacionModelo,
  t: number,
  dt: number,
  energia: number,
  acum: { ang: number },
): void {
  const vel = anim.velocidad ?? 1
  const k = anim.intensidad ?? 1
  const e = energia
  let x = 0
  let y = 0
  let ry = 0
  let rz = 0
  let s = 1
  switch (anim.preset) {
    case 'girar':
      acum.ang += dt * 1.6 * vel * e
      ry = acum.ang
      break
    case 'flotar':
      y = (Math.sin(t * 2 * vel) * 0.5 + 0.5) * 0.35 * k * e
      break
    case 'pulsar':
      s = 1 + Math.sin(t * 3 * vel) * 0.08 * k * e
      break
    case 'mecerse':
      rz = Math.sin(t * 2.2 * vel) * 0.14 * k * e
      break
    case 'rebotar':
      y = Math.abs(Math.sin(t * 3.2 * vel)) * 0.3 * k * e
      break
    case 'temblar':
      ry = Math.sin(t * 28 * vel) * 0.05 * k * e
      x = Math.sin(t * 31 * vel) * 0.02 * k * e
      break
  }
  g.position.set(x, y, 0)
  g.rotation.set(0, ry, rz)
  g.scale.setScalar(s)
}

/**
 * Marcha del jugador (mutable, sin re-render): `Character` la escribe cada
 * frame y `AvatarModelo`/`Prendas` la leen para balancear extremidades y ropa
 * al caminar. La fase avanza con la distancia recorrida (no con el tiempo),
 * así la zancada corresponde al paso real y se detiene con el personaje.
 * `nadando`: en una alberca, moviéndose — brazada de crol en vez de caminar
 * (flotando quieto se queda en la pose de reposo, sin tocar esta bandera).
 */
export const marchaAvatar = { velocidad: 0, fase: 0, nadando: false }

/** Balanceo de piernas al caminar (radianes máximos). Brazos: `MARCHA_BRAZOS`. */
export const MARCHA_PIERNAS = 0.55
export const MARCHA_BRAZOS = 0.44

/**
 * Ángulo de balanceo de una extremidad en este frame: seno de la fase de
 * marcha escalado por el factor y la velocidad actual (0 en reposo). Cuerpo y
 * ropa lo leen por separado y quedan sincronizados sin compartir refs.
 */
export function anguloMarcha(factor: number): number {
  return Math.sin(marchaAvatar.fase) * factor * Math.min(1, marchaAvatar.velocidad)
}

/** La brazada gira más rápido que la zancada normal (molino continuo, no vaivén). */
const NADO_MULT_BRAZO = 2.2
const NADO_MULT_PIERNA = 3
const NADO_AMPL_PIERNA = 0.5

/**
 * Brazada de crol: el brazo gira en molino completo (no un vaivén acotado),
 * los dos desfasados medio ciclo para alternar. El izquierdo es la referencia
 * sin desfase; el derecho suma π.
 */
export function anguloBrazoNado(esIzquierdo: boolean): number {
  const base = marchaAvatar.fase * NADO_MULT_BRAZO
  return esIzquierdo ? base : base + Math.PI
}

/** Patada de nado (aleteo): piernas en oposición, más rápido que al caminar. */
export function anguloPiernaNado(esIzquierda: boolean): number {
  const p = Math.sin(marchaAvatar.fase * NADO_MULT_PIERNA) * NADO_AMPL_PIERNA
  return esIzquierda ? p : -p
}

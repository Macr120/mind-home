import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { Pieza3D } from '../chat/mascotas'
import { ModeloPiezas } from './modeloPersonalizado'
import { actualizarEnergia, aplicarPreset, type AnimacionModelo } from './animacion'

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
  children,
}: {
  anim?: AnimacionModelo
  /** Piso del objeto para el modo 'proximidad' (null = ignorar nivel). */
  nivel?: number | null
  children: React.ReactNode
}) {
  if (!anim?.preset || anim.activacion === 'apagado') return <>{children}</>
  return (
    <GrupoPresetActivo anim={anim} nivel={nivel}>
      {children}
    </GrupoPresetActivo>
  )
}

function GrupoPresetActivo({
  anim,
  nivel,
  children,
}: {
  anim: AnimacionModelo
  nivel: number | null
  children: React.ReactNode
}) {
  const group = useRef<THREE.Group>(null)
  const energia = useRef(0)
  const acum = useRef({ ang: 0 })

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const e = actualizarEnergia(g, anim, nivel, energia)
    // Con energía 0 las fórmulas dejan el transform en reposo (girar se congela
    // en su ángulo actual en vez de saltar a 0).
    aplicarPreset(g, anim, state.clock.elapsedTime, dt, e, acum.current)
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
}: {
  piezas: Pieza3D[]
  anim: AnimacionModelo
  nivel?: number | null
}) {
  const grupo = useRef<THREE.Group>(null)
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const energia = useRef(0)

  useFrame((state) => {
    const g = grupo.current
    const poses = anim.poses
    if (!g || !poses || poses.length < 2) return
    const e = actualizarEnergia(g, anim, nivel, energia)
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

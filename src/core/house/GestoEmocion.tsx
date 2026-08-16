import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { EmocionId } from '../chat/emociones'
import { useEmocionActiva } from '../state/emocionesStore'

/**
 * Gesto corporal que acompaña a la reacción emocional: envuelve el modelo del
 * asistente y anima posición/rotación/escala del grupo mientras la emoción está
 * activa, volviendo suave a la identidad al terminar. Funciona para TODAS las
 * formas (también las que no tienen rostro dibujado: mago, robot, GLB…).
 */
export function GestoEmocion({ asistenteId, children }: { asistenteId: string; children: ReactNode }) {
  const g = useRef<Group>(null)
  const emocion = useEmocionActiva(asistenteId)
  const previa = useRef<EmocionId | null>(null)
  const t0 = useRef(0)
  const quieto = useRef(true)

  useFrame(({ clock }, dt) => {
    const grupo = g.current
    if (!grupo) return
    if (emocion !== previa.current) {
      previa.current = emocion
      t0.current = clock.elapsedTime
      quieto.current = false
    }
    // Poda: sin emoción y ya en reposo, no hay nada que animar.
    if (!emocion && quieto.current) return

    const t = clock.elapsedTime - t0.current
    let x = 0
    let y = 0
    let rx = 0
    let rz = 0
    let esc = 1
    switch (emocion) {
      case 'felicidad':
        // Brinquitos: tres rebotes cortos.
        if (t < 1.5) y = Math.abs(Math.sin(t * Math.PI * 2)) * 0.16
        break
      case 'enojo':
        // Temblor lateral rápido con leve inclinación hacia el frente.
        if (t < 1.2) x = Math.sin(t * 40) * 0.03
        rx = 0.06
        break
      case 'sorpresa':
        // Salto único con «pop» de escala y leve retroceso.
        if (t < 0.5) {
          y = Math.sin((t / 0.5) * Math.PI) * 0.22
          esc = 1 + Math.sin((t / 0.5) * Math.PI) * 0.08
        }
        rx = -0.05
        break
      case 'aprobacion':
        // Asentimiento de cuerpo: dos reverencias cortas.
        if (t < 1.4) rx = Math.abs(Math.sin((t * Math.PI) / 0.7)) * 0.2
        break
      case 'gusto':
        // Balanceo suave sostenido.
        rz = Math.sin(t * 3) * 0.08
        break
      case 'tristeza':
        // Decaimiento: inclinación adelante sostenida + hundimiento leve.
        rx = 0.18
        y = -0.05
        break
    }

    const k = Math.min(1, dt * 14)
    grupo.position.x += (x - grupo.position.x) * k
    grupo.position.y += (y - grupo.position.y) * k
    grupo.rotation.x += (rx - grupo.rotation.x) * k
    grupo.rotation.z += (rz - grupo.rotation.z) * k
    grupo.scale.setScalar(grupo.scale.x + (esc - grupo.scale.x) * k)

    // Al volver a la identidad, encaja en cero y entra en reposo.
    if (
      !emocion &&
      Math.abs(grupo.position.x) < 0.001 &&
      Math.abs(grupo.position.y) < 0.001 &&
      Math.abs(grupo.rotation.x) < 0.001 &&
      Math.abs(grupo.rotation.z) < 0.001 &&
      Math.abs(grupo.scale.x - 1) < 0.001
    ) {
      grupo.position.set(0, 0, 0)
      grupo.rotation.set(0, 0, 0)
      grupo.scale.setScalar(1)
      quieto.current = true
    }
  })

  return <group ref={g}>{children}</group>
}

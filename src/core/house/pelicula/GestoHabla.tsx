import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { estadoActor } from '../../state/peliculaStore'

/**
 * Cabeceo de habla de un actor del modo película: envuelve el modelo y lo mece
 * con la energía que escribe el Director (la misma fórmula que el avatar del
 * Studio). Sirve para TODAS las formas, también las que no tienen boca dibujada
 * (mago, robot, GLB…). Grupo propio, aparte de `GestoEmocion`, que es dueño de
 * la rotación del suyo. Sin actor (o en reposo) no toca nada.
 */
export function GestoHabla({ id, children }: { id: string; children: ReactNode }) {
  const g = useRef<Group>(null)
  const quieto = useRef(true)
  useFrame(({ clock }) => {
    const grupo = g.current
    if (!grupo) return
    const a = estadoActor(id)
    const k = a?.energia ?? 0
    if (!a || k < 0.001) {
      if (!quieto.current) {
        grupo.rotation.set(0, 0, 0)
        quieto.current = true
      }
      return
    }
    quieto.current = false
    const t = clock.elapsedTime
    grupo.rotation.x = 0.05 * Math.sin(t * 2.3) * k + 0.05 * a.boca.current.nivel
    grupo.rotation.z = 0.03 * Math.sin(t * 1.3) * k
    grupo.rotation.y = 0.05 * Math.sin(t * 0.7) * k
  })
  return <group ref={g}>{children}</group>
}

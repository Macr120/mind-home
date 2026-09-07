import type { Avatar } from '../state/disenoStore'
import { COLOR_FORMA, type Asistente } from '../chat/mascotas'

/**
 * Qué cuerpo baila/hace ejercicio con el rig del gym (box-man con codos y
 * rodillas) y cuál se anima «libre» (ver `CuerpoLibre`): mascotas integradas,
 * piezas de IA/presets y .glb no tienen articulaciones que calcar.
 */
export function esHumanoideAvatar(av: Avatar): boolean {
  if (av.modeloGlb) return false
  if (av.modelo3d?.length) return av.cuerpoPresetId === 'base'
  return !av.forma
}

/** Un asistente solo es box-man con el preset «Base» (las piezas de `piezasBase`). */
export function esHumanoideAsistente(a: Asistente): boolean {
  return !a.modeloGlb && !!a.modelo3d?.length && a.cuerpoPresetId === 'base'
}

/**
 * `Avatar` equivalente de un asistente Base para el rig: colores de sus piezas
 * (piernas 0, torso 2, cabeza 5 en `piezasBase`). Sin escala: la pone el grupo
 * del asistente, y el rig la aplicaría dos veces.
 */
export function avatarDeAsistente(a: Asistente): Avatar {
  const piezas = a.modelo3d ?? []
  const torso = piezas[2]?.color ?? a.color ?? COLOR_FORMA[a.forma]
  return {
    cabeza: piezas[5]?.color ?? '#f2c79a',
    torso,
    piernas: piezas[0]?.color ?? torso,
    escala: 1,
    ropa: a.ropa ?? {},
    expresion: a.expresion,
    rostro: a.rostro,
    peinado: a.peinado,
    peloColor: a.peloColor,
  }
}

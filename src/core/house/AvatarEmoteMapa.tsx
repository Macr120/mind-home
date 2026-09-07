import { useMemo, useRef } from 'react'
import type * as THREE from 'three'
import type { Avatar } from '../state/disenoStore'
import { RigEjercicio } from '../../rooms/ejercicio/anim/RigEjercicio'
import { resolverPatron } from '../../rooms/ejercicio/anim/pose'
import { PATRONES_EMOTE } from './emotesPatrones'
import type { EmoteId } from './emotes'
import type { EstadoMarcha } from './animacion'
import { AvatarModelo } from './AvatarModelo'
import { CuerpoLibre } from './CuerpoLibre'
import { esHumanoideAvatar } from './actuacion'

/**
 * Emote elegido en la rueda («Bailar › Floss, 67…»): el personaje lo baila
 * donde está. Con el cuerpo de cubos usa el rig del gym (codos, rodillas y
 * tronco); con una mascota, piezas o .glb se mueve entero (`CuerpoLibre`).
 * Sustituye a `AvatarModelo` en `Character` mientras dure; moverse lo cancela
 * allí mismo (misma regla que el baile clásico). Lazy: arrastra el rig y los
 * patrones.
 */
export default function AvatarEmoteMapa({ av, emote }: { av: Avatar; emote: EmoteId }) {
  const patron = useMemo(() => resolverPatron(PATRONES_EMOTE[emote]), [emote])
  const marcha = useRef<EstadoMarcha>({ velocidad: 0, fase: 0 }).current
  const brazo = useRef<THREE.Group>(null)
  if (esHumanoideAvatar(av)) return <RigEjercicio av={av} patron={patron} jugando />
  return (
    <CuerpoLibre patron={patron} estado={marcha} brazoRef={brazo} escala={av.escala}>
      <AvatarModelo av={av} marchaEstado={marcha} brazoRef={brazo} />
    </CuerpoLibre>
  )
}

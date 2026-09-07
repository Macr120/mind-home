import { useMemo, useRef, type RefObject } from 'react'
import type * as THREE from 'three'
import type { Asistente } from '../chat/mascotas'
import type { Actuacion } from '../state/actuacionStore'
import type { ExpresionId } from './apariencia'
import type { BocaHabla } from './bocaHabla'
import type { EstadoMarcha } from './animacion'
import { RigEjercicio } from '../../rooms/ejercicio/anim/RigEjercicio'
import { patronDe } from '../../rooms/ejercicio/anim/resolver'
import { resolverPatron } from '../../rooms/ejercicio/anim/pose'
import { PATRONES_EMOTE } from './emotesPatrones'
import { CuerpoLibre } from './CuerpoLibre'
import { CuerpoAsistenteVivo } from './Asistente3D'
import { avatarDeAsistente, esHumanoideAsistente } from './actuacion'

/**
 * Un asistente bailando o haciendo un ejercicio en el mapa (pedido desde la
 * burbuja de cercanía o el chat). Con cuerpo Base usa el rig del gym; con
 * cualquier otro cuerpo se anima entero con `CuerpoLibre`. Lazy: arrastra el
 * rig y los patrones.
 */
export default function AsistenteActuando({
  asistente,
  actuacion,
  expresion,
  boca,
}: {
  asistente: Asistente
  actuacion: Actuacion
  expresion?: ExpresionId
  boca?: RefObject<BocaHabla>
}) {
  const patron = useMemo(
    () => (actuacion.tipo === 'emote' ? resolverPatron(PATRONES_EMOTE[actuacion.emote]) : patronDe(actuacion.nombre)),
    [actuacion],
  )
  const av = useMemo(() => avatarDeAsistente(asistente), [asistente])
  const marcha = useRef<EstadoMarcha>({ velocidad: 0, fase: 0 }).current
  const brazo = useRef<THREE.Group>(null)

  if (patron && esHumanoideAsistente(asistente)) return <RigEjercicio av={av} patron={patron} jugando />
  const cuerpo = <CuerpoAsistenteVivo asistente={asistente} brazo={brazo} marcha={marcha} expresion={expresion} boca={boca} />
  if (!patron) return cuerpo
  return (
    <CuerpoLibre patron={patron} estado={marcha} brazoRef={brazo}>
      {cuerpo}
    </CuerpoLibre>
  )
}

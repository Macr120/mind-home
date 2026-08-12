import { useShallow } from 'zustand/react/shallow'
import { DESCRIPCIONES, getPlantilla } from '../registry'
import { useDiseño } from '../state/disenoStore'
import { useT } from '../i18n/useT'

const SUBTITULO_FALLBACK: Record<string, string> = {
  recamara: 'Sueño y anécdotas',
  entretenimiento: 'Archivo y juegos de mesa',
  hobbies: 'Pasatiempos y proyectos',
}

/**
 * Título y subtítulo para la tarjeta del menú lateral.
 * `t` (opcional) traduce el subtítulo con la clave `room.<id>.sub`, usando el
 * texto en español calculado como fallback.
 */
export function tituloSubtituloCuarto(
  room: { id: string },
  nombre: string,
  t?: (clave: string, fallback?: string) => string,
) {
  const subT = (sub: string) => (t ? t(`room.${room.id}.sub`, sub) : sub)

  const sep = ' · '
  if (nombre.includes(sep)) {
    const i = nombre.indexOf(sep)
    return {
      titulo: nombre.slice(0, i),
      subtitulo: subT(nombre.slice(i + sep.length)),
    }
  }
  const corto = SUBTITULO_FALLBACK[room.id]
  if (corto) return { titulo: nombre, subtitulo: subT(corto) }
  const desc = DESCRIPCIONES[room.id]
  if (desc) {
    const primera = desc.split(':')[0]?.trim() || desc.split('.')[0]?.trim()
    return { titulo: nombre, subtitulo: subT(primera) }
  }
  return { titulo: nombre, subtitulo: '' }
}

/**
 * Nombre visible (y traducido) de un cuarto. Fuente única para menú lateral,
 * editor, planos y radar de progreso.
 *
 * - El nombre que el usuario puso a mano (`roomNames`) se respeta TAL CUAL: es
 *   suyo, no se traduce.
 * - El heredado de la app al asignarla (ver `adoptarIdentidad`) sí se traduce.
 *   La clave sale de la PLANTILLA (`room.<app>.nombre`), no del cuarto: los ids
 *   de cuarto son generados y nunca están en el diccionario.
 * - Si el cuarto se renombró por otra vía (chat), su texto ya no coincide con el
 *   de la plantilla y también se deja como está.
 */
export function useNombreCuarto() {
  const t = useT()
  const roomNames = useDiseño((s) => s.roomNames)
  // Primera app por cuarto (estable al mover objetos), como en el menú lateral.
  const appPorCuarto = useDiseño(
    useShallow((s) => {
      const m: Record<string, string> = {}
      for (const o of s.objetos) if (o.plantillaId && !(o.roomId in m)) m[o.roomId] = o.plantillaId
      return m
    }),
  )

  return (room: { id: string; nombre: string }) => {
    const propio = roomNames[room.id]
    if (propio) return propio
    const base = room.nombre.split(' · ')[0]
    const appId = appPorCuarto[room.id]
    const p = appId ? getPlantilla(appId) : undefined
    if (!p || p.nombre.split(' · ')[0] !== base) return base
    return t(`room.${appId}.nombre`, base).split(' · ')[0]
  }
}

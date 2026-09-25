import { limpiarConversacion } from '../data/repository'
import { useAsistentes } from '../state/asistentesStore'
import { useMascota } from '../state/mascotaStore'
import type { Asistente } from './mascotas'

/**
 * Los chats de la vista Asistentes son los asistentes que están en el mapa:
 * platicar con uno lo trae al mapa (y lo vuelve el activo, el que te sigue) y
 * borrar su conversación lo quita. Siempre queda al menos uno.
 */
export const enChat = (a: Asistente, activoId: string): boolean => a.enMapa || a.id === activoId

/** Trae al asistente al mapa y lo vuelve el activo; el anterior se queda de compañero. */
export async function traerAsistente(id: string): Promise<void> {
  const { lista, guardar } = useAsistentes.getState()
  const { mascota, setMascota } = useMascota.getState()
  const nuevo = lista.find((a) => a.id === id)
  if (!nuevo) return
  const previo = lista.find((a) => a.id === mascota)
  // El activo está en el mapa aunque no tenga `enMapa`: al dejar de serlo, se le pone.
  if (previo && previo.id !== id && !previo.enMapa) await guardar({ ...previo, enMapa: true })
  if (!nuevo.enMapa) await guardar({ ...nuevo, enMapa: true })
  if (mascota !== id) await setMascota(id)
}

/**
 * Borra la conversación y saca al asistente del mapa. Si era el único chat, solo
 * se vacía (false = se quedó).
 */
export async function borrarChat(id: string): Promise<boolean> {
  const { lista, guardar } = useAsistentes.getState()
  const { mascota, setMascota } = useMascota.getState()
  await limpiarConversacion(id)
  const quedan = lista.filter((a) => a.id !== id && enChat(a, mascota))
  const a = lista.find((x) => x.id === id)
  if (!a || quedan.length === 0) return false
  if (mascota === id) await setMascota(quedan[0].id)
  if (a.enMapa) await guardar({ ...a, enMapa: false })
  return true
}

import type { RoomModule } from '../registry'
import { DESCRIPCIONES } from '../registry'

const SUBTITULO_FALLBACK: Record<string, string> = {
  recamara: 'Sueño y anécdotas',
  entretenimiento: 'Archivo y juegos de mesa',
  configuraciones: 'Perfil y preferencias',
  diseno: 'Mapa y decoración',
}

/** Título y subtítulo para la tarjeta del menú lateral. */
export function tituloSubtituloCuarto(room: RoomModule, nombre: string) {
  const sep = ' · '
  if (nombre.includes(sep)) {
    const i = nombre.indexOf(sep)
    return {
      titulo: nombre.slice(0, i),
      subtitulo: nombre.slice(i + sep.length),
    }
  }
  const corto = SUBTITULO_FALLBACK[room.id]
  if (corto) return { titulo: nombre, subtitulo: corto }
  const desc = DESCRIPCIONES[room.id]
  if (desc) {
    const primera = desc.split(':')[0]?.trim() || desc.split('.')[0]?.trim()
    return { titulo: nombre, subtitulo: primera }
  }
  return { titulo: nombre, subtitulo: '' }
}

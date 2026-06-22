import { DESCRIPCIONES } from '../registry'

const SUBTITULO_FALLBACK: Record<string, string> = {
  recamara: 'Sueño y anécdotas',
  entretenimiento: 'Archivo y juegos de mesa',
  bodega: 'Inventario y archivo',
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

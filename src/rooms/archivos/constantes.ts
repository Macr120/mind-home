import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/** Color de la app (azul cielo, la nube). */
export const COLOR_FABRICA = '#38bdf8'
/**
 * Con el que se pinta la app: el color del CUARTO abierto (lo baja `RoomOverlay`
 * en `--ui-app`) y, fuera de él, el de fábrica.
 */
export const COLOR = `var(--ui-app, ${COLOR_FABRICA})`

/** Subidas en paralelo: más satura la conexión del móvil sin terminar antes. */
export const SUBIDAS_A_LA_VEZ = 2

/** Tope de la miniatura de las imágenes (px del lado mayor). */
export const LADO_MINIATURA = 256

/** Icono del catálogo según el tipo de archivo. */
export function iconoDeMime(mime: string): NombreIcono {
  if (mime.startsWith('image/')) return 'imagen'
  if (mime.startsWith('video/')) return 'pelicula'
  if (mime.startsWith('audio/')) return 'musica'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('text/')) return 'nota'
  return 'archivo'
}

import { registerPlugin } from '@capacitor/core'

/**
 * Qué canción suena AHORA en el teléfono (Spotify, YouTube Music, el navegador…).
 *
 * En la web esto es imposible: la captura de pantalla solo da la señal de audio
 * (ver `sistema.ts`). En Android sí: `MediaSessionManager` publica los metadatos
 * de la sesión de reproducción activa, pero solo se los entrega a una app que
 * tenga permiso de «Acceso a notificaciones» — por eso hay que pedirlo, y por
 * eso existe el `NotificationListenerService` vacío del lado Java.
 *
 * Fuera de Android todo devuelve `null`/`false` sin romper: `registerPlugin`
 * crea un proxy que lanzaría al llamarlo, así que ni se toca sin `esAppNativa()`.
 */

export interface CancionSistema {
  /** Nombre de la app que reproduce ('Spotify'); es su package si no hay etiqueta. */
  app: string
  titulo: string
  artista: string
  album: string
  /** Falso si está en pausa. */
  sonando: boolean
}

interface MediaSesionPlugin {
  hayPermiso(): Promise<{ valor: boolean }>
  pedirPermiso(): Promise<void>
  leer(): Promise<{ cancion: CancionSistema | null }>
  addListener(evento: 'cambio', cb: (d: { cancion: CancionSistema | null }) => void): Promise<{ remove: () => Promise<void> }>
}

const MediaSesion = registerPlugin<MediaSesionPlugin>('MediaSesion')

/**
 * ¿Se puede siquiera intentar? **Apagado desde el 21-ago-2026**: leer la sesión
 * de reproducción exige `BIND_NOTIFICATION_LISTENER_SERVICE`, un permiso que
 * Play revisa con lupa y que aquí solo servía para enseñar qué canción suena —
 * demasiado riesgo de rechazo para el primer envío. El plugin Java se retiró con
 * él; para revivirlo hay que restaurarlo de git, redeclarar el servicio en el
 * manifiesto, volver a poner `esAppNativa()` aquí y justificar el permiso en la
 * ficha de Play.
 */
export const hayMediaSesion = (): boolean => false

export async function permisoMediaSesion(): Promise<boolean> {
  if (!hayMediaSesion()) return false
  try {
    return (await MediaSesion.hayPermiso()).valor
  } catch {
    return false
  }
}

/** Abre los ajustes del sistema donde se concede «Acceso a notificaciones». */
export async function pedirPermisoMediaSesion(): Promise<void> {
  if (!hayMediaSesion()) return
  try {
    await MediaSesion.pedirPermiso()
  } catch {
    /* el usuario cerró los ajustes */
  }
}

export async function leerCancionSistema(): Promise<CancionSistema | null> {
  if (!hayMediaSesion()) return null
  try {
    return (await MediaSesion.leer()).cancion
  } catch {
    return null
  }
}

/**
 * Avisa cuando cambia la canción (el plugin escucha `onMetadataChanged`, así que
 * no hay sondeo). Devuelve la baja; en web no engancha nada.
 */
export function alCambiarCancion(cb: (c: CancionSistema | null) => void): () => void {
  if (!hayMediaSesion()) return () => {}
  let quitar: (() => Promise<void>) | null = null
  let vivo = true
  void MediaSesion.addListener('cambio', (d) => cb(d.cancion))
    .then((h) => {
      if (vivo) quitar = h.remove
      else void h.remove()
    })
    .catch(() => {})
  return () => {
    vivo = false
    void quitar?.()
  }
}

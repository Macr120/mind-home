import { useMascota } from './state/mascotaStore'

/**
 * La única puerta por la que sale un aviso. Hoy escribe en tres sitios (service
 * worker, Notification del navegador y la mascota); el día que la app corra en
 * Capacitor, `notificar` pasa a hablar con `@capacitor/local-notifications` y ni
 * las apps ni el reloj de avisos se enteran.
 *
 * Lo que NO puede hacer, para que conste: avisar con la app cerrada. Un service
 * worker no puede programar timers (el navegador lo mata a los ~30 s de
 * inactividad), `Notification Triggers` se retiró de Chrome, y `Periodic
 * Background Sync` deja la cadencia a criterio del navegador (~horas). Con la
 * pestaña abierta —aunque esté en segundo plano o la ventana minimizada— el aviso
 * sí llega; con la app cerrada haría falta Web Push, o sea servidor.
 */

export interface Aviso {
  /** Clave de deduplicación del día: `rutina:12|2026-07-15`, `meta:cocina|2026-07-15`. */
  clave: string
  titulo: string
  cuerpo: string
  /** App a la que lleva el clic en la notificación. */
  plantillaId?: string
  seccion?: string
  /** Rutina cuyo paso 0 marca el botón de registrar. */
  rutinaId?: number
  /** Abre el Wrapped de este periodo al tocar la notificación. */
  wrapped?: 'semana' | 'mes' | 'anio'
  /** Etiqueta del botón de registrar, ya traducida. Sin valor: solo se ofrece abrir. */
  accionRegistrar?: string
  /** Etiqueta del botón de abrir, ya traducida. */
  accionAbrir?: string
}

/** Un botón de la notificación. */
interface AccionNotif {
  action: string
  title: string
}

/**
 * `NotificationOptions` de TypeScript NO declara `actions`: está tipado contra el
 * constructor `Notification`, que efectivamente no las admite. Solo las acepta
 * `ServiceWorkerRegistration.showNotification`, que es a donde va esto.
 */
interface OpcionesConAcciones extends NotificationOptions {
  actions?: AccionNotif[]
}

export function permisoNotificaciones(): NotificationPermission | 'no-soportado' {
  if (!('Notification' in window)) return 'no-soportado'
  return Notification.permission
}

/**
 * Pide permiso al navegador. SOLO desde un gesto del usuario (un clic): pedirlo
 * desde el tick de un timer se ignora sin más.
 */
export async function pedirPermiso(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

/**
 * Lanza el aviso por el mejor canal disponible. El service worker va primero: su
 * notificación sobrevive con la pestaña en segundo plano, es la única clicable
 * (`notificationclick` en sw.js sabe abrir el cuarto) y **la única que admite
 * botones** — `actions` solo existe vía `showNotification`, nunca en el
 * constructor `Notification`.
 *
 * Los botones son mejora progresiva: Chrome muestra 2 como máximo y Firefox y
 * Safari los ignoran y pintan la notificación normal, cuyo clic sigue abriendo la
 * app. La vía garantizada es el banner de dentro de la app.
 *
 * La mascota habla SIEMPRE, aunque haya notificación: `decir` deja el mensaje en
 * `mensajesChat`, así que el aviso queda por escrito aunque no se viera la
 * burbuja (dentro de un cuarto no se pinta) ni se diera permiso al navegador.
 */
export async function notificar(a: Aviso): Promise<void> {
  useMascota.getState().decir(`${a.titulo} · ${a.cuerpo}`)

  if (permisoNotificaciones() !== 'granted') return
  const datos = {
    plantillaId: a.plantillaId,
    seccion: a.seccion,
    rutinaId: a.rutinaId,
    wrapped: a.wrapped,
  }
  // Chrome pinta 2 como máximo; el orden importa porque el resto se descarta.
  const acciones = [
    a.accionRegistrar && a.rutinaId != null
      ? { action: 'registrar', title: a.accionRegistrar }
      : null,
    a.accionAbrir && (a.plantillaId || a.wrapped)
      ? { action: 'abrir', title: a.accionAbrir }
      : null,
  ].filter((x): x is AccionNotif => x != null)

  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) {
      const opciones: OpcionesConAcciones = {
        body: a.cuerpo,
        tag: a.clave,
        data: datos,
        actions: acciones,
      }
      await reg.showNotification(a.titulo, opciones)
      return
    }
  } catch {
    /* sin service worker: queda la notificación simple de abajo */
  }
  // Sin `actions`: el constructor no los admite. El clic abre la app y ya.
  new Notification(a.titulo, { body: a.cuerpo, tag: a.clave })
}

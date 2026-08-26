import { useMascota } from './state/mascotaStore'
import { esAppNativa } from './plataforma'

/**
 * La única puerta por la que sale un aviso. Escribe en cuatro sitios: la mascota
 * siempre, y luego —según dónde corra— las notificaciones locales de Capacitor
 * (Android), el service worker o el `Notification` del navegador.
 *
 * **En el WebView de Android la Notification API del navegador no existe**, así
 * que sin la rama nativa la app publicada no daría un solo aviso: ni rutinas, ni
 * misiones, ni citas.
 *
 * Lo que NO puede hacer en la web, para que conste: avisar con la app cerrada. Un
 * service worker no puede programar timers (el navegador lo mata a los ~30 s de
 * inactividad), `Notification Triggers` se retiró de Chrome, y `Periodic
 * Background Sync` deja la cadencia a criterio del navegador (~horas). Con la
 * pestaña abierta —aunque esté en segundo plano o la ventana minimizada— el aviso
 * sí llega; con la app cerrada haría falta Web Push, o sea servidor. En Android
 * nativo esa limitación desaparece en cuanto el aviso se PROGRAMA con antelación,
 * que es el paso siguiente; hoy se emite en el momento, como en la web.
 */

/** Datos que viajan con el aviso y deciden a dónde lleva el toque. */
export interface DestinoAviso {
  plantillaId?: string
  seccion?: string
  rutinaId?: number
  wrapped?: 'semana' | 'mes' | 'anio'
  accion?: 'registrar'
}

type PluginNotifs = typeof import('@capacitor/local-notifications')['LocalNotifications']

/** El plugin, cargado bajo demanda: en web no debe entrar al bundle. */
async function plugin(): Promise<PluginNotifs> {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  return LocalNotifications
}

/**
 * Espejo síncrono del permiso nativo: `checkPermissions()` es asíncrono y
 * `permisoNotificaciones()` no puede serlo sin tocar a todos sus llamadores.
 * Lo refresca `iniciarAvisosNativos()` al arrancar y `pedirPermiso()` al conceder.
 */
let permisoNativo: NotificationPermission = 'default'

/**
 * Las notificaciones nativas se identifican por un entero, no por el `tag` de la
 * web. El hash de la clave hace de dedupe: el mismo aviso del mismo día reemplaza
 * al anterior en vez de apilarse.
 */
function idDeClave(clave: string): number {
  let h = 5381
  for (let i = 0; i < clave.length; i++) h = ((h << 5) + h + clave.charCodeAt(i)) | 0
  return Math.abs(h) % 2147483647
}

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
  /**
   * Quién lo dice. Sin valor habla el asistente activo, que es lo que pasaba
   * siempre: el aviso de la cocina lo daba quien tuvieras seleccionado en el chat,
   * no el asistente responsable de esa app.
   */
  asistenteId?: string
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
  if (esAppNativa()) return permisoNativo
  if (!('Notification' in window)) return 'no-soportado'
  return Notification.permission
}

/**
 * Pide permiso. SOLO desde un gesto del usuario (un clic): pedirlo desde el tick
 * de un timer se ignora sin más, y en Android 13+ el diálogo de POST_NOTIFICATIONS
 * solo se puede volver a mostrar un par de veces.
 */
export async function pedirPermiso(): Promise<boolean> {
  if (esAppNativa()) {
    try {
      const p = await plugin()
      const r = await p.requestPermissions()
      permisoNativo = r.display === 'granted' ? 'granted' : 'denied'
      return permisoNativo === 'granted'
    } catch {
      return false
    }
  }
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

/**
 * Arranca las notificaciones nativas: sincroniza el espejo del permiso y engancha
 * el toque. `alTocar` es el MISMO manejador que usa el service worker en la web
 * (main.tsx), para que un aviso lleve al mismo sitio en las dos plataformas.
 */
export async function iniciarAvisosNativos(alTocar: (d: DestinoAviso) => void): Promise<void> {
  if (!esAppNativa()) return
  try {
    const p = await plugin()
    permisoNativo = (await p.checkPermissions()).display === 'granted' ? 'granted' : 'default'
    await p.addListener('localNotificationActionPerformed', (e) => {
      alTocar((e.notification.extra ?? {}) as DestinoAviso)
    })
  } catch (err) {
    console.warn('[MPH] No se pudieron iniciar las notificaciones nativas:', err)
  }
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
  useMascota.getState().decir(`${a.titulo} · ${a.cuerpo}`, { asistenteId: a.asistenteId })

  if (permisoNotificaciones() !== 'granted') return
  const datos: DestinoAviso = {
    plantillaId: a.plantillaId,
    seccion: a.seccion,
    rutinaId: a.rutinaId,
    wrapped: a.wrapped,
  }

  // Android: notificación del sistema de verdad. Sin botones a propósito —
  // exigen registrar `actionTypes` al arrancar y el toque ya abre la app en el
  // sitio correcto, que es lo que importa para la v1.
  if (esAppNativa()) {
    try {
      const p = await plugin()
      await p.schedule({
        notifications: [{ id: idDeClave(a.clave), title: a.titulo, body: a.cuerpo, extra: datos }],
      })
    } catch (err) {
      console.warn('[MPH] No se pudo lanzar el aviso nativo:', err)
    }
    return
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
    // `getRegistration()` y no `.ready`: bajo el protocolo `app://` del
    // escritorio (Electron) `.ready` NUNCA resuelve —aunque el worker esté
    // activo y controlando— y este await se quedaba colgado con el fallback
    // inalcanzable: ni un aviso salía. `getRegistration()` responde en todas
    // partes; si aún no hay worker activo, cae a la notificación simple.
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg?.active) {
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

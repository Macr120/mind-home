/*
 * Service worker de Mind Home.
 *
 * NO CACHEA NADA, y es deliberado: existe solo para que las notificaciones
 * sobrevivan con la pestaña en segundo plano y para saber a dónde llevar al
 * tocarlas. Sin handler de `fetch` no hay forma de que sirva un JS viejo, que es
 * la clase de fallo que se depura durante horas culpando al código.
 *
 * Lo que este archivo NO puede hacer, para que nadie lo intente: programar un
 * aviso a futuro. El navegador termina el worker a los ~30 s de inactividad, así
 * que un `setTimeout` de ocho horas aquí dentro no existe. Avisar con la app
 * cerrada necesita Web Push (servidor + VAPID) o, en móvil, las notificaciones
 * locales de Capacitor. El hueco para lo primero está abajo.
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

/**
 * Tocar la notificación (o uno de sus botones) le dice a la app qué hacer. Si ya
 * hay una ventana se reusa (`postMessage`); si no, se abre una con la intención en
 * la URL, que main.tsx lee al arrancar.
 *
 * Este worker NO registra nada por su cuenta, y no es pereza: escribir la sesión
 * exige Dexie, el esquema de captura y el registro de plantillas — todo código de
 * la app. Aquí solo se transmite la intención; registra la página.
 */
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const datos = e.notification.data || {}
  // Sin botón (clic en el cuerpo) la intención es abrir, como siempre.
  const accion = e.action || 'abrir'
  e.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const c of clientes) {
        if ('focus' in c) {
          c.postMessage({
            tipo: 'abrir-app',
            accion,
            plantillaId: datos.plantillaId,
            seccion: datos.seccion,
            rutinaId: datos.rutinaId,
            wrapped: datos.wrapped,
          })
          // Registrar de un toque no debería arrastrarte dentro de la app: era un
          // toque para quitártelo de encima, no para ponerte a mirar la pantalla.
          return accion === 'registrar' ? undefined : c.focus()
        }
      }
      const params = new URLSearchParams()
      if (datos.plantillaId) params.set('app', datos.plantillaId)
      if (datos.seccion) params.set('seccion', datos.seccion)
      if (datos.wrapped) params.set('wrapped', datos.wrapped)
      if (accion === 'registrar' && datos.rutinaId != null) {
        params.set('accion', 'registrar')
        params.set('rutina', String(datos.rutinaId))
      }
      const query = params.toString()
      return self.clients.openWindow(query ? `/?${query}` : '/')
    })(),
  )
})

// Punto de extensión para cuando exista el backend: con Web Push, el servidor
// manda el aviso y ESTO sí despierta la app cerrada. Hoy no hay a quién
// suscribirse, así que los handlers quedan a la vista pero vacíos.
// self.addEventListener('push', (e) => { … })
// self.addEventListener('pushsubscriptionchange', (e) => { … })

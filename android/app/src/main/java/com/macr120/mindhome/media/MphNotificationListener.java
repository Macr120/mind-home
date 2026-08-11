package com.macr120.mindhome.media;

import android.service.notification.NotificationListenerService;

/**
 * Servicio VACÍO a propósito: no lee ni una notificación.
 *
 * Existe solo porque `MediaSessionManager.getActiveSessions()` exige el
 * `ComponentName` de un listener de notificaciones habilitado — es la forma que
 * tiene Android de exigir consentimiento explícito para ver qué se reproduce.
 * Sin este cascarón declarado en el manifiesto, la llamada lanza
 * `SecurityException` aunque el usuario conceda el permiso.
 */
public class MphNotificationListener extends NotificationListenerService {
}

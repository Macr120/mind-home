package com.macr120.mindhome.media;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.provider.Settings;
import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

/**
 * Plugin Capacitor local «MediaSesion»: qué canción suena en el teléfono.
 *
 * Lo pregunta al `MediaSessionManager`, que publica los metadatos de cualquier
 * app que esté reproduciendo (Spotify, YouTube Music, el navegador…). El sistema
 * solo se los da a quien tenga «Acceso a notificaciones», de ahí `hayPermiso` /
 * `pedirPermiso` y el servicio vacío `MphNotificationListener`.
 *
 * Java no decide nada: entrega los metadatos y avisa cuando cambian. Quien elige
 * qué enseñar es la UI (`core/audio/mediaSesion.ts`).
 */
@CapacitorPlugin(name = "MediaSesion")
public class MediaSesionPlugin extends Plugin {

  /** Controlador vigilado ahora mismo, para poder soltar su callback. */
  private MediaController vigilado;
  private MediaController.Callback callback;
  private MediaSessionManager.OnActiveSessionsChangedListener alCambiarSesiones;

  @PluginMethod
  public void hayPermiso(PluginCall call) {
    JSObject r = new JSObject();
    r.put("valor", permisoConcedido());
    call.resolve(r);
  }

  @PluginMethod
  public void pedirPermiso(PluginCall call) {
    Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(i);
    call.resolve();
  }

  @PluginMethod
  public void leer(PluginCall call) {
    JSObject r = new JSObject();
    r.put("cancion", cancionActual());
    // Aprovecha la llamada para (re)engancharse a la sesión que suene ahora.
    vigilar();
    call.resolve(r);
  }

  /** ¿Está nuestro listener de notificaciones habilitado por el usuario? */
  private boolean permisoConcedido() {
    String activos = Settings.Secure.getString(
      getContext().getContentResolver(), "enabled_notification_listeners");
    if (TextUtils.isEmpty(activos)) return false;
    return activos.contains(getContext().getPackageName());
  }

  private MediaSessionManager gestor() {
    return (MediaSessionManager) getContext().getSystemService(Context.MEDIA_SESSION_SERVICE);
  }

  private ComponentName listener() {
    return new ComponentName(getContext(), MphNotificationListener.class);
  }

  /** La sesión que está sonando; si ninguna suena, la primera que haya. */
  private MediaController sesionActiva() {
    if (!permisoConcedido()) return null;
    MediaSessionManager m = gestor();
    if (m == null) return null;
    try {
      List<MediaController> sesiones = m.getActiveSessions(listener());
      if (sesiones == null || sesiones.isEmpty()) return null;
      for (MediaController c : sesiones) {
        PlaybackState e = c.getPlaybackState();
        if (e != null && e.getState() == PlaybackState.STATE_PLAYING) return c;
      }
      return sesiones.get(0);
    } catch (SecurityException e) {
      // El permiso se revocó entre la comprobación y la llamada.
      return null;
    }
  }

  private JSObject cancionActual() {
    MediaController c = sesionActiva();
    if (c == null) return null;
    MediaMetadata meta = c.getMetadata();
    if (meta == null) return null;
    String titulo = texto(meta, MediaMetadata.METADATA_KEY_TITLE);
    if (titulo.isEmpty()) return null; // sin título no hay nada que enseñar
    PlaybackState estado = c.getPlaybackState();
    JSObject o = new JSObject();
    o.put("app", nombreApp(c.getPackageName()));
    o.put("titulo", titulo);
    o.put("artista", texto(meta, MediaMetadata.METADATA_KEY_ARTIST));
    o.put("album", texto(meta, MediaMetadata.METADATA_KEY_ALBUM));
    o.put("sonando", estado != null && estado.getState() == PlaybackState.STATE_PLAYING);
    return o;
  }

  private String texto(MediaMetadata meta, String clave) {
    CharSequence v = meta.getText(clave);
    return v == null ? "" : v.toString();
  }

  /** Nombre visible de la app ('Spotify'); su package si no se puede resolver. */
  private String nombreApp(String paquete) {
    if (paquete == null) return "";
    try {
      PackageManager pm = getContext().getPackageManager();
      ApplicationInfo info = pm.getApplicationInfo(paquete, 0);
      return pm.getApplicationLabel(info).toString();
    } catch (PackageManager.NameNotFoundException e) {
      return paquete;
    }
  }

  /** Emite el evento `cambio` con lo que suene ahora. */
  private void emitir() {
    JSObject datos = new JSObject();
    datos.put("cancion", cancionActual());
    notifyListeners("cambio", datos);
  }

  /**
   * Se engancha a la sesión activa para avisar sin sondear: al cambiar de
   * canción (`onMetadataChanged`), al pausar (`onPlaybackStateChanged`) y al
   * cambiar de app reproductora (listener del gestor).
   */
  private void vigilar() {
    if (!permisoConcedido()) return;
    MediaController actual = sesionActiva();
    if (actual == null || (vigilado != null && vigilado.getSessionToken().equals(actual.getSessionToken()))) {
      return; // ya vigilamos esa misma sesión (o no hay ninguna)
    }
    soltarControlador();
    vigilado = actual;
    callback = new MediaController.Callback() {
      @Override
      public void onMetadataChanged(MediaMetadata metadata) {
        emitir();
      }

      @Override
      public void onPlaybackStateChanged(PlaybackState state) {
        emitir();
      }

      @Override
      public void onSessionDestroyed() {
        soltarControlador();
        vigilar();
        emitir();
      }
    };
    vigilado.registerCallback(callback);

    if (alCambiarSesiones == null) {
      MediaSessionManager m = gestor();
      if (m == null) return;
      alCambiarSesiones = controllers -> {
        vigilar();
        emitir();
      };
      try {
        m.addOnActiveSessionsChangedListener(alCambiarSesiones, listener());
      } catch (SecurityException e) {
        alCambiarSesiones = null;
      }
    }
  }

  private void soltarControlador() {
    if (vigilado != null && callback != null) vigilado.unregisterCallback(callback);
    vigilado = null;
    callback = null;
  }

  @Override
  protected void handleOnDestroy() {
    soltarControlador();
    MediaSessionManager m = gestor();
    if (m != null && alCambiarSesiones != null) {
      m.removeOnActiveSessionsChangedListener(alCambiarSesiones);
      alCambiarSesiones = null;
    }
    super.handleOnDestroy();
  }
}

package com.macr120.mindhome.widgets;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

/**
 * Único punto de acceso a las SharedPreferences de los widgets. Sincronizado con
 * un lock de clase: el RemoteViewsFactory corre en hilos binder, y el receiver
 * de taps y el plugin (WebView) pueden escribir a la vez.
 *
 * Claves:
 *  - snapshot:   JSON que publica la app (SnapshotWidgets de src/core/widgets/tipos.ts)
 *  - acciones:   cola JSON de AccionWidget que dejaron los taps (FIFO, tope 200)
 *  - optimistas: accionId -> {id, hecho, ts}; solo para PINTAR mientras la app
 *                no aplica la cola. Los poda publicarSnapshot.
 */
final class WidgetsStore {

  private static final String PREFS = "mph_widgets";
  private static final String CLAVE_SNAPSHOT = "snapshot";
  private static final String CLAVE_ACCIONES = "acciones";
  private static final String CLAVE_OPTIMISTAS = "optimistas";
  private static final String CLAVE_DESTINO = "destino";
  private static final int MAX_ACCIONES = 200;

  private static final Object LOCK = new Object();

  private WidgetsStore() {}

  private static SharedPreferences prefs(Context ctx) {
    return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  }

  static String leerSnapshot(Context ctx) {
    synchronized (LOCK) {
      return prefs(ctx).getString(CLAVE_SNAPSHOT, null);
    }
  }

  static void guardarSnapshot(Context ctx, String json) {
    synchronized (LOCK) {
      prefs(ctx).edit().putString(CLAVE_SNAPSHOT, json).apply();
    }
  }

  /** Encola la acción de un tap (FIFO con tope) y apunta su optimista. */
  static void encolarAccion(Context ctx, JSONObject accion) {
    synchronized (LOCK) {
      try {
        JSONArray cola = new JSONArray(prefs(ctx).getString(CLAVE_ACCIONES, "[]"));
        cola.put(accion);
        // Tope: se descartan las MÁS VIEJAS (si la app no se abre en 200 taps,
        // perder las primeras es el mal menor).
        while (cola.length() > MAX_ACCIONES) {
          cola.remove(0);
        }
        JSONObject optimistas = new JSONObject(prefs(ctx).getString(CLAVE_OPTIMISTAS, "{}"));
        JSONObject marca = new JSONObject();
        marca.put("id", accion.getString("id"));
        marca.put("hecho", accion.getBoolean("hecho"));
        marca.put("ts", accion.getLong("ts"));
        optimistas.put(accion.getString("accionId"), marca);
        prefs(ctx)
            .edit()
            .putString(CLAVE_ACCIONES, cola.toString())
            .putString(CLAVE_OPTIMISTAS, optimistas.toString())
            .apply();
      } catch (JSONException ignorada) {
        // Una acción malformada no debe tumbar el widget: se pierde ese tap.
      }
    }
  }

  /** Devuelve la cola como JSON y la VACÍA, en la misma sección crítica. */
  static String tomarAcciones(Context ctx) {
    synchronized (LOCK) {
      String cola = prefs(ctx).getString(CLAVE_ACCIONES, "[]");
      prefs(ctx).edit().putString(CLAVE_ACCIONES, "[]").apply();
      return cola;
    }
  }

  /** Optimistas vigentes (accionId -> {id, hecho, ts}), para pintar la lista. */
  static JSONObject leerOptimistas(Context ctx) {
    synchronized (LOCK) {
      try {
        return new JSONObject(prefs(ctx).getString(CLAVE_OPTIMISTAS, "{}"));
      } catch (JSONException e) {
        return new JSONObject();
      }
    }
  }

  /** Destino del toque en un widget ({appId, seccion, accion}), hasta que el WebView lo tome. */
  static void guardarDestino(Context ctx, JSONObject destino) {
    synchronized (LOCK) {
      prefs(ctx).edit().putString(CLAVE_DESTINO, destino.toString()).apply();
    }
  }

  /** Devuelve el destino y lo BORRA, o null si no hay ninguno pendiente. */
  static JSONObject tomarDestino(Context ctx) {
    synchronized (LOCK) {
      String crudo = prefs(ctx).getString(CLAVE_DESTINO, null);
      if (crudo == null) return null;
      prefs(ctx).edit().remove(CLAVE_DESTINO).apply();
      try {
        return new JSONObject(crudo);
      } catch (JSONException e) {
        return null;
      }
    }
  }

  /**
   * Foto de la casa. Va a un archivo y no a SharedPreferences: son decenas de KB
   * de JPEG que se reescriben cada vez que cambia la casa.
   */
  static File archivoFotoCasa(Context ctx) {
    return new File(ctx.getFilesDir(), "casa.jpg");
  }

  static void guardarFotoCasa(Context ctx, byte[] datos) throws IOException {
    synchronized (LOCK) {
      try (FileOutputStream salida = new FileOutputStream(archivoFotoCasa(ctx))) {
        salida.write(datos);
      }
    }
  }

  /**
   * Poda de optimistas los accionId que ya NO están en la cola: la app ya los
   * aplicó y el snapshot recién publicado trae la verdad. Los encolados durante
   * la aplicación sobreviven a la poda.
   */
  static void podarOptimistas(Context ctx) {
    synchronized (LOCK) {
      try {
        JSONArray cola = new JSONArray(prefs(ctx).getString(CLAVE_ACCIONES, "[]"));
        Set<String> vivos = new HashSet<>();
        for (int i = 0; i < cola.length(); i++) {
          vivos.add(cola.getJSONObject(i).getString("accionId"));
        }
        JSONObject optimistas = new JSONObject(prefs(ctx).getString(CLAVE_OPTIMISTAS, "{}"));
        JSONObject podados = new JSONObject();
        for (Iterator<String> it = optimistas.keys(); it.hasNext(); ) {
          String accionId = it.next();
          if (vivos.contains(accionId)) {
            podados.put(accionId, optimistas.get(accionId));
          }
        }
        prefs(ctx).edit().putString(CLAVE_OPTIMISTAS, podados.toString()).apply();
      } catch (JSONException ignorada) {
        // Peor caso: optimistas de más hasta la próxima publicación.
      }
    }
  }
}

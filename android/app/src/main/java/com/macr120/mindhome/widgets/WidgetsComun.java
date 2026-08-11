package com.macr120.mindhome.widgets;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import com.macr120.mindhome.MainActivity;

/** Lo que comparten todos los widgets: leer el snapshot y armar sus PendingIntent. */
final class WidgetsComun {

  private WidgetsComun() {}

  /** El snapshot publicado por la app, o null si aún no hay ninguno. */
  static JSONObject leerSnapshot(Context ctx) {
    String crudo = WidgetsStore.leerSnapshot(ctx);
    if (crudo == null) return null;
    try {
      return new JSONObject(crudo);
    } catch (JSONException e) {
      return null;
    }
  }

  /** Textos ya localizados del snapshot (nunca null, para no repetir guardas). */
  static JSONObject textos(JSONObject snapshot) {
    JSONObject textos = snapshot == null ? null : snapshot.optJSONObject("textos");
    return textos == null ? new JSONObject() : textos;
  }

  /** Fecha local yyyy-MM-dd del sistema (mismo formato que hoyISO() de la app). */
  static String hoy() {
    return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
  }

  /** ¿El snapshot es de un día anterior? (el widget lo avisa en vez de mentir) */
  static boolean desactualizado(JSONObject snapshot) {
    return snapshot != null && !hoy().equals(snapshot.optString("fecha"));
  }

  static PendingIntent abrirApp(Context ctx) {
    return haciaLaApp(ctx, 0, new Intent(ctx, MainActivity.class));
  }

  /** Abre la app en la app (plantilla) indicada: extras que lee WidgetsPlugin. */
  static PendingIntent abrirEn(Context ctx, int requestCode, String appId) {
    Intent abrir = new Intent(ctx, MainActivity.class);
    abrir.putExtra("mph_app", appId);
    return haciaLaApp(ctx, requestCode, abrir);
  }

  /** Abre la app ejecutando una acción global ('chat', 'chat-foto', 'chat-voz'). */
  static PendingIntent abrirAccion(Context ctx, int requestCode, String accion) {
    Intent abrir = new Intent(ctx, MainActivity.class);
    abrir.putExtra("mph_accion", accion);
    return haciaLaApp(ctx, requestCode, abrir);
  }

  /**
   * El requestCode debe ser DISTINTO por destino: con el mismo,
   * FLAG_UPDATE_CURRENT fundiría los PendingIntent (filterEquals ignora los
   * extras) y todos los botones acabarían abriendo el último destino.
   */
  private static PendingIntent haciaLaApp(Context ctx, int requestCode, Intent abrir) {
    return PendingIntent.getActivity(
        ctx, requestCode, abrir, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
  }
}

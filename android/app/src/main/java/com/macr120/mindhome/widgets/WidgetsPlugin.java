package com.macr120.mindhome.widgets;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;

import com.macr120.mindhome.R;

/**
 * Plugin Capacitor local «Widgets»: el puente entre el WebView (src/core/widgets/)
 * y los widgets del launcher. Java nunca decide negocio — guarda lo que la app
 * publica y le entrega lo que el widget encoló.
 */
@CapacitorPlugin(name = "Widgets")
public class WidgetsPlugin extends Plugin {

  /** Arranque en frío desde el toque en un widget: el Intent ya trae los extras. */
  @Override
  public void load() {
    guardarDestinoDe(getActivity().getIntent());
  }

  /** App ya viva (singleTask): el toque llega por onNewIntent. */
  @Override
  protected void handleOnNewIntent(Intent intent) {
    super.handleOnNewIntent(intent);
    guardarDestinoDe(intent);
  }

  private void guardarDestinoDe(Intent intent) {
    if (intent == null) return;
    String app = intent.getStringExtra("mph_app");
    String accion = intent.getStringExtra("mph_accion");
    if (app == null && accion == null) return;
    try {
      JSONObject destino = new JSONObject();
      if (app != null) destino.put("appId", app);
      if (accion != null) destino.put("accion", accion);
      String seccion = intent.getStringExtra("mph_seccion");
      if (seccion != null) destino.put("seccion", seccion);
      WidgetsStore.guardarDestino(getContext(), destino);
    } catch (JSONException ignorada) {
      return;
    }
    // Que una recreación de la Activity (rotación) no repita el destino.
    intent.removeExtra("mph_app");
    intent.removeExtra("mph_seccion");
    intent.removeExtra("mph_accion");
  }

  /** Destino del último toque en un widget ({} si no hay); leerlo lo consume. */
  @PluginMethod
  public void tomarDestinoPendiente(PluginCall call) {
    JSONObject destino = WidgetsStore.tomarDestino(getContext());
    JSObject res = new JSObject();
    if (destino != null) {
      if (destino.has("appId")) res.put("appId", destino.optString("appId"));
      if (destino.has("seccion")) res.put("seccion", destino.optString("seccion"));
      if (destino.has("accion")) res.put("accion", destino.optString("accion"));
    }
    call.resolve(res);
  }

  /** Guarda el snapshot, poda optimistas ya aplicados y repinta los widgets. */
  @PluginMethod
  public void publicarSnapshot(PluginCall call) {
    String json = call.getString("json");
    if (json == null) {
      call.reject("Falta json");
      return;
    }
    Context ctx = getContext();
    WidgetsStore.guardarSnapshot(ctx, json);
    WidgetsStore.podarOptimistas(ctx);
    repintarTodos(ctx);
    call.resolve();
  }

  /** Guarda la foto de la casa (JPEG en base64) y repinta su widget. */
  @PluginMethod
  public void publicarFotoCasa(PluginCall call) {
    String base64 = call.getString("base64");
    if (base64 == null) {
      call.reject("Falta base64");
      return;
    }
    Context ctx = getContext();
    try {
      WidgetsStore.guardarFotoCasa(ctx, Base64.decode(base64, Base64.DEFAULT));
    } catch (IOException | IllegalArgumentException e) {
      call.reject("No se pudo guardar la foto de la casa", e);
      return;
    }
    AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
    for (int id : ids(ctx, mgr, CasaWidgetProvider.class)) {
      CasaWidgetProvider.pintar(ctx, mgr, id);
    }
    call.resolve();
  }

  /** Qué widgets hay colocados: si ninguno, la app ni arma el snapshot. */
  @PluginMethod
  public void hayWidgets(PluginCall call) {
    Context ctx = getContext();
    AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
    boolean casa = ids(ctx, mgr, CasaWidgetProvider.class).length > 0;
    boolean hoy = ids(ctx, mgr, HoyWidgetProvider.class).length > 0;
    JSObject res = new JSObject();
    // El de chat no cuenta: es un lanzador puro, no consume datos de la app.
    res.put("hay", casa || hoy);
    res.put("casa", casa);
    call.resolve(res);
  }

  /** Devuelve la cola de acciones y la vacía (atómico en WidgetsStore). */
  @PluginMethod
  public void tomarAccionesPendientes(PluginCall call) {
    try {
      JSObject res = new JSObject();
      res.put("acciones", new JSArray(WidgetsStore.tomarAcciones(getContext())));
      call.resolve(res);
    } catch (JSONException e) {
      call.reject("Cola de acciones ilegible", e);
    }
  }

  private static int[] ids(Context ctx, AppWidgetManager mgr, Class<?> provider) {
    return mgr.getAppWidgetIds(new ComponentName(ctx, provider));
  }

  /** Repinta los widgets que viven del snapshot y recarga la lista de «Hoy». */
  static void repintarTodos(Context ctx) {
    AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
    for (int id : ids(ctx, mgr, CasaWidgetProvider.class)) {
      CasaWidgetProvider.pintar(ctx, mgr, id);
    }
    int[] hoy = ids(ctx, mgr, HoyWidgetProvider.class);
    for (int id : hoy) {
      HoyWidgetProvider.pintar(ctx, mgr, id);
    }
    mgr.notifyAppWidgetViewDataChanged(hoy, R.id.widget_hoy_lista);
  }
}

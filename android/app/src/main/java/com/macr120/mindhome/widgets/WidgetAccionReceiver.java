package com.macr120.mindhome.widgets;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.UUID;

import com.macr120.mindhome.R;

/**
 * Recibe los taps de las filas del widget «Hoy». No ejecuta negocio: encola la
 * acción con estado destino (idempotente) y repinta la lista, que la mostrará
 * en optimista hasta que la app se abra, aplique la cola con la lógica real y
 * re-publique el snapshot.
 */
public class WidgetAccionReceiver extends BroadcastReceiver {

  static final String ACCION = "com.macr120.mindhome.widgets.ACCION";

  @Override
  public void onReceive(Context ctx, Intent intent) {
    if (!ACCION.equals(intent.getAction())) return;
    String id = intent.getStringExtra("id");
    String tipo = intent.getStringExtra("tipo");
    String fecha = intent.getStringExtra("fecha");
    if (id == null || tipo == null || fecha == null) return;

    try {
      JSONObject accion = new JSONObject();
      accion.put("accionId", UUID.randomUUID().toString());
      accion.put("id", id);
      accion.put("tipo", tipo);
      accion.put("fecha", fecha);
      accion.put("hecho", intent.getBooleanExtra("hecho", true));
      accion.put("ts", System.currentTimeMillis());
      WidgetsStore.encolarAccion(ctx, accion);
    } catch (JSONException e) {
      return;
    }

    AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
    int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, HoyWidgetProvider.class));
    mgr.notifyAppWidgetViewDataChanged(ids, R.id.widget_hoy_lista);
  }
}

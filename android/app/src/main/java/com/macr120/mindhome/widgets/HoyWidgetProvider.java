package com.macr120.mindhome.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import com.macr120.mindhome.R;

/**
 * Widget «Hoy»: la checklist del día (rutinas/eventos del calendario y metas
 * diarias por app), palomeable desde el launcher. Las filas las sirve
 * HoyWidgetService; los taps disparan WidgetAccionReceiver vía la plantilla de
 * PendingIntent (MUTABLE: el fill-in de cada fila necesita aplicarse).
 */
public class HoyWidgetProvider extends AppWidgetProvider {

  @Override
  public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
    for (int id : ids) {
      pintar(ctx, mgr, id);
    }
    // updatePeriodMillis (30 min) pasa por aquí: re-lee el snapshot y refresca
    // el estado «desactualizado» tras la medianoche con la app cerrada.
    mgr.notifyAppWidgetViewDataChanged(ids, R.id.widget_hoy_lista);
  }

  static void pintar(Context ctx, AppWidgetManager mgr, int widgetId) {
    RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_hoy);
    JSONObject snap = WidgetsComun.leerSnapshot(ctx);
    JSONObject textos = WidgetsComun.textos(snap);

    rv.setTextViewText(
        R.id.widget_hoy_titulo,
        snap != null ? textos.optString("titulo") : ctx.getString(R.string.app_name));
    rv.setTextViewText(R.id.widget_hoy_fecha, textos.optString("fechaLarga"));
    rv.setTextViewText(R.id.widget_hoy_metas, textos.optString("metas"));

    boolean viejo = WidgetsComun.desactualizado(snap);
    rv.setTextViewText(R.id.widget_hoy_desactualizado, textos.optString("desactualizado"));
    rv.setViewVisibility(R.id.widget_hoy_desactualizado, viejo ? View.VISIBLE : View.GONE);

    // Vacío: sin snapshot aún (abre la app) o con el día en blanco (nada agendado).
    rv.setTextViewText(
        R.id.widget_hoy_vacio,
        snap != null ? textos.optString("vacio") : ctx.getString(R.string.widget_vacio));

    // Adapter de la lista; el data Uri hace único el Intent por widget.
    Intent svc = new Intent(ctx, HoyWidgetService.class);
    svc.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
    svc.setData(Uri.parse(svc.toUri(Intent.URI_INTENT_SCHEME)));
    rv.setRemoteAdapter(R.id.widget_hoy_lista, svc);
    rv.setEmptyView(R.id.widget_hoy_lista, R.id.widget_hoy_vacio);

    // Plantilla de los taps de las filas (el fill-in exige FLAG_MUTABLE).
    Intent tpl = new Intent(ctx, WidgetAccionReceiver.class).setAction(WidgetAccionReceiver.ACCION);
    PendingIntent plantilla =
        PendingIntent.getBroadcast(
            ctx, 0, tpl, PendingIntent.FLAG_MUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    rv.setPendingIntentTemplate(R.id.widget_hoy_lista, plantilla);

    // La cabecera (y el estado vacío) abren la app.
    rv.setOnClickPendingIntent(R.id.widget_hoy_cabecera, WidgetsComun.abrirApp(ctx));
    rv.setOnClickPendingIntent(R.id.widget_hoy_vacio, WidgetsComun.abrirApp(ctx));

    mgr.updateAppWidget(widgetId, rv);
  }
}

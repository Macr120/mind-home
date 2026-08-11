package com.macr120.mindhome.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

import com.macr120.mindhome.R;

/**
 * Widget «Chat»: lanzador de los tres accesos al chat de la casa. No lee el
 * snapshot —sus textos son fijos— así que funciona desde el primer arranque.
 *
 * Cada botón necesita su propio requestCode: con el mismo, FLAG_UPDATE_CURRENT
 * fundiría los tres PendingIntent en uno (filterEquals ignora los extras).
 */
public class ChatWidgetProvider extends AppWidgetProvider {

  private static final int PI_CHAT = 10;
  private static final int PI_CAMARA = 11;
  private static final int PI_VOZ = 12;

  @Override
  public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
    for (int id : ids) {
      pintar(ctx, mgr, id);
    }
  }

  static void pintar(Context ctx, AppWidgetManager mgr, int widgetId) {
    RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_chat);
    rv.setOnClickPendingIntent(R.id.chat_abrir, WidgetsComun.abrirAccion(ctx, PI_CHAT, "chat"));
    rv.setOnClickPendingIntent(
        R.id.chat_camara, WidgetsComun.abrirAccion(ctx, PI_CAMARA, "chat-foto"));
    rv.setOnClickPendingIntent(R.id.chat_voz, WidgetsComun.abrirAccion(ctx, PI_VOZ, "chat-voz"));
    mgr.updateAppWidget(widgetId, rv);
  }
}

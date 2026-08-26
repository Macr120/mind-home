package com.macr120.mindhome.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.File;

import com.macr120.mindhome.R;

/**
 * Widget «Casa»: la foto del mapa 3D que publica la app, con la fecha del día
 * encima. Tocarlo abre la casa.
 */
public class CasaWidgetProvider extends AppWidgetProvider {

  @Override
  public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
    for (int id : ids) {
      pintar(ctx, mgr, id);
    }
  }

  /** Al quitar el último widget, la foto ya no le sirve a nadie. */
  @Override
  public void onDisabled(Context ctx) {
    File foto = WidgetsStore.archivoFotoCasa(ctx);
    if (foto.exists()) foto.delete();
  }

  static void pintar(Context ctx, AppWidgetManager mgr, int widgetId) {
    RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_casa);
    JSONObject snap = WidgetsComun.leerSnapshot(ctx);
    JSONObject textos = WidgetsComun.textos(snap);
    JSONObject tema = WidgetsComun.tema(snap);
    Bitmap foto = leerFoto(ctx);

    // El fondo del tema (solo se ve mientras no hay foto).
    rv.setInt(R.id.casa_fondo, "setColorFilter", WidgetsComun.color(tema, "fondo", 0xFF0F1115));
    rv.setInt(R.id.casa_fondo, "setImageAlpha", WidgetsComun.alfaFondo(tema));

    if (foto != null) rv.setImageViewBitmap(R.id.casa_foto, foto);
    rv.setViewVisibility(R.id.casa_foto, foto == null ? View.GONE : View.VISIBLE);
    rv.setViewVisibility(R.id.casa_velo, foto == null ? View.GONE : View.VISIBLE);

    // Sin fecha no hay nada que rotular; sin foto NI fecha, el widget explica
    // que hay que abrir la app una vez.
    boolean hayFecha = snap != null;
    rv.setViewVisibility(R.id.casa_fecha, hayFecha ? View.VISIBLE : View.GONE);
    rv.setViewVisibility(R.id.casa_vacio, foto == null && !hayFecha ? View.VISIBLE : View.GONE);
    rv.setTextColor(R.id.casa_vacio, WidgetsComun.color(tema, "tinta2", 0xFF9AA0AA));
    if (hayFecha) {
      // Sobre la FOTO la fecha va en blanco con sombra; sin foto queda sobre el
      // fondo del tema y ahí manda su tinta (en claro, el blanco no se leía).
      boolean viejo = WidgetsComun.desactualizado(snap);
      int tinta = foto != null ? 0xFFFFFFFF : WidgetsComun.color(tema, "tinta", 0xFFFFFFFF);
      int tinta2 = foto != null ? 0xFFE0E4EA : WidgetsComun.color(tema, "tinta2", 0xFFE0E4EA);
      rv.setTextColor(R.id.casa_dia, tinta);
      rv.setTextColor(R.id.casa_diasemana, tinta);
      rv.setTextColor(
          R.id.casa_mes, viejo ? WidgetsComun.color(tema, "alerta", 0xFFF87171) : tinta2);
      rv.setTextViewText(R.id.casa_dia, textos.optString("diaNumero"));
      rv.setTextViewText(R.id.casa_diasemana, textos.optString("diaSemana"));
      rv.setTextViewText(
          R.id.casa_mes,
          viejo ? textos.optString("desactualizado") : textos.optString("mesAnio"));
    }

    rv.setOnClickPendingIntent(R.id.widget_casa_raiz, WidgetsComun.abrirApp(ctx));
    mgr.updateAppWidget(widgetId, rv);
  }

  /**
   * La foto publicada. RGB_565 a propósito: RemoteViews transporta el bitmap ya
   * descomprimido y con 4 bytes por píxel una foto de 640 px roza el límite de
   * la transacción del binder.
   */
  private static Bitmap leerFoto(Context ctx) {
    File archivo = WidgetsStore.archivoFotoCasa(ctx);
    if (!archivo.exists()) return null;
    BitmapFactory.Options opciones = new BitmapFactory.Options();
    opciones.inPreferredConfig = Bitmap.Config.RGB_565;
    try {
      return BitmapFactory.decodeFile(archivo.getAbsolutePath(), opciones);
    } catch (OutOfMemoryError e) {
      return null;
    }
  }
}

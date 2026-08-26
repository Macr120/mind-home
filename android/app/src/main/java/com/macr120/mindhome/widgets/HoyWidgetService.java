package com.macr120.mindhome.widgets;

import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import com.macr120.mindhome.R;

/**
 * Sirve las filas de la lista del widget «Misiones» desde el snapshot publicado.
 * El estado pintado de cada fila es el del snapshot CORREGIDO por el último
 * optimista de ese ítem: así el tap se ve al instante aunque la app (que es
 * quien de verdad escribe) siga cerrada.
 */
public class HoyWidgetService extends RemoteViewsService {

  @Override
  public RemoteViewsFactory onGetViewFactory(Intent intent) {
    return new Factory(getApplicationContext());
  }

  private static final class Fila {
    String id;
    String tipo;
    String titulo;
    String detalle;
    String emoji;
    String hora;
    boolean hecho;
    boolean urgente;
  }

  private static final class Factory implements RemoteViewsFactory {

    private final Context ctx;
    private final List<Fila> filas = new ArrayList<>();
    private String fechaSnapshot = "";
    // La paleta del snapshot, leída junto con las filas (misma foto del estado).
    private int colorTinta = 0xFFEDEDF2;
    private int colorTinta2 = 0xFF9AA0AA;
    private int colorHecho = 0xFF6B7280;
    private int colorHechoDetalle = 0xFF565C66;
    private int colorAcento = 0xFF8BE9B6;
    private int colorUrgente = 0xFFFBBF24;
    private int colorFondo = 0xFF0F1115;

    Factory(Context ctx) {
      this.ctx = ctx;
    }

    @Override
    public void onCreate() {}

    /** Corre en un hilo binder: todo el estado pasa por WidgetsStore (con lock). */
    @Override
    public void onDataSetChanged() {
      filas.clear();
      fechaSnapshot = "";
      JSONObject snap = WidgetsComun.leerSnapshot(ctx);
      if (snap == null) return;
      fechaSnapshot = snap.optString("fecha");

      JSONObject tema = WidgetsComun.tema(snap);
      colorTinta = WidgetsComun.color(tema, "tinta", 0xFFEDEDF2);
      colorTinta2 = WidgetsComun.color(tema, "tinta2", 0xFF9AA0AA);
      colorHecho = WidgetsComun.color(tema, "hecho", 0xFF6B7280);
      colorHechoDetalle = WidgetsComun.color(tema, "hechoDetalle", 0xFF565C66);
      colorAcento = WidgetsComun.color(tema, "acento", 0xFF8BE9B6);
      colorUrgente = WidgetsComun.color(tema, "urgente", 0xFFFBBF24);
      colorFondo = WidgetsComun.color(tema, "fondo", 0xFF0F1115);

      // Último optimista por ítem (gana el ts más alto): id -> hecho.
      Map<String, long[]> tsPorItem = new HashMap<>();
      Map<String, Boolean> optimistaPorItem = new HashMap<>();
      JSONObject optimistas = WidgetsStore.leerOptimistas(ctx);
      for (Iterator<String> it = optimistas.keys(); it.hasNext(); ) {
        JSONObject marca = optimistas.optJSONObject(it.next());
        if (marca == null) continue;
        String id = marca.optString("id");
        long ts = marca.optLong("ts");
        long[] previo = tsPorItem.get(id);
        if (previo == null || ts >= previo[0]) {
          tsPorItem.put(id, new long[] {ts});
          optimistaPorItem.put(id, marca.optBoolean("hecho"));
        }
      }

      JSONArray hoy = snap.optJSONArray("hoy");
      if (hoy == null) return;
      for (int i = 0; i < hoy.length(); i++) {
        try {
          JSONObject item = hoy.getJSONObject(i);
          Fila f = new Fila();
          f.id = item.getString("id");
          f.tipo = item.optString("tipo");
          f.titulo = item.optString("titulo");
          f.detalle = item.optString("detalle");
          f.emoji = item.optString("emoji");
          f.hora = item.optString("hora");
          Boolean optimista = optimistaPorItem.get(f.id);
          f.hecho = optimista != null ? optimista : item.optBoolean("hecho");
          f.urgente = item.optBoolean("urgente") && !f.hecho;
          filas.add(f);
        } catch (JSONException ignorada) {
          // Un ítem malformado se salta; el resto de la lista sigue.
        }
      }
    }

    @Override
    public RemoteViews getViewAt(int posicion) {
      if (posicion < 0 || posicion >= filas.size()) return null;
      Fila f = filas.get(posicion);
      RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_hoy_item);

      rv.setTextViewText(R.id.item_emoji, f.emoji);
      rv.setTextViewText(R.id.item_titulo, f.titulo);
      rv.setTextViewText(R.id.item_detalle, f.detalle);
      rv.setViewVisibility(R.id.item_detalle, f.detalle.isEmpty() ? View.GONE : View.VISIBLE);
      rv.setTextViewText(R.id.item_hora, f.hora);
      // La lista lleva juntos los pendientes y los cumplidos: lo hecho baja de tono
      // para que lo que falta siga leyéndose primero, y la hora de lo que ya se pasó
      // va en urgente, como el globo de Misiones dentro de la app. Los colores
      // son la paleta que empujó la app (tema × modo elegidos).
      rv.setTextColor(R.id.item_titulo, f.hecho ? colorHecho : colorTinta);
      rv.setTextColor(R.id.item_detalle, f.hecho ? colorHechoDetalle : colorTinta2);
      rv.setTextColor(R.id.item_hora, f.urgente ? colorUrgente : colorTinta2);
      rv.setViewVisibility(R.id.item_hora, f.hora.isEmpty() ? View.GONE : View.VISIBLE);
      // Palomita en dos capas: círculo del acento (o aro de tinta2) y, encima,
      // la marca teñida del color del fondo, que parece recortada.
      rv.setImageViewResource(
          R.id.item_check, f.hecho ? R.drawable.widget_check_on : R.drawable.widget_check_off);
      rv.setInt(R.id.item_check, "setColorFilter", f.hecho ? colorAcento : colorTinta2);
      rv.setViewVisibility(R.id.item_check_marca, f.hecho ? View.VISIBLE : View.GONE);
      rv.setInt(R.id.item_check_marca, "setColorFilter", colorFondo);

      // El tap de la fila encola el estado DESTINO (lo contrario de lo pintado).
      Intent fillIn = new Intent();
      fillIn.putExtra("id", f.id);
      fillIn.putExtra("tipo", f.tipo);
      fillIn.putExtra("fecha", fechaSnapshot);
      fillIn.putExtra("hecho", !f.hecho);
      rv.setOnClickFillInIntent(R.id.item_fila, fillIn);

      return rv;
    }

    @Override
    public int getCount() {
      return filas.size();
    }

    @Override
    public RemoteViews getLoadingView() {
      return null;
    }

    @Override
    public int getViewTypeCount() {
      return 1;
    }

    @Override
    public long getItemId(int posicion) {
      return posicion;
    }

    @Override
    public boolean hasStableIds() {
      return false;
    }

    @Override
    public void onDestroy() {
      filas.clear();
    }
  }
}

package com.macr120.mindhome.widgets;

import org.json.JSONObject;

import com.macr120.mindhome.R;

/**
 * La paleta con la que se pintan los widgets. Sigue el ajuste «Apariencia» de
 * la app —claro / oscuro / transparente, el `ModoUI` de src/core/ui/temasUI.ts—,
 * que viaja en el snapshot: aquí no se decide nada, solo se traduce a colores.
 *
 * Los drawables no se pueden teñir desde un RemoteViews, así que cada modo trae
 * los suyos y el provider los intercambia con `setBackgroundResource`.
 *
 * Sin snapshot todavía —o con uno viejo, de antes de que hubiera modos— vale
 * OSCURO, que es como se veían los widgets hasta ahora.
 */
final class WidgetTema {

  /** Panel del widget (fondo + borde). */
  final int fondo;
  /** Botón alargado del widget de chat. */
  final int pildora;
  /** Botón redondo del widget de chat. */
  final int circulo;
  /** Tinta principal: títulos y misiones pendientes. */
  final int texto;
  /** Tinta secundaria: fecha, detalle, hora, estado vacío. */
  final int tenue;
  /** Título de una misión ya cumplida (baja de tono, no desaparece). */
  final int textoHecho;
  /** Detalle de una misión ya cumplida. */
  final int tenueHecho;
  /** La cuenta «hechas/total» de la cabecera. */
  final int cuenta;
  /** Hora de lo que ya se pasó y sigue pendiente. */
  final int urgente;
  /** Aviso de snapshot de otro día («Toca para actualizar»). */
  final int aviso;
  /** Tinte de los iconos de cámara y dictado, que vienen en blanco. */
  final int icono;
  /** Velo bajo la fecha del widget de la casa: sin él el texto se pierde. */
  final int velo;

  private WidgetTema(
      int fondo,
      int pildora,
      int circulo,
      int texto,
      int tenue,
      int textoHecho,
      int tenueHecho,
      int cuenta,
      int urgente,
      int aviso,
      int icono,
      int velo) {
    this.fondo = fondo;
    this.pildora = pildora;
    this.circulo = circulo;
    this.texto = texto;
    this.tenue = tenue;
    this.textoHecho = textoHecho;
    this.tenueHecho = tenueHecho;
    this.cuenta = cuenta;
    this.urgente = urgente;
    this.aviso = aviso;
    this.icono = icono;
    this.velo = velo;
  }

  private static final WidgetTema OSCURO =
      new WidgetTema(
          R.drawable.widget_fondo,
          R.drawable.widget_pildora,
          R.drawable.widget_circulo,
          0xFFEDEDF2,
          0xFF9AA0AA,
          0xFF6B7280,
          0xFF565C66,
          0xFF8BE9B6,
          0xFFFBBF24,
          0xFFF87171,
          0xFFFFFFFF,
          0x59000000);

  private static final WidgetTema CLARO =
      new WidgetTema(
          R.drawable.widget_fondo_claro,
          R.drawable.widget_pildora_claro,
          R.drawable.widget_circulo_claro,
          0xFF1C2333,
          0xFF5B6272,
          0xFF9AA0AE,
          0xFFA8AEBB,
          0xFF0E8A57,
          0xFFB45309,
          0xFFC0392B,
          0xFF1C2333,
          // Menos velo que en oscuro: la foto de la casa se ve más luminosa.
          0x33000000);

  private static final WidgetTema TRANSPARENTE =
      new WidgetTema(
          R.drawable.widget_fondo_transparente,
          R.drawable.widget_pildora_transparente,
          R.drawable.widget_circulo_transparente,
          // Sobre el vidrio la tinta va clara, como en oscuro.
          0xFFFFFFFF,
          0xFFDCE0E8,
          0xFFB9BEC9,
          0xFFA2A8B4,
          0xFF8BE9B6,
          0xFFFBBF24,
          0xFFFCA5A5,
          0xFFFFFFFF,
          // La foto de la casa sale casi limpia: lo justo para que la fecha no
          // se pierda sobre un tejado claro.
          0x26000000);

  /** El tema del snapshot publicado por la app. */
  static WidgetTema de(JSONObject snapshot) {
    String modo = snapshot == null ? "" : snapshot.optString("tema");
    if ("claro".equals(modo)) return CLARO;
    if ("transparente".equals(modo)) return TRANSPARENTE;
    return OSCURO;
  }
}

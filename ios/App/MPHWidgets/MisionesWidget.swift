import SwiftUI
import WidgetKit

/**
 * Widget «Misiones»: la checklist de HOY de toda la casa —lo que pide cada app
 * y lo que hay agendado—, palomeable desde la pantalla de inicio. Espejo de
 * `HoyWidgetProvider.java` + `HoyWidgetService.java`.
 */
struct MisionesWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "MPHMisiones", provider: ProveedorWidget()) { entrada in
      VistaMisiones(entrada: entrada)
    }
    .configurationDisplayName(NSLocalizedString("widget_hoy_label", comment: ""))
    .description(NSLocalizedString("widget_hoy_desc", comment: ""))
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

struct VistaMisiones: View {
  @Environment(\.widgetFamily) private var familia
  let entrada: EntradaWidget

  /// Cuántas filas caben. La mediana da para tres; la grande, para ocho.
  private var tope: Int { familia == .systemLarge ? 8 : 3 }

  /**
   * El estado pintado es el del snapshot CORREGIDO por el último optimista de
   * ese ítem: así el tap se ve al instante aunque la app —que es quien de
   * verdad escribe— siga cerrada.
   */
  private var filas: [ItemHoy] {
    guard let snap = entrada.snapshot else { return [] }
    let optimistas = AlmacenWidgets.leerOptimistas()
    // Último por ítem: gana el ts más alto.
    var ultimo: [String: Optimista] = [:]
    for marca in optimistas.values {
      if let previo = ultimo[marca.id], previo.ts > marca.ts { continue }
      ultimo[marca.id] = marca
    }
    return snap.hoy.map { item in
      guard let marca = ultimo[item.id], marca.hecho != item.hecho else { return item }
      return ItemHoy(
        id: item.id, tipo: item.tipo, titulo: item.titulo, detalle: item.detalle,
        emoji: item.emoji, hora: item.hora, hecho: marca.hecho, urgente: item.urgente)
    }
  }

  var body: some View {
    let snap = entrada.snapshot
    let lista = filas
    VStack(alignment: .leading, spacing: 6) {
      Cabecera(snapshot: snap)

      if lista.isEmpty {
        // Vacío: sin snapshot aún (abre la app) o con el día en blanco.
        Text(snap?.texto("vacio") ?? NSLocalizedString("widget_vacio", comment: ""))
          .font(.system(size: 12))
          .foregroundColor(Paleta.tinta2)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
          .multilineTextAlignment(.center)
      } else {
        VStack(spacing: 0) {
          ForEach(lista.prefix(tope), id: \.id) { item in
            FilaMision(
              item: item, fecha: snap?.fecha ?? ComunWidgets.hoy(),
              redactada: entrada.esEjemplo)
          }
          Spacer(minLength: 0)
        }
      }
    }
    .padding(12)
    .fondoWidget()
    // Toda la zona que no sea un botón de palomear abre la app.
    .widgetURL(EnlaceWidget.app())
  }
}

private struct Cabecera: View {
  let snapshot: SnapshotWidgets?

  var body: some View {
    VStack(alignment: .leading, spacing: 1) {
      HStack(alignment: .firstTextBaseline) {
        Text(snapshot?.texto("titulo") ?? "Mind Planner Home")
          .font(.system(size: 14, weight: .semibold))
          .foregroundColor(Paleta.tinta)
          .lineLimit(1)
        Spacer(minLength: 6)
        Text(snapshot?.texto("misiones") ?? "")
          .font(.system(size: 11))
          .foregroundColor(Paleta.cuenta)
      }
      if ComunWidgets.desactualizado(snapshot) {
        Text(snapshot?.texto("desactualizado") ?? "")
          .font(.system(size: 10))
          .foregroundColor(Paleta.alerta)
          .lineLimit(1)
      } else {
        Text(snapshot?.texto("fechaLarga") ?? "")
          .font(.system(size: 11))
          .foregroundColor(Paleta.tinta2)
          .lineLimit(1)
      }
    }
  }
}

/// Fila de la lista: emoji · título/detalle · hora · palomita.
private struct FilaMision: View {
  let item: ItemHoy
  let fecha: String
  /// Fila de utilería (galería): textos como barras grises y sin botón.
  var redactada = false

  private var urgente: Bool { (item.urgente ?? false) && !item.hecho }

  /**
   * La fila ENTERA palomea, como en Android (`setOnClickFillInIntent` va sobre
   * `item_fila`, no sobre la palomita): en una fila de 24 pt acertarle solo al
   * círculo con el pulgar es pedir demasiado. Lo que queda para abrir la app es
   * la cabecera, igual que allá.
   *
   * Antes de iOS 17 no hay forma de ejecutar código desde un widget, así que la
   * fila se pinta idéntica pero inerte y el tap cae en el `widgetURL` de la
   * vista, que abre la app en la casa.
   */
  var body: some View {
    if redactada {
      // En la galería la fila es utilería: nada que encolar.
      contenido
    } else if #available(iOS 17.0, *) {
      Button(intent: MarcarMision(
        id: item.id, tipo: item.tipo, fecha: fecha, hecho: !item.hecho)
      ) {
        contenido
      }
      .buttonStyle(.plain)
      // El texto de la fila ya es la etiqueta; esto dice qué hace tocarla.
      .accessibilityHint(NSLocalizedString("widget_palomear", comment: ""))
    } else {
      contenido
    }
  }

  private var contenido: some View {
    HStack(spacing: 8) {
      Text(item.emoji ?? "")
        .font(.system(size: 15))

      VStack(alignment: .leading, spacing: 0) {
        Text(item.titulo)
          .font(.system(size: 13))
          .foregroundColor(item.hecho ? Paleta.tintaHecho : Paleta.tinta)
          .lineLimit(1)
        if let detalle = item.detalle, !detalle.isEmpty {
          Text(detalle)
            .font(.system(size: 10))
            .foregroundColor(item.hecho ? Paleta.tintaHechoDetalle : Paleta.tinta2)
            .lineLimit(1)
        }
      }
      // Redactado = barras grises del largo del texto: el ejemplo se entiende
      // en cualquier idioma sin traducir ni un título.
      .redacted(reason: redactada ? .placeholder : [])
      Spacer(minLength: 4)

      if let hora = item.hora, !hora.isEmpty {
        Text(hora)
          .font(.system(size: 11))
          .foregroundColor(urgente ? Paleta.urgente : Paleta.tinta2)
      }

      icono
    }
    .padding(.vertical, 5)
    // Sin esto el hueco del Spacer no responde y media fila quedaría muerta.
    .contentShape(Rectangle())
  }

  private var icono: some View {
    Image(systemName: item.hecho ? "checkmark.circle.fill" : "circle")
      .font(.system(size: 20))
      .foregroundColor(item.hecho ? Paleta.cuenta : Paleta.tinta2)
      .frame(width: 24, height: 24)
  }
}

#if DEBUG
struct MisionesWidget_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      VistaMisiones(entrada: .ejemplo)
        .previewContext(WidgetPreviewContext(family: .systemMedium))
        .previewDisplayName("Galería (ejemplo)")
      VistaMisiones(entrada: .ejemplo)
        .previewContext(WidgetPreviewContext(family: .systemLarge))
        .previewDisplayName("Grande (ejemplo)")
      VistaMisiones(entrada: EntradaWidget(date: Date(), snapshot: nil, foto: nil))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
        .previewDisplayName("Sin datos")
    }
  }
}
#endif

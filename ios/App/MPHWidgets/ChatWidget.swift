import SwiftUI
import WidgetKit

/**
 * Widget «Chat»: lanzador de los tres accesos al chat de la casa. No lee el
 * snapshot —sus textos son fijos— así que funciona desde el primer arranque,
 * igual que `ChatWidgetProvider.java`.
 *
 * Aquí cada botón es un `Link` propio (no `widgetURL`, que es uno por widget).
 */
struct ChatWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "MPHChat", provider: ProveedorWidget()) { _ in
      VistaChat()
    }
    .configurationDisplayName(NSLocalizedString("widget_chat_label", comment: ""))
    .description(NSLocalizedString("widget_chat_desc", comment: ""))
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct VistaChat: View {
  var body: some View {
    VStack(spacing: 10) {
      Link(destination: EnlaceWidget.accion("chat")) {
        HStack(spacing: 10) {
          Image(systemName: "bubble.left.and.bubble.right.fill")
            .font(.system(size: 18))
            .foregroundColor(Paleta.cuenta)
          Text(NSLocalizedString("widget_chat_abrir", comment: ""))
            .font(.system(size: 18, weight: .semibold))
            .foregroundColor(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Paleta.pildora)
        .clipShape(Capsule())
      }

      HStack(spacing: 10) {
        BotonRedondo(icono: "camera.fill",
                     etiqueta: NSLocalizedString("widget_chat_camara", comment: ""),
                     destino: EnlaceWidget.accion("chat-foto"))
        BotonRedondo(icono: "mic.fill",
                     etiqueta: NSLocalizedString("widget_chat_voz", comment: ""),
                     destino: EnlaceWidget.accion("chat-voz"))
      }
    }
    .padding(10)
    .fondoWidget()
  }
}

private struct BotonRedondo: View {
  let icono: String
  let etiqueta: String
  let destino: URL

  var body: some View {
    Link(destination: destino) {
      Image(systemName: icono)
        .font(.system(size: 20))
        .foregroundColor(Paleta.tinta)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Paleta.pildora)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
    .accessibilityLabel(etiqueta)
  }
}

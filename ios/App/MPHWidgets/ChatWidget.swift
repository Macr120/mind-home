import SwiftUI
import WidgetKit

/**
 * Widget «Chat»: lanzador de los tres accesos al chat de la casa. Sus textos
 * son fijos, así que funciona desde el primer arranque; del snapshot solo toma
 * la PALETA (y sin snapshot pinta la oscura), igual que `ChatWidgetProvider.java`.
 *
 * Aquí cada botón es un `Link` propio (no `widgetURL`, que es uno por widget).
 */
struct ChatWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "MPHChat", provider: ProveedorWidget()) { entrada in
      VistaChat(tema: entrada.tema)
    }
    .configurationDisplayName(NSLocalizedString("widget_chat_label", comment: ""))
    .description(NSLocalizedString("widget_chat_desc", comment: ""))
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct VistaChat: View {
  var tema: TemaWidget = .oscuro

  var body: some View {
    VStack(spacing: 10) {
      Link(destination: EnlaceWidget.accion("chat")) {
        HStack(spacing: 10) {
          // El logo de la app, no un ícono genérico: mismo trato que Android
          // (`widget_chat.xml` pinta `widget_logo` junto al texto).
          LogoMPH()
            .frame(width: 46, height: 26)
          Text(NSLocalizedString("widget_chat_abrir", comment: ""))
            .font(.system(size: 18, weight: .semibold))
            .foregroundColor(tema.colorTinta)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(tema.colorPanel)
        .clipShape(Capsule())
      }

      HStack(spacing: 10) {
        BotonRedondo(icono: "camera.fill",
                     etiqueta: NSLocalizedString("widget_chat_camara", comment: ""),
                     destino: EnlaceWidget.accion("chat-foto"), tema: tema)
        BotonRedondo(icono: "mic.fill",
                     etiqueta: NSLocalizedString("widget_chat_voz", comment: ""),
                     destino: EnlaceWidget.accion("chat-voz"), tema: tema)
      }
    }
    .padding(10)
    .fondoWidget(tema)
  }
}

/**
 * El logo de la app suelto (las tres figuras), espejo de `widget_logo.xml`:
 * mismas rutas y mismos colores, en un lienzo de 357×100. Se dibuja aquí en
 * vez de empaquetar un asset porque son tres paths y así no hay una segunda
 * copia del logo que envejezca en otro formato.
 */
struct LogoMPH: View {
  var body: some View {
    Canvas { ctx, size in
      // fitCenter, como el ImageView de Android: entra completo y centrado.
      let escala = min(size.width / 357, size.height / 100)
      let x0 = (size.width - 357 * escala) / 2
      let y0 = (size.height - 100 * escala) / 2
      func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
        CGPoint(x: x0 + x * escala, y: y0 + y * escala)
      }

      let cuadro = Path(
        roundedRect: CGRect(origin: pt(0, 3),
                            size: CGSize(width: 94 * escala, height: 94 * escala)),
        cornerRadius: 20 * escala, style: .continuous)
      ctx.fill(cuadro, with: .color(Color(red: 0xDA / 255, green: 0x94 / 255, blue: 0x25 / 255)))

      var triangulo = Path()
      triangulo.move(to: pt(137, 0))
      triangulo.addLine(to: pt(137, 100))
      triangulo.addLine(to: pt(237, 100))
      triangulo.closeSubpath()
      ctx.fill(triangulo, with: .color(Color(red: 0xC2 / 255, green: 0x3A / 255, blue: 0x40 / 255)))

      // Cuarto de disco con el centro en su esquina superior derecha (357,0).
      var cuarto = Path()
      cuarto.move(to: pt(257, 0))
      cuarto.addLine(to: pt(357, 0))
      cuarto.addLine(to: pt(357, 100))
      cuarto.addArc(center: pt(357, 0), radius: 100 * escala,
                    startAngle: .degrees(90), endAngle: .degrees(180), clockwise: false)
      cuarto.closeSubpath()
      ctx.fill(cuarto, with: .color(Color(red: 0x89 / 255, green: 0x5A / 255, blue: 0xC6 / 255)))
    }
  }
}

private struct BotonRedondo: View {
  let icono: String
  let etiqueta: String
  let destino: URL
  let tema: TemaWidget

  var body: some View {
    Link(destination: destino) {
      Image(systemName: icono)
        .font(.system(size: 20))
        .foregroundColor(tema.colorTinta)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(tema.colorPanel)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
    .accessibilityLabel(etiqueta)
  }
}

#if DEBUG
struct ChatWidget_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      VistaChat()
        .previewContext(WidgetPreviewContext(family: .systemSmall))
        .previewDisplayName("Chico")
      VistaChat()
        .previewContext(WidgetPreviewContext(family: .systemMedium))
        .previewDisplayName("Mediano")
    }
  }
}
#endif

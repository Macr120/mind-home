import SwiftUI
import WidgetKit

/**
 * Widget «Casa»: la foto del mapa 3D que publica la app, con la fecha del día
 * encima. Tocarlo abre la casa. Espejo de `CasaWidgetProvider.java`.
 */
struct CasaWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "MPHCasa", provider: ProveedorWidget(conFoto: true)) { entrada in
      VistaCasa(entrada: entrada)
    }
    .configurationDisplayName(NSLocalizedString("widget_casa_label", comment: ""))
    .description(NSLocalizedString("widget_casa_desc", comment: ""))
    // 250×110 dp en Android: la mediana es la que guarda esa proporción.
    .supportedFamilies([.systemMedium])
  }
}

struct VistaCasa: View {
  let entrada: EntradaWidget

  private var imagen: UIImage? {
    guard let foto = entrada.foto else { return nil }
    return UIImage(data: foto)
  }

  /// Sobre la FOTO (o el mapa de utilería) la fecha va en blanco con sombra;
  /// sin foto queda sobre el fondo del tema, y ahí manda la tinta del tema.
  private var tintaFecha: Color {
    imagen != nil || entrada.esEjemplo ? .white : entrada.tema.colorTinta
  }

  private var tintaFecha2: Color {
    imagen != nil || entrada.esEjemplo ? Color(white: 0.88) : entrada.tema.colorTinta2
  }

  var body: some View {
    let snap = entrada.snapshot
    ZStack {
      if let imagen {
        Image(uiImage: imagen)
          .resizable()
          .scaledToFill()
        // Velo bajo la fecha: sobre un cielo claro el texto blanco se perdía.
        Color.black.opacity(0.35)
      } else if entrada.esEjemplo {
        // La galería, antes de la primera foto: un mapa de utilería con los
        // colores del icono, para enseñar la idea en vez de un aviso.
        MapaEjemplo()
      }

      if let snap {
        HStack(alignment: .center, spacing: 10) {
          Text(snap.texto("diaNumero"))
            .font(.system(size: 42, weight: .bold))
            .foregroundColor(tintaFecha)
          VStack(alignment: .leading, spacing: 1) {
            Text(snap.texto("diaSemana"))
              .font(.system(size: 14, weight: .bold))
              .foregroundColor(tintaFecha)
              .lineLimit(1)
            Text(ComunWidgets.desactualizado(snap) ? snap.texto("desactualizado") : snap.texto("mesAnio"))
              .font(.system(size: 12))
              .foregroundColor(ComunWidgets.desactualizado(snap) ? entrada.tema.colorAlerta : tintaFecha2)
              .lineLimit(1)
          }
          Spacer(minLength: 0)
        }
        .shadow(color: .black.opacity(0.7), radius: 6, x: 0, y: 1)
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
      } else {
        // Sin foto NI fecha: el widget explica que hay que abrir la app una vez.
        Text(NSLocalizedString("widget_vacio", comment: ""))
          .font(.system(size: 12))
          .foregroundColor(entrada.tema.colorTinta2)
          .multilineTextAlignment(.center)
          .padding(16)
      }
    }
    .fondoWidget(entrada.tema)
    .widgetURL(EnlaceWidget.app())
  }
}

/// Cuartos de mentira sobre un fondo cielo→pasto, como el mapa 3D visto de lejos.
private struct MapaEjemplo: View {
  var body: some View {
    GeometryReader { geo in
      ZStack {
        LinearGradient(
          colors: [
            Color(red: 0x1A / 255, green: 0x21 / 255, blue: 0x30 / 255),
            Color(red: 0x23 / 255, green: 0x2E / 255, blue: 0x27 / 255),
          ],
          startPoint: .top, endPoint: .bottom)
        cuarto(Color(red: 0xD9 / 255, green: 0xA0 / 255, blue: 0x3C / 255),
               x: 0.32, y: 0.40, w: 0.19, h: 0.30, geo: geo)
        cuarto(Color(red: 0x6E / 255, green: 0xA5 / 255, blue: 0xC8 / 255),
               x: 0.54, y: 0.30, w: 0.21, h: 0.36, geo: geo)
        cuarto(Color(red: 0xC9 / 255, green: 0x4F / 255, blue: 0x4C / 255),
               x: 0.78, y: 0.26, w: 0.15, h: 0.26, geo: geo)
        cuarto(Color(red: 0x8B / 255, green: 0x5C / 255, blue: 0xF6 / 255),
               x: 0.73, y: 0.62, w: 0.17, h: 0.24, geo: geo)
      }
    }
  }

  private func cuarto(
    _ color: Color, x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat, geo: GeometryProxy
  ) -> some View {
    RoundedRectangle(cornerRadius: 3, style: .continuous)
      .fill(color.opacity(0.85))
      .overlay(
        RoundedRectangle(cornerRadius: 3, style: .continuous)
          .stroke(Color.white.opacity(0.9), lineWidth: 1.5))
      .frame(width: geo.size.width * w, height: geo.size.height * h)
      .position(x: geo.size.width * x, y: geo.size.height * y)
  }
}

#if DEBUG
struct CasaWidget_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      VistaCasa(entrada: .ejemplo)
        .previewContext(WidgetPreviewContext(family: .systemMedium))
        .previewDisplayName("Galería (ejemplo)")
      VistaCasa(entrada: EntradaWidget(date: Date(), snapshot: nil, foto: nil))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
        .previewDisplayName("Sin datos")
    }
  }
}
#endif

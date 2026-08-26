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

  var body: some View {
    let snap = entrada.snapshot
    ZStack {
      if let imagen {
        Image(uiImage: imagen)
          .resizable()
          .scaledToFill()
        // Velo bajo la fecha: sobre un cielo claro el texto blanco se perdía.
        Color.black.opacity(0.35)
      }

      if let snap {
        HStack(alignment: .center, spacing: 10) {
          Text(snap.texto("diaNumero"))
            .font(.system(size: 42, weight: .bold))
            .foregroundColor(.white)
          VStack(alignment: .leading, spacing: 1) {
            Text(snap.texto("diaSemana"))
              .font(.system(size: 14, weight: .bold))
              .foregroundColor(.white)
              .lineLimit(1)
            Text(ComunWidgets.desactualizado(snap) ? snap.texto("desactualizado") : snap.texto("mesAnio"))
              .font(.system(size: 12))
              .foregroundColor(ComunWidgets.desactualizado(snap) ? Paleta.alerta : Color(white: 0.88))
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
          .foregroundColor(Paleta.tinta2)
          .multilineTextAlignment(.center)
          .padding(16)
      }
    }
    .fondoWidget()
    .widgetURL(EnlaceWidget.app())
  }
}

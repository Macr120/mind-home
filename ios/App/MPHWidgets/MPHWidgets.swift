import SwiftUI
import WidgetKit

/**
 * Los tres widgets de Mind Planner Home, espejo de los de Android
 * (`android/…/widgets/`): la casa, las misiones del día y el chat.
 *
 * Reparto igual que allá: la app publica un snapshot YA localizado en el App
 * Group y aquí solo se pinta. Nada de lógica de negocio ni de traducir.
 */
@main
struct MPHWidgets: WidgetBundle {
  var body: some Widget {
    CasaWidget()
    MisionesWidget()
    ChatWidget()
  }
}

// MARK: - Paleta

extension Color {
  /// #rrggbb o #rrggbbaa (CSS). Un valor ilegible cae a gris, no revienta.
  init(hexCSS: String) {
    var hex = hexCSS.hasPrefix("#") ? String(hexCSS.dropFirst()) : hexCSS
    if hex.count == 6 { hex += "ff" }
    let v = UInt64(hex, radix: 16) ?? 0x8080_80ff
    self.init(
      .sRGB,
      red: Double((v >> 24) & 0xFF) / 255,
      green: Double((v >> 16) & 0xFF) / 255,
      blue: Double((v >> 8) & 0xFF) / 255,
      opacity: Double(v & 0xFF) / 255)
  }
}

/**
 * Los colores listos para pintar. La app manda el tema en el snapshot; sin
 * snapshot (o con uno de antes de que el tema viajara) se cae a `.oscuro`,
 * la paleta de siempre — los mismos valores que `res/drawable/widget_fondo.xml`.
 */
extension TemaWidget {
  static let oscuro = TemaWidget(
    fondo: "#0f1115", panel: "#1e2128", tinta: "#ededf2", tinta2: "#9aa0aa",
    hecho: "#6b7280", hechoDetalle: "#565c66", acento: "#8be9b6",
    urgente: "#fbbf24", alerta: "#f87171", vidrio: false)

  var colorFondo: Color { Color(hexCSS: fondo) }
  var colorPanel: Color { Color(hexCSS: panel) }
  var colorTinta: Color { Color(hexCSS: tinta) }
  var colorTinta2: Color { Color(hexCSS: tinta2) }
  var colorHecho: Color { Color(hexCSS: hecho) }
  var colorHechoDetalle: Color { Color(hexCSS: hechoDetalle) }
  var colorAcento: Color { Color(hexCSS: acento) }
  var colorUrgente: Color { Color(hexCSS: urgente) }
  var colorAlerta: Color { Color(hexCSS: alerta) }
}

extension EntradaWidget {
  /// La paleta a pintar en esta entrada.
  var tema: TemaWidget { snapshot?.tema ?? .oscuro }
}

// MARK: - Enlaces a la app

/**
 * Los taps abren la app por el esquema que ya usa OAuth (`Info.plist`). El
 * AppDelegate los convierte en el «destino» que `useWidgets` recoge con
 * `tomarDestinoPendiente`, igual que los extras del Intent en Android.
 */
enum EnlaceWidget {
  static func app() -> URL { URL(string: "com.macr120.mindhome://widget")! }

  static func cuarto(_ appId: String, seccion: String? = nil) -> URL {
    var partes = "com.macr120.mindhome://widget?app=\(codificar(appId))"
    if let seccion { partes += "&seccion=\(codificar(seccion))" }
    return URL(string: partes) ?? app()
  }

  /// Acción global: 'chat', 'chat-foto', 'chat-voz'.
  static func accion(_ accion: String) -> URL {
    URL(string: "com.macr120.mindhome://widget?accion=\(codificar(accion))") ?? app()
  }

  private static func codificar(_ s: String) -> String {
    s.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? s
  }
}

// MARK: - Fondo del contenedor

/**
 * En iOS 17 el fondo lo tiene que declarar el widget con `containerBackground`
 * o el sistema lo pinta él y deja un marco claro alrededor; antes de 17 ese
 * modificador no existe y el fondo va como capa normal. En modo transparente el
 * fondo es vidrio del sistema (material translúcido), lo más cerca que WidgetKit
 * deja llegar al panel de vidrio de la app.
 */
struct FondoWidget: ViewModifier {
  let tema: TemaWidget

  func body(content: Content) -> some View {
    if #available(iOS 17.0, *) {
      if tema.vidrio {
        content.containerBackground(for: .widget) { Rectangle().fill(.ultraThinMaterial) }
      } else {
        content.containerBackground(tema.colorFondo, for: .widget)
      }
    } else {
      if tema.vidrio {
        content.background(.ultraThinMaterial)
      } else {
        content.background(tema.colorFondo)
      }
    }
  }
}

extension View {
  func fondoWidget(_ tema: TemaWidget) -> some View { modifier(FondoWidget(tema: tema)) }
}

// MARK: - Timeline

/// Una sola entrada: lo que hay publicado ahora mismo.
struct EntradaWidget: TimelineEntry {
  let date: Date
  let snapshot: SnapshotWidgets?
  /// Foto de la casa (JPEG del App Group); solo la pide el widget de la casa.
  let foto: Data?
  /// Utilería de la galería y el placeholder: los textos van redactados.
  var esEjemplo = false
}

/**
 * Proveedor común. La app fuerza el repintado al publicar
 * (`WidgetCenter.reloadAllTimelines`), así que aquí solo hace falta una cita
 * programada: la medianoche, que es cuando el snapshot pasa a estar
 * desactualizado sin que nadie escriba nada.
 */
struct ProveedorWidget: TimelineProvider {
  /// El de la casa carga además el JPEG; los otros dos se ahorran leerlo.
  var conFoto = false

  func placeholder(in context: Context) -> EntradaWidget { .ejemplo }

  func getSnapshot(in context: Context, completion: @escaping (EntradaWidget) -> Void) {
    let real = entrada()
    // La galería antes del primer snapshot. Es el estado NORMAL de un usuario
    // nuevo —la app solo publica cuando hay un widget colocado—, así que aquí
    // se enseña el ejemplo, no un aviso de «abre la app» que no vende nada.
    if context.isPreview, real.snapshot == nil {
      completion(.ejemplo)
    } else {
      completion(real)
    }
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<EntradaWidget>) -> Void) {
    let manana = Calendar.current.nextDate(
      after: Date(), matching: DateComponents(hour: 0, minute: 1),
      matchingPolicy: .nextTime) ?? Date().addingTimeInterval(3600)
    completion(Timeline(entries: [entrada()], policy: .after(manana)))
  }

  private func entrada() -> EntradaWidget {
    EntradaWidget(
      date: Date(),
      snapshot: AlmacenWidgets.leerSnapshot(),
      foto: conFoto ? AlmacenWidgets.leerFotoCasa() : nil)
  }
}

// MARK: - Utilería

extension EntradaWidget {
  /**
   * Lo que pinta la galería (y el placeholder) mientras la app no ha publicado
   * nada. Nada de esto necesita traducción a mano: lo legible sale de los
   * `Localizable.strings` que ya vienen de Android o lo localiza el sistema
   * (las fechas); los títulos de las filas se pintan REDACTADOS (barras
   * grises), así que su texto es relleno que solo da el largo de cada barra.
   */
  static var ejemplo: EntradaWidget {
    let ahora = Date()
    let df = DateFormatter()
    func fecha(_ plantilla: String) -> String {
      df.setLocalizedDateFormatFromTemplate(plantilla)
      return df.string(from: ahora)
    }
    let textos = [
      "titulo": NSLocalizedString("widget_hoy_label", comment: ""),
      "fechaLarga": fecha("EEEEdMMMM"),
      "diaNumero": fecha("d"),
      "diaSemana": fecha("EEEE"),
      "mesAnio": fecha("MMMMy"),
      "misiones": "2/6",
    ]
    let hoy = [
      ItemHoy(id: "e1", tipo: "rutina", titulo: "Una misión", detalle: "Un cuarto", emoji: "💊", hora: "08:00", hecho: false, urgente: true),
      ItemHoy(id: "e2", tipo: "objetivo", titulo: "Otra misión más larga", detalle: "Otro cuarto y su avance", emoji: "🍽️", hora: nil, hecho: false, urgente: nil),
      ItemHoy(id: "e3", tipo: "meta", titulo: "Una tercera", detalle: "El mismo cuarto", emoji: "🏃", hora: "18:30", hecho: false, urgente: nil),
      ItemHoy(id: "e4", tipo: "rutina", titulo: "La cuarta, algo más larga", detalle: "Aquel otro", emoji: "🪴", hora: "19:00", hecho: false, urgente: nil),
      ItemHoy(id: "e5", tipo: "objetivo", titulo: "Una ya cumplida", detalle: "Un cuarto", emoji: "📖", hora: nil, hecho: true, urgente: nil),
      ItemHoy(id: "e6", tipo: "rutina", titulo: "Y otra hecha", detalle: "Otro más", emoji: "🛏️", hora: "07:15", hecho: true, urgente: nil),
    ]
    return EntradaWidget(
      date: ahora,
      snapshot: SnapshotWidgets(
        version: 1, fecha: ComunWidgets.hoy(), idioma: "en", textos: textos,
        tema: nil, hoy: hoy),
      foto: nil,
      esEjemplo: true)
  }
}

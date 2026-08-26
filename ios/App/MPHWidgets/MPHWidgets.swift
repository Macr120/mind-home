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

/// El tema oscuro de la app, los mismos valores que `res/drawable/widget_fondo.xml`.
enum Paleta {
  static let fondo = Color(red: 0x0F / 255, green: 0x11 / 255, blue: 0x15 / 255)
  static let pildora = Color(red: 0x1E / 255, green: 0x21 / 255, blue: 0x28 / 255)
  static let tinta = Color(red: 0xED / 255, green: 0xED / 255, blue: 0xF2 / 255)
  static let tinta2 = Color(red: 0x9A / 255, green: 0xA0 / 255, blue: 0xAA / 255)
  /// Lo cumplido baja de tono para que lo que falta se lea primero.
  static let tintaHecho = Color(red: 0x6B / 255, green: 0x72 / 255, blue: 0x80 / 255)
  static let tintaHechoDetalle = Color(red: 0x56 / 255, green: 0x5C / 255, blue: 0x66 / 255)
  static let cuenta = Color(red: 0x8B / 255, green: 0xE9 / 255, blue: 0xB6 / 255)
  static let alerta = Color(red: 0xF8 / 255, green: 0x71 / 255, blue: 0x71 / 255)
  /// La hora ya pasada, como el globo de Misiones dentro de la app.
  static let urgente = Color(red: 0xFB / 255, green: 0xBF / 255, blue: 0x24 / 255)
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
 * modificador no existe y el fondo va como capa normal.
 */
struct FondoWidget: ViewModifier {
  func body(content: Content) -> some View {
    if #available(iOS 17.0, *) {
      content.containerBackground(Paleta.fondo, for: .widget)
    } else {
      content.background(Paleta.fondo)
    }
  }
}

extension View {
  func fondoWidget() -> some View { modifier(FondoWidget()) }
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
        version: 1, fecha: ComunWidgets.hoy(), idioma: "en", textos: textos, hoy: hoy),
      foto: nil,
      esEjemplo: true)
  }
}

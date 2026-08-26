import Foundation

/**
 * Contratos y almacén del puente app ↔ widgets, espejo de `WidgetsStore.java`
 * y de `src/core/widgets/tipos.ts`. Se compila en LOS DOS targets (la app y la
 * extensión), que son procesos distintos y solo se hablan por el App Group.
 *
 * Igual que en Android: la app EMPUJA un snapshot ya localizado (el widget solo
 * pinta, no traduce ni concatena) y el widget ENCOLA acciones con estado
 * destino que la app aplica luego con la lógica real de `core/hoy.ts`.
 */

// MARK: - Modelo (espejo de src/core/widgets/tipos.ts)

/// Un renglón del widget «Misiones»: un `PasoHoy` de cualquier app de la casa.
struct ItemHoy: Codable {
  let id: String
  let tipo: String
  let titulo: String
  /// Línea secundaria: el cuarto del que sale y su avance.
  let detalle: String?
  let emoji: String?
  /// 'HH:mm'; vacío = sin hora.
  let hora: String?
  let hecho: Bool
  /// Ya se pasó de su hora y sigue pendiente: se pinta en ámbar.
  let urgente: Bool?
}

/**
 * La paleta que la app resolvió (tema × modo, y en transparente la base que
 * dictó la luz de la casa) — espejo de `TemaWidgets` en tipos.ts. El widget no
 * sabe de temas: pinta estos colores tal cual. CSS hex: #rrggbb o #rrggbbaa.
 */
struct TemaWidget: Codable {
  let fondo: String
  let panel: String
  let tinta: String
  let tinta2: String
  let hecho: String
  let hechoDetalle: String
  let acento: String
  let urgente: String
  let alerta: String
  /// Modo transparente: el fondo va de vidrio (material translúcido).
  let vidrio: Bool
}

struct SnapshotWidgets: Codable {
  let version: Int
  /// `hoyISO()` al generarlo: si cambió el día, el widget avisa en vez de mentir.
  let fecha: String
  let idioma: String
  /// Todo lo que el widget pinta tal cual, YA localizado y compuesto en la app.
  let textos: [String: String]
  /// La paleta según el tema elegido en la app; nil en snapshots viejos (los
  /// widgets caen entonces a su paleta oscura de siempre).
  let tema: TemaWidget?
  let hoy: [ItemHoy]

  /// Nunca revienta por una clave que falte: el widget prefiere un hueco a no pintar.
  func texto(_ clave: String) -> String { textos[clave] ?? "" }
}

/// Acción encolada por un tap en el widget. FIJA estado (idempotente), no voltea.
struct AccionWidget: Codable {
  /// UUID puesto al encolar: dedupe y poda de optimistas.
  let accionId: String
  /// `ItemHoy.id`
  let id: String
  let tipo: String
  /// La fecha del snapshot al momento del tap (puede ser de días atrás).
  let fecha: String
  /// Estado DESTINO.
  let hecho: Bool
  /// Epoch ms: orden de aplicación (last-write-wins por ítem).
  let ts: Double
}

/// Marca optimista: solo para PINTAR mientras la app no aplica la cola.
struct Optimista: Codable {
  let id: String
  let hecho: Bool
  let ts: Double
}

// MARK: - Almacén

enum AlmacenWidgets {
  /// El App Group debe estar en los entitlements de AMBOS targets, o `defaults`
  /// sale nil y los widgets se quedan en blanco sin más síntoma.
  static let grupo = "group.com.macr120.mindhome"

  private static let claveSnapshot = "snapshot"
  private static let claveAcciones = "acciones"
  private static let claveOptimistas = "optimistas"
  private static let claveDestino = "destino"
  /// Tope de la cola: si la app no se abre en 200 taps, perder los primeros es
  /// el mal menor (mismo criterio que Android).
  private static let maxAcciones = 200

  /**
   * El lock solo serializa dentro de un proceso. La app y la extensión son dos,
   * así que un tap que caiga exactamente mientras la app drena la cola puede
   * perderse. Android no tenía esa ventana (todo corría en el proceso de la
   * app); aquí se acepta a cambio de no montar un NSFileCoordinator por tap.
   */
  private static let lock = NSLock()

  private static var defaults: UserDefaults? { UserDefaults(suiteName: grupo) }

  // MARK: Snapshot

  static func leerSnapshot() -> SnapshotWidgets? {
    lock.lock()
    defer { lock.unlock() }
    guard let json = defaults?.string(forKey: claveSnapshot),
          let datos = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(SnapshotWidgets.self, from: datos)
  }

  static func guardarSnapshot(_ json: String) {
    lock.lock()
    defer { lock.unlock() }
    defaults?.set(json, forKey: claveSnapshot)
  }

  // MARK: Cola de acciones

  /// Encola la acción de un tap (FIFO con tope) y apunta su optimista.
  static func encolarAccion(_ accion: AccionWidget) {
    lock.lock()
    defer { lock.unlock() }
    var cola = leerAccionesSinLock()
    cola.append(accion)
    if cola.count > maxAcciones { cola.removeFirst(cola.count - maxAcciones) }
    var optimistas = leerOptimistasSinLock()
    optimistas[accion.accionId] = Optimista(id: accion.id, hecho: accion.hecho, ts: accion.ts)
    escribir(cola, en: claveAcciones)
    escribir(optimistas, en: claveOptimistas)
  }

  /// Devuelve la cola y la VACÍA, en la misma sección crítica.
  static func tomarAcciones() -> [AccionWidget] {
    lock.lock()
    defer { lock.unlock() }
    let cola = leerAccionesSinLock()
    escribir([AccionWidget](), en: claveAcciones)
    return cola
  }

  /// Optimistas vigentes (accionId -> marca), para pintar la lista.
  static func leerOptimistas() -> [String: Optimista] {
    lock.lock()
    defer { lock.unlock() }
    return leerOptimistasSinLock()
  }

  /**
   * Poda los accionId que ya NO están en la cola: la app los aplicó y el
   * snapshot recién publicado trae la verdad. Los encolados mientras se
   * aplicaba sobreviven.
   */
  static func podarOptimistas() {
    lock.lock()
    defer { lock.unlock() }
    let vivos = Set(leerAccionesSinLock().map(\.accionId))
    let podados = leerOptimistasSinLock().filter { vivos.contains($0.key) }
    escribir(podados, en: claveOptimistas)
  }

  // MARK: Destino de un toque

  /// Destino del toque en un widget, hasta que el WebView lo tome.
  static func guardarDestino(_ destino: [String: String]) {
    lock.lock()
    defer { lock.unlock() }
    escribir(destino, en: claveDestino)
  }

  /// Devuelve el destino y lo BORRA, o nil si no hay ninguno pendiente.
  static func tomarDestino() -> [String: String]? {
    lock.lock()
    defer { lock.unlock() }
    guard let datos = defaults?.data(forKey: claveDestino),
          let destino = try? JSONDecoder().decode([String: String].self, from: datos) else { return nil }
    defaults?.removeObject(forKey: claveDestino)
    return destino
  }

  // MARK: Foto de la casa

  /**
   * Va a un archivo del contenedor compartido y no a UserDefaults: son decenas
   * de KB de JPEG que se reescriben cada vez que cambia la casa.
   */
  static var archivoFotoCasa: URL? {
    FileManager.default
      .containerURL(forSecurityApplicationGroupIdentifier: grupo)?
      .appendingPathComponent("casa.jpg")
  }

  static func guardarFotoCasa(_ datos: Data) throws {
    guard let destino = archivoFotoCasa else {
      throw NSError(domain: "Widgets", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Sin contenedor del App Group \(grupo)"])
    }
    lock.lock()
    defer { lock.unlock() }
    try datos.write(to: destino, options: .atomic)
  }

  static func leerFotoCasa() -> Data? {
    guard let origen = archivoFotoCasa else { return nil }
    return try? Data(contentsOf: origen)
  }

  static func borrarFotoCasa() {
    guard let archivo = archivoFotoCasa else { return }
    try? FileManager.default.removeItem(at: archivo)
  }

  // MARK: Privados (sin lock: solo desde dentro de una sección crítica)

  private static func leerAccionesSinLock() -> [AccionWidget] {
    guard let datos = defaults?.data(forKey: claveAcciones) else { return [] }
    return (try? JSONDecoder().decode([AccionWidget].self, from: datos)) ?? []
  }

  private static func leerOptimistasSinLock() -> [String: Optimista] {
    guard let datos = defaults?.data(forKey: claveOptimistas) else { return [:] }
    return (try? JSONDecoder().decode([String: Optimista].self, from: datos)) ?? [:]
  }

  private static func escribir<T: Encodable>(_ valor: T, en clave: String) {
    guard let datos = try? JSONEncoder().encode(valor) else { return }
    defaults?.set(datos, forKey: clave)
  }
}

// MARK: - Utilidades compartidas

enum ComunWidgets {
  /// Fecha local yyyy-MM-dd (mismo formato que `hoyISO()` de la app).
  static func hoy() -> String {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: Date())
  }

  /// ¿El snapshot es de un día anterior? (el widget lo avisa en vez de mentir)
  static func desactualizado(_ snapshot: SnapshotWidgets?) -> Bool {
    guard let snapshot else { return false }
    return snapshot.fecha != hoy()
  }
}

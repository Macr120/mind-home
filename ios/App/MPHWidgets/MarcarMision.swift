import AppIntents
import Foundation
import WidgetKit

/**
 * Palomear una misión desde la pantalla de inicio. Es el equivalente de
 * `WidgetAccionReceiver.java`: NO ejecuta negocio, solo encola la acción con el
 * estado destino (idempotente) y deja que WidgetKit repinte. La lista la
 * mostrará en optimista hasta que la app se abra, aplique la cola con la lógica
 * real (`core/widgets/acciones.ts`) y re-publique el snapshot.
 *
 * Pide iOS 17: antes de esa versión un widget no puede ejecutar código al
 * tocarlo, así que ahí la fila solo abre la app (ver `FilaMision`).
 */
@available(iOS 17.0, *)
struct MarcarMision: AppIntent {
  static var title: LocalizedStringResource = "Marcar misión"
  /// Sin abrir la app: la gracia es palomear sin salir de la pantalla de inicio.
  static var openAppWhenRun: Bool = false
  /**
   * Fuera de Atajos, Spotlight y Siri: sus parámetros son ids internos
   * («rut:12|0») que a solas no le sirven a nadie. Es el equivalente del
   * `android:exported="false"` que lleva `WidgetAccionReceiver` en el manifiesto.
   *
   * Ponerlo en `true` es, además, la ÚNICA forma de ejecutar este intent en un
   * simulador —donde no se pueden colocar widgets, ver `docs/IOS.md`—: aparece
   * en Atajos, se le teclean los cuatro parámetros y se corre.
   */
  static var isDiscoverable: Bool = false

  @Parameter(title: "id") var id: String
  @Parameter(title: "tipo") var tipo: String
  @Parameter(title: "fecha") var fecha: String
  @Parameter(title: "hecho") var hecho: Bool

  init() {}

  init(id: String, tipo: String, fecha: String, hecho: Bool) {
    self.id = id
    self.tipo = tipo
    self.fecha = fecha
    self.hecho = hecho
  }

  func perform() async throws -> some IntentResult {
    AlmacenWidgets.encolarAccion(
      AccionWidget(
        accionId: UUID().uuidString,
        id: id,
        tipo: tipo,
        fecha: fecha,
        hecho: hecho,
        // Epoch en MILISEGUNDOS: lo ordena `aplicarAccionesPendientes` junto a
        // los `Date.now()` que ya usa el lado JS.
        ts: Date().timeIntervalSince1970 * 1000))
    WidgetCenter.shared.reloadTimelines(ofKind: "MPHMisiones")
    return .result()
  }
}

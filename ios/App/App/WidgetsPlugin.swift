import Capacitor
import Foundation
import WidgetKit

/**
 * Plugin Capacitor local «Widgets»: el puente entre el WebView
 * (`src/core/widgets/`) y los widgets de la pantalla de inicio. Mismo contrato
 * que el de Android (`WidgetsPlugin.java`), método por método, para que
 * `src/core/widgets/plugin.ts` no tenga que saber en qué plataforma corre.
 *
 * Swift nunca decide negocio: guarda lo que la app publica y le entrega lo que
 * el widget encoló.
 */
@objc(WidgetsPlugin)
public class WidgetsPlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier = "WidgetsPlugin"
  public let jsName = "Widgets"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "publicarSnapshot", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "publicarFotoCasa", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "tomarAccionesPendientes", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "hayWidgets", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "tomarDestinoPendiente", returnType: CAPPluginReturnPromise),
  ]

  /// Los `kind` que declara cada widget en `MPHWidgets`.
  private static let kindCasa = "MPHCasa"
  private static let kindMisiones = "MPHMisiones"

  /// Guarda el snapshot, poda optimistas ya aplicados y repinta los widgets.
  @objc func publicarSnapshot(_ call: CAPPluginCall) {
    guard let json = call.getString("json") else {
      call.reject("Falta json")
      return
    }
    AlmacenWidgets.guardarSnapshot(json)
    AlmacenWidgets.podarOptimistas()
    WidgetCenter.shared.reloadAllTimelines()
    call.resolve()
  }

  /// Guarda la foto de la casa (JPEG en base64, sin cabecera `data:`).
  @objc func publicarFotoCasa(_ call: CAPPluginCall) {
    guard let base64 = call.getString("base64") else {
      call.reject("Falta base64")
      return
    }
    guard let datos = Data(base64Encoded: base64, options: .ignoreUnknownCharacters) else {
      call.reject("La foto de la casa no es base64 válido")
      return
    }
    do {
      try AlmacenWidgets.guardarFotoCasa(datos)
    } catch {
      call.reject("No se pudo guardar la foto de la casa", nil, error)
      return
    }
    WidgetCenter.shared.reloadTimelines(ofKind: Self.kindCasa)
    call.resolve()
  }

  /// Devuelve la cola de acciones y la vacía.
  @objc func tomarAccionesPendientes(_ call: CAPPluginCall) {
    let acciones = AlmacenWidgets.tomarAcciones().map { a -> [String: Any] in
      ["accionId": a.accionId, "id": a.id, "tipo": a.tipo,
       "fecha": a.fecha, "hecho": a.hecho, "ts": a.ts]
    }
    call.resolve(["acciones": acciones])
  }

  /**
   * Qué widgets hay colocados: si ninguno, la app ni arma el snapshot. El de
   * chat no cuenta —es un lanzador puro que no consume datos—, igual que en
   * Android.
   */
  @objc func hayWidgets(_ call: CAPPluginCall) {
    WidgetCenter.shared.getCurrentConfigurations { resultado in
      guard case let .success(infos) = resultado else {
        // Sin permiso o sin WidgetKit disponible: mejor no publicar que reventar.
        call.resolve(["hay": false, "casa": false])
        return
      }
      let casa = infos.contains { $0.kind == Self.kindCasa }
      let misiones = infos.contains { $0.kind == Self.kindMisiones }
      // Sin widget de casa colocado, el JPEG del contenedor no le sirve a nadie.
      // Android lo borra en `onDisabled`; WidgetKit no avisa de la retirada, así
      // que el momento equivalente es esta consulta, que la app ya hace sola.
      if !casa { AlmacenWidgets.borrarFotoCasa() }
      call.resolve(["hay": casa || misiones, "casa": casa])
    }
  }

  /// Destino del último toque en un widget ({} si no hay); leerlo lo consume.
  @objc func tomarDestinoPendiente(_ call: CAPPluginCall) {
    guard let destino = AlmacenWidgets.tomarDestino() else {
      call.resolve([:])
      return
    }
    var res: [String: Any] = [:]
    for clave in ["appId", "seccion", "accion"] where destino[clave] != nil {
      res[clave] = destino[clave]!
    }
    call.resolve(res)
  }
}

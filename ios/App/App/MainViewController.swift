import Capacitor
import UIKit

/**
 * El equivalente iOS de `MainActivity.onCreate` en Android: el único sitio
 * donde se registran los plugins Capacitor LOCALES (los que viven en el target
 * de la app, no en `node_modules`).
 *
 * Por qué hace falta: desde Capacitor 6 el puente ya no busca plugins por el
 * runtime de Objective-C. `CapacitorBridge.registerPlugins()` registra los
 * built-in y NADA MÁS que las clases del `packageClassList` de
 * `capacitor.config.json`, y esa lista la reescribe `cap sync` recorriendo solo
 * los paquetes npm (`@capacitor/cli/.../iosplugin.js`). Un plugin local jamás
 * entra ahí, por muy bien que declare `@objc` y `CAPBridgedPlugin`: el puente
 * ni se entera de que existe y todas sus llamadas contestan UNIMPLEMENTED.
 *
 * Y OJO con `registerPluginType(_:)`, que es lo que uno buscaría primero:
 * arranca con `if autoRegisterPlugins { return }`, y `autoRegisterPlugins` vale
 * true por defecto, así que es un no-op SILENCIOSO. El que sirve aquí es
 * `registerPluginInstance(_:)`, que no lleva esa guarda y hace lo mismo que el
 * registro automático (`load(on:)` + exportar el JS del plugin).
 */
class MainViewController: CAPBridgeViewController {
  /// Llamado justo después de crear el puente y ANTES de cargar el WebView,
  /// que es la ventana en la que el registro todavía llega a tiempo.
  override func capacitorDidLoad() {
    bridge?.registerPluginInstance(WidgetsPlugin())
    bridge?.registerPluginInstance(VozArchivoPlugin())
    bridge?.registerPluginInstance(AppleLoginPlugin())
  }
}

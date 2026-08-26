import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Arranque en frío desde el toque en un widget: la URL viene aquí, y
        // `open url` llega DESPUÉS de que el WebView ya preguntó por el destino.
        if let url = launchOptions?[.url] as? URL { AppDelegate.guardarDestinoDe(url) }
        return true
    }

    /**
     * Convierte el toque en un widget en el «destino» que `useWidgets` recoge
     * con `tomarDestinoPendiente`, igual que los extras del Intent en Android.
     * Solo mira el host `widget`: el MISMO esquema lo usa OAuth (`://oauth`).
     */
    static func guardarDestinoDe(_ url: URL) {
        guard url.scheme == "com.macr120.mindhome", url.host == "widget" else { return }
        let partes = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        var destino: [String: String] = [:]
        for parte in partes {
            guard let valor = parte.value, !valor.isEmpty else { continue }
            switch parte.name {
            case "app": destino["appId"] = valor
            case "seccion": destino["seccion"] = valor
            case "accion": destino["accion"] = valor
            default: break
            }
        }
        // Sin `app` ni `accion` no hay a dónde ir: el widget de la casa abre
        // la casa a secas, que es lo que pasa al no guardar destino.
        guard destino["appId"] != nil || destino["accion"] != nil else { return }
        AlmacenWidgets.guardarDestino(destino)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        AppDelegate.guardarDestinoDe(url)
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

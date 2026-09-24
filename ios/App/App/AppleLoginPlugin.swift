import AuthenticationServices
import Capacitor
import Foundation

/**
 * Plugin Capacitor local «AppleLogin»: Sign in with Apple NATIVO (la hoja del
 * sistema con Face ID), en vez de la web de Apple dentro de un Safari
 * incrustado.
 *
 * Por qué existe: el login web de Apple vuelve con `response_mode=form_post`
 * → callback de Supabase → redirección a `com.macr120.mindhome://oauth`. Ese
 * último salto a un esquema propio lo dispara un POST automático, sin toque del
 * usuario, y el Safari incrustado puede no seguirlo: se queda en blanco. Es lo
 * que vio App Review el 24-sep-2026 en un iPad Air (M3) con iPadOS 27.0 (quinto
 * rechazo, 2.1(a)).
 *
 * Swift no decide nada: pide la credencial y devuelve el `identityToken`; el
 * canje por sesión lo hace Supabase (`signInWithIdToken`, en `sesionStore.ts`).
 * El `nonce` llega YA hasheado (SHA-256): Apple lo mete tal cual en el token y
 * Supabase lo compara con el hash del nonce en claro que le pasa la app.
 */
@objc(AppleLoginPlugin)
public class AppleLoginPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding
{
  public let identifier = "AppleLoginPlugin"
  public let jsName = "AppleLogin"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "entrar", returnType: CAPPluginReturnPromise)
  ]

  /// La llamada en curso: la hoja de Apple contesta por el delegado.
  private var llamada: CAPPluginCall?

  @objc func entrar(_ call: CAPPluginCall) {
    let peticion = ASAuthorizationAppleIDProvider().createRequest()
    peticion.requestedScopes = [.fullName, .email]
    if let nonce = call.getString("nonce") { peticion.nonce = nonce }

    // Si quedara una llamada anterior colgada, se cierra antes de pisarla.
    llamada?.reject("Sustituida por un nuevo intento", "SUSTITUIDA")
    llamada = call

    DispatchQueue.main.async {
      let controlador = ASAuthorizationController(authorizationRequests: [peticion])
      controlador.delegate = self
      controlador.presentationContextProvider = self
      controlador.performRequests()
    }
  }

  public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    return bridge?.viewController?.view.window ?? ASPresentationAnchor()
  }

  public func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    guard let call = llamada else { return }
    llamada = nil
    guard
      let credencial = authorization.credential as? ASAuthorizationAppleIDCredential,
      let datos = credencial.identityToken,
      let token = String(data: datos, encoding: .utf8)
    else {
      call.reject("Apple no devolvió el token", "SIN_TOKEN")
      return
    }
    // El nombre solo llega la PRIMERA vez que la persona autoriza la app.
    let nombre = [credencial.fullName?.givenName, credencial.fullName?.familyName]
      .compactMap { $0 }
      .joined(separator: " ")
    call.resolve(["identityToken": token, "nombre": nombre])
  }

  public func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithError error: Error
  ) {
    guard let call = llamada else { return }
    llamada = nil
    let codigo = (error as? ASAuthorizationError)?.code
    if codigo == .canceled {
      call.reject("Cancelado", "CANCELADO")
    } else {
      call.reject(error.localizedDescription, "ERROR_\(codigo?.rawValue ?? -1)")
    }
  }
}

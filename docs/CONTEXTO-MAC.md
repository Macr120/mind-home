# Mind Planner Home — contexto para seguir en la Mac

Pásale este archivo a la sesión de Claude Code que abras en la Mac (basta con
decirle «lee CONTEXTO-MAC.md y sigue»). Lo escribió la sesión de Windows que
preparó el proyecto iOS el 25-ago-2026.

## Qué es esto

**Mind Planner Home (MPH)**: casa isométrica 3D donde cada cuarto es una
mini-app (17 apps + infraestructura). Web con Vite + React + React Three Fiber,
móvil con Capacitor 8, backend en Supabase, compras con RevenueCat. El
desarrollo principal vive en Windows; la Mac es SOLO para compilar iOS.

- Bundle id: `com.macr120.mindhome`
- App Store Connect: Apple ID **6804840611**, versión **1.0**, estado
  *Prepare for Submission*.
- La ficha ya está COMPLETA en los 16 idiomas (textos + 4 capturas de iPhone
  6.9" + 1 de iPad 13" cada uno). No hay que tocar nada de la ficha.

## Lo único que falta: el build

En la Mac hay una carpeta descomprimida del ZIP `MPH-ios-xcode.zip` con esta
forma, y **es autocontenida**: no hace falta Node, ni npm, ni CocoaPods, ni el
`.env` — la web ya viene compilada dentro.

```
MPH-ios/
  LEEME.txt
  ios/App/App.xcodeproj      <- esto es lo que se abre
  ios/App/App/public/        <- la web ya compilada (57 MB)
  node_modules/@capacitor/{app,browser,local-notifications}
  node_modules/@revenuecat/purchases-capacitor
```

### Reglas que NO se pueden romper

1. **`ios/` y `node_modules/` tienen que quedar hermanos.** `Package.swift`
   apunta a `../../../node_modules`. Si mueves `ios/` solo, Xcode dirá
   «Missing package product 'CapacitorApp'».
2. **Se abre `App.xcodeproj`, NO un `.xcworkspace`.** Capacitor 8 usa Swift
   Package Manager, no CocoaPods. No corras `pod install`.
3. **No vuelvas a correr `npx cap sync ios` desde Windows** sin correr después
   `node scripts/arreglar-package-swift.mjs`: en Windows escribe las rutas de
   los plugins con barras invertidas y SPM no las resuelve en macOS.

### Pasos

```bash
xattr -dr com.apple.quarantine ~/Downloads/MPH-ios   # ajusta la ruta
open ~/Downloads/MPH-ios/ios/App/App.xcodeproj
```

1. Espera a que termine «Resolving Package Graph» (baja `capacitor-swift-pm`
   8.5.0 de GitHub; necesita internet). Si se atora:
   *File → Packages → Reset Package Caches*.
2. **Simulador**: elige un iPhone arriba y ⌘R. Para simulador NO hace falta
   Team ni firma. Comprobar: sale la pantalla de idioma, luego la casa 3D y el
   HUD responde. Las compras NO funcionan en simulador (RevenueCat necesita
   dispositivo real); el login con Google abre Safari y vuelve por el deep link
   `com.macr120.mindhome://oauth`, eso sí debe funcionar.
3. **Archivar**: target App → *Signing & Capabilities* → *Automatically manage
   signing* + Team (Apple ID del usuario). Arriba elige **Any iOS Device
   (arm64)** — con un simulador puesto, *Archive* sale en gris. Luego
   *Product → Archive* → *Distribute App* → *App Store Connect* → *Upload*.
4. La build tarda 5–30 min en aparecer en App Store Connect; llega un correo.
   Después se elige en la sección *Build* de la versión 1.0.

## Ya configurado (no hay que volver a hacerlo)

En `ios/App/App/Info.plist`: `CFBundleURLTypes` con el esquema
`com.macr120.mindhome` (deep link del OAuth), las cuatro `NS*UsageDescription`
(cámara, micrófono, fototeca, guardar en fototeca) y
`ITSAppUsesNonExemptEncryption = false` (el único uso propio de cripto es un
SHA-256 en `sync/blobs.ts`, que es hash, no cifrado).
**Sin permiso de ubicación a propósito**, para no contradecir lo declarado en
Play y en App Privacy.

Iconos ya aplanados y **sin canal alfa** (Apple rechaza el icono con
transparencia, ITMS-90717). Versión 1.0, build 1, iOS mínimo 15.0, iPhone +
iPad.

## Lo que sigue bloqueado y NO depende de la Mac

Lo hace el usuario en App Store Connect, no Claude:

- Aceptar el **Apple Developer Program License Agreement** actualizado (sin eso
  no se pueden enviar apps).
- **Teléfono** de contacto en App Review y la **contraseña** de la cuenta de
  revisor `mindplannerhome@gmail.com`.
- **Precio y países** (va Gratis con compras) y el *Paid Applications
  Agreement*.
- Revisar dos cosas: la clasificación por edad quedó en **9+** cuando en Google
  Play, con el mismo contenido (ruleta y blackjack simulados, paintball), salió
  *Teen*; y en **App Privacy** faltan **ubicación aproximada** y **contactos**
  respecto a lo declarado en Play.

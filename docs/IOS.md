# iOS — del `npm run build` a TestFlight

El proyecto nativo vive en `ios/` y lo genera Capacitor, igual que `android/`.
Aquí va lo que NO está en el código: qué hace falta en el Mac, cómo se compila,
qué pide Apple para dejar publicar y dónde están las trampas.

La parte de tienda que es común a las dos plataformas —productos, precios,
webhook de RevenueCat— NO se repite aquí: vive en
[`BACKEND.md`](BACKEND.md) §3e. Este archivo solo cuenta lo que es de Apple.

---

## 1. Lo que hace falta en el Mac

| Pieza | Estado hoy | Nota |
|---|---|---|
| Xcode | 26.5 | `xcode-select -p` → `/Applications/Xcode.app/Contents/Developer` |
| Node | 25.8 | La fase de build de Release lo busca en `/usr/local/bin` y `/opt/homebrew/bin` |
| CocoaPods | No hace falta | Capacitor 8 usa **Swift Package Manager** (`ios/App/CapApp-SPM/Package.swift`) |
| Certificado | «Apple Development: Marco Cabanillas» | Para **archivar** hace falta además uno de distribución, que Xcode crea solo al iniciar sesión con el Apple ID del equipo `9FA4Z58JF3` |

## 2. Compilar y probar

```bash
npm install
npm run build          # la web → dist/
npx cap sync ios       # copia dist/ y actualiza los plugins de Package.swift
npx cap open ios       # abre Xcode
```

En Xcode: seleccionar el esquema **App**, un simulador o el iPhone conectado, ▶.

Desde la terminal, sin abrir Xcode:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath ios/App/build build CODE_SIGNING_ALLOWED=NO
```

**Debug NO recompila la web**: usa el `dist` que ya está copiado en
`ios/App/App/public`. Tras tocar código de la app hay que volver a
`npm run build && npx cap copy ios` (o usar live reload). **Release sí**: la
fase «Compilar la web (solo Release)» del target corre `npm run build` y
`npx cap copy ios` ella sola, que es el espejo del `construirWeb` de
`android/app/build.gradle`. Existe por un motivo concreto: sin ella, archivar
empaqueta el `dist` de la última vez y el `.ipa` sale con la app de hace horas
sin que nada lo avise.

⚠️ **El build de tienda necesita `.env.local`.** Las claves son de compilación
(`VITE_*` entran en el bundle), así que un `.ipa` archivado sin `.env.local` sale
sin cuenta, sin IA y sin cobros — y con la app ya en revisión. Ver
`.env.example`; para iOS es imprescindible `VITE_REVENUECAT_IOS_KEY` (`appl_…`).

## 3. Qué se tocó respecto a la plantilla de Capacitor

| Sitio | Qué y por qué |
|---|---|
| `Info.plist` | Esquema `com.macr120.mindhome://oauth` (el mismo del `intent-filter` de Android; ya está en las Redirect URLs de Supabase), permisos de cámara/micrófono/fototeca, `CFBundleLocalizations` con los 16 idiomas, las 4 orientaciones e `ITSAppUsesNonExemptEncryption=false` |
| `<id>.lproj/InfoPlist.strings` | Los tres permisos traducidos a los 16 idiomas. El original (inglés) vive en el `Info.plist`, como `values/strings.xml` en Android |
| `Assets.xcassets` | Icono 1024 **sin alfa** (el App Store lo rechaza con transparencia) y splash sobre `#0f1115`. Se regeneran con `npm run ios:iconos` desde `public/icon.svg` y `public/favicon.svg` |
| `project.pbxproj` | Versión 1.0.0 (1), equipo `9FA4Z58JF3` y la fase de build de Release |
| `capacitor.config.ts` | `ios.backgroundColor = '#0f1115'`: sin él, entre el splash y el primer render se cuela un fogonazo blanco |

Y en el código compartido, dos cosas que solo se notan aquí:

- **Barra de estado** (`core/ui/barraEstadoNativa.ts`): en iOS el WebView se
  dibuja DEBAJO de la barra, así que la hora se pinta sobre el fondo de la app.
  Sigue al tema desde `aplicarTemaUI`, donde ya se actualizaba el `theme-color`.
- **Descargas** (`core/descargarArchivo.ts`): el `<a download>` no existe en el
  WebView de Capacitor —ni en iOS ni en Android—, así que respaldo, hojas de
  cálculo e imágenes se guardan por la hoja de compartir.

**Sin widgets.** Los tres de Android (`widgets/*.java`) son código nativo propio;
en iOS harían falta una extensión WidgetKit y un App Group. `useWidgets` está
acotado a Android a propósito.

## 3b. Estado del alta (24-ago-2026)

La app ya existe en App Store Connect: **id 6804840611**, bundle
`com.macr120.mindhome`, SKU `mind-planner-home`, versión 1.0 (1), **solo iOS**
(la plataforma macOS se creó por error y se borró: el Mac va por .dmg fuera de
la tienda y por «Designed for iPad»).

| Bloque | Estado |
|---|---|
| Clasificación por edad | ✅ **9+** (12+ Vietnam, A10 Brasil). Solo puntúa el paintball: violencia de fantasía y armas «Infrequent» |
| Derechos de contenido | ✅ Sí (RSS del Diario, datos de Finnhub) |
| App Privacy | ✅ 11 tipos, todos «App Functionality» y ligados a la identidad, **cero rastreo**. Falta pulsar «Publish» |
| Ficha en inglés | ✅ textos + 4 capturas de iPhone 6,9" y 1 de iPad 13" |
| Ficha en español | ✅ textos · ⬜ capturas |
| Los otros 14 idiomas | ⬜ |
| Productos de compra | ⬜ los seis de §3e de [`BACKEND.md`](BACKEND.md) |
| Notas de revisión y build | ⬜ |

**Dos cosas bloquean el envío** y solo las puede hacer el dueño: aceptar el
*Apple Developer Program License Agreement* actualizado (el aviso sale en Apps) y
poner el `.env.local` en el Mac antes de archivar.

**Para el resto de idiomas, usa la API, no el navegador.** El formulario de Apple
es React: `form_input` solo escribe en campos vacíos, no hay «seleccionar todo»
(`cmd+A` se teclea como una letra) y al crear una localización Apple la rellena
copiando el inglés, así que hay que vaciar a base de `Backspace`/`Delete` en
tandas. Y las capturas se suben DE UNA EN UNA: en lote quedan en el orden en que
terminan de subir, no en el que se mandan. `npm run asc:ficha` hace todo eso de
una pasada; solo pide una clave con rol App Manager (Users and Access ›
Integrations) y sus tres variables.

## 4. Subir a la tienda

1. **App Store Connect** → nueva app: bundle id `com.macr120.mindhome`, nombre
   «Mind Planner Home», idioma principal inglés (los 16 del `CFBundleLocalizations`
   se declaran en la ficha para que aparezcan en la ventana de idiomas).
2. **Productos de compra in-app** con los ids EXACTOS de `BACKEND.md` §3e
   (`unlock_casa_v4`, `pro_x1_v2`, `pro_x2_v2`, `pro_x3_v2`, `pro_x1_anual`,
   `creditos_x1`). Apple exige id único global, por eso el suyo va con el bundle
   por delante; `idBase()` lo quita en el cliente y en el webhook.
3. **RevenueCat** → app de iOS: clave `appl_…` a `.env.local`, productos al
   offering `default` en su paquete canónico y webhook activo (el MISMO endpoint
   y `RC_WEBHOOK_AUTH` que la web).
4. **Archivar**: esquema App → destino «Any iOS Device» → Product ▸ Archive →
   Distribute App ▸ App Store Connect. Recompila la web sola (§2).
5. **TestFlight** → probar con una cuenta **sandbox** de Apple que la compra
   entra en `perfiles` y que la MISMA cuenta abre la casa en el navegador.

### Lo que Apple mira con lupa en esta app

- **3.1.1 — compra in-app obligatoria**: en la app nativa el cobro va por IAP y
  la app **no puede enlazar ni mencionar** la compra de la web. Ya está resuelto
  en `canalPago()` (`core/plataforma.ts`): si es app nativa, `iap` y se acabó.
- **5.1.1(v) — borrado de cuenta**: obligatorio y desde dentro de la app. Lo
  sirve la Edge Function `borrar-cuenta` (ver `BACKEND.md`).
- **Permisos**: cada texto del `Info.plist` tiene que explicar el uso REAL. Los
  tres de aquí lo hacen; si algún día se pide otro permiso, se añade con su
  traducción en los 16 `.lproj` **en el mismo cambio**.
- **Privacidad**: la ficha pide declarar qué se recoge. La app funciona 100 %
  local; con cuenta, lo que viaja a Supabase es lo que sincroniza `syncables.ts`.
- **4.8 — Sign in with Apple**: la app ofrece Google, así que Apple también es
  obligatorio. Ya está (mismo flujo de navegador + deep link); el client secret
  caduca a los 6 meses y se regenera con `node scripts/apple-secret.mjs`.

## 5. Cuando algo falla

| Síntoma | Causa |
|---|---|
| La app abre con la versión de ayer | Se compiló en Debug sin `npx cap copy ios` |
| Pantalla blanca al arrancar | `dist/` vacío o `webDir` mal: mirar `ios/App/App/public/index.html` |
| El login social no vuelve a la app | El esquema del `Info.plist` y la Redirect URL de Supabase no coinciden |
| «no encuentro npm» al archivar | Node instalado fuera de `/usr/local/bin` y `/opt/homebrew/bin`: añadir la ruta en la fase de build |
| Un plugin nuevo no existe en tiempo de ejecución | Falta `npx cap sync ios` (y `sync android`, que reescribe sus `.gradle`) |

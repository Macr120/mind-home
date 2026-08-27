# Escritorio — de `npm run build` al `.dmg`

La app de escritorio (macOS y Windows) es un **shell de Electron** que corre
EXACTAMENTE la misma web de `dist/`, igual que Capacitor en el teléfono. No hay
un segundo frontend que mantener: si algo se ve mal aquí, se arregla en `src/`.

Vive en [`escritorio/`](../escritorio) y son tres archivos: `principal.js` (el
proceso principal), `precarga.cjs` (el puente, minúsculo) y el `package.json`
con la configuración de electron-builder.

**No pasa por la Mac App Store**, y eso no es un descuido: el escritorio cobra
directo por RevenueCat Web Billing —sin comisión— y la regla 3.1.1 de Apple no
lo permitiría dentro de su tienda. El Mac también estará en la tienda, pero por
la otra vía: «Designed for iPad» con la app de iOS (ver [`IOS.md`](IOS.md) §3b).

---

## 1. Correr y empaquetar

```bash
npm run escritorio            # abre el shell con el dist/ que ya haya
npm run escritorio:mac        # recompila la web y saca el .dmg  → escritorio/salida/
npm run escritorio:win        # el instalador de Windows (correr EN Windows)
npm run escritorio:iconos     # regenera los iconos desde public/icon.svg
```

La primera vez, `npm install` dentro de `escritorio/` (Electron son ~200 MB y no
tienen por qué vivir en el `node_modules` de la web; la fase de Release de iOS
corre `npm run build` y no necesita nada de esto).

⚠️ **El build de tienda necesita `.env.local`**, igual que iOS: las `VITE_*`
entran en el bundle al compilar, así que un `.dmg` hecho sin él sale sin cuenta,
sin IA y sin cobros.

⚠️ **`npm run escritorio` NO recompila la web.** Usa el `dist/` que haya en
disco. Tras tocar `src/`, `npm run build`.

## 2. Cómo está armado

| Pieza | Qué y por qué |
|---|---|
| **`mph://app/`** | La web NO se sirve por `file://`: un `file://` no tiene origen, y sin origen no hay IndexedDB, ni localStorage, ni service worker — o sea, no hay app. El esquema propio se declara `standard` y `secure`, así que Chromium lo trata como un https y los datos del usuario viven siempre en el mismo sitio entre versiones |
| **Marca en el user agent** | `MindPlannerHome/<versión>` es lo que hace que `esEscritorio()` (`core/plataforma.ts`) responda que sí, y con ello que `canalPago()` devuelva `escritorio` y el pago se vaya al navegador. Se pone a propósito y se limpia la que Electron deriva del nombre: si no, sale duplicada |
| **Nada navega fuera** | `setWindowOpenHandler` + `will-navigate`: cualquier `http(s)` se abre en el navegador del sistema y la ventana no se mueve de `mph://app`. Una ventana de Electron no es sitio para un formulario de pago |
| **Enlace profundo** | `com.macr120.mindhome://oauth`, el MISMO que Android e iOS. Lo reclama `app.setAsDefaultProtocolClient` y el `CFBundleURLTypes` del bundle |
| **Permisos** | Cámara y micrófono (probador de máscaras y dictado) y notificaciones; lo demás se deniega, y solo para nuestro propio origen |
| **Ventana** | Fondo `#0f1115` antes del primer frame (sin él se cuela un fogonazo blanco, igual que en el teléfono), tamaño y posición recordados, mínimo 1024×700 |
| **Menú** | En español, con Editar completo — sin él, ⌘C/⌘V no funcionan en los campos de texto de la app |
| **Permisos traducidos** | El `.app` reusa los `ios/App/App/<id>.lproj/InfoPlist.strings` de iOS, los 16 idiomas. Una sola copia para las dos plataformas; el original inglés va en el `extendInfo` del `package.json` |

## 3. Qué se tocó del código compartido

Dos archivos, y solo por el login social:

- **`core/cuenta/supabase.ts`**: el escritorio usa **PKCE** con
  `detectSessionInUrl: false`, como la app nativa. Su URL es
  `mph://app/index.html`, que ningún proveedor aceptaría como destino.
- **`core/cuenta/sesionStore.ts`**: `entrarConProveedor` abre el navegador del
  sistema (Google RECHAZA el login dentro de una ventana empotrada), y
  `escucharDeepLinkAuth` escucha la vuelta. Lo único que cambia respecto al
  teléfono es QUIÉN avisa: allá el plugin `App` de Capacitor, aquí un evento del
  DOM que emite `precarga.cjs`, para que esa capa no tenga que saber que
  Electron existe.

El resto ya estaba: `PuertaUnlock` y `EditorCuentaSection` llevan meses
distinguiendo el canal `escritorio` y mandando el pago a la web.

## 4. Firmar y notarizar

Son DOS cosas distintas y las dos hacen falta: sin firma Gatekeeper no abre el
`.dmg` en ninguna Mac que no sea esta, y firmado pero sin notarizar tampoco
(`spctl` responde «rejected · source=Unnotarized Developer ID»).

**El certificado ya existe** (creado el 26-ago-2026): *Developer ID Application:
Marco Cabanillas (9FA4Z58JF3)*, en el llavero. Ojo con el de al lado: **Apple
Development NO sirve** aquí, es el de desarrollo. Si algún día hubiera que
rehacerlo: Xcode ▸ Settings ▸ Accounts ▸ el Apple ID del equipo `9FA4Z58JF3` ▸
Manage Certificates ▸ **+** ▸ *Developer ID Application*. Apple solo deja tener
cinco, así que no se crea uno «por probar».

**La notarización** necesita credenciales de App Store Connect. electron-builder
26 admite tres juegos de variables de entorno, y la notarización se activa sola
en cuanto encuentra uno (sin ellas avisa y sigue, no falla):

| Variables | Cuándo |
|---|---|
| `APPLE_KEYCHAIN` + `APPLE_KEYCHAIN_PROFILE` | **La buena**: el secreto vive en el llavero, no en el historial del shell |
| `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER` | Clave de App Store Connect (la misma vía que `npm run asc:ficha`) |
| `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID` | Contraseña específica de app, en claro |

Guardar el perfil una sola vez (lo pide interactivo, no queda en el historial):

```bash
xcrun notarytool store-credentials "MPH" --apple-id "macr120cme@gmail.com" --team-id 9FA4Z58JF3
```

y a partir de ahí:

```bash
APPLE_KEYCHAIN=login.keychain APPLE_KEYCHAIN_PROFILE=MPH npm run escritorio:mac
```

Si el `.dmg` ya está firmado y solo falta notarizarlo, no hace falta recompilar:

```bash
xcrun notarytool submit escritorio/salida/MindPlannerHome-1.0.0-mac.dmg \
  --keychain-profile MPH --wait
xcrun stapler staple escritorio/salida/MindPlannerHome-1.0.0-mac.dmg
```

Comprobar SIEMPRE antes de publicar — esto es lo que verá quien lo descargue:

```bash
spctl -a -vvv -t install "escritorio/salida/mac-universal/Mind Planner Home.app"
```

**Para probar sin nada de esto** en esta Mac: `npm --prefix escritorio run
empaquetar:sinfirmar`.

## 5. Publicar

Los instaladores **no caben en Cloudflare Pages** (límite de 25 MB por archivo;
el `.dmg` universal pesa ~240 MB). Van a **GitHub Releases** y la landing
enlaza ahí — está dicho en [`BACKEND.md`](BACKEND.md). En la landing, las
tarjetas de macOS y Windows de `#descargas` dicen hoy «muy pronto»
(`desc.pronto` en `web/i18n/paginas/<id>.mjs`, los 16 idiomas).

## 6. Trampas que ya costaron tiempo

- **El sellado de tiempo de Apple falla a ratos.** `codesign --timestamp` puede
  devolver «The timestamp service is not available» con la red perfectamente
  bien. Es intermitente: reintentar.
- **El `.dmg` universal pesa ~240 MB** porque lleva los dos Electron (Intel y
  Apple Silicon). Si un día molesta, `arch: ["arm64", "x64"]` saca dos archivos
  más pequeños, a costa de que la landing tenga que preguntar cuál.
- **Esta Mac es Intel**: compila el lado arm64 sin problema, pero no lo puede
  ejecutar. La primera prueba en un Mac con Apple Silicon está pendiente.
- **El primer arranque escribe en `~/Library/Application Support/Mind Planner
  Home`.** Para probar sin ensuciar ese perfil: `--user-data-dir=/tmp/loquesea`.
- **El enlace profundo solo se puede probar de verdad empaquetado**: quien
  enruta `com.macr120.mindhome://` es LaunchServices, y en desarrollo
  (`electron .`) el que queda registrado es el Electron genérico.

## 7. Windows

El mismo `escritorio/` saca el instalador NSIS, pero **hay que correrlo en
Windows** (`npm run escritorio:win`): electron-builder no firma ni empaqueta
para Windows desde macOS sin trampas. El icono cuadrado (`recursos/icono-win.png`)
ya está generado; la firma de Windows es un tema aparte y todavía no se ha visto.

# Escritorio — de `npm run build` al `.dmg` y al `.appx`

La app de escritorio (Windows y macOS) es un **shell de Electron** que corre
EXACTAMENTE la misma web de `dist/`, igual que Capacitor en el teléfono. No hay
un segundo frontend que mantener: si algo se ve mal aquí, se arregla en `src/`.

Son cuatro archivos en [`electron/`](../electron) —`main.js`, `precarga.cjs` y
los dos `.ps1` del modo fondo— más [`electron-builder.yml`](../electron-builder.yml)
en la raíz. Electron y electron-builder viven en las devDependencies de la web:
no hay un segundo `node_modules`.

**Ni el `.dmg` ni el `.exe` pasan por la Mac App Store**, y no es un descuido: el
escritorio cobra directo por RevenueCat Web Billing —sin comisión— y la regla
3.1.1 de Apple no lo permitiría dentro de su tienda. El Mac también estará en la
tienda, pero por la otra vía: «Designed for iPad» con la app de iOS (ver
[`IOS.md`](IOS.md) §3b).

**Los canales** (decididos en ago 2026):

| Plataforma | Canal principal | Secundario |
|---|---|---|
| macOS | `.dmg` notarizado en **GitHub Releases**, enlazado desde la landing | `.zip` (mismo release) |
| Windows | **Microsoft Store** (`.appx`, lo firma la tienda) | `.exe` NSIS **sin firmar** en el release, sin enlace destacado — SmartScreen avisaría de «editor desconocido» |

Los instaladores no caben en Cloudflare Pages (25 MB por archivo contra 240 MB
del `.dmg`), así que los bytes salen de GitHub y la web solo enlaza.

---

## 1. Correr y empaquetar

```bash
npm run escritorio:dev      # el shell contra el servidor de Vite (recarga en caliente)
npm run escritorio:preview  # recompila la web y la sirve desde el shell, como en producción
npm run escritorio:fondo    # el modo fondo de pantalla
npm run escritorio:mac      # build + iconos + dmg/zip  → dist-escritorio/
npm run escritorio:win      # build + iconos + NSIS + appx (correr EN Windows)
npm run escritorio:icono    # regenera los iconos desde public/icon.svg
```

⚠️ **El build de tienda necesita `.env.local`**, igual que iOS: las `VITE_*`
entran en el bundle al compilar, así que un `.dmg` hecho sin él sale sin cuenta,
sin IA y sin cobros.

⚠️ **`npm run escritorio:win` hay que correrlo en Windows.** Desde macOS no se
empaqueta el NSIS ni el appx sin trampas; el script pasa por
`scripts/escritorio-win.mjs`, que rodea el `makeappx` roto de electron-builder.

## 2. Cómo está armado

| Pieza | Qué y por qué |
|---|---|
| **`app://mph`** | La web NO se sirve por `file://`: un `file://` no tiene origen, y sin origen no hay IndexedDB, ni localStorage, ni service worker — o sea, no hay app. El esquema propio se declara `standard`, `secure` y `allowServiceWorkers`, así que Chromium lo trata como un https: contexto seguro (`crypto.subtle`, `getUserMedia`) y `sw.js` registra. Y el origen no se cambia a la ligera: **IndexedDB va por origen**, así que tocarlo dejaría huérfanos los datos de quien ya abrió la app |
| **Marca en el user agent** | `MindPlannerHome/<versión>` es lo que hace que `esEscritorio()` (`core/plataforma.ts`) responda que sí, y con ello que `canalPago()` devuelva `escritorio` y el pago se vaya al navegador. Se pone a propósito y se limpia la que Electron deriva del nombre del producto, o viaja dos veces |
| **Nada navega fuera** | `setWindowOpenHandler` + `will-navigate`: cualquier `http(s)` se abre en el navegador del sistema y la ventana no se mueve de `app://mph`. Una ventana de Electron no es sitio para un formulario de pago |
| **Modo fondo** (`--fondo`) | La casa como wallpaper vivo. En Windows la ventana se cuelga del WorkerW del escritorio (`fondo.ps1`, el truco de Wallpaper Engine) y el shell le reenvía el cursor y los clics con `sendInputEvent`; en macOS basta `type: 'desktop'`. La app entra por la query `?fondo=1` |
| **Enlace profundo** | `com.macr120.mindhome://oauth`, el MISMO que Android e iOS. Lo declara `protocols:` del yml y lo reclama `setAsDefaultProtocolClient` |
| **Permisos** | Cámara y micrófono (Chat AR y dictado) y notificaciones; lo demás se deniega, y solo para nuestro propio origen |
| **Ventana** | Fondo `#0f1115` antes del primer frame (sin él se cuela un fogonazo blanco, igual que en el teléfono) y tamaño y posición recordados entre arranques |
| **Menú** | En español, y **no es decorativo**: sin un menú Editar con sus roles nativos, ⌘C y ⌘V no funcionan en los campos de texto de la app. Electron los cablea desde el menú, no desde el sistema |
| **Permisos traducidos** | El `.app` reusa los `ios/App/App/<id>.lproj/InfoPlist.strings` de iOS, los 16 idiomas, por `extraResources`. Una sola copia para las dos plataformas; el original inglés va en el `extendInfo` del yml |
| **Aviso de versión** | Sin electron-updater en la v1: mira la última release de GitHub y ofrece abrirla. **Sin ninguna release publicada falla en silencio**, así que la v1.0.0 es la que enciende ese aviso |

## 3. El login social, que es de dos lados

Es lo único del escritorio que obligó a tocar código compartido, y el contrato
está partido entre el shell y la app. Si se rompe una mitad, la otra no avisa:

1. `entrarConProveedor` (`core/cuenta/sesionStore.ts`) pide la URL con
   `skipBrowserRedirect` y la abre con `window.open` → el shell la deniega y la
   manda al navegador del sistema. **Google RECHAZA el login dentro de una
   ventana empotrada**, así que esto no es opcional.
2. El usuario entra en su navegador y Supabase lo devuelve a
   `com.macr120.mindhome://oauth?code=…`.
3. El SO despierta al shell: `open-url` en macOS, un argumento más en
   `second-instance` en Windows —se busca por esquema, no con un `includes`, que
   no distinguiría la URL del flag `--fondo`—.
4. `precarga.cjs` reemite la URL como evento del DOM **`mph:enlace-profundo`**.
   Ese nombre ES el contrato.
5. `escucharDeepLinkAuth` canjea el `code` por sesión. Es **PKCE**, como en el
   teléfono (`core/cuenta/supabase.ts`): `detectSessionInUrl: false`, porque la
   URL de aquí es `app://mph/` y ningún proveedor la aceptaría como destino.

La cola de enlaces se vacía en `did-finish-load` y NO en `ready-to-show`: quien
escucha es la app, y hasta que no corre su JavaScript no hay nadie al otro lado.
Abrir la app *desde* el enlace del login es el caso normal, no el raro.

## 4. Firmar y notarizar

Son DOS cosas distintas y las dos hacen falta: sin firma Gatekeeper no abre el
`.dmg` en ninguna otra Mac, y firmado pero sin notarizar tampoco (`spctl`
responde «rejected · source=Unnotarized Developer ID»).

**El certificado existe** desde el 26-ago-2026: *Developer ID Application: Marco
Cabanillas (9FA4Z58JF3)*, en el llavero de la Mac. Ojo con el de al lado:
**Apple Development NO sirve** aquí, es el de desarrollo. Si algún día hubiera
que rehacerlo: Xcode ▸ Settings ▸ Accounts ▸ el Apple ID del equipo ▸ Manage
Certificates ▸ **+** ▸ *Developer ID Application*. Apple solo deja tener cinco.

**La notarización** necesita credenciales de App Store Connect. El yml ya trae
`notarize: true`, así que basta con que electron-builder encuentre uno de estos
juegos de variables (sin ellas avisa y sigue, no falla):

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
xcrun notarytool submit dist-escritorio/MindPlannerHome-1.0.0-mac.dmg --keychain-profile MPH --wait
xcrun stapler staple dist-escritorio/MindPlannerHome-1.0.0-mac.dmg
```

Comprobar SIEMPRE antes de publicar — esto es lo que verá quien lo descargue:

```bash
spctl -a -vvv -t install "dist-escritorio/mac-universal/Mind Planner Home.app"
```

**Para probar sin nada de esto**: `CSC_IDENTITY_AUTO_DISCOVERY=false npm run escritorio:mac`.

## 5. Trampas que ya costaron tiempo

- **`asar: false` no es negociable.** `net.fetch(file://…)`, con el que `main.js`
  sirve `dist/`, pasa por el cargador de Chromium, que **no lee dentro de un
  `.asar`**: empaquetado serviría 404s aunque en desarrollo funcione.
- **`navigator.serviceWorker.ready` NUNCA resuelve** bajo un esquema propio, y
  `reg.getNotifications()` tampoco. Hay que ir por `getRegistration()` y mirar
  `reg?.active`.
- **El sellado de tiempo de Apple falla a ratos.** `codesign --timestamp` puede
  devolver «The timestamp service is not available» con la red perfectamente
  bien. Es intermitente: reintentar.
- **El `.dmg` universal pesa ~240 MB** porque lleva los dos Electron (Intel y
  Apple Silicon). Si un día molesta, `arch: ["arm64", "x64"]` saca dos archivos
  más pequeños, a costa de que la landing tenga que preguntar cuál.
- **La Mac del proyecto es Intel**: compila el lado arm64 sin problema, pero no
  lo puede ejecutar. La primera prueba en un Mac con Apple Silicon sigue
  pendiente.
- **El enlace profundo solo se puede probar empaquetado**: quien enruta
  `com.macr120.mindhome://` es el registro del sistema, y en desarrollo el que
  queda registrado es el Electron genérico.
- **`watch.ignored` de Vite SUSTITUYE la lista de serie**, no se suma. Dejando
  solo `dist-escritorio` el vigilante se come `node_modules` y el dev server
  entra en bucle de HMR sin llegar a montar la app.
- **El primer arranque escribe en `~/Library/Application Support/Mind Planner
  Home`.** Para probar sin ensuciar ese perfil: `--user-data-dir=/tmp/loquesea`.
- **Depurar por CDP**: el puerto 9222 está ocupado en la máquina de Windows; usar
  9333 o 9334.

## 6. Microsoft Store

La identidad del `.appx` la **asignó Partner Center** al reservar el nombre y
está copiada al carácter en el yml (`identityName`, `publisher`, Store ID
`9N893LFZHR0T`): si no coincide, la tienda rechaza el paquete. Y el bloque
`appx.languages` con los 16 locales no es cosmético — **Partner Center saca del
PAQUETE los idiomas de la ficha**, así que sin él la tienda daría MPH por
monolingüe y se caería la ficha en 16 idiomas.

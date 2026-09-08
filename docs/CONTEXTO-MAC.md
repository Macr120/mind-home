# Mind Planner Home — guion para el Mac (versión 1.0.4)

Pásale este archivo a la sesión de Claude Code que abras en la Mac («lee
`docs/CONTEXTO-MAC.md` y sigue»). Lo escribió la sesión de Windows del
7-sep-2026, que dejó **todo commiteado y empujado** en `main` con el tag `v1.0.4`
y construyó ya la web (desplegada), el `.appx`/`.exe` de Windows y el AAB de
Android. En el Mac quedan dos cosas: el **`.dmg` notarizado** (y publicar la
release, que Windows dejó en borrador con el `.exe`) y el **archive de iOS**
para TestFlight. Los runbooks completos son [`ESCRITORIO.md`](ESCRITORIO.md) §4
y [`IOS.md`](IOS.md) §2–§4; esto es el orden exacto para hoy.

## 0. Antes de nada: que el árbol sea EL MISMO que en Windows

Esta comprobación existe porque en agosto un `git pull` que «no traía nada»
costó un día de trabajo duplicado (el shell de escritorio se construyó dos
veces). Si algo de esto no cuadra, **no compiles**: pregunta.

```bash
cd ~/mind-home                                   # ajusta la ruta del clon
git fetch origin && git checkout main && git pull --ff-only origin main
git status -sb                                   # «## main...origin/main», sin ahead/behind ni cambios
git log -1 --oneline                             # debe ser el commit de docs de la 1.0.4 (o posterior)
git rev-parse --short 'v1.0.4^{commit}'          # 5a45cb8 (el tag se movió al commit de la paleta nueva), y debe estar en el historial de HEAD
node -p "require('./package.json').version"      # 1.0.4
grep -c 'path: "\.\./' ios/App/CapApp-SPM/Package.swift   # 8 (rutas POSIX; si sale 0, ver §3)
ls .env.local .env.production                    # los dos existen (si falta .env.production, copiarlo de Windows)
grep -E '^VITE_URL' .env.production              # app.mindplannerhome.com / mindplannerhome.com
npm ci                                           # 3-5 min (trae mediabunny, nuevo en esta versión)
```

## 1. macOS: build firmado y notarización a mano

`electron-builder` firma con el *Developer ID Application: Marco Cabanillas
(9FA4Z58JF3)* del llavero. La notarización se hace **después y a mano**:
encadenarla por `APPLE_KEYCHAIN` rompe la búsqueda del perfil (ESCRITORIO.md §4).

```bash
security find-identity -v -p codesigning | grep "Developer ID Application"   # debe listar el de Marco
# El perfil del llavero se pierde a veces; si el history falla, se rehace (pide la contraseña específica de app):
xcrun notarytool history --keychain-profile MPH >/dev/null 2>&1 \
  || xcrun notarytool store-credentials "MPH" --apple-id "macr120cme@gmail.com" --team-id 9FA4Z58JF3

npm run escritorio:mac                           # 10-15 min → dist-escritorio/MindPlannerHome-1.0.4-mac.{dmg,zip}

xcrun notarytool submit dist-escritorio/MindPlannerHome-1.0.4-mac.dmg --keychain-profile MPH --wait   # «status: Accepted»
xcrun stapler staple dist-escritorio/MindPlannerHome-1.0.4-mac.dmg
xcrun stapler staple "dist-escritorio/mac-universal/Mind Planner Home.app"
spctl -a -vvv -t install "dist-escritorio/mac-universal/Mind Planner Home.app"   # «accepted … source=Notarized Developer ID»

# El .zip de electron-builder se creó ANTES del ticket: se regenera con la .app ya grapada.
rm dist-escritorio/MindPlannerHome-1.0.4-mac.zip
ditto -c -k --sequesterRsrc --keepParent "dist-escritorio/mac-universal/Mind Planner Home.app" dist-escritorio/MindPlannerHome-1.0.4-mac.zip
ls -la dist-escritorio/MindPlannerHome-1.0.4-mac.*   # dmg ~245 MB, zip ~245 MB
```

Abrir la `.app` una vez: arranca sobre `app://mph`, pide cámara/micro cuando
toca (no muere), y la casa persiste al reiniciar. Probar de paso lo nuevo de
esta versión en el escritorio: pulsación larga en un objeto → 🔗 → «Enlace web»
(en macOS no hay pestaña «Programa»: es solo de Windows).

## 2. Publicar la release (Windows la dejó en BORRADOR con el `.exe`)

```bash
gh release view v1.0.4 --json isDraft,assets -q '{draft:.isDraft, assets:[.assets[].name]}'   # draft:true, el .exe dentro
gh release upload v1.0.4 dist-escritorio/MindPlannerHome-1.0.4-mac.dmg dist-escritorio/MindPlannerHome-1.0.4-mac.zip --clobber
gh release edit v1.0.4 --draft=false --latest
gh release view v1.0.4 --json assets -q '.assets[] | .name + "  " + (.size|tostring)'   # 3 activos
curl -sIL https://github.com/Macr120/mind-home/releases/download/v1.0.4/MindPlannerHome-1.0.4-mac.dmg | grep -i '^HTTP' | tail -1   # 200
```

Si el borrador no existiera (algo falló en Windows), se crea completo:
`gh release create v1.0.4 --verify-tag --title "Mind Planner Home 1.0.4 — un clic en tu fondo de pantalla" --notes-file <notas> dist-escritorio/MindPlannerHome-1.0.4-mac.{dmg,zip}`.

Al publicarla, **el aviso de versión nueva** del shell (`/releases/latest`) se
enciende para quien tenga la 1.0.3 instalada por `.dmg`/NSIS (la Store se
actualiza sola). Y queda un paso de vuelta en Windows: `web/index.html` enlaza el
`.dmg` por nombre de archivo → cambiar `v1.0.3/MindPlannerHome-1.0.3-mac.dmg` por
la 1.0.4, `npm run build:web` y desplegar `dist-web` (ver BACKEND.md, Cloudflare).

## 3. iOS: archive → TestFlight

El bump ya está hecho en el `.pbxproj` (`MARKETING_VERSION 1.0.4`,
`CURRENT_PROJECT_VERSION 2`, en App y en MPHWidgets). Capacitor 8 usa SPM, **no**
CocoaPods: se abre `App.xcodeproj`, nunca un workspace.

```bash
npm run build && npx cap sync ios                # copia dist/ a ios/App/App/public (ignorado) y regenera Package.swift
git status --porcelain ios                       # vacío, o Package.swift sin cambios reales (en el Mac escribe rutas POSIX)
grep -c 'MARKETING_VERSION = 1.0.4' ios/App/App.xcodeproj/project.pbxproj   # 4
npx cap open ios
```

Si `Package.swift` apareciera con barras invertidas (solo pasa cuando el `cap
sync` se corrió en Windows): `node scripts/arreglar-package-swift.mjs`.

En Xcode: esquema **App** → destino **Any iOS Device (arm64)** (con un simulador
elegido, *Archive* sale en gris) → *Signing & Capabilities* con firma automática
y equipo **9FA4Z58JF3** en los DOS targets (App y MPHWidgets, comparten el App
Group) → **Product ▸ Archive** (la fase «Compilar la web (solo Release)» vuelve
a compilar la web sola; si dice que no encuentra `npm`, IOS.md §5) → *Distribute
App ▸ App Store Connect ▸ Upload*. El build tarda 5–30 min en aparecer.

## 4. Lo que solo puede hacer el usuario (no Claude)

- **App Store Connect** (app 6804840611): aceptar el *Program License Agreement*
  vigente; en la versión de la ficha cambiar **1.0 → 1.0.4** (si no, el build
  «1.0.4 (2)» no aparece para elegir) y elegirlo; teléfono de contacto y
  contraseña del revisor (`mindplannerhome@gmail.com`); precio/países y el
  *Paid Applications Agreement*; probar en **TestFlight** con cuenta sandbox
  (IOS.md §4.5) y enviar a revisión.
- **Microsoft Store**: subir `MindPlannerHome-1.0.4-win.appx` (copia en
  `C:\Users\macr1\mph-paquetes\`) como envío nuevo en Partner Center.
- **Play Console**: subir `android/app/build/outputs/bundle/release/app-release.aab`
  (`versionCode 6`, 1.0.4) a la pista que toque y escribir las notas.

## Qué trae la 1.0.4 (para las notas de las tiendas)

- **Un clic en el fondo de pantalla** (Windows): tocar un objeto de la casa abre
  su página web, su app de MPH o un **programa del equipo** asignado (nuevo: en
  el diálogo del enlace hay una pestaña «Programa» con el diálogo del sistema).
- **Studio de video** con obra y guion, cámara con efectos, narración y
  exportación a velocidad constante; **publicar en redes** (YouTube, TikTok, Meta).
- **Construcción libre** (muros, pisos y recintos de vértices arbitrarios, techos
  sobre recintos), **deshacer/rehacer** del mapa y **actuación del avatar**
  (emotes, bailes, ejercicio de los asistentes).
- Web: la landing vive en `/acerca`; cuenta del dueño con IA ilimitada.

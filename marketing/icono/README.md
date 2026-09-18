# Paquete de iconos

Las tres figuras de siempre (cuadrado naranja, triángulo rojo, cuarto de círculo
morado) en el acabado con relieve del 7 sep 2026: canto oscuro abajo-derecha,
sombra difusa y brillo en el borde iluminado. Desde el 17 sep 2026 van **sobre
blanco** (`public/icon.svg`) y, donde la plataforma cambia el icono con el
aspecto del sistema, **sobre negro** (`public/icon-oscuro.svg`); el verde oliva
de antes ya no se usa. TODO sale de esos dos SVG y de `public/favicon.svg` (las
piezas solas) con `npm run app:iconos` (`scripts/iconos-app.mjs`); al cambiar
el logo se vuelve a correr y se sube lo generado.

## Dónde cambia solo entre claro y oscuro (y dónde no)

- **iOS 18+**: sí. El catálogo `ios/App/App/Assets.xcassets/AppIcon.appiconset`
  lleva las tres apariencias (clara, oscura y tintada); iOS elige según el
  aspecto de la pantalla de inicio. Las genera `npm run ios:iconos`.
- **Windows (Microsoft Store)**: sí, en la barra de tareas y el menú Inicio: los
  mosaicos `Square44x44Logo.targetsize-N_altform-unplated` (negro) y
  `_altform-lightunplated` (blanco) que genera `scripts/icono-escritorio.mjs`.
  El shell de Electron además cambia el icono de la ventana en caliente
  (`nativeTheme`), en Windows y en el Dock de macOS; el .ico/.icns del
  ejecutable y el acceso directo anclado son fijos (blanco).
- **Web**: el favicon de pestaña (`web/public/favicon.svg`) sigue al aspecto del
  navegador por `prefers-color-scheme` dentro del SVG; el de la app
  (`public/favicon.svg`) son las piezas sin fondo, que sirven en los dos.
- **Android**: no existe icono «oscuro». El launcher usa el blanco (fondo
  `@color/ic_launcher_background`) y en Android 13+ el icono temático
  (capa `monochrome`), que se tiñe con el color del fondo de pantalla. Se
  podría simular con dos `activity-alias` y cambiarlos al abrir la app, pero
  rompe accesos directos y no sigue al sistema en tiempo real: descartado.
- **PWA (manifest)**: no distingue aspecto; va el blanco.

## Qué ya está en uso

- **`android/`** — copia byte a byte de `android/app/src/main/res/mipmap-*/`
  del proyecto: `ic_launcher.png` (cuadrado redondeado) e
  `ic_launcher_round.png` (círculo) para Android < 8, y
  `ic_launcher_foreground.png`, la capa de arriba del icono adaptativo
  (Android 8+): las piezas sin fondo dentro de la zona segura (66 de 108 dp).
  El fondo lo pone `@color/ic_launcher_background` (blanco).
- **`android/adaptive-foreground.png`** (1024×1024) — la misma capa de arriba
  a tamaño grande, por si una tienda o herramienta la pide.

## Qué está listo para subir a las tiendas (no se sube solo)

- **`playstore.png`** (512×512) — icono de la ficha en Play Console.
- **`appstore.png`** (1024×1024, sin alfa) — icono de App Store Connect.
- **`appstore-oscuro.png`** y **`appstore-tintado.png`** — las variantes de
  iOS 18 (opaca sobre negro; gris sin fondo), las mismas que lleva el catálogo
  del proyecto. App Store Connect solo pide la clara.

## Qué queda pendiente de cablear (necesita Mac)

- **`Assets.xcassets/AppIcon.appiconset/`** — catálogo de Xcode con los 25
  tamaños de iOS (ya generados, sin alfa, solo la apariencia clara). El
  proyecto de `ios/` usa un solo 1024 por apariencia (`npm run ios:iconos`).
- **`AppIcon.icon/`** — el mismo icono en formato "Icon Composer" de iOS 26
  (Liquid Glass), sin variante oscura todavía (se añade desde Icon Composer).
  Se referencia desde `Info.plist`/el proyecto Xcode, mismo requisito de Mac.

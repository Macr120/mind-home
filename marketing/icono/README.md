# Paquete de iconos

Las tres figuras de siempre (cuadrado naranja, triángulo rojo, cuarto de círculo
morado) sobre el verde oliva, en el acabado con relieve del 7 sep 2026: canto
oscuro abajo-derecha, sombra difusa y brillo en el borde iluminado. TODO sale
de `public/icon.svg` (con fondo) y `public/favicon.svg` (las piezas solas) con
`npm run app:iconos` (`scripts/iconos-app.mjs`); al cambiar el logo se vuelve a
correr y se sube lo generado. Antes (23 ago 2026) era un pack de appicon.co.

## Qué ya está en uso

- **`android/`** — copia byte a byte de `android/app/src/main/res/mipmap-*/`
  del proyecto: `ic_launcher.png` (cuadrado redondeado) e
  `ic_launcher_round.png` (círculo) para Android < 8, y
  `ic_launcher_foreground.png`, la capa de arriba del icono adaptativo
  (Android 8+): las piezas sin fondo dentro de la zona segura (66 de 108 dp).
  El fondo lo pone `@color/ic_launcher_background`.
- **`android/adaptive-foreground.png`** (1024×1024) — la misma capa de arriba
  a tamaño grande, por si una tienda o herramienta la pide.

## Qué está listo para subir a las tiendas (no se sube solo)

- **`playstore.png`** (512×512) — icono de la ficha en Play Console.
- **`appstore.png`** (1024×1024, sin alfa) — icono de App Store Connect.

## Qué queda pendiente de cablear (necesita Mac)

- **`Assets.xcassets/AppIcon.appiconset/`** — catálogo de Xcode con los 25
  tamaños de iOS (ya generados, sin alfa). El proyecto de `ios/` usa por ahora
  un solo 1024 (`npm run ios:iconos`).
- **`AppIcon.icon/`** — el mismo icono en formato "Icon Composer" de iOS 26
  (Liquid Glass). Se referencia desde `Info.plist`/el proyecto Xcode, mismo
  requisito de Mac.

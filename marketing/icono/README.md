# Paquete de iconos (appicon.co)

Copia del pack `AppIcons (4)` del escritorio (23 ago 2026), con las tres
figuras de siempre (cuadrado naranja, triángulo rojo, cuarto de círculo morado
sobre fondo `#576748`) en el acabado con relieve/brillo de appicon.co.

## Qué ya está en uso

- **`android/`** — YA es el mismo que trae `android/app/src/main/res/mipmap-*/
  ic_launcher.png` del proyecto: los 5 tamaños (48/72/96/144/192) coinciden
  byte a byte. No hace falta tocar nada ahí.
- **`android/adaptive-foreground.png`** (1024×1024, con relieve) NO está en
  uso: el icono adaptativo real (Android 8+, `mipmap-anydpi-v26/ic_launcher.xml`)
  sigue usando el vector plano de `android/app/src/main/res/drawable/
  ic_launcher_foreground.xml`. Los dos acabados (relieve en el ícono estático
  <Android 8, plano en el adaptativo ≥Android 8) conviven ahora mismo — si se
  quiere el mismo acabado en los dos, hay que decidir cuál gana.

## Qué está listo para subir a las tiendas (no se sube solo)

- **`playstore.png`** (512×512) — icono de la ficha en Play Console.
- **`appstore.png`** (1024×1024) — icono de App Store Connect. Trae canal
  alfa; Apple exige el icono de 1024 SIN transparencia — aplanar contra un
  fondo sólido antes de subirlo si el validador lo rechaza.

## Qué queda pendiente de cablear (necesita Mac)

- **`Assets.xcassets/AppIcon.appiconset/`** — catálogo de Xcode con los 25
  tamaños de iOS. Va dentro de `ios/App/App/` cuando exista el proyecto de
  Capacitor para iOS (ver `docs/COMO-TRABAJAR.md`: "iOS con Capacitor requiere
  Mac").
- **`AppIcon.icon/`** — el mismo icono en formato "Icon Composer" de iOS 26
  (Liquid Glass). Se referencia desde `Info.plist`/el proyecto Xcode, mismo
  requisito de Mac.

Generado con appicon.co.

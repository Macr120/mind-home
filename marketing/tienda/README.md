# Capturas de tienda (Play Store · App Store)

Cuatro láminas **en los 16 idiomas de la app**, hechas con capturas reales del
modo demo (casa de Pep@), no con maquetas dibujadas. Fondo blanco con el halo de
color de cada lámina (morado, ámbar, rojo, verde: los colores de la marca).

| # | Escena | Titular (es) |
|---|--------|--------------|
| 1 | La casa demo en isométrica, mediodía | Tu mente, en una **casa 3D** |
| 2 | Calendario · vista Semana | Tu semana, **hora por hora** |
| 3 | Rejilla de cuartos (mosaico de apps) | **17 apps + 2 AR** bajo un mismo techo |
| 4 | El avatar acostado en la cama + chat | Tu asistente **vive ahí dentro** |

El titular 1 es literalmente `hero.h1` de `web/i18n/paginas/<idioma>.mjs`: la
lámina y la portada de la web dicen lo mismo, palabra por palabra. Los otros
tres se escribieron para esta baraja y viven en `generador/copia.json`.

El icono de la app (para subir a Play Console / App Store Connect) vive aparte,
en [`marketing/icono/`](../icono/README.md).

## Qué subir

```
play/<idioma>/01.png … 04.png        1080×1920 — teléfono de Google Play
appstore/<idioma>/01.png … 04.png    1290×2796 — 6.9" del App Store
capturas/<idioma>/01-casa.png …      1170×2532 — la app sola, sin marco ni texto
```

Idiomas: `es en pt fr de it ja zh ko ru hi tr id pl nl ar`.

Si App Store Connect pide además el 6.5", valen los de `appstore/` reescalados a
1242×2688.

```
ipad/<idioma>.png                    2048×2732 — 12.9" del App Store, obligatorio solo si se publica para iPad
feature-graphic-1024x500.png         1024×500 — banner de cabecera de Play
capturas/mapa-completo.png           2048×1000 — el mapa entero, sin marco
```

`ipad/` es UNA sola lámina por idioma (no cuatro): la misma escena y el mismo
titular que la lámina 1 de teléfono («Tu mente, en una casa 3D»), recompuesta
para el aspecto de pantalla del iPad (0.75, no el 0.4621 del teléfono). A este
ancho la app cambia al HUD de escritorio (hamburguesa, reloj, cubo de vista,
barra de chat) en vez del minimal del móvil, así que se oculta entero — igual
que en el gráfico destacado — y queda solo la escena.

**Trampa que costó la sesión**: capturar la escena 3D (WebGL) a más de ~3
megapíxeles hace crashear la pestaña en este entorno (GPU virtual limitada) —
pasó tanto pidiendo 2048×2732 directo como pidiendo `clip.scale:2` sobre un
canvas más chico. La solución: la captura de la app se hace SIEMPRE en nativo
seguro (1024×1366, sin escalar) y el reescalado a 2048×2732 lo hace el propio
`<img>` del HTML de la lámina — eso ya no toca WebGL, es una imagen normal, y
ahí sí aguanta el tamaño completo sin problema.

El gráfico destacado es el **mapa completo** en vista de planta (cenital,
alineada a los ejes — no la isométrica en diamante de las láminas): casa,
canchas, huerto, pistas y alberca, a pantalla completa (full-bleed), con solo
el lockup de marca en una esquina. `bbox-mapa.mjs` calcula el recuadro
recorriendo la escena 3D directamente (la infraestructura no vive en
`layoutStore`, así que `mapFocusPos()` se queda corta). Por ahora solo en
español; se regenera igual que las demás si se quiere en otro idioma.

## Regenerar

`generador/` trae todo. Hace falta el servidor de `mind-home-pruebas` levantado
(puerto 53378, BD aparte de la del usuario) y el Chrome del piloto:

```bash
node marketing/tienda/generador/cdp.mjs arranca
```

Con la app abierta en esa ventana (`http://localhost:53378/`):

```bash
node marketing/tienda/generador/capturar.mjs
node marketing/tienda/generador/exportar.mjs
```

`capturar.mjs` recorre los 16 idiomas: pone `mh.idioma`, recarga, espera a que el
DemoGate reconstruya la casa y saca las 4 escenas a 3× en `shots/<idioma>/`.
`exportar.mjs` las monta en las láminas. Ambos aceptan idiomas sueltos
(`node capturar.mjs de ja`) para rehacer solo uno.

- Los textos, en `copia.json` (una entrada por idioma).
- Colores, encuadre del teléfono y chips flotantes, en `componer.mjs`.
- El marco del teléfono y el fondo, en `plantilla.mjs` (CSS puro, sin imágenes).

Dos cosas que cuestan una sesión si no se saben, y por eso están comentadas en el
código: el render a 3× necesita `gl.setPixelRatio(3)` a mano (el `dpr` del Canvas
lo capa a 1.5), y sin `Emulation.setFocusEmulationEnabled` la pestaña tapada
queda `hidden`, R3F pausa el rAF y el canvas se queda en 300×150.

Para `ipad/` el flujo es igual pero en dos pasos (`generador/capturar-ipad.mjs`
+ `generador/exportar-ipad.mjs`, mismos argumentos de idioma sueltos). Antes de
correrlos, agrandar la ventana del piloto más allá de la pantalla física —
Windows lo permite, Chrome no recorta el viewport a `Emulation.
setDeviceMetricsOverride` si la ventana real no lo cubre:

```bash
node marketing/tienda/generador/resize.mjs   # ajustar el ancho/alto ahí dentro si hace falta
node marketing/tienda/generador/capturar-ipad.mjs
node marketing/tienda/generador/exportar-ipad.mjs
```

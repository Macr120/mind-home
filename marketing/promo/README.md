# Anuncio principal de MPH (Remotion)

~60 s, 1080×1920 a 30 fps, pensado para TikTok/Reels/Shorts: gancho en los dos
primeros segundos, corte cada 2-4 s, titulares cortos en el tercio superior,
sin subtítulos, y el último plano repite el primero para que el bucle no se
note. Sale en los **16 idiomas** de la app (voz, titulares y la propia interfaz
de los clips).

Proyecto Remotion **autocontenido** (deps propias en `package.json`; la raíz
lo excluye de `tsc -b`, ESLint y del vigilante de Vite).

## Los tres comandos

```bash
cd marketing/promo
npm install                      # una vez (Remotion 4.0.523 pinado)
node voz.mjs                     # 1. voz en off edge-tts → public/voz/<id>/
node grabar/grabar.mjs           # 2. clips de la app por CDP → public/clips/<id>/
node preparar.mjs                # 3. arma src/generado/manifiesto.json
npx remotion studio              #    (opcional) revisar en el Studio
node render-todos.mjs            # 4. out/<id>.mp4 (o `es en` para unos pocos)
```

Desde la raíz del repo: `npm run promo:voz`, `promo:grabar`, `promo:preparar`,
`promo:studio`, `promo:render` (aceptan idiomas sueltos tras `--`).

## El anuncio dentro de la app (contenido de fábrica del Studio de video)

```bash
node empaquetar-studio.mjs               # o, desde la raíz, npm run promo:app
node empaquetar-studio.mjs --sin-medios  # solo el montaje (reusa public/promo/)
```

Deja el anuncio como **proyecto de fábrica del Studio de video** de la app: las
tomas en la pista principal (recortadas a lo que usa el montaje, H.264 crf 28,
≈7 MB por set), la captura de escritorio, los rótulos, la voz en off línea a
línea (48 kb/s mono, ≈0,4 MB por idioma, con los silencios de edge-tts
recortados: 0,05 s delante, pausas de 0,4 s y 0,2 s detrás), los efectos de la
carpeta de sonidos de fábrica (`sfx` por toma con el corte, `tras` por escena
DESPUÉS de su línea de voz, en `ESCENAS` del empaquetador) y el cierre.
Escribe `public/promo/` de la app (clips `es` y `en` —el español ve los suyos,
los demás idiomas los ingleses—, el calendario de cada idioma grabado para la
ráfaga «16 idiomas», voces de los 16 y `musica.mp3` si existe) y el montaje
resuelto por idioma en `src/rooms/video/promo.data.ts`. La app lo siembra desde
`src/rooms/video/promo.ts` al abrir el Studio (casa real y demo); es un proyecto
normal, se edita y se borra. Repetir tras cambiar guion, voces o clips.

Todo acepta idiomas sueltos (`node grabar/grabar.mjs es ja ar`). `voz.mjs`
admite `--solo=gancho,cta` y `--rate=+10%`; `grabar.mjs` admite
`--escena=02-casa-gira,07-baile` y `--spike` (deja el crudo del navegador).
Varias grabaciones EN PARALELO (idiomas repartidos): cada instancia con su
puerto CDP y su perfil, `GRABAR_PUERTO=9335 GRABAR_PERFIL=perfil-chrome-2 node
grabar/grabar.mjs id pl` (las descargas van dentro de ese perfil). Tres a la
vez van bien en la RTX 5070 Ti.

## Qué es cada cosa

| Ruta | Qué |
|---|---|
| `guion/<id>.json` | **Fuente de verdad traducible**: líneas de voz, titulares, las 3 líneas del cierre y la llamada a probar. Cambiar texto = editar aquí y repetir `voz.mjs` + `preparar.mjs`. |
| `src/escenas.ts` | El montaje: escenas, tomas, segundos mínimos de cada toma, qué línea suena en cada escena y cuándo entran los titulares. |
| `src/Promo.tsx` / `Escena.tsx` / `Toma.tsx` / `Titular.tsx` / `Cierre.tsx` | Los componentes. Los clips van a pantalla completa con micro-zoom y «punch» en cada corte. |
| `src/fuentes.ts` | Noto Sans (+ JP/SC/KR/Devanagari/Naskh Arabic) desde `public/fuentes/`, copiadas de `marketing/video/fuentes/`. Árabe con `direction: rtl`. |
| `grabar/escenas.mjs` | Una toma por clip: JS que corre DENTRO de la app demo (stores de DEV) para armar la escena y animarla mientras se graba. |
| `grabar/sesion.mjs` | Chrome grabador por CDP (puerto 9334, perfil propio), espera al DemoGate, ayudas inyectadas (`moverCam`, `abrirApp`, `limpiarTodo`, …). |
| `grabar/grabador-pagina.mjs` | El grabador en página: `getDisplayMedia` de la pestaña + MediaRecorder H.264 + descarga. |
| `preparar.mjs` | Escanea voces/clips (con ffprobe), decide la ráfaga de idiomas y la música, y escribe `src/generado/manifiesto.json`. |
| `public/musica.mp3` | **Opcional, la pone el usuario** (pista libre de derechos). Si existe, suena de fondo con ducking bajo la voz. |

## Cómo se decide la duración

Cada escena dura lo que más tarde: la suma de sus tomas o la voz de ese idioma
(más pausas). El sobrante lo absorbe la última toma, y si un clip se queda
corto se ralentiza (nunca se queda en negro). Por eso el alemán o el francés
salen algo más largos que el español sin recortar nada. `voz.mjs` avisa si una
línea se pasa mucho de su tope y la re-sintetiza más rápida (+10/20 %).

## El grabador: trampas que cuestan una sesión

- Necesita el dev server **`mind-home-pruebas`** (localhost:53378) levantado;
  usa la casa demo de Pep@ (`mh.demo=1`) con la UI en cada idioma (`mh.idioma`).
  Reconstruir el demo en un idioma nuevo tarda 1-3 min.
- Chrome se lanza con `--force-device-scale-factor=3` y un viewport emulado de
  360×640 → **1080×1920 físicos**. `getDisplayMedia` exige gesto de usuario: la
  evaluación va con `userGesture: true` y la llamada es lo primero del cuerpo.
- La captura de pestaña toma el **área de contenido real** de la ventana y la
  escala para que quepa en la «pantalla» emulada. Chrome no deja ventanas de
  menos de ~512 DIP, así que `ajustarVentana` mide ese área y declara una
  pantalla emulada igual de grande: la captura sale 1:1 y ffmpeg recorta los
  1080×1920 de la esquina.
- H.264 **nivel 5.1** (`avc1.640033`) primero: con el nivel 4.0 el codificador
  por hardware devolvía un archivo vacío para áreas > 2,1 MP.
- `--auto-select-tab-capture-source-by-title="Mind Planner Home"` salta el
  selector de pestaña (coincide con el `<title>` de la app).
- Si la GPU que imprime no es la dedicada, en Windows › Gráficos pon
  `chrome.exe` en «Alto rendimiento».
- El ciclo día/noche se deja **apagado y fijo a las 11:00** en todas las tomas
  (decisión del usuario: luz plena); el cierre es de media tarde.

## Traducciones

Los 16 `guion/<id>.json` se escribieron en sesión con el glosario de
`scripts/traducir/glosario.mjs` (nada por API). «MPH» y «Mind Planner Home»
no se traducen.

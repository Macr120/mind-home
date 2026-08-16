# Marketing MPH: máscara AR + video en 16 idiomas + publicación

Pipeline completo del video de lanzamiento: grabarte con la cabeza del avatar
(máscara AR), doblar el video a los 15 idiomas restantes con TTS gratis,
quemar subtítulos y publicarlo en Facebook, Instagram, YouTube y TikTok.

## Prerrequisitos (una vez)

```powershell
winget install Gyan.FFmpeg              # build "full": libass + fribidi (árabe OK)
winget install Cloudflare.cloudflared
pip install edge-tts whisper-ctranslate2
```

Fuentes Noto (variables, licencia OFL) ya descargadas en `marketing/video/fuentes/`.

## 1. Máscara AR (grabarte desde el iPhone)

**En casa (dev):**

```powershell
npm run dev:mascara        # terminal 1: dev server (puerto 5175)
npm run mascara:tunel      # terminal 2: túnel HTTPS + QR para el iPhone
```

**En la calle (URL fija, sin PC):** la máscara es 100 % estática, se publica en
Cloudflare Pages (la misma cuenta de la landing). Una sola vez:

```powershell
npx wrangler login
```

y en cada actualización:

```powershell
npm run build:mascara
npx wrangler pages deploy dist-mascara --project-name mascara-mph
```

La URL queda fija (p. ej. `https://mascara-mph.pages.dev`): ábrela en Safari y
usa «Añadir a pantalla de inicio» para tenerla como app. Los ajustes se guardan
por dispositivo.

Escanea el QR con el iPhone y abre la URL en Safari. Calibra con los sliders
(Tamaño/Altura/Profundidad, quedan guardados), elige expresión/peinado/colores,
y en «Cámara» cambia frontal/trasera, lente (la ultra gran angular es el 0.5×),
zoom y linterna según lo que exponga el teléfono.

- **Plan A**: botón rojo de la página (MediaRecorder, saca MP4 y lo comparte a Fotos).
- **Plan B** (si tartamudea): botón «Ocultar» + grabación de pantalla de iOS
  (activa el micrófono en el Centro de Control), y recorta en la PC:
  `ffmpeg -i pantalla.mov -vf "crop=ih*9/16:ih,scale=1080:1920" -r 30 original.mp4`
- **Plan C**: en la PC con webcam, directo en `http://localhost:5175` (sin túnel).

Graba **con la voz limpia y sin música** (la música entra aparte en el montaje).
El master queda en `marketing/video/<slug>/original.mp4` (p. ej. `lanzamiento`).

## 2. Transcribir y traducir (sin gastar API)

```powershell
cd marketing/video/lanzamiento
whisper-ctranslate2 original.mp4 --model small --language es --output_format srt --compute_type int8
# renombra el .srt resultante a es.srt y CORRÍGELO a mano (frases completas de 2-6 s)
cd ../../..
npm run video:guion sacar lanzamiento
```

Rellena `meta.es.json` (título, descripción, hashtags, textos por plataforma).
Después, **en una sesión de Claude Code**: «traduce `guion.pendientes.json` y
`meta.pendientes.json` de marketing/video/lanzamiento a los 15 idiomas siguiendo
`scripts/traducir/glosario.mjs`» → produce `guion.<id>.json` + `meta.<id>.json`.
Reglas extra del video: cada frase debe caber en su presupuesto de `segundos`
(±15 % del español) y como subtítulo (≤ 2 líneas × 42 caracteres).

```powershell
npm run video:guion meter lanzamiento todos
```

## 3. Doblar y montar

Piloto primero (el árabe estresa RTL/fuentes; el inglés se audita de oído):

```powershell
npm run video:doblar lanzamiento ar
npm run video:montar lanzamiento ar
npm run video:doblar lanzamiento en
npm run video:montar lanzamiento en
```

Revisa `salida/ar.mp4` y `salida/en.mp4` **en un teléfono** (subtítulos legibles,
árabe bien ligado, sincronía razonable). Si un segmento «NO CABE», acorta su
traducción en `guion.<id>.json` y repite `meter` + `doblar` de ese idioma. Luego:

```powershell
npm run video:doblar lanzamiento --todos
npm run video:montar lanzamiento --todos
```

Salida final en `salida/`: `<id>.mp4` (subs quemados, para FB/IG/TikTok),
`<id>.sin-subs.mp4` y `<id>.srt` (para YouTube).

## 4. Cuentas y credenciales (las creas TÚ)

> Claude no crea cuentas ni maneja contraseñas: prepara textos, bios y avatares,
> y los scripts. Cada publicación real la confirmas tú.

1. **Facebook**: crea una **página** para MPH desde tu perfil.
2. **Instagram**: cuenta nueva → conviértela en **Business/Creator** y vincúlala
   a la página de FB (Configuración → Cuentas vinculadas).
3. **YouTube**: canal nuevo (puede ser canal de marca de tu cuenta Google).
4. **TikTok**: cuenta nueva.

**App de Meta** (para publicar por API en FB+IG desde el día 1):
[developers.facebook.com](https://developers.facebook.com) → Crear app → tipo
*Business* → **queda en modo desarrollo** (así publica en TUS activos sin App
Review). En Graph API Explorer genera un token de usuario con
`pages_manage_posts`, `pages_read_engagement`, `instagram_basic`,
`instagram_content_publish`; luego:

```
GET /oauth/access_token?grant_type=fb_exchange_token&client_id=<APP_ID>&client_secret=<SECRET>&fb_exchange_token=<TOKEN_CORTO>
GET /me/accounts                                  → access_token de la página (long-lived)
GET /<PAGE_ID>?fields=instagram_business_account  → el IG id
```

**Trámites para automatizar YT/TT en el futuro** (lánzalos ya, tardan semanas):
verificación OAuth + aumento de cuota en Google Cloud (proyecto con YouTube
Data API v3), y audit del Content Posting API en developers.tiktok.com.

`.env.marketing` en la raíz del repo (git lo ignora):

```
META_PAGE_ID=
META_PAGE_TOKEN=
META_IG_ID=
VIDEO_BASE_URL=          # URL pública del túnel que sirve salida/ (solo día D)
GOOGLE_CLIENT_ID=        # futuro (youtube.mjs)
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=    # lo da: node scripts/publicar/youtube.mjs autorizar
TIKTOK_ACCESS_TOKEN=     # futuro (tiktok.mjs)
```

Días antes del lanzamiento: `npm run publicar lanzamiento` (dry-run) y una
publicación de PRUEBA borrable en FB/IG (`--idiomas=es --publicar`).

## 5. Día D (64 publicaciones)

**FB + IG (automático).** Los Reels de IG exigen URL pública; sírvela con:

```powershell
npx serve marketing/video/lanzamiento/salida   # terminal 1 (puerto 3000)
cloudflared tunnel --url http://localhost:3000 # terminal 2 → VIDEO_BASE_URL
npm run publicar lanzamiento -- --publicar     # terminal 3 (confirma el lote)
```

Espacia 25 min entre idiomas (configurable con `--espera`). Lo publicado queda
en `marketing/publicaciones.log.json`; si algo falla, reintenta sin duplicar.

**YouTube (manual, ~90 min).** [studio.youtube.com](https://studio.youtube.com) →
subir los 16 `salida/<id>.mp4` como Shorts: título y descripción de
`meta.<id>.json` (rama youtube), subtítulos `salida/<id>.srt`, idioma del video
= el suyo, programados escalonados. *¿Por qué no API?* 16×1600 u > 10 000 u/día
de cuota, y una app sin verificar bloquea los videos en privado.

**TikTok (manual).** [tiktok.com/upload](https://www.tiktok.com/upload) → los 16
`salida/<id>.mp4` con el caption de `meta.<id>.json` (rama tiktok). *¿Por qué no
API?* Sin audit, los posts salen SELF_ONLY (solo los ves tú).

## Estructura

```
marketing/
  mascara/            mini-app Vite de la máscara (npm run dev:mascara)
  video/
    fuentes/          Noto (OFL) para quemar subtítulos
    <slug>/           original.mp4 · es.srt · guion.*.json · meta.*.json ·
                      <id>.srt · tts/<id>/ · salida/<id>.mp4|.srt
scripts/
  video/              tunel · guion (sacar/meter) · doblar · montar · voces · srt
  publicar/           publicar (orquestador FB+IG) · meta · youtube · tiktok · entorno
```

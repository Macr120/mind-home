# Trámites para abrir «Publicar en redes» a cualquier usuario

Guion paso a paso, por red, para dar de alta la app en Google/YouTube, TikTok y Meta,
desplegar el backend y pasar las revisiones. Versión navegable con casillas y botones
«Copiar»: https://claude.ai/code/artifact/8c15be65-c702-4eae-9c82-7d8ab297f169
(la casilla marcada vive en el navegador; este archivo es la copia de referencia).

**Cómo acompañar al usuario con este documento**: preguntar en qué fase y paso va,
hacer UN paso a la vez, pedirle que confirme lo que ve en la consola antes de seguir,
y anotar aquí (marcando `[x]`) lo que ya quedó hecho. Claude no crea cuentas, no pega
secretos ni introduce contraseñas: prepara textos, comandos y comprobaciones.

El código ya publica en la cuenta de quien pulsa «Publicar» (ver `docs/BACKEND.md` §6 y
la memoria del proyecto). Lo que falta son las altas y revisiones de las plataformas.
Las esperas de las tres revisiones corren en paralelo: hacer las altas seguidas,
desplegar, probar con las cuentas propias y enviar las tres solicitudes el mismo día.
Mientras se aprueban, la función ya sirve a cualquier usuario con los avisos de
«sale privado».

## Valores que se pegan en las tres consolas

| Campo | Valor |
|---|---|
| Página de inicio | `https://app.mindplannerhome.com` |
| Privacidad | `https://mindplannerhome.com/privacidad` |
| Términos | `https://mindplannerhome.com/terminos` |
| Soporte | `https://mindplannerhome.com/soporte` |
| Borrado de datos | `https://mindplannerhome.com/soporte#eliminar-cuenta` |
| Redirect URI (OAuth, las tres redes) | `https://bzwiexwvpimlellfprip.supabase.co/functions/v1/redes-oauth/callback` |
| Paquete Android | `com.macr120.mindhome` |

La raíz `mindplannerhome.com` redirige a la app; como «homepage» se usa la de la app,
pública y con los enlaces legales en el pie. Si Google la rechaza como homepage, servir
una portada mínima en la raíz.

## Fase 0 · Web pública (1 h)

Por qué primero: las tres plataformas rastrean privacidad y términos antes de aceptar
la solicitud; hoy llevan `noindex` y no mencionan las cuentas de redes.

- [x] Quitar `<meta name="robots" content="noindex">` de `web/privacidad.html` y
      `web/terminos.html` (línea 9). Hecho el 3-sep-2026; `cuenta.html` conserva el suyo.
- [x] Añadir el apartado «Cuentas de redes sociales» a la política de privacidad en los
      16 archivos `web/i18n/paginas/<idioma>.mjs` (texto base al final de este documento).
      Debe decir: qué se guarda (tokens cifrados, nombre y foto), para qué (publicar el
      video que el usuario pide), que no se lee nada más, hasta cuándo (desconectar o
      borrar la cuenta), cómo revocar (Cuentas conectadas y los ajustes de cada red), y
      para YouTube la mención a **YouTube API Services** + enlace a la política de Google.
      Hecho: claves `priv.redes.h` / `priv.redes.p` / `priv.redes.youtube` en los 16
      idiomas y sección `#cuentas-redes` en `web/privacidad.html` (ancla estable para
      enlazar desde las consolas).
- [x] Revisar que `/soporte#eliminar-cuenta` diga que al borrar la cuenta se borran las
      conexiones a redes (Meta lo exige como «Data deletion instructions URL»). Hecho:
      `sop.cuenta.p` ampliado en los 16 idiomas.
- [x] Redesplegar la web (3-sep-2026, deployment `8424553f`):

```bash
npm run build:web
npx wrangler pages deploy dist-web --project-name mindplannerhome --branch main --commit-dirty=true
curl -sI https://mindplannerhome.com/privacidad
```

## Fase 1 · Google / YouTube

Consola: console.cloud.google.com, con la misma cuenta Google que administra el dominio.
**Proyecto aparte**: no reutilizar el proyecto del login («Mind Planner Home»); un scope
sensible metería el cliente de Supabase Auth en la misma verificación.

### A · Alta

- [x] Crear el proyecto «MPH Studio». Anotar el **número de proyecto** (lo pide la auditoría).
      Hecho el 3-sep-2026: nombre `MPH Studio`, id `mph-studio`, **número `498842875738`**,
      sin organización. (El del login sigue aparte: `mind-planner-home`, nº 701807121795.)
- [x] APIs y servicios → Biblioteca → «YouTube Data API v3» → Habilitar. Hecho el
      3-sep-2026 en `mph-studio`: `youtube.googleapis.com` en estado «Habilitada».
      Cuota de partida confirmada en la consola: **Queries per day = 10 000** (lo que el
      documento daba por supuesto: 5 subidas al día para toda la app hasta la auditoría).
- [x] Google Auth Platform → Branding: nombre «Mind Planner Home», correo de asistencia,
      página de inicio, privacidad, términos, dominio autorizado `mindplannerhome.com`,
      correo de contacto. **Sin logo por ahora** (subirlo dispara la verificación de marca).
      Hecho el 3-sep-2026. Contacto del desarrollador: `mindplannerhome@gmail.com` **y**
      `macr120cme@gmail.com` (ahí llegan los correos del revisor; mejor dos bandejas).
      **Correo de asistencia = `macr120cme@gmail.com`, PENDIENTE de cambiar**: el
      desplegable solo ofrece la cuenta con la sesión abierta o un grupo de Google que
      administres — no vale escribir otra dirección, y dar Propietario a
      `mindplannerhome@gmail.com` (hecho, en IAM de `mph-studio`) NO lo añade a la lista.
      Para dejarlo en el correo de la app hay que entrar a la consola CON esa cuenta
      (ya es propietaria) y cambiarlo en Branding; se puede hacer en cualquier momento.
- [x] Audience → Externo → **Publicar la app** («En producción»). En «Testing» los refresh
      tokens caducan a los 7 días. Hecho el 3-sep-2026: Público → Estado de publicación =
      «En producción», tipo de usuario «Usuarios externos». Reversible con «Volver al modo
      de prueba» en esa misma página.
- [x] Data Access → añadir `https://www.googleapis.com/auth/youtube.upload` (sensible) y
      `openid`, `email`, `profile`. Hecho el 3-sep-2026: los tres no sensibles y el
      sensible «YouTube Data API v3 · .../auth/youtube.upload» («Se requiere aprobación»).
      Permisos restringidos: ninguno. En ESA MISMA página («Acceso a los datos») están el
      campo **«¿Cómo se usarán los permisos?»** (justificación, 1000 caracteres) y el
      **video de demostración** que pide la verificación del paso B: los dos siguen vacíos.
- [x] Clientes → Crear cliente → Aplicación web «MPH Studio web» → **URIs de
      redireccionamiento autorizados** (no en el campo Nombre: ya pasó una vez) = la
      redirect URI. Copiar ID y secreto. Hecho el 3-sep-2026.
      **ID de cliente** (público): `498842875738-6baibe858od4t8ge23qro0kl53vbhqd6.apps.googleusercontent.com`
      Redirect URI verificada leyéndola de la consola y comparándola carácter a carácter
      con la que arma `callbackUrl()`: **idénticas**. Orígenes de JavaScript: ninguno (el
      intercambio del code es de servidor; la subida va a la sesión resumable, sin OAuth
      desde el navegador). El **secreto lo guardó Marco**, no está en este repo ni en el
      historial del chat; si se pierde, se restablece desde Clientes → «MPH Studio web».
- [x] Search Console → propiedad de dominio `mindplannerhome.com` → TXT en Cloudflare DNS.
      Hecho el 3-sep-2026, ANTES de Branding (Google no acepta un dominio autorizado sin
      verificar). Se descartó la verificación automática de Cloudflare que ofrece Google:
      pide acceso a toda la cuenta DNS. TXT manual en la raíz (`@`, TTL Auto, DNS only):
      `google-site-verification=4RsyeXvyKeTK0W5GTUfpG44nNa5Jz2mjsXFii6lOwZI`.
      **No borrar ese registro**: quitarlo tumba la verificación.
- [ ] Secretos en Supabase: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (fase 4).

### B · Verificación OAuth (Verification Center)

- [x] Grabar el video demo (guion abajo), en inglés, subido a YouTube «No listado». Debe
      verse la barra de direcciones de la pantalla de consentimiento con el `client_id`.
- [x] Branding → Verify branding → Publish branding (automático, minutos).
- [x] Verification Center → declarar scopes, justificación de `youtube.upload` (abajo),
      enlace al video y hasta 3 enlaces (privacidad, soporte). Enviar.
- [ ] Contestar los correos del revisor (3–5 días hábiles por vuelta).

**ENVIADA el 6-sep-2026.** «El equipo de Confianza y Seguridad recibió tu formulario»;
la revisión tarda **4–6 semanas** y el primer correo llega en **3–5 días**. Mientras tanto
«tu última pantalla de consentimiento aprobada sigue en uso», así que nada se rompe. Las
etapas que va marcando la consola: página principal (la primera en revisarse), política de
privacidad, funciones de la app, lineamientos de marca, acceso a los datos adecuados,
permisos mínimos y requisitos adicionales.

Cómo quedó el envío:

- **Video demo**: `https://youtu.be/_HWCCkp-gLo`, subido a mano desde youtube.com como
  **No listado** (el candado de la API que fuerza «privado» no aplica a la subida web),
  1:52, «No, no es contenido creado para niños». En la descripción va el guion numerado,
  el scope único y los enlaces a `/acerca` y `/privacidad`.
- **Cuestionario de verificación** (sale al pulsar «Confirmar», no antes): las cuatro
  preguntas —uso personal, uso interno, solo desarrollo/pruebas, complemento SMTP de
  Gmail para WordPress— van todas en **No**, más las dos casillas de confirmación. Aviso
  de Google en ese diálogo: **cambiar el estado de publicación (prueba↔producción) o el
  tipo de usuario (interno↔externo) durante la revisión la retrasa**. No tocar.
- **Información adicional**: que la app pide cuenta gratuita porque el token se guarda por
  usuario en nuestro servidor, que el flujo completo está en el video, que se puede
  explorar sin cuenta con «Try the app» y que damos credenciales de prueba si las piden.
- Trampa de la consola: el campo del video **no está en «Acceso a los datos»** normal,
  sino en `Centro de verificación → Prepare for verification → Soluciona el problema`,
  que lleva a `/auth/scopes;verificationMode=true` con el campo `videoLink`. Y ahí los
  campos **no aceptan escritura sintética**: hubo que asignar el valor con el setter
  nativo y disparar `input`/`change` para que Angular se enterara.


**Estado real de la consola (5-sep-2026), tras revisarla a fondo.** El proyecto es
`mph-studio` y la consola nueva es «Google Auth Platform», con 7 secciones.

- **Nombre de la app ya estaba bien** («Mind Planner Home»); lo que faltaba era otra cosa.
- **HECHO: los scopes estaban SIN DECLARAR.** Las tres tablas de «Acceso a los datos»
  estaban vacías, y por eso el Centro de verificación afirmaba «no se requiere la
  verificación porque tu app no solicita permisos sensibles» — falso, la app pide
  `youtube.upload`. Declarados `openid`, `userinfo.email`, `userinfo.profile` y
  **`youtube.upload`** (sale como sensible, «Se requiere aprobación»), con la
  justificación en inglés (594/1000). Al guardar, el Centro pasó a decir lo correcto.
- **HECHO: logotipo subido** (el icono de la app a 120×120, que es lo que recomienda
  Google). Antes estaba vacío.
- **La marca sigue SIN verificar, y ese es el motivo de que la pantalla de
  consentimiento enseñe `bzwiexwvpimlellfprip.supabase.co` en vez del nombre de la app.**
  Google solo muestra nombre y logo cuando la marca está verificada y publicada.
- **BLOQUEANTE de fondo**: entre los dominios autorizados está `bzwiexwvpimlellfprip.supabase.co`,
  porque ahí vive la redirect URI. Google exige demostrar la propiedad de cada dominio
  autorizado y ese es de Supabase. Mientras la redirect URI no esté en un dominio propio
  (p. ej. `app.mindplannerhome.com/oauth/redes` con una función que reenvíe a la Edge
  Function), la pantalla seguirá enseñando el host de Supabase.
- **Orden que impone la consola**: «Debes verificar y publicar la información de tu marca
  antes de solicitar la verificación» del acceso a los datos.
- El formulario trae un campo **«Vínculo de YouTube»** para el video demo, y aclara algo
  útil: «La pantalla de app no verificada aparecerá en tu cuenta de prueba. Esto es normal
  y **debe mostrarse en el video**». O sea que ese cartel en el metraje no es un defecto.

**La redirect URI ya vive en NUESTRO dominio (5-sep-2026).** Era el bloqueante para
verificar la marca. Cómo quedó:

- `https://mindplannerhome.com/oauth/redes` **solo reenvía**: una regla en
  `web/public/_redirects` responde 302 al `…/functions/v1/redes-oauth/callback` de
  Supabase **conservando `?code=…&state=…`** (comprobado con `curl`: Cloudflare Pages sí
  los conserva, no hizo falta una Pages Function). El canje del código lo sigue haciendo
  la Edge Function, que es donde vive el client secret. Commit `01ecba3`.
- El código ya lo soportaba: `REDES_CALLBACK_URL` en `redes-oauth/index.ts:44`. Puesto
  con `supabase secrets set`. Verificado pidiendo una URL de autorización desde la app:
  sale `redirect_uri=https://mindplannerhome.com/oauth/redes`.
- **Desplegado SOLO el proyecto del dominio raíz** (`mindplannerhome` ← `dist-web`),
  desde un worktree limpio en el commit: el árbol de trabajo tenía 443 archivos con
  cambios en curso y compilar en local los habría publicado.
- En la consola de Google el cliente tiene AHORA LAS DOS URIs (la vieja de Supabase y la
  nueva). Se añadió la nueva sin quitar la vieja para no dejar el login caído ni un
  minuto; la vieja se puede borrar cuando todo esté probado. Google avisa: **«La
  configuración puede tardar entre 5 minutos y algunas horas en aplicarse»**.
- **PENDIENTE**: TikTok y Meta siguen con la redirect URI vieja registrada en sus
  consolas. Como el servidor ya manda la nueva, sus flujos fallarían por
  `redirect_uri_mismatch` en cuanto se usen. No urge (aún no tienen secretos), pero hay
  que cambiarla antes de probarlos.

**Primer intento de verificar la marca (6-sep-2026): RECHAZADO, con dos motivos concretos.**
Antes se limpió el camino: se quitó del cliente OAuth la redirect URI vieja de Supabase
(ya solo queda la de nuestro dominio) y, con ella, el dominio autorizado
`bzwiexwvpimlellfprip.supabase.co`. Eso sí funcionó: la lista de dominios autorizados es
ahora solo `mindplannerhome.com`, que sí se puede verificar en Search Console.

Lo que Google respondió al pulsar «Verificar la marca»:

- «**Tu página principal está protegida por una página de acceso.**»
- «**En la página principal, no se explica el propósito de la app.**»

Causa: el campo «Página principal de la aplicación» apunta a `https://app.mindplannerhome.com`,
que es la app tras el login. Y la landing que sí explicaba el producto (`web/index.html`,
«Your mind, in a 3D house…») **no se sirve**: `_redirects` manda `/` a la app y
`/index.html` se normaliza a `/` con un 308. Comprobado con `curl`.

Opciones para desbloquearlo: (A) publicar la landing en una ruta propia —p. ej.
`/acerca`— y apuntar ahí el campo, dejando la raíz como está; (B) devolver la landing a
la raíz; (C) convertir `/soporte` en descripción del producto. La A es aditiva y no toca
la decisión de que la portada sea la app.

Tras corregirlo hay que volver: el botón pasó a ser «Ver problemas» → «Corregí los
problemas» → «Solicita la nueva verificación de tu marca». **No se envió nada** en este
intento (el diálogo se canceló), porque los problemas son reales y no un error de Google.

**Segundo intento (6-sep-2026): MARCA VERIFICADA Y PUBLICADA.** Se eligió la opción A.

- `scripts/web-i18n.mjs` copia la landing recién construida como `acerca.html` antes de
  multiplicarla por idioma, así que sale en `/acerca` y en `/<id>/acerca` con su selector,
  su tema y sus enlaces dentro del idioma (80 páginas en vez de 64). Lo único retocado en
  la copia es el logotipo: allí no puede llevar a la raíz, que es la app.
- Desplegado solo `mindplannerhome` ← `dist-web` desde un worktree limpio en el commit.
  Comprobado con `curl`: `/` sigue en 302 a la app, `/acerca` y `/en/acerca` dan **200**.
  La versión inglesa —la que verá quien tenga el navegador en inglés, por la autodetección
  de idioma— trae título, descripción y enlace a la privacidad.
- En la consola, «Página principal de la aplicación» pasó de `https://app.mindplannerhome.com`
  a `https://mindplannerhome.com/acerca`. Guardado y comprobado tras recargar.
- «Ver problemas» → «Corregí los problemas» → «Continuar». La comprobación es **automática
  y sale en el momento**: «Se verificó la información de tu marca, pero aún no se muestra
  a los usuarios. Publícala antes de que venza el resultado verificado dentro de 7 días».
  Ese plazo es real: hay un segundo botón, **«Publicar desarrollo de la marca»**, y sin
  pulsarlo la verificación caduca. Pulsado → «Se verificó la información de tu marca y se
  muestra a los usuarios» (verde, también en el Centro de verificación).

**Ojo con la ventana pequeña de la consola:** el recuadro «Estado de verificación» —el que
lleva el botón— vive en una columna a la derecha que **desaparece por debajo de ~900 px de
ancho**, sin dejar rastro. Con la ventana estrecha la página parece no tener ningún botón
de verificación y solo se ve el aviso del Centro de verificación mandándote a ella.

Queda en amarillo el otro estado del Centro de verificación: **«Data access status — No se
verificó el acceso a los datos de tu app»**, que es el trámite B (los scopes) y necesita el
video demo publicado.
### C · Auditoría de cumplimiento y cuota

- [x] «YouTube API Services – Audit and Quota Extension Form»
      (support.google.com/youtube/contact/yt_api_form): número de proyecto, descripción
      del uso, capturas, enlace a la privacidad con la mención a YouTube API Services y
      la cuota pedida: **50 000 unidades/día** ≈ 30 subidas diarias para toda la app.
      **ENVIADO el 6-sep-2026**: «Gracias por enviar el Formulario de servicios de la API
      de YouTube». La respuesta llega por correo.
- [ ] Al aprobar: `REDES_YT_AUDITADO=1` y `REDES_YT_MAX_DIA` = cuota ÷ 1600 menos margen
      (50 000 → 28).

Mientras no está aprobada: cualquiera puede conectar (pantalla «no verificada», tope
100 usuarios), los videos suben **privados**, cuota 10 000 u/día (5 subidas/día para toda
la app).

**El formulario, enviado el 6-sep-2026.**
Son SIETE secciones que se despliegan solas; lo que se contestó:

| Sección | Respuesta |
|---|---|
| 1 · Tipo | Auditoría de cumplimiento **para solicitar cuota adicional** |
| 2 · Organización | Persona física · desarrollador independiente · categoría «Desarrollo de tecnología y software» · web `mindplannerhome.com` · contacto `macr120cme@gmail.com` (los otros dos contactos, «igual que el principal») |
| 3 · Negocio | Público general · compra única + «otra» (USD 8.99, sin publicidad) · anuncios «no aplicable» · sin representante de Google · canal asociado `UC0A2_8mEVc2X8G3iAIy4MCQ` |
| 4 · Cliente de API | «Mind Planner Home» (no lleva «YouTube» en el nombre) · acceso `app.mindplannerhome.com` · privacidad y términos · **NO es de acceso público** → cupón en «Instrucciones especiales» |
| 5 · Cuota | Proyecto `498842875738` · caso «Carga de videos y administración de cuentas» · OAuth «Sí» · volumen «menos de 1000/día» · endpoint **solo `youtube.videos.insert`** · **50 000 u/día**, 8 000 u/min |
| 6 · Pruebas | Los cuatro archivos obligatorios (abajo) |
| 7 · Certificaciones | Las **ocho** casillas (Marco las autorizó expresamente) |

**Lo que rechaza el envío, en el orden en que salió** (el formulario no dice qué falta
hasta que pulsas «Enviar», y el aviso de abajo del todo es el único que nombra el campo):

1. **«Se requiere confirmación» de la cuenta de demostración** (`demo_account_waiver`): es
   obligatoria aunque NO se den credenciales, porque contestamos «no es de acceso público».
2. **Un octavo consentimiento que no sale con los otros siete**: «Consentimiento para la
   Grabación de la Asistencia». Comparte el `name=data_usage_consent` con el séptimo, así
   que si solo marcas uno el formulario se queda quieto sin decir por qué.
3. **La cabecera del grupo de endpoints es en sí una casilla** (`endpoint_title_1`, valor
   `select_endpoint`). Marcar `youtube.videos.insert` NO basta: hay que marcar también la
   cabecera, o el grupo sale «invalid» aunque la selección esté hecha.
4. Al marcar la cabecera aparecen **campos de cuota POR ENDPOINT** —
   `videos_insert_per_day_1`, `..._peak_1`, `..._justification_1`— aparte de los del
   proyecto (`default_per_day_project_1`…). Hay que rellenar los dos juegos.

- **Por qué «no es de acceso público»**: la puerta de la app es idioma → cuenta → **compra**
  (`PuertaUnlock`), y publicar en redes exige sesión (`MenuExportar.tsx:88`), así que ni con
  el modo «Probar la app» llega el revisor al flujo. En vez de dar contraseñas se emitió un
  **cupón** (`canjear_cupon`, migración `20260818000001`) con `usos_max 5`: el revisor se
  crea su cuenta gratis y lo canjea. Los campos de cuenta de demostración **no son
  obligatorios**, así que quedan vacíos. El código NO se escribe en este repo; se emitió el
  6-sep-2026 desde el editor SQL del panel (`usos_max 5`, `trial_dias 365`) y lo corrió
  Marco: escribir en la BD de producción se lo queda él.
- **Las cuatro pruebas** (un solo archivo por campo, <10 MB, PNG): capturas de la ventana de
  Chrome **con la barra de direcciones**, hechas con `ffmpeg -f gdigrab` sobre el monitor y
  recortadas para quitar la tira de pestañas, la barra de tareas y el aviso «Claude started
  debugging this browser».
  1. `politica-de-privacidad-youtube.png` — portada, la sección «Connected social media
     accounts» (menciona *YouTube API Services*, enlaza los Términos de YouTube y la
     privacidad de Google, y explica la revocación en `myaccount.google.com/permissions`) y
     el borrado de cuenta.
  2. `pagina-principal-vinculo-privacidad.png` — `/en/acerca` y su pie con el enlace legal.
  3. `condiciones-del-servicio.png` — `/en/terminos`.
  4. `flujo-oauth-y-carga.png` — cinco paneles rotulados: pantalla de acceso de HOY (con la
     marca verificada), consentimiento con el permiso único, formulario de publicación,
     el video en el canal y la desconexión.
- **Cuidado con las capturas de las tomas viejas**: la pantalla de consentimiento que se
  grabó el 5-sep enseña `bzwiexwvpimlellfprip.supabase.co` y «Google no verificó esta app»,
  porque es de ANTES de mover la redirect URI y verificar la marca. Va rotulada como tal.
  **El video demo que ya se envió a la verificación de OAuth tiene ese mismo plano.**
- **Trampa de la consola de Chrome**: el formulario tiene 1358 campos, casi todos ocultos
  (hay diez bloques de proyecto). Los de nuestro proyecto son el bloque 1; para dar con los
  `input[type=file]` correctos hubo que marcarlos con un `aria-label` propio y buscarlos por
  ahí. Y ojo: en una pestaña de fondo `getBoundingClientRect()` devuelve 0, así que la
  comprobación de «visible» solo vale con la pestaña al frente.

## Fase 2 · TikTok

Consola: developers.tiktok.com con tu cuenta de TikTok como desarrollador.
Scopes: `user.info.basic`, `video.publish`.


> ⚠️ **CORRECCIÓN (5-sep-2026): las casillas marcadas de esta fase NO están en la consola.**
> Al entrar a cambiar la redirect URI, la app `7681343089528604690` aparece
> prácticamente **vacía**: sin icono, descripción en 0/120, sin URLs legales, **sin
> productos y sin scopes**, y la explicación de revisión en 0/1000. El registro de
> cambios de TikTok solo tiene una entrada: *«Sep 3, 2026 1:41 PM — Created App · Added
> App name: Mind Planner Home»*. Lo único que persistió fue el nombre.
>
> Es decir: el trabajo del 3-sep se hizo pero **nunca se guardó** (la consola de TikTok
> trabaja por borrador con un botón «Save» explícito, y al parecer se salió sin pulsarlo).
> Lo de abajo queda como GUION DE LO QUE HAY QUE HACER, no como registro de lo hecho.
>
> Ventaja: al configurarlo de cero ya se pone directamente la redirect URI nueva
> (`https://mindplannerhome.com/oauth/redes`), sin pasar por la de Supabase.
>
> **RESUELTO esa misma noche (5-sep-2026, 23:47): la app quedó configurada y GUARDADA.**
> El changelog de TikTok ya lo registra. Lo que había impedido guardar el 3-sep salta a
> la vista al intentarlo: **TikTok no deja guardar ni el borrador** sin icono, categoría
> **y un video demo subido** — «This form has 3 errors». Se corrigen los tres o no se
> guarda nada, y de ahí que aquella tarde se perdiera entero.
>
> Cómo quedó: categoría Productivity · icono `electron/build/icon.png` · descripción de
> 98 caracteres · términos y privacidad en `mindplannerhome.com` · plataforma Web con
> `https://app.mindplannerhome.com` · Login Kit + Content Posting API con **Direct Post
> activado** · scopes `user.info.basic`, `video.publish` y `video.upload` (este último se
> añade solo) · redirect URI **ya la nueva**: `https://mindplannerhome.com/oauth/redes` ·
> explicación de revisión de 843 caracteres.
>
> ⚠️ **El video subido es un MARCADOR DE POSICIÓN**, un clip rojo de 4 s que dice
> «PLACEHOLDER - NOT THE DEMO / Replace with the TikTok demo before submitting». Se subió
> solo porque el formulario no guarda sin él. **HAY QUE SUSTITUIRLO** por el demo real de
> TikTok antes de pulsar «Submit for review»; si se envía así, rechazo seguro.
>
> **Meta sí conservó lo suyo**: tiene la redirect URI registrada, y el 5-sep se le añadió la nueva al lado de la vieja (verificado tras recargar).

### A · Alta

- [x] Manage apps → Connect an app: nombre «Mind Planner Home» (sin «TikTok»), icono,
      categoría, descripción, URLs de términos y privacidad. Hecho el 3-sep-2026.
      Ownership **Individual** (coherente con el proyecto de Google «Sin organización»);
      app type **Other**, que NO se puede cambiar después. App id `7681343089528604690`.
      Categoría Productivity. Icono: `electron/build/icon.png` (1024×1024, 28 KB — el
      formulario pide exactamente 1024×1024, hasta 5 MB).
      **La descripción tiene un tope de 120 caracteres**, no cabe un párrafo: quedó
      «Plan your life in a 3D house and publish videos you edit in its Studio to your own
      TikTok account.» (98).
- [x] Plataforma Web: `https://app.mindplannerhome.com`. Android/iOS se añaden cuando la
      app esté en las tiendas (paquete `com.macr120.mindhome`); el OAuth sale al navegador
      en todas las plataformas, con Web basta. Hecho: solo la casilla Web.
- [x] **CORRECCIÓN al documento: TikTok SÍ exige verificar el dominio.** Las tres URLs
      (términos, privacidad y la de la plataforma web) salen en rojo con «This URL is not
      verified» hasta hacerlo. Se hace en **URL properties → Verify properties → Domain**
      (método: registro DNS), que cubre el dominio y sus subdominios de una vez. TXT añadido
      en Cloudflare el 3-sep-2026 (`@`, TTL Auto, DNS only), junto al de Google y sin tocarlo:
      `tiktok-developers-site-verification=P3trNAgprkIvVHOTYY5FawIVejmp3Xmw`.
      Verificado a la primera. Lo que NO hace falta es el «Verify domains» que aparece
      DENTRO del Content Posting API: ese es solo para `pull_by_url`, y la app usa
      `push_by_file`.
- [x] Add products → Login Kit → Redirect URI = la redirect URI. Scope `user.info.basic`.
      Hecho: redirect URI en la pestaña **Web** del Login Kit.
- [x] Add products → Content Posting API → activar **Direct Post**. Scope `video.publish`.
      No hace falta verificar dominio (la app sube el archivo, no una URL) — cierto solo
      para ESTE producto; los enlaces legales sí lo exigen (ver arriba). Hecho.
      **`video.upload` se añade solo** con el producto y no se puede quitar: la app no lo
      usa (nada de borradores, solo Direct Post) y así queda dicho en la explicación de la
      revisión, porque TikTok avisa de que los scopes sin demostrar retrasan el resultado.
- [ ] Client key y Client secret → `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`. Están en
      App details → Credentials, enmascarados y consultables cuando haga falta (a
      diferencia de Google, TikTok no los esconde tras crearlos). Se copian en la fase 4.
- [x] Explicación de productos y scopes para la revisión: escrita y guardada (995 de los
      **1000 caracteres** que admite el campo; a 1000 lo corta a mitad de palabra).
      **Reescrita el 6-sep-2026**, antes de enviar, con tres cosas que el revisor comprueba
      una por una y que faltaban: (1) que la pantalla de publicar se construye desde
      `creator_info` —de ahí salen el nickname y las opciones de privacidad—, (2) que
      **ninguna privacidad viene preseleccionada**, que es requisito de las UX guidelines
      de Direct Post, y (3) qué demuestra cada uno de los tres videos.
      También se corrigió un punto que el revisor podía rebatir: el nickname de la pantalla
      de publicar NO sale de `user.info.basic` sino de `creator_info`; `user.info.basic`
      solo alimenta el nombre y el avatar de «Connected accounts».

### B · Sandbox y prueba propia

- [x] Sandbox → Create sandbox. El sandbox tiene **su propio** client key/secret: durante
      las pruebas van en Supabase; al enviar a revisión se vuelven a poner los de producción.
      **Creado el 6-sep-2026: «MPH pruebas», id `7682300713170913288`**, marcando «Clone
      from Production or an existing Sandbox» → «Clone from **Draft**» (la app aún no está
      aprobada, así que lo que hay que clonar es el borrador). Se llevó todo: categoría,
      icono, URLs legales, Login Kit, Content Posting API, los tres scopes y la redirect
      URI `https://mindplannerhome.com/oauth/redes`.
- [x] Target users → Add account: lo tiene que hacer **Marco a mano**. «Continue» abre el
      login de TikTok en una VENTANA EMERGENTE, y un clic sintético (CDP) no la dispara —
      el diálogo se cierra y no pasa nada. Además pide la contraseña de TikTok.
      Hecho el 6-sep-2026: usuario `mindplannerhome`.
- [x] **Cuenta conectada desde la app** (6-sep-2026, 13:39). El `estado` del servidor
      devuelve `{plataforma:'tiktok', nombre:'mindplannerhome', estado:'ok'}` con el token
      válido 24 h. La pantalla de autorización pedía exactamente dos permisos («Access your
      profile info» y «Post content to TikTok») y la app que aparecía era **Mind Planner
      Home (Sandbox)**, con el `client_key` del sandbox: los secretos llegan bien.

⚠️ **La app se queda en «Waiting for you to come back from TikTok…» aunque la conexión
haya funcionado**: el navegador se queda en la página de la Edge Function y la vuelta al
escritorio no dispara. Se arregla recargando la app (el `estado` se refresca y aparece
conectada). Y ojo: **pulsar «Continue» dos veces da «Enlace caducado»** — el `state` es de
un solo uso (`delete ... returning` en `redes-oauth/index.ts:137`), así que el segundo
envío no encuentra la fila. Eso es lo que pasó aquí; la conexión ya estaba hecha.
- [ ] Publicar un video de prueba desde el Studio (sale «Solo yo») y comprobarlo en el perfil.
      **Intentado el 6-sep-2026 y RECHAZADO por TikTok**: «Please review our integration
      guidelines at https://developers.tiktok.com/doc/content-sharing-guidelines/».

      Lo que SÍ funciona (comprobado en la misma prueba): el diálogo trae la cuenta y sus
      opciones desde `creator_info` — `{nickname:'mindplannerhome', privacidad:
      ['PUBLIC_TO_EVERYONE','MUTUAL_FOLLOW_FRIENDS','SELF_ONLY'], comentarios/duet/stitch:
      true, max_duracion_seg:600, auditado:false}`. O sea: token válido, scope concedido,
      `SELF_ONLY` permitido y cero posts en el día. Falla en `video/init`, no antes.

      **Causa: `unaudited_client_can_only_post_to_private_accounts`.** La referencia de la
      Direct Post API lo dice tal cual: *«unaudited clients can only post to private
      accounts»*. Poner `privacy_level = SELF_ONLY` NO basta — **la cuenta de TikTok en sí
      tiene que estar en privado** mientras la app no pase la auditoría. Se cambia en la
      app de TikTok: Perfil → ☰ → Configuración y privacidad → Privacidad → **Cuenta
      privada**. (TikTok devuelve el mensaje genérico sin el código, así que esto es
      deducción: encaja con la restricción documentada y con que todo lo demás responde
      bien.) Al aprobar la auditoría se puede volver a poner pública.

      **Con la cuenta en privado, la subida PASA** (6-sep-2026): `video/init` acepta,
      el archivo sube entero (`{"recibido":827373,"completo":true}`) y TikTok lo procesa.
      Pero lo rechaza al final: **`frame_rate_check_failed`**. Y `creator_info` cambió a
      `['FOLLOWER_OF_CREATOR','MUTUAL_FOLLOW_FRIENDS','SELF_ONLY']`, sin
      `PUBLIC_TO_EVERYONE`: prueba de que el cambio de cuenta a privada surtió efecto.

- [x] **RESUELTO (6-sep-2026): «Published on TikTok».** Ver abajo el diagnóstico y el
      arreglo. El archivo que TikTok aceptó: VP9 1280×720, **`avg_frame_rate` 30/1**,
      204 fotogramas, duración declarada 7,08 s.

- [x] ~~**BLOQUEANTE: el video que exporta el Studio no pasa el chequeo de frame rate de
      TikTok.**~~ Medido sobre el archivo real (descargado con «Download» y `ffprobe`):
      VP9 1280×720, **207 fotogramas en 6,80 s ≈ 30 fps** — o sea, la velocidad REAL está
      bien. Lo que falla es la metadata: `avg_frame_rate=0/0` y `format=duration=N/A`.
      El contenedor no declara ni duración ni frame rate.

      Es consecuencia de cómo se exporta (`src/rooms/video/exportar.ts`): `MediaRecorder`
      sobre `canvas.captureStream(0)` con `requestFrame()` disparado por un `setInterval`
      de `1000/FPS_EXPORT`. Eso produce **frame rate VARIABLE** y un contenedor de flujo
      en vivo sin duración. TikTok exige frame rate constante entre 23 y 60 fps.

      Descartado que sea por tener la ventana tapada (Chromium estrangula los timers a 1 Hz
      en segundo plano): se reintentó con la app en primer plano y subió **exactamente los
      mismos 827 373 bytes** — «Retry» reintenta la SUBIDA, no la exportación, y el
      proyecto guarda el export cacheado. YouTube sí acepta estos archivos porque
      recodifica; TikTok no.

      **Medido sobre el archivo REAL que se sube** (interceptando el cuerpo de la
      petición, no el del botón «Download», que sale en otro formato):

      | Intento | Contenedor | Fotogramas | Duración | fps |
      |---|---|---|---|---|
      | Original | MP4 · H.264 | 135 | 6,996 s | **19,3** |
      | Solo WebM | WebM · VP9 | 135 | 6,8 s | **19,4** |
      | WebM + `captureStream(30)` | WebM · VP9 | 132 | 6,81 s | **19,4** |
      | «Download» con la máquina en reposo | WebM · VP9 | 207 | 6,80 s | 30,4 |

      **Dos hipótesis probadas y DESCARTADAS:**

      1. *Que fuera cosa del contenedor o de la metadata.* No: el MP4 traía duración y
         `avg_frame_rate` correctos (19,78). La metadata está bien; los fps son bajos de
         verdad.
      2. *Que `captureStream(FPS_EXPORT)` lo arreglara* dejando que el compositor emita a
         ritmo fijo y repita el último frame. No: el compositor tampoco captura más rápido
         de lo que el hilo principal PINTA, así que da los mismos fps — y además se congela
         con la ventana tapada, que es justo lo que el diseño actual evita. Revertido.

      **Causa real: el render en tiempo real no llega a 23 fps con la máquina cargada.**
      Con ella en reposo sí (30,4). O sea que hoy publicar en TikTok desde el Studio
      funciona o no según lo ocupado que esté el equipo, lo cual no se puede enviar así.

      **Lo único que queda es recodificar a ritmo constante** después de grabar,
      duplicando fotogramas hasta 30 fps sin tocar la duración:
      - `ffmpeg.wasm` con `-r 30`: seguro y probado, pero ~30 MB de wasm en un proyecto
        que ya pelea con el tamaño del paquete.
      - `WebCodecs` (`VideoDecoder`/`VideoEncoder`) + `mp4-muxer` y un demuxer: ~250 KB y
        acelerado por hardware, pero es escribir el pipeline entero.

      **ARREGLO (6-sep-2026): un segundo grabador, `grabarConCodecs` en `exportar.ts`.**
      No recodifica después: graba bien desde el principio con **WebCodecs**, y la clave
      es que **los timestamps salen de la línea de tiempo, no del reloj** —
      `CanvasSource.add(i / 30, 1 / 30)`. Si el render se retrasa, el mismo lienzo sale
      varias veces y la velocidad NO baja. No se desincroniza con el audio porque el motor
      ya lleva su reloj por tiempo real: cuando el render tarda no se queda atrás, se salta
      posiciones, y los fotogramas repetidos rellenan justo esos huecos.

      - Librería: **`mediabunny`** (MPL-2.0), por `import()` → trozo perezoso de 232 KB,
        fuera del arranque. Da `Output` + `CanvasSource` + `MediaStreamAudioTrackSource`,
        que recibe la pista de audio que el exportador YA construye (`destino.stream`), así
        que no hizo falta ningún AudioWorklet. Se descartó `ffmpeg.wasm` (~30 MB) y también
        `webm-muxer`+`mp4-muxer` (MIT pero sin releases desde julio 2025, y solo muxean).
      - **Solo al publicar** (`PublicarDialog.tsx` pasa `codecs: true`). Descargar sigue
        con MediaRecorder. Por eso `firmaExport` lleva ahora el grabador: los dos caminos
        pueden coincidir en contenedor y NO son el mismo archivo.
      - Si no hay `VideoEncoder`/`AudioEncoder`, `soportaCodecs()` devuelve false y se cae
        al grabador de siempre.
      - `add()` captura el lienzo AL LLAMARLO, así que no se puede diferir con una cola de
        promesas: se llama en el acto y solo se espera la última promesa, que hace de freno.

      **Cambio aplicado de paso** (`PublicarDialog.tsx`): TikTok deja de pedir MP4. Su
      documentación acepta WebM/VP9, y el codificador H.264 es el más caro de los dos
      (30,4 fps en WebM contra 19,3 en MP4 en la misma máquina en reposo).

⚠️ **La consola de TikTok enseña las credenciales del sandbox EN TEXTO PLANO** en cuanto se
abre «App details → Credentials» (a diferencia de Google, que las esconde tras crearlas).
No se copian a este repo ni al chat: se leen de la pantalla y se pegan directamente en
`npx supabase secrets set`.

⚠️ **La consola de TikTok NO responde a los clics si su pestaña está en segundo plano**: el
botón responde pero el diálogo no se abre, y los valores escritos por código (`value` +
evento `input`) no llegan al estado de React — el formulario se queda en blanco y «Confirm»
no hace nada. Hay que tenerla al frente y teclear con eventos de teclado de verdad.

### C · Revisión y audit

- [x] Video demo del flujo completo (hasta 5 videos de 50 MB): entrar, Conectar TikTok,
      consentimiento, pantalla de publicar con nickname, privacidad, interruptores de
      comentarios/dúo/stitch, contenido comercial con casillas y texto de consentimiento,
      y el video ya en TikTok. El dominio visible debe ser el declarado.

      **HECHO el 6-sep-2026: el marcador rojo ya NO está.** Tres archivos en su lugar,
      comprobado recargando la página entera (el chequeo que destapó la pérdida del 3-sep):

      | Archivo | Qué demuestra | |
      |---|---|---|
      | `2-conectar.mp4` | Login Kit · `user.info.basic`: desconectar, conectar y la pantalla «**Mind Planner Home (Sandbox)** wants to access your TikTok account» con sus dos permisos y el `client_key` del sandbox en la barra | 60 s |
      | `1-publicar.mp4` | Content Posting API · `video.publish`: el formulario entero —cuenta, título, privacidad con el aviso de revisión, comentarios/dúo/stitch, contenido comercial desplegado con «Your brand» y su etiqueta «Promotional content», consentimiento de música— y «Published on TikTok» | 63 s |
      | `3-en-tiktok.mp4` | Los tres videos en TikTok Studio, todos en «Only me» | 12 s |

      Trampas de la grabación, para no repetirlas:

      - **Grabar en MKV, nunca en MP4.** El proceso de `ffmpeg` muere cuando termina la
        llamada de la herramienta, y un MP4 sin cerrar no tiene `moov` → archivo inválido.
        MKV aguanta el corte; luego se convierte con `-c copy`.
      - **Cada comando devuelve el foco a la ventana de Claude**: una toma entera grabó
        esta conversación en vez de la app. Se arregla fijando la ventana como TOPMOST
        (`scratchpad/encima.ps1`) y, si hay que cambiar de ventana a media toma, haciéndolo
        DESDE el propio script de la coreografía, que corre en una sola llamada.
      - **`scrollIntoView` mueve el botón**: leer sus coordenadas justo después da la
        posición vieja y el clic cae en el vacío. Hay que traerlo a la vista, esperar, y
        LEER DESPUÉS.
      - **La consola de TikTok no responde a los clics de CDP con su pestaña en segundo
        plano**, pero sí a `elemento.click()` por JavaScript. La subida de archivos
        (`DOM.setFileInputFiles`) sí funciona de fondo.
      - Los intentos fallidos gastan **nuestro** límite de 10 publicaciones/24 h
        (`redes-pub-tiktok`); se vacía con `delete from rate_limits where bucket = '…'`.
- [x] Submit for review con la justificación por scope. 1–2 semanas.
      **ENVIADO el 6-sep-2026**: la consola marca **Production «In review»**. El diálogo de
      envío pide además un motivo de **120 caracteres** (aparte de la explicación de 1000):
      «First submission. Login Kit and Content Posting API (Direct Post) to publish videos
      made in the app Studio.»
      Mientras dure la revisión: **no tocar la app** (la consola trabaja por borrador y un
      cambio a medias puede invalidar el envío) y **dejar la cuenta de TikTok en privado**,
      que es lo que permite publicar sin auditar.
      Lo más probable que pregunten: `video.upload`. Respuesta: viene atado al producto, no
      se puede quitar, y la app no lo usa porque no hay borradores, solo Direct Post.
      **Seguimiento 10-sep-2026 (día 4): sigue «In review»** — la app abre en
      `/app/7681343089528604690/**pending**`, con el aviso *«This version of Mind Planner
      Home is in review. There may be a delay in the app review process due to a high
      volume of requests»*. Sin comentarios del revisor («Review comments» vacío) y con los
      tres videos demo en su sitio. No hay nada que hacer más que esperar; recordatorio:
      no tocar la app y dejar la cuenta de TikTok en privado.
- [ ] Con la app aprobada, pedir desde el producto Content Posting API el **audit** que
      quita el «Solo yo».
- [ ] Al aprobar: `REDES_TIKTOK_AUDITADO=1`.

Mientras no está aprobada: solo los target users del sandbox pueden conectar; posts
«Solo yo»; 15 posts/día por cuenta y 6 llamadas/min (la app los respeta). Rechazos
típicos: scopes de más, sitio a medio hacer, nombre que no coincide o menciona otra red.

## Fase 3 · Meta (Facebook + Instagram)

Consola: developers.facebook.com. Permisos: `pages_show_list`, `pages_read_engagement`,
`pages_manage_posts`, `instagram_basic`, `instagram_content_publish`.
Facebook solo publica en Páginas e Instagram solo en cuentas profesionales vinculadas a
una Página: hacen falta para probar (la app se lo explica al usuario que no las tenga).

### A · Cuentas de prueba propias

- [x] Página de Facebook (facebook.com/pages/create). Creada el 3-sep-2026:
      **«Mind Planner Home»**, categoría *App page*, id `61593954365814`
      (facebook.com/profile.php?id=61593954365814), web `https://mindplannerhome.com`,
      foto de perfil = `electron/build/icon.png`. Se creó una Página NUEVA a propósito, en
      vez de reutilizar otra que ya existía: los videos de prueba y del screencast se
      publican de verdad en la Página que se elija.
      Sin teléfono (dato personal, y la Página es pública), sin WhatsApp y **sin invitar a
      nadie**. Queda pendiente si se quiere: foto de portada y apagar «Marketing &
      promotional emails» (Configuración → Notificaciones), que viene activado de fábrica.
- [x] Instagram → Configuración → Tipo de cuenta → Profesional; Página → Configuración →
      Cuentas vinculadas → Instagram. Hecho el 3-sep-2026: cuenta **NUEVA** `@mindplannerhome`
      (nombre «mph»), tipo **Business** (no Creator: la vía documentada para publicar por
      `instagram_content_publish` es Business, y las Creator han arrastrado restricciones),
      vinculada a la Página desde Facebook → Configuración → Cuentas vinculadas.
      Comprobado en «Connected Instagram»: «You have access to manage the Mind Planner Home
      Facebook Page, so you also have access to manage the @mindplannerhome Instagram
      account». Pendiente de rellenar: foto de perfil, web y bio de la cuenta (vacías).
- [x] Business Portfolio en business.facebook.com. **Meta lo creó solo** al crear la
      Página, con el nombre «mph» y sin datos. El 3-sep-2026 se dejó como
      **«Mind Planner Home»**, id `1749756319389874`, **Página principal** = la Página de
      MPH. Business Suite muestra la Página y `@mindplannerhome` juntas en el portafolio.
      **FALTA, y lo pone Marco** (son datos legales suyos, y tienen que coincidir con los
      documentos oficiales o la verificación se cae): nombre legal, dirección, teléfono
      de negocio y web, en Configuración → Información del portafolio → Business details.

### B · Alta de la app

- [ ] My Apps → Create app → caso «Otro» → tipo **Business** → «Mind Planner Home»,
      correo, Business Portfolio.
      **La consola cambió**: ya no hay «Otro» ni tipo de app; el asistente es
      App details → Use cases → Business → Requirements → Overview. El equivalente a
      «Otro» está en el filtro **Others (5)** → **«Create an app without a use case»**
      («an app ID without adding any permissions, features or products»), que es lo que
      deja pedir después exactamente los cinco permisos sin arrastrar los de un caso de uso.
      Antes de esto hay que estar en el **perfil personal**, no actuando como la Página:
      con la Página activa, developers.facebook.com no reconoce sesión y ofrece «Get Started»
      en vez de «My Apps». Y la cuenta tiene que estar registrada como desarrollador
      (acepta las Condiciones de la plataforma y verifica por teléfono/correo).
- [x] App settings → Basic: icono 1024×1024, categoría, URL de privacidad, URL de
      términos, **User data deletion → Data deletion instructions URL** (borrado de datos),
      App domains `mindplannerhome.com`, Add platform → Website
      `https://app.mindplannerhome.com`. Copiar App ID y App secret.
      Hecho el 3-sep-2026 y **verificado recargando la página** (no fiarse de la pantalla:
      App domains no se guardó al primer intento y hubo que repetirlo).
      **App ID `1160399086438498`**. Categoría *Utility & productivity*. Plataforma: solo
      **Website** — Android e iOS se añaden cuando la app esté en las tiendas.
      Ojo: **Términos y Borrado de datos vienen rellenos con `https://www.facebook.com/`**
      de fábrica; hay que sustituirlos, no añadir.
      **Falta el icono**: Meta no expone un `input[type=file]`, abre el diálogo nativo del
      sistema. Lo sube Marco a mano con `electron/build/icon.png` (1024×1024).
      **Ya subido** (`appstore.png`, comprobado el 6-sep-2026).
      El **App secret** sigue sin copiarse (App settings → Basic → Show).
      **Repasado entero el 6-sep-2026 y todo sigue en su sitio**: App ID, nombre, correo de
      contacto, privacidad, términos, borrado de datos, App domains `mindplannerhome.com`,
      categoría *Utility & productivity* e icono. Nada se perdió desde el 3-sep.
- [x] **Casos de uso añadidos** (3-sep-2026): «Manage everything on your Page» (Pages API,
      da los `pages_*`) y «Manage messaging & content on Instagram» (Instagram API).
      Meta pregunta al añadirlas y las ACEPTA juntas en la misma app — era el riesgo que
      había que despejar, porque el código asume una sola app para Facebook e Instagram.
      Avisa eso sí: «These use cases have different requirements in order to access data».
      Al añadirlas aparece solo el producto **Facebook Login for Business** en el menú,
      con Settings / Quickstart / Configurations / Templates.
- [x] Facebook Login for Business → Settings → **Valid OAuth Redirect URIs** = la redirect
      URI. Si la consola obliga a crear una «configuración» con los permisos, su id va a
      `META_CONFIG_ID`; si no, vacío (la app pide los scopes directamente).
      **La URL clásica `/apps/<id>/fb-login/settings/` ya NO existe**: la buena es
      **`/apps/<id>/business-login/settings/`**, y en el menú se llega desplegando
      «Facebook Login for Business» → Settings.
      Hecho el 3-sep-2026 y verificado recargando: una sola entrada, idéntica carácter a
      carácter a la que arma `callbackUrl()`.
- [x] ⚠️ **La «configuración» de Login for Business NO es opcional.** El 3-sep di por
      bueno dejar `META_CONFIG_ID` vacío porque la consola no obligaba a crearla, y el
      código caía en la rama `else` de `urlAutorizacionMeta` mandando los cinco scopes
      sueltos. **Eso no funciona**: con los permisos ya añadidos, la pantalla de
      consentimiento cargaba, pero al seguir el flujo Facebook saltaba SOLO —sin tocar
      nada— a `…/dialog/oauth/business/**cancel**/?…&action=reentry_finish&
      selected_business_id=`, y la pestaña se quedaba en blanco. Ni error ni mensaje.
      La doc de Meta lo llama «opcional» pero recomienda no usar `scope`; en la práctica,
      con este producto instalado, hace falta la configuración.
      Creada el 6-sep-2026 en `Facebook Login for Business → Configurations →
      Create configuration` (ruta real: `/apps/<id>/business-login/configurations/`):
      - Nombre: «Publicar videos del Studio» · Login variation: General (única).
      - **Access token: «User access token»**, y esto NO se puede cambiar después.
        Es el que toca porque el backend llama `/me/accounts` y saca de ahí el
        `access_token` de cada Página (ver `paginasMeta` en `_shared/redes/meta.ts`).
        La otra opción, «System-user access token», obligaría a cada usuario a entrar
        con un portafolio de negocio: impensable para quien solo quiere publicar en su
        Página. Al elegir usuario, el paso «Assets» se desactiva solo.
      - Permisos: los cinco, y solo los cinco (ojo con `business_management`, que el
        buscador ofrece de primero y NO usamos).
      `Configuration ID = 1787504305820680` → secreto `META_CONFIG_ID`. No es
      confidencial: viaja en la URL del diálogo, a la vista del usuario.
      Tras `supabase secrets set` redesplegué `redes-oauth` creyendo que no había
      recogido el secreto, porque la URL de CANCELACIÓN mostraba `user_scopes[]` y ningún
      `config_id`. **Era una lectura equivocada**: el historial de Chrome demuestra que la
      URL de INICIO ya llevaba `config_id` desde el primer intento. Meta *expande* la
      configuración en sus propios `user_scopes[]` al construir la página de cancelación.
      Para saber qué se mandó de verdad hay que mirar la URL de inicio, no la de vuelta;
      el historial de Chrome (`urls` en `User Data/Default/History`, ojo que
      `last_visit_time` no cabe en un `Number`: sacarlo como TEXT y usar `BigInt`) es la
      forma más fiable de verlo.
- [x] ⚠️ **«Continue» reutiliza un vínculo VIEJO y por eso el flujo muere.** Con la
      configuración ya puesta, el diálogo abre bien pero dice: *«You've previously linked
      Mind Planner Home to Facebook. Would you like to continue with your previous
      settings?»* con dos botones, **Edit settings** y **Continue**. Pulsar «Continue»
      revalida los ajustes de un intento anterior (los de `v22.0`, con otros permisos y
      SIN ninguna Página elegida), no hay activos que conceder y Facebook cae otra vez en
      `…/business/cancel/`. Se puede repetir infinitas veces con el mismo resultado.
      **Hay que pulsar «Edit settings»**, que es la rama que abre la elección de Páginas y
      de cuentas de Instagram. (6-sep-2026.)
- [x] ⚠️⚠️ **El botón «Continue» del diálogo se sale de la ventana.** Tras «Edit settings»
      aparece *«Choose the Pages you want Mind Planner Home to access»*, con la Página ya
      marcada… y **ningún botón visible**. No es un fallo de carga: los botones «Back» y
      «Continue» están en `y=649` y el viewport medía **632 px**, o sea 17 píxeles por
      debajo del borde; el diálogo NO tiene scroll propio, así que no hay forma de
      alcanzarlos. Desde fuera parece que la pantalla está muerta, se cierra la ventana y
      Facebook lo apunta como cancelación. Esto explica los intentos «di Continue y no
      pasó nada».
      La ventana estaba MAXIMIZADA, pero en el monitor pequeño (1293×733 sobre uno de 720
      de alto): maximizar no arregla nada ahí. **Arreglo: bajar el zoom a 75 %**
      (`Ctrl` + `-` dos veces) — comprobado, «Continue» sube de `y=649` a `y=486` y entra.
      La otra salida es mover Chrome al monitor grande.
      Para diagnosticarlo: leer las posiciones con
      `[...document.querySelectorAll('div[role=button],button')]` y comparar su `y` con
      `innerHeight`; una captura de pantalla NO lo delata, porque lo que falta simplemente
      no se ve.
- [x] ⚠️ **`motivo=sin-pagina`: `/me/accounts` no ve las Páginas de un portafolio.** El 6-sep, con
      todo lo anterior resuelto, el flujo terminó ENTERO (Facebook devolvió `code`, el
      callback lo canjeó) y aun así la cuenta no quedó conectada. El motivo real viaja en
      la URL de vuelta: `…/?redes=error&plataforma=facebook&motivo=sin-pagina`.
      Sale de `conectarMeta`: `paginasMeta` pide `/me/accounts` y **descarta toda Página
      que venga sin `access_token`**; si la lista queda vacía → `sin-pagina`.
      Llegué a creer que era por pulsar «Continue» en vez de «Edit settings»: **falso**,
      falló igual entrando por «Edit settings» con la Página marcada.

      **Cómo leer el motivo cuando el retorno se pierde.** El deep link
      `com.macr120.mindhome://redes` se lo lleva la MPH **instalada** (la de `AppData/Local/Programs/mind-home`), no la de desarrollo, así que el resultado no se ve. Truco:
      pedir el enlace a mano con `retorno: {tipo:'pestana', origen:'…'}` en vez de
      `{tipo:'app'}` — la vuelta se queda en el navegador. Ojo: si el `origen` es el APEX
      `mindplannerhome.com`, la redirección de la raíz a la app se come la query; el
      motivo se recupera igual del historial de Chrome buscando `redes=`.

      **Qué se sabe a 6-sep-2026, comprobado con el Graph API Explorer** (app «Mind
      Planner Home», token de usuario):
      - `me/permissions` → los CINCO salen `granted`. No falta ningún permiso.
      - `me/accounts?fields=id,name,access_token` → **`{"data": []}`**. Ésta es la llamada
        que hace `paginasMeta`, y por eso sale `sin-pagina`.
      - `1332592089931251?fields=id,name,access_token` (la Página por su id) → **SÍ**
        devuelve nombre y `access_token`. O sea: la Página existe, el token llega a ella y
        se puede sacar su token de Página; simplemente NO aparece en el listado.
      - `me/businesses` → `(#100) Missing Permission` (pide `business_management`).
      - En Business Suite, Marco figura con **«Full access»** sobre la Página, asignado a
        través del portafolio, no con un rol clásico.
      La pinta es que `/me/accounts` no lista Páginas cuyo acceso llega por asignación de
      un portafolio de negocio. Falta confirmar si un token emitido POR NUESTRA
      configuración de Login for Business (Explorer → pestaña «Configurations» → la
      configuración «Publicar videos del Studio» → Generate Access Token) sí las lista:
      **CONFIRMADO con un token emitido por la configuración** (Explorer → Configurations
      → «Publicar videos del Studio» → Generate Access Token):
      - `me/accounts` (con y sin `fields`) → **`{"data": []}`**.
      - `1332592089931251?fields=id,name,access_token` → **devuelve el token de Página**.
      - `1332592089931251?fields=has_transitioned_to_new_page_experience,is_published` →
        `true` y `true`.
      - `me/assigned_pages` → «Application does not have permission for this action».
      - `me/businesses` → «Missing Permission» (pide `business_management`).

      **Conclusión: es un fallo NUESTRO, no de trámites.** La Página está en el *New Pages
      Experience* y se administra desde un portafolio de negocio; el token SÍ puede operar
      sobre ella, pero **`/me/accounts` no la lista**, y `paginasMeta` no mira otra cosa
      → lista vacía → `sin-pagina`. Le pasará a cualquier usuario con la Página en un
      portafolio, que es lo normal en cuentas de empresa.
      Salidas posibles, por decidir:
      - añadir `business_management` y listar por `/me/businesses` → `owned_pages` /
        `client_pages`. Es lo que Meta ofrece, pero mete un permiso más en la revisión;
      - o dejar que el usuario indique su Página (id/URL) y resolverla por `/{page-id}`,
        que ya se sabe que funciona, usando `/me/accounts` solo como atajo cuando responda.
      **RESUELTO el 6-sep-2026** con la opción de indicar la Página a mano (sin añadir
      `business_management`, para no meter otro permiso en la revisión):
      - `paginaMetaPorId()` en `_shared/redes/meta.ts` resuelve una Página por id o por su
        nombre de usuario; el mapeo de campos se compartió en `dePagina()`.
      - `conectarMeta` ya NO aborta con la lista vacía: guarda el token de usuario en una
        fila con `extra.falta_pagina` (si no, habría que repetir el OAuth entero después).
      - `estado` no devuelve esa fila como cuenta usable, pero manda `avisos.falta_pagina`.
      - `elegir` acepta una Página que el listado no ve y la resuelve por id.
      - `PasoCuenta.tsx` pinta el campo para pegar el enlace; `referenciaPagina()` saca el
        id de `profile.php?id=…` o el nombre de `facebook.com/LoQueSea`.
      Verificado de punta a punta: `avisos.falta_pagina='facebook'` tras conectar, y luego
      `elegir` → **facebook = «Mind Planner Home» e instagram = «mindplannerhome»**
      conectadas (Instagram sale sola porque la Página tiene la cuenta vinculada).
- [ ] ⚠️ **NUEVO GATE: hay que ser «Tech Provider» para poder enviar la App Review.**
      El panel lo dice literalmente: *«Become a Tech Provider to submit to App Review and
      request access to user data… You'll be required to complete access verification»*, y
      detalla que sin ese estatus un desarrollador solo puede añadir casos de uso,
      personalizar permisos y probar llamadas — **no** completar verificaciones, ni pedir
      acceso a datos, ni enviar a revisión. Va antes que todo lo demás de la fase 3 C y
      cuelga de los datos legales del portafolio.
- [x] Use cases / Permissions and features: añadir los cinco permisos (acceso estándar =
      funcionan para quien tenga rol en la app).
      **HECHO el 6-sep-2026.** Era lo que rompía la conexión: con los secretos ya
      puestos, «Connect» en Facebook volvía con:

      > `error_code=100` · «**Invalid Scopes: pages_read_engagement, pages_manage_posts,
      > instagram_basic, instagram_content_publish**. This message is only shown to
      > developers.»

      No es un fallo del código ni de los secretos: añadir el CASO DE USO no añade sus
      permisos. Hay que entrar a cada uno y pulsar «Add» permiso por permiso, en
      `Use cases → Customize → Permissions and features`:
      - Caso **Pages API** (`use_case_enum=PAGES_API`): `pages_show_list`,
        `pages_read_engagement`, `pages_manage_posts`. NO añadir
        `pages_manage_engagement`: no se usa, y los permisos de más retrasan la revisión.
      - Caso **Instagram** (`use_case_enum=INSTAGRAM_BUSINESS`): `instagram_basic` e
        `instagram_content_publish`.
      **Ojo con los nombres**: Meta lista también `instagram_business_basic` e
      `instagram_business_content_publish`, que son los nuevos. Los viejos siguen
      disponibles y son los que pide el código, así que se añaden ESOS y no hay que tocar
      `urlAutorizacionMeta`.
      Al añadir `pages_read_engagement` sale un diálogo *«Adding … will affect other use
      cases»*: hay que aceptarlo, porque el permiso se comparte con el caso de uso de
      Páginas y así queda en los dos de una vez. `pages_show_list` ya estaba puesto.
      Los cinco quedan en «Ready for testing», y con eso el diálogo de OAuth ya carga.

      **Trampa al automatizar la consola de Meta**: la ventana de Chrome se REDIMENSIONA
      sola (858 → 1117 px de ancho) mientras se recorre la lista, así que clicar por
      coordenadas leídas un instante antes falla en silencio — el clic cae en la fila de al
      lado. Hay que clicar por REFERENCIA de elemento, no por píxeles. (Lo de que «los
      clics no prenden en segundo plano» era diagnóstico equivocado: la pestaña estaba
      visible y con foco.)
- [ ] App roles → Roles → Testers si otra persona va a probar.
- [ ] Secretos → `META_APP_ID`, `META_APP_SECRET` (+ `META_CONFIG_ID`). Se puede activar
      «Require App Secret» en Settings → Advanced: las funciones mandan `appsecret_proof`.
- [ ] Probar en modo desarrollo: Conectar → elegir Página → Reel 9:16 en Facebook e
      Instagram y video 16:9 en Facebook.
      **6-sep-2026: conectar SÍ, publicar NO.** El vídeo de prueba (7 s, 16:9) llega
      entero pero Facebook no lo publica. Estado del vídeo `1293422036094238`:
      ```
      video_status: error
      uploading_phase:  complete     ← la subida va bien
      processing_phase: complete     ← Facebook lo procesa bien
      publishing_phase: not_started  ← nunca arranca
      ```
      y **ni un solo error** en las tres fases (hubo que pedir los subcampos a mano:
      `fields=status` a secas NO trae `errors`; se arregló en `estadoVideoFB`, que ahora
      devuelve el motivo real de Facebook y, a falta de él, el id del vídeo).
      El archivo NO es el problema: se interceptó el que se sube y ffprobe lo da como
      H.264 High 4.1 · 1280×720 · yuv420p · **30 fps constantes** · AAC-LC 48 kHz estéreo
      · 7,06 s · MP4. Impecable para Facebook.
      `/{page}/videos` sigue devolviendo `{"data": []}`: el vídeo existe pero no se publica.
      Creí que era el **modo desarrollo**: **NO lo es**. La prueba: `POST /{page-id}/feed`
      con el token de Página publicó un post de texto a la primera (`200`, id
      `1332592089931251_122103048909465145`). O sea, la app publica en la Página sin
      problema con `pages_manage_posts` en acceso estándar; lo que falla es SOLO el vídeo.
      Tampoco es que falte una *feature*: en el caso de uso Pages API no hay ninguna de
      vídeo pendiente (`business_management` entró solo, por dependencias).
      Y el método tampoco: la doc de Meta confirma nuestro flujo palabra por palabra —
      Resumable Upload API en `/{app-id}/uploads` con **token de usuario**, y luego
      `POST /{page-id}/videos` con `fbuploader_video_file_chunk=<handle>` y **token de
      Página** «requested by a person who can perform the CREATE_CONTENT task».
      Probado también `POST /{page-id}/videos` con **`file_url`** y dos MP4 públicos
      distintos (Blender y Google Cloud Storage): los dos devuelven
      `(#389) Unable to fetch video file from URL` (`error_subcode 1363057`). Facebook no
      descarga NINGUNA. Con eso queda descartado que el fallo esté en el handle de la
      subida resumible: **el vídeo no sale por ninguna vía**, mientras que el texto sí.
      **Hipótesis que queda** (sin confirmar): la app está **Unpublished** y Meta permite
      texto pero no vídeo hasta publicarla / pasar App Review. Encaja con que el
      Dashboard insista en *«Check that all requirements are met, then publish your app»*.
      **CONFIRMADO**: el MISMO archivo, subido A MANO desde Meta Business Suite, se
      publica sin problema. O sea: el archivo es correcto, la Página no tiene ninguna
      restricción, y lo único que cambia entre un caso y otro es **quién publica**: la app.
      Queda pues acotado a que Meta no deja publicar VÍDEO por API a una app sin revisar
      (texto sí, vídeo no). No es seguro al 100 % —Meta no devuelve ni un error—, pero ya
      no hay nada más que probar sin pasar la revisión.
      **No hay nada que arreglar en el código.** Se desbloquea cuando pase la
      verificación de negocio → Tech Provider → App Review, que es justo lo que está en
      curso; al poner la app en Live (`REDES_META_LIVE=1`) hay que **reintentar la
      publicación de vídeo** y confirmarlo.
      **10-sep-2026: la app YA está en Live** (ver fase 3 C) y resultó que no hacía falta
      la App Review para publicarla.
      **CONFIRMADO ESE MISMO DÍA: con la app en Live, el vídeo SE PUBLICA.** Prueba hecha
      contra la Graph API con el token de Página (Explorer → `1332592089931251?fields=
      access_token`, que sigue siendo la única forma de llegar a la Página porque
      `/me/accounts` continúa devolviendo `{"data":[]}`), subiendo un clip generado al
      vuelo con `MediaRecorder` sobre un lienzo:

      | Fase | 6-sep (app *Unpublished*) | 10-sep (app *Live*) |
      |---|---|---|
      | `uploading_phase` | complete | complete |
      | `processing_phase` | complete | complete |
      | `publishing_phase` | **not_started** | **published · complete** |
      | `video_status` | error | **ready** |

      O sea que la causa era el **estado de la app**, no el archivo, ni el método, ni los
      permisos — y bastaba con publicarla, sin App Review. El vídeo de prueba se borró
      (`success: true`); en la Página solo queda el «Video Test» que se subió A MANO el
      7-sep.
      **Matiz honesto**: el que se probó fue el upload **multipart** (`source`), no la
      subida resumible que usa el backend, porque desde el navegador el `Authorization:
      OAuth` de la resumible dispara CORS. Falta comprobar esa vía con la app real, y es
      justo lo que hará la toma C del screencast. Y ojo: **`file_url` sigue fallando** con
      `(#389) 1363057 Unable to fetch video file from URL`, igual que el 6-sep, o sea que
      ese endpoint tiene un problema propio que no tiene que ver con el estado de la app.

      **Trampas al probar la Graph API desde el navegador** (por si hay que repetirlo):
      la consola de `developers.facebook.com` tiene **CSP**, así que no se puede descargar
      un MP4 de fuera (hay que generarlo en el propio lienzo), y el token **no puede ir en
      la query string** —la petición se bloquea sin llegar a salir—: va en el cuerpo, junto
      con `method: 'GET'` o `'DELETE'` cuando haga falta.
      La Página quedó limpia: se borraron el post de texto y el vídeo fallido.

### C · Verificación y App Review

- [x] **ENVIADA el 3-sep-2026 → «In review»** (Meta: ~2 días hábiles). Lo que la
      desbloqueó fue subir los documentos (constancia como «Constancia de Situación Fiscal
      SAT», que Meta ofrece ya como tipo en México) en el paso «Upload documents», no la
      vía del dominio. Detalle abajo por si hay que repetirlo.
- [ ] ⚠️⚠️ **RECHAZADA DOS VECES por el mismo motivo, y la causa era la URL** (9-sep-2026).
      Meta repite: *«We can't verify your business website is associated with the business
      Marco Antonio Cabanillas Ramirez because your legal business name must be present on
      the website»* — aunque el 6-sep se publicó el nombre legal en el pie.
      **El texto estaba bien; lo que fallaba era DÓNDE mira Meta.** El portafolio declaraba
      `https://mindplannerhome.com/`, y esa raíz responde **302 a `app.mindplannerhome.com`**
      (la SPA), donde el nombre no aparece. El pie con el nombre vive en `/acerca`.
      Comprobado con `curl`: la raíz redirige y no contiene «Cabanillas Ramirez»; `/acerca`
      sí. **Arreglo (9-sep): el sitio web del portafolio pasa a
      `https://mindplannerhome.com/acerca`**, que es la landing pública hecha justo para
      esto y la que Google ya aceptó para la verificación de marca.
      REGLA para no repetirlo: el dato que una consola verifica hay que comprobarlo en la
      URL EXACTA que se le declaró, siguiendo las redirecciones — no en la página donde uno
      cree que está.
      **REENVIADA el 9-sep-2026 → «In review»** («Your business verification application is
      being reviewed by Meta»). Comprobado antes de enviar, tal como lo ve Meta:
      `curl -L https://mindplannerhome.com/acerca` → **200, 0 redirecciones**, y el nombre
      legal aparece en el HTML. Es la tercera vuelta: si vuelve a caer, tocará la otra vía
      que ofrece el propio diálogo, subir un documento oficial.
- [ ] ⚠️⚠️⚠️ **RECHAZADA UNA TERCERA VEZ, con el MISMO texto** (visto el 10-sep-2026 en
      Security Center): *«Verification for Marco Antonio Cabanillas Ramirez · Submitted on
      Sep 09, 2026 · We weren't able to verify your business using the information provided
      · Needs more information»*, y en «Details & next steps» otra vez *«We can't verify
      your business website is associated with the business … because your legal business
      name must be present on the website»*.
      **Lo que esto demuestra: cambiar el campo Website del portafolio a `/acerca` NO
      cambia dónde mira Meta.** Comprobado el 10-sep: el portafolio declara
      `https://mindplannerhome.com/acerca` (Business info) y `curl` lo da como **200 sin
      redirecciones y con el nombre legal**; la que sigue sin nombre es la **raíz**
      (`https://mindplannerhome.com/` → **302** a `app.mindplannerhome.com`, la SPA).
      O sea que la verificación por sitio web comprueba el **dominio verificado del
      portafolio** (su raíz), no la URL con ruta del campo Website.
      **CAUSA REAL, encontrada el 10-sep abriendo el asistente** («Learn more» → «Continue»
      → Get started → México → Sole Proprietorship → Registered → Add business details):
      **el formulario guarda SU PROPIA copia de la URL y no se entera de lo que cambies en
      Business info.** En el paso «Contact information» el campo *Website* seguía trayendo
      **`https://mindplannerhome.com/`** — la raíz que redirige. O sea que el envío del
      9-sep mandó a Meta otra vez a la página sin el nombre legal, y la teoría de que Meta
      mire la raíz por diseño es **falsa**: mira lo que hay en ESE campo.
      Es la misma trampa que ya se apuntó el 3-sep («la URL parece quedar congelada en el
      borrador») y que entonces se atribuyó a otra cosa.
      **Arreglo: corregir el campo DENTRO del asistente**, no en Business info. Hecho el
      10-sep: `https://mindplannerhome.com/acerca`.
      De paso, dos avisos del propio asistente: **se reabre desde cero** (país, tipo de
      negocio, «Registered»… todo hay que volver a elegirlo; los datos de nombre, dirección
      y teléfono sí vienen precargados), y el teléfono que trae (**5513635499**) NO es el
      de Business info (`+525510132542`) — es al primero al que llega el código de
      «Confirm your connection».
      **Tras «Contact information» sale un CAPTCHA** («Help us confirm it's you»), que lo
      marca Marco a mano: ningún agente puede resolverlo.
      Plan B si esto vuelve a caer: la segunda opción del propio diálogo, **subir un
      documento** que asocie el negocio con el sitio (factura del dominio o del hosting a
      nombre de la persona).
- [x] **CUARTA VUELTA ENVIADA el 10-sep-2026 → «In review»** («Thank you for submitting
      your information. It should take about 2 business days…»). Esta vez con la URL
      corregida DENTRO del asistente y con la conexión confirmada por **correo del propio
      dominio**, que es la vía que Meta marca como *Recommended* y la única que no depende
      de la web: las de teléfono/SMS/WhatsApp piden un documento donde salga el número
      (imposible con el SAT o el CFE) y la del dominio es la que ya falló tres veces.
      Los **documentos siguen guardados** en el expediente y no hubo que volver a subirlos:
      `csf.pdf` como *Constancia de Situación Fiscal SAT* (nombre legal) y un PDF como
      *Utility Bill* (dirección).
      **`marco@mindplannerhome.com` montado de cero** para esto (Cloudflare → Email →
      Email Routing de la zona): destino `macr120cme@gmail.com` —**Verified al instante**,
      por ser la misma cuenta de Cloudflare, sin correo de confirmación—, regla
      `marco@` → Gmail, y «Add missing records» publica los 3 MX (`route1/2/3.mx
      .cloudflare.net`), el SPF y el DKIM, que quedan **Locked**. El dominio no tenía
      NINGÚN MX antes, así que no se pisó nada. Comprobado con `nslookup` contra 8.8.8.8
      antes de pedir el código, y el servicio en **Enabled** (pasa por «Syncing» un rato).
      Trampas de esta tanda:
      - **El diálogo «Send email» se cuelga**: se queda con el esqueleto gris para siempre
        aunque el correo SÍ salga. Al recargar, Chrome avisa de «cambios sin guardar» y
        hay que descartarlos; el expediente se conserva en el servidor —pasa a
        *«Started on <hoy> · Pending submission»* con un botón **Continue**— pero **el
        borrador local se pierde y el campo Website vuelve a la raíz**: hay que corregirlo
        OTRA VEZ antes de seguir.
      - **Cada «Send email» invalida el código anterior.** El primero (el del intento que
        se colgó) da «The confirmation code you entered is incorrect»; vale el último.
      - **Validar el código ES el envío**: no hay pantalla de repaso ni botón «Submit»
        aparte. En cuanto Meta acepta los 6 dígitos sale «Information submitted».
      - El CAPTCHA («Help us confirm it's you») salió solo en el primer recorrido, no en
        el segundo. Lo marca Marco: ningún agente puede resolverlo.
- [ ] Rechazo anterior (visto el 6-sep-2026). En Security Center → Business Verification:
      *«Verification for <nombre legal> · Submitted on Sep 03, 2026 · **We weren't able to
      verify your business using the information provided** · Needs more information»*, y en
      Configuración → Información: **Business verification status = Unverified**,
      «Additional information is needed». Hay que reabrir el expediente, leer el motivo
      concreto y volver a enviar; lo hace Marco, porque son sus documentos.
      **MOTIVO REAL, leído en «Details & next steps»** (no era la dirección, que fue mi
      primera sospecha y era falsa):

      > «We can't verify your business website is associated with the business <nombre
      > legal> because **your legal business name must be present on the website**.»

      Meta ata el negocio a la web **buscando el nombre legal en el sitio**, y no estaba en
      ninguna de las cuatro páginas. Ofrece dos salidas: ponerlo en la web, o subir otro
      documento que acredite la asociación.

      **ARREGLADO el 6-sep-2026 por la primera vía**: el pie de las cuatro páginas pasa de
      `© 2026 Mind Planner Home` a `© 2026 Mind Planner Home · Marco Antonio Cabanillas
      Ramirez`. Sale en las **80 páginas** (16 idiomas × 5) y **no hizo falta tocar los
      catálogos**: esa línea es texto literal en el HTML, no una clave, y un nombre propio
      no se traduce. Desplegado y verificado con `curl` en las cuatro rutas.
      **Se escribe SIN acento en «Ramirez»**, exactamente como está registrado en el
      portafolio: la comparación de Meta es literal.
- [x] **REENVIADA el 6-sep-2026 → «In review»**: «Your business verification application is
      being reviewed by Meta». La vía es la del **dominio**, que ya estaba verificado en el
      portafolio desde el 3-sep — Meta lo usa para ir a mirar la web, y lo único que
      faltaba era el nombre legal en ella.
- [ ] **Access verification (Tech Provider): «Not verified»** (6-sep-2026). Meta revisa en
      **5 días**. Es un trámite APARTE y es el que bloquea enviar la App Review.
      **NO se puede adelantar**: su propia página lo dice —
      *«To start access verification, you need to complete the following: **Connect this app
      to a verified business**»*. Va estrictamente después de que el negocio quede
      verificado. Formulario en
      `developers.facebook.com/<business_id>/access-verification/` («Start verification»).
      **Con fecha límite**: *«To avoid restrictions to 1 app, this must be completed by
      11/5/2026»* — 5 de noviembre de 2026 leyendo el formato de Meta (M/D/Y). Hay margen,
      pero pasada esa fecha la app se restringe.
- [ ] Business verification: App settings → Basic → Verification → conectar el Business
      → Security Center → Start verification (nombre legal, dirección, teléfono,
      documentos oficiales; como persona física con actividad empresarial suelen valer
      constancia fiscal e identificación). Solo un administrador del Business la completa.
      **Cómo va (3-sep-2026)**: business type = **Sole Proprietorship** + **Registered**
      (el RFC/constancia del SAT ES el registro oficial de una persona física; «Not yet
      registered» contradiría el documento que se sube). Nombre legal = el nombre completo
      de la persona, NO «Mind Planner Home»: Meta compara literal contra el documento.
      1.er documento: constancia de situación fiscal → «Business Tax Document». ✅ subida.
      2.º documento (dirección o teléfono): la constancia o un recibo de servicios; la
      dirección del formulario tiene que coincidir LITERAL con la del papel — si no
      cuadran, se cambia el formulario, nunca el documento.
      **Trampa**: Meta pide además confirmar la «conexión» con la persona, y las vías de
      teléfono/SMS/WhatsApp exigen que el TELÉFONO salga en el documento (imposible con el
      SAT o CFE). La de **Email** acepta «dirección _o_ teléfono», pero manda el código a
      una cuenta @mindplannerhome.com. La salida limpia fue **Domain verification**.
      **OJO — verificar el dominio NO verifica el negocio.** Son cosas distintas: el
      dominio es un activo del portafolio. Al 3-sep-2026, tras verificar el dominio, en
      Configuración → Información: Business verification = **Unverified** y Access
      verification (Tech Provider) = **Not verified**, sin cambio.
      El expediente vive en **Security Center** (Configuración → Información → «View
      details», que abre PESTAÑA NUEVA) → Business Verification, con caso de uso «App
      requires access to permissions on Meta for Developers». Estado real:
      **«Pending submission»** — empezado el 3-sep-2026 y NO enviado; nadie lo está
      revisando. Cuidado con el rótulo: «Pending submission» NO es «pendiente de que Meta
      lo revise», es **pendiente de que lo envíes tú**.
      Se retoma con «Continue» y pide tres cosas: datos del negocio (nombre, dirección,
      teléfono, correo y web), confirmar la conexión, y subir documentos.
      **TRAMPA que costó un rato: el asistente parece quedarse en bucle.** El diálogo es
      más alto que la ventana y el botón que avanza (**«Get started»**, no «Continue»)
      queda POR DEBAJO del borde visible: se pulsa lo que se ve y parece que no pasa nada.
      Hay que hacer scroll dentro del diálogo. No tiene nada que ver con el 2FA (se probó
      a activarlo por una hipótesis equivocada; no era eso).
      Pasado ese punto: país (México) → **Add business details**, donde Meta ya rellena
      `Business name` = el nombre completo de la persona y hay un campo
      **«Alternative business name»** para el nombre comercial — ahí va «Mind Planner Home».
      Luego «Is your business officially registered?» → **Registered**, y de ahí Meta
      ofrece **«Verify through business domain»**.
      **SEGUNDA TRAMPA, la que bloquea de verdad**: ese paso comprueba la URL del campo
      **Website del portafolio**, y ahí estaba `https://app.mindplannerhome.com/` — un
      **SUBDOMINIO**. Meta solo deja registrar y verificar **dominios raíz** (su propio
      formulario lo dice), así que el botón «Verify» no hace nada: pide verificar algo que
      no se puede registrar. Poner la raíz en Configuración → Información → Business
      details → Website **no bastó**: el paso siguió mostrando el subdominio (la URL
      parece quedar congelada en el borrador, o sale de la plataforma Website de la app).
      **Lo que sí funcionó**: no insistir con el dominio y seguir hasta **«Upload
      documents»**, subir ahí la constancia y enviar. La vía del dominio es un atajo que
      puede no cuadrar; la de documentos es la que cierra el trámite.
- [x] **Dominio verificado en el portafolio de Meta** (3-sep-2026): añadido
      `mindplannerhome.com` (id `2202386900335459`) en Configuración → Dominios, método
      «Update the DNS TXT record», TXT en Cloudflare junto a los otros dos y verificado a
      la primera: `facebook-domain-verification=idbe03kah17azy5zoj53qoqj08tbw8`.
      **Los tres TXT de verificación conviven en la raíz sin pisarse** (Google, TikTok y
      Meta) — comprobado en el DNS público.
- [x] Screencast (uno por solicitud, inglés o subtítulos): entrar, Conectar Facebook,
      diálogo de permisos con los cinco, elegir Página, publicar desde el Studio, ver el
      video en la Página y el Reel en Instagram, Desconectar en Cuentas conectadas.
      **Rodado y montado el 10-sep-2026**: ocho tomas (A–H) desde la app instalada, 4:50,
      narración TTS en inglés y subtítulos quemados, en
      `Videos/Grabaciones de pantalla/screencast-meta-app-review.mp4` (9,4 MB) con su
      `.srt` al lado. El guion, las tomas y dónde quedó cada una, más abajo en
      «Guion del screencast de Meta».
- [ ] App Review → Permissions and features → Request advanced access para los cinco:
      descripción de uso (abajo), screencast e **instrucciones con credenciales**. La
      cuenta revisora es `mindplannerhome+meta@gmail.com` — propia, porque la compartida
      con Apple y Play no vale (ver abajo) — y no basta con que entre: hay que dejarle casa,
      cuarto del Studio y dos proyectos de demostración, porque los binarios del Studio no
      viajan por el sync y Instagram solo acepta 9:16. **Ya está lista**: receta y estado en
      «Cuenta del revisor de Meta» (abajo).
- [ ] Enviar y contestar (3–7 días hábiles). Rechazo típico: el revisor no pudo entrar o
      el screencast no enseña el permiso en uso.
- [x] Pasar la app a **Live** (interruptor App Mode). **HECHO el 10-sep-2026**, y antes de
      lo previsto: se hizo para poder grabar el screencast, porque la App Review pide ver
      `pages_manage_posts` e `instagram_content_publish` funcionando y con la app
      *Unpublished* el vídeo no se publicaba. La ruta es el menú **Publish** de la app;
      decía *«All required app settings are complete»* y el botón **Publish** estaba
      disponible **sin App Review**. Resultado: *«Your app was successfully published»*,
      Publish Status = **Published**, y el botón pasa a **Unpublish** (reversible). La
      única alerta que llegó es el propio cambio de modo.
      Ojo: en Live los permisos siguen en **acceso estándar**, o sea que solo funcionan
      para quien tenga rol en la app. Por eso **`REDES_META_LIVE` se queda a 0**: pasarla a
      1 solo apaga los avisos de la interfaz («modo desarrollo», «solo testers»), y para
      un usuario cualquiera esos avisos SIGUEN siendo ciertos hasta que pase la App Review.
      Se pone a 1 al aprobarse, no ahora. Cada año: Data Use Checkup.

Mientras no está aprobada: solo admins/desarrolladores/testers conectan (los demás ven
«app no disponible»); para ellos publica de verdad. El token caduca a los 60 días y la
app ofrece «Reconectar» 7 días antes.

Para qué sirve cada permiso (así en la solicitud): `pages_show_list` listar Páginas para
elegir dónde publicar · `pages_read_engagement` nombre/foto de la Página y su Instagram
vinculado · `pages_manage_posts` publicar el video o Reel en la Página · `instagram_basic`
id y usuario de la cuenta profesional · `instagram_content_publish` publicar el Reel.

## Fase 4 · Servidor y pruebas reales

- [ ] Generar los dos secretos propios y guardarlos fuera del equipo (sin la clave de
      cifrado los tokens guardados no se pueden leer).
- [x] Subir secretos — **Google hecho el 3-sep-2026**: `REDES_CIFRADO_KEY`,
      `REDES_STATE_SECRET`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` registrados.
      Faltan los de TikTok y Meta; `secrets set` es ADITIVO, se añaden sin tocar el resto,
      y cada proveedor falla por separado (YouTube ya funciona sin los otros).
      **Cómo meterlos sin que pasen por la terminal** (nos costó dos intentos): NO pegar
      el `CLAVE=valor` en PowerShell —lo intenta ejecutar y además queda en el historial—
      y no fiarse de Notepad, que puede no guardar. Lo que funcionó: `Read-Host` pide cada
      valor (lo tecleado en un Read-Host NO entra en el historial) y escribe el archivo.
      El archivo debe llamarse **`.env.redes`**: `redes.env` NO lo ignora `.gitignore`
      (el patrón es `.env.*`) y se podría commitear por error.
- [x] Migración y funciones (3-sep-2026). `npx supabase db push` aplicó las DOS
      pendientes: `endurecer_auditoria` (26-ago) y `redes_sociales`. Comprobado antes de
      lanzarlo que `sync_reset` —cuya firma cambia— **no se llama desde el cliente ni
      desde las funciones**, solo a mano, así que el cambio no rompe la app.
      Funciones desplegadas y verificadas: `redes-oauth` con **verify_jwt = false** y
      `redes-publicar` con true.
- [x] Desplegar la app web desde un worktree limpio (`docs/BACKEND.md` §5). Hecho el
      3-sep-2026 desde el commit `b38d4bd`, que se creó justo para esto: **el código de
      redes estaba sin commitear**, así que un worktree en HEAD habría publicado la app
      SIN la función. Deployment `1097b530`; verificado que el dominio quedó inyectado en
      `dist/assets`, que el bundle contiene `redes-oauth`, y que el chunk principal sirve
      `application/javascript` (no el fallback HTML).
- [x] **Primera publicación real a YouTube (3-sep-2026)**: sube y aparece en el canal
      como privado. Costó dos arreglos que no estaban previstos:
      **1) La ventana emergente se quedaba en blanco.** `redes-oauth` devolvía una página
      HTML con un `postMessage`, y **Supabase reescribe las cabeceras de sus funciones**
      (`text/plain`, `nosniff`, CSP con `sandbox`): el navegador nunca ejecuta ese script.
      Solución: la función responde **302** a `<origen>/?redes=ok&plataforma=…` y es la
      propia app la que, al arrancar, detecta que es la emergente, avisa a `window.opener`
      y se cierra (`arrancarRedes` en `src/core/redes/redesStore.ts`). Commit `41ec626`.
      **2) «Se perdió la conexión con YouTube durante la subida».** Google ata la sesión
      resumable al `Origin` con el que se abrió y **solo a ese origen le devuelve cabeceras
      CORS**; como la sesión la abre el servidor, los `PUT` del navegador morían en el
      preflight y el `fetch` fallaba a nivel de red, indistinguible de quedarse sin señal.
      Solución: `redes-publicar` pasa `req.headers.get('Origin')` a
      `iniciarSubidaYouTube`. Commit `fd039aa`.
      **Sigue pendiente un detalle de UX**: si la vuelta del OAuth no llega, el diálogo
      espera indefinidamente y el estado `pendiente` deja «Conectar» deshabilitado hasta
      recargar.
- [ ] Android: `npx cap sync android` (el intent-filter ganó el host `redes`) y APK.

```bash
openssl rand -base64 32     # → REDES_CIFRADO_KEY
openssl rand -hex 32        # → REDES_STATE_SECRET

npx supabase secrets set REDES_STATE_SECRET=… REDES_CIFRADO_KEY=… \
  GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=… \
  TIKTOK_CLIENT_KEY=… TIKTOK_CLIENT_SECRET=… \
  META_APP_ID=… META_APP_SECRET=…

npx supabase db push
npx supabase functions deploy redes-oauth --no-verify-jwt
npx supabase functions deploy redes-publicar

npm run build
npx wrangler pages deploy dist --project-name mindplannerhome-app --branch main --commit-dirty=true
npx cap sync android
```

Prueba real por red antes de enviar las revisiones:

| Qué | Cómo | Debe pasar |
|---|---|---|
| Web, ventana emergente | Chrome → Exportar → red → Conectar | La ventana se cierra sola y el diálogo pasa al formulario — ✅ 3-sep-2026 |
| Web, emergente bloqueada | Bloquear emergentes y repetir | La pestaña va al proveedor y vuelve con la cuenta conectada |
| Android (APK) | Conectar desde el Honor | Sale Chrome, vuelve por `com.macr120.mindhome://redes` y cierra la pestaña |
| Escritorio (Electron) | Conectar desde el shell | Sale el navegador del sistema y la app recibe la vuelta |
| YouTube | Publicar un video corto | Aparece en YouTube Studio como privado; el enlace lo abre — ✅ 3-sep-2026 |
| TikTok | Publicar 9:16 desde el sandbox | Aparece en el perfil como «Solo yo» |
| Facebook | Reel 9:16 y video 16:9 | Los dos en la Página (el 16:9 va por la subida resumable) |
| Instagram | Publicar 9:16 en MP4 | Reel publicado; si Instagram rechaza el MP4 del navegador, revisar el export |
| Reintento | Cortar la red a mitad de subida y reintentar | Reanuda sin volver a exportar |

Banderas al aprobar (sin redeploy):

```bash
npx supabase secrets set REDES_YT_AUDITADO=1 REDES_YT_MAX_DIA=28
npx supabase secrets set REDES_TIKTOK_AUDITADO=1
npx supabase secrets set REDES_META_LIVE=1
```

## Material para las revisiones

### Guion del video demo (vale para las tres redes)

Se monta **en el Studio de video de la propia app**. Tres condiciones que salen del
código y no son opinables:

1. **Rodar desde la app de ESCRITORIO (Electron), no desde Chrome.** `capturar()` en
   `src/core/grabacionPantalla.ts` solo usa `getDisplayMedia` si `esEscritorio()`; en
   cualquier navegador cae al `captureStream` del lienzo `[data-lienzo-casa] canvas`, es
   decir **la casa 3D sin interfaz ni audio**: ni HUD, ni apps, ni el diálogo de publicar.
   Desde el navegador el video de la revisión es imposible.
2. **La barra de direcciones no la puede capturar la app**, y no es un ajuste que falte:
   el shell concede `peticion.frame` (`electron/main.js`, `setDisplayMediaRequestHandler`),
   o sea su propia página, nunca la pantalla. Como Google exige ver la URL de la pantalla
   de consentimiento con el `client_id`, **ese trozo se graba fuera** (Herramienta de
   Recortes de Windows 11, `Win+Shift+R`) y se importa al Studio como un medio más. Son
   ~20 s de los ~100 del video; el resto sí sale del grabador de la app.
3. **Poner la app en inglés antes de rodar.** Las voces gratis del dispositivo se filtran
   por el idioma de la app (`vocesDispositivo()` → `langVoz()` en `src/rooms/video/voces.ts`),
   así que en español no hay narrador inglés que elegir. Y las tres revisiones quieren
   inglés o subtítulos.

**Dos proyectos en el Studio**: «Demo clip» (un video corto e inocuo, el que se publica
delante de la cámara) y «Review demo» (donde se monta esto). Las tomas se guardan en el
proyecto **desde el que se pulsó «Grabar»**, así que siempre se pulsa desde «Review demo»;
durante la toma se navega a «Demo clip» y se trabaja ahí. Al parar, el Studio vuelve solo
a «Review demo» con el clip ya en la pista principal, en el cursor (moverlo al final antes
de cada toma nueva). Tope por toma: 5 min.

| Toma | Cómo | Qué tiene que verse | Narración (inglés) |
|---|---|---|---|
| **A** | «Grabar» de la app | La casa, entrar al cuarto de video, abrir «Demo clip», reproducir 2 s, Exportar → YouTube, el botón Conectar | «Mind Planner Home is a personal planner where each room of a 3D house is a different app. This is the video Studio, where I just edited a short video.» / «To publish it to my own YouTube channel, I connect my account.» |
| **B** | Recortes, fuera | La ventana del navegador **con la barra de direcciones legible**: la pantalla de consentimiento de Google, la cuenta, la lista de permisos, Permitir | «Google asks for permission to upload videos. This is the only scope the app requests: youtube.upload.» |
| **C** | «Grabar» de la app | El diálogo ya con la cuenta conectada: título, descripción, privacidad y la declaración de contenido para niños; Publicar; el progreso; «Ver en YouTube» | «I set the title, the description, the privacy and the made-for-kids declaration. The app uploads the video I just created to my own channel. It never reads the channel, its videos or its comments.» |
| **D** | Recortes, fuera | El video ya en el canal (YouTube Studio) | «Here it is on my channel.» |
| **E** | «Grabar» de la app | Configuraciones → Cuentas conectadas → Desconectar | «I can disconnect the account at any time from Settings, and the stored token is deleted.» |
| **F** | Recortes, fuera | `mindplannerhome.com/privacidad#cuentas-redes` | «The privacy policy explains exactly what we store and why.» |

**TRAMPA del grabador interno, y su arreglo (4-sep-2026).** La píldora de grabación y su
aviso («Do anything in the app…») son parte de la PÁGINA, así que `getDisplayMedia` los
captura y **salen dentro del metraje**. Arreglo que funciona sin tocar el código: ponerles
`opacity: 0` una vez empezada la toma — desaparecen de la imagen pero **siguen recibiendo
clics**, así que el botón de parar se puede pulsar igual (con `visibility:hidden` no, ahí
deja de ser pulsable). Ojo también: mientras se graba hay **dos** botones «Stop» en
pantalla —el de la píldora y el de la barra del editor—; el bueno es el de arriba del todo.

Montaje: A + B + C + D + E + F en la pista principal, narrador del dispositivo en inglés
(voz `sys:`) o subtítulos, y exportar. **El video se sube a YouTube A MANO desde
youtube.com como «No listado»**: por la web no hay candado de privacidad, ese solo aplica
a las subidas por API.

Para TikTok y Meta se rueda el mismo esqueleto cambiando B, C y D por su pantalla de
consentimiento y su formulario (en TikTok hay que pasar despacio por privacidad,
interacciones y contenido comercial; en Meta, por el diálogo de los cinco permisos y la
elección de Página).


**Topes de publicación que muerden al grabar el video (4-sep-2026).** Son DOS, los dos con
ventana FIJA de 24 h que arranca en la primera llamada (`public.rate_limits`, RPC
`consumir_rate_limit`), no un día natural:

| Tope | Alcance | Cuántas | Dónde |
|---|---|---|---|
| `redes-pub-youtube` | por usuario | **3** | `redes-publicar/index.ts:159` |
| `youtube-global` | toda la app | 5 (`REDES_YT_MAX_DIA`) | `redes-publicar/index.ts:171` |

**Los intentos FALLIDOS también consumen**, porque el contador se toca antes de publicar.
Con tres pruebas por la tarde no queda ninguna para rodar la toma del publicado, y el
mensaje que sale —«Ya publicaste varias veces hoy en esa red»— no dice que la ventana sea
móvil desde la primera. Solo el global es configurable por variable de entorno; el de 3 por
usuario está en el código. Al planificar el rodaje: **grabar la toma del publicado ANTES de
gastar intentos probando**.
### Guion del screencast de Meta (10-sep-2026)

Sale del esqueleto de arriba cambiando B, C y D; lo que Meta quiere ver es **cada uno de
los cinco permisos en uso**, y por eso hay dos publicaciones: el 16:9 a la Página y el
Reel 9:16 a Instagram.

| Permiso | Dónde se demuestra en el video |
|---|---|
| `pages_show_list` | la app enseña las Páginas donde puede publicar y se elige una |
| `pages_read_engagement` | la tarjeta con el nombre y la foto de la Página y su Instagram vinculado |
| `pages_manage_posts` | el vídeo 16:9 apareciendo en la Página |
| `instagram_basic` | el usuario de la cuenta profesional en el formulario |
| `instagram_content_publish` | el Reel apareciendo en `@mindplannerhome` |

**PASO 0 — HECHO el 10-sep-2026: el vídeo YA se publica**, y no solo por la API: **también
desde la app entera**, con su backend y su subida resumible. Con la app en Live,
`publishing_phase` pasa de `not_started` a `published · complete` (tabla y matices en la
fase 3 B), y esa misma tarde el Studio publicó «Demo clip» en la Página **Mind Planner
Home** de punta a punta: `Exporting → Uploading 100 % → Publishing` y el diálogo final
*«Published on Facebook — It was uploaded as private as the app is still under review by
Facebook»*. Ya no queda nada por despejar antes de rodar.

**Cómo se llega a la Página (importante para el guion).** Al conceder solo la Página de
MPH —sin marcar la otra Página de la cuenta, «RALLY CDMX PASS», que es la única que
`/me/accounts` sí lista— la app avisa en rojo: *«Your account doesn't manage any Page»*.
No es un fallo: es el caso `sin-pagina` de siempre. La salida está en el **diálogo de
publicar** (no en Configuraciones): ahí sale *«If you manage your Page from a business
portfolio, Facebook doesn't show it to us in the list. Paste its link here»* con un campo
y el botón **«Use this Page»**. Pegando `https://www.facebook.com/1332592089931251` el
diálogo pasa a decir **«It will be published as Mind Planner Home»** y ya publica.
Esto conviene ENSEÑARLO en el screencast: explica por qué la app no pide
`business_management`.

Antes de la primera toma:

- [ ] App **en inglés** (las voces `sys:` se filtran por el idioma de la app).
- [ ] Rodar desde la app de **escritorio (Electron)**: en navegador el grabador solo captura
      el lienzo 3D, sin interfaz ni diálogos.
- [ ] **Desconectar Facebook antes de empezar.** Si la cuenta ya está vinculada, el diálogo
      abre con *«You've previously linked Mind Planner Home…»* y el botón «Continue» revalida
      ajustes viejos y muere en `/business/cancel/`. Hay que entrar por **Edit settings**, y
      en el vídeo queda mucho mejor un consentimiento limpio.
- [ ] **Zoom del navegador al 75 %** para el diálogo de Facebook: a tamaño normal, en un
      monitor de 720 de alto, los botones «Back» y «Continue» caen por debajo del borde y la
      pantalla parece muerta.
- [ ] Dos clips exportados y listos en «Demo clip»: uno **16:9** para la Página y uno
      **9:16** para el Reel (Instagram exige MP4 9:16).
- [ ] Píldora de grabación y su aviso con `opacity: 0` una vez empezada la toma (siguen
      recibiendo clics; con `visibility:hidden` no).
- [ ] Los trozos que se graban fuera, con la Herramienta de Recortes, **en MKV**: el proceso
      de `ffmpeg` muere al terminar la llamada y un MP4 sin cerrar no tiene `moov`.
- [ ] Ventana **TOPMOST** (`scratchpad/encima.ps1`) y coreografía en UNA sola llamada, o el
      foco vuelve a la ventana de Claude a mitad de toma.
- [ ] Cuidado con los topes: **10 publicaciones por red y 24 h** (`redes-pub-facebook`,
      `redes-pub-instagram`), ventana móvil desde la primera y **los fallos también cuentan**.
      Se vacía con `delete from rate_limits where bucket = '…'`.

| Toma | Cómo | Qué tiene que verse | Narración (inglés) |
|---|---|---|---|
| **A** | grabador de la app | La casa, entrar al cuarto de vídeo, el Studio con el clip montado, Exportar → Facebook, el botón Conectar | «Mind Planner Home is a personal planner where each room of a 3D house is a different app. This is its video Studio, where I just edited a short video, and I want to publish it to my own Facebook Page.» |
| **B** | Recortes, fuera | El diálogo de Facebook Login for Business con **la barra de direcciones legible**, los cinco permisos, la elección de Página y la de cuenta de Instagram | «Facebook asks which Page I want the app to access, and for permission to publish on it and on the Instagram account linked to it.» |
| **C** | grabador de la app | La cuenta ya conectada: nombre y foto de la Página, el Instagram vinculado, el formulario 16:9, Publicar, el progreso y el resultado con su enlace | «The app shows the Page it will publish to and its linked Instagram account. It never reads posts, messages or insights: it only publishes the video I just made.» |
| **D** | Recortes, fuera | El vídeo ya en la Página, en `facebook.com` | «Here it is, on my Page.» |
| **E** | grabador de la app | Segunda publicación desde el mismo Studio, ahora el 9:16 a Instagram: el usuario de la cuenta, Publicar, progreso, resultado | «The same video Studio publishes a vertical cut as an Instagram Reel, to the professional account linked to that Page.» |
| **F** | Recortes, fuera | El Reel en el perfil `@mindplannerhome` | «And here is the Reel.» |
| **G** | grabador de la app | Configuraciones → Cuentas conectadas → Desconectar | «I can disconnect the account at any time from Settings, and the stored token is deleted.» |
| **H** | Recortes, fuera | `mindplannerhome.com/privacidad#cuentas-redes` | «The privacy policy explains exactly what we store and why.» |

Montaje: A…H en la pista principal, narrador `sys:` en inglés o subtítulos, y **el archivo
se sube al formulario de App Review**, no a ninguna red.

**RODADO el 10-sep-2026 por la noche.** Dónde está cada toma:

| Toma | Dónde | Qué tiene |
|---|---|---|
| **A** | clip dentro del proyecto **«Review demo»** (Studio) | casa → cuarto de Vídeo → «Demo clip» → reproducir → Export → Facebook → botón Connect |
| **B, C, D** | `Vídeos\Grabaciones de pantalla\…191406.mp4` (731 MB, 10:58) | consentimiento limpio con elección de Página e Instagram · el aviso de que Facebook no lista la Página · pegar su enlace y «Use this Page» · el formulario con «It will be published as Mind Planner Home» · `Exporting → Uploading → Publishing` · «Published on Facebook» · y el vídeo ya en la Página, visto en Business Suite → Content |
| **E, G** | `…192510.mp4` (2,4 GB) | el Reel 9:16 publicado en `@mindplannerhome` de principio a fin, y después Ajustes → Cuentas conectadas → Desconectar con su diálogo |
| **F, H** | tercera grabación de esa carpeta | el Reel ya procesado en `instagram.com/reel/DdIPCotgHRW/` —vertical, rosa, publicado por `mindplannerhome`— y la sección **«Connected social media accounts»** de `mindplannerhome.com/en/privacidad` |
| — | `…184618.mp4` (143 MB) | intento fallido, se tira |

Los vídeos de prueba de la Página se borraron todos al terminar (la Página queda en cero);
el Reel de Instagram se dejó, porque es el que sale en la toma F.

**MONTAJE (10-sep-2026): `Vídeos\Grabaciones de pantalla\screencast-meta-app-review.mp4`**
— 2:08, 3,5 MB, subtítulos en inglés quemados (el `.srt` queda al lado por si hay que
retocarlos). Se montó con **ffmpeg**, no con el Studio: las grabaciones suman 3 GB y 47
minutos y meterlas en IndexedDB para recortarlas a mano era pedir problemas. Tramos:

| Tramo | Origen | Qué demuestra |
|---|---|---|
| 0:00–0:38 | `…191406.mp4` 0-38 s | consentimiento entero: Páginas, cuenta de Instagram y la pantalla de permisos |
| 0:38–1:58 | `…191406.mp4` 92-172 s | Export → Facebook, pegar el enlace de la Página, el formulario y la publicación completa |
| 1:58–2:08 | `…192510.mp4` 1057-1067 s | el vídeo ya en la Página |

**VERSIÓN DEFINITIVA (10-sep-2026, 20:30): 4:50, 9,4 MB, con NARRACIÓN EN VOZ además de
los subtítulos.** Cubre los cinco permisos. Las siete partes:

| Tramo | Origen | Qué demuestra |
|---|---|---|
| 0:00–0:38 | `…191406.mp4` 0-38 s | consentimiento: Páginas, Instagram y la pantalla de permisos |
| 0:38–1:58 | `…191406.mp4` 92-172 s | pegar el enlace de la Página, el formulario y la publicación |
| 1:58–2:08 | `…192510.mp4` 1057-1067 s | el vídeo en la Página |
| 2:08–3:28 | `…202248.mp4` 5-85 s | el **Reel a Instagram**: diálogo, subida y «Published on Instagram» |
| 3:28–3:53 | `Vídeos\Grabación …201538.mp4` 25-50 s | el Reel en el perfil `@mindplannerhome` |
| 3:53–4:23 | `…202248.mp4` 132-162 s | desconectar la cuenta en Ajustes |
| 4:23–4:50 | `…201538.mp4` 58-85 s | la sección «Connected social media accounts» de la privacidad |

**La voz se generó con `edge-tts`** (`en-US-AndrewNeural`, `--rate=+8%`): una frase por
subtítulo, cada `mp3` colocado en su segundo con `adelay` y mezclado con `amix`, para que
la narración caiga sincronizada con la imagen. El `.srt` queda al lado por si hay que
retocar el texto y rehacer.

**Trampa que casi cuesta el material**: la Herramienta de Recortes cortó una grabación con
*«Se produjo un error y se detuvo la grabación. Se guardó el progreso»*, y ese archivo
**no llega solo al disco**: se queda en su reproductor y hay que pulsar el **disquete**
para guardarlo. Ahí estaban las tomas F y H, que se dieron por perdidas.

Lo que se aprendió rodando, y que conviene tener presente al montar y al narrar:

- **Los dos vídeos salen PRIVADOS** mientras la app esté en revisión, y la propia app lo
  dice al terminar. En la Página pública no se ven: hay que enseñarlos desde **Business
  Suite → Content** (ahí aparece «Demo clip · Mind Planner Home») y decirlo en la
  narración, o el revisor pensará que no se publicó.
- Facebook clasificó como **Reel** el vídeo 16:9 que subimos a la Página.
- **«View on Facebook» no sirve para la toma D**: abre el enlace en una vista incrustada
  de la propia app, sin sesión, y pide iniciar sesión. Hay que verlo en el navegador.
- El **selector 16:9 / 9:16** del editor basta para preparar las dos publicaciones desde
  el mismo proyecto; con 16:9, Instagram aparece atenuado en «Export or publish».
- Al desconectar Facebook, **Instagram cae con él** (va atado a la Página). Correcto, y
  queda bien en la toma G.
- La **barra de grabación de la Herramienta de Recortes se oculta sola** y no se alcanza
  por automatización: el botón de detener lo pulsa Marco.

**Ojo con `sin-pagina` durante el rodaje**: si `/me/accounts` devuelve la lista vacía —le
pasa a cualquiera con la Página en un portafolio de negocio—, la app pide pegar el enlace
de la Página. No hay que esconderlo: es parte del producto y explica por qué NO se pide
`business_management`. Si sale, narrarlo: «If Facebook doesn't list the Page, I just paste
its link, so the app never needs access to my whole business portfolio.»

### Instrucciones para el revisor de Meta (inglés, se pegan en App Review)

El revisor tiene que poder reproducir el flujo él mismo; si no puede entrar, rechazo
seguro. La contraseña se pega directamente en el formulario de Meta: **no se guarda en
este repo**. Cómo se dejó lista la cuenta, en «Cuenta del revisor» (justo debajo).

```
Mind Planner Home is a personal planner where each room of a 3D house is a different
app. One of them is a video Studio. This integration lets a user publish a video they
made in that Studio to their OWN Facebook Page and to the Instagram professional
account linked to it. The app never reads posts, messages, comments or insights.

Test account (already set up: it has a house, a video Studio and two demo projects):
   https://app.mindplannerhome.com
   email: mindplannerhome+meta@gmail.com
   password: <…>

The first screen asks which language you want the app in. English is already
selected: just press Next. Then sign in with the credentials above.

After signing in you land on the 3D house. Open the rooms button in the top bar
("Quick access to your rooms"), choose the Studio room and click the desk to open the
video editor. Shortcut: once signed in, https://app.mindplannerhome.com/?app=video
opens the editor directly.

How to test — publishing to a Facebook Page:
1. In the project list, open "Demo video (Facebook)". It is a 12-second video.
2. Press the export button at the top right and choose Facebook.
3. Press Connect and log in with a Facebook account that administers a Page. The Page
   must have an Instagram professional account linked to it.
4. Facebook asks which Page the app may access and which permissions to grant. The
   five permissions in this request are the only ones the app asks for.
5. If Facebook does not list the Page — this happens when the Page belongs to a
   business portfolio and /me/accounts comes back empty — the app asks you to paste
   the Page link instead. We do it this way on purpose, so the app never has to
   request business_management.
6. The app shows the Page it will publish to, with a title and a description you can
   edit. Press Publish: the video is rendered, uploaded and published on that Page.
   While the app is under review it is published as private.

How to test — publishing an Instagram Reel:
7. Go back to the project list and open "Demo Reel (Instagram)": the same idea in 9:16,
   because Instagram only accepts vertical video.
8. Export → Instagram → Publish. It is posted as a Reel on the Instagram professional
   account linked to that Page, also as private while the app is under review.

Removing the connection:
9. Open the house editor (the pencil in the top bar) → Settings → Connected accounts →
   Disconnect. Removing Facebook also removes the linked Instagram account, and the
   stored tokens are deleted from our server.

Permissions:
- pages_show_list: list the Pages the user can publish to, so they can pick one.
- pages_read_engagement: read the Page name, picture and its linked Instagram
  account, to show them before publishing.
- pages_manage_posts: publish the video on the Page the user chose.
- instagram_basic: read the id and username of the linked professional account.
- instagram_content_publish: publish the Reel on that account.
```

### Cuenta del revisor de Meta: cómo se dejó lista

Meta pide **credenciales de prueba**, a diferencia de Google, donde bastó el cupón para que
el revisor se creara su propia cuenta (§Fase 3). Hecha el **10-sep-2026**.

**Cuenta propia, no la compartida.** `mindplannerhome@gmail.com` ya es la cuenta de prueba
que usan los revisores de **Apple** y de **Play**, y compartirla habría sido un problema de
verdad, no una incomodidad: la casa de MPH es UNA y se sincroniza, así que (1) el revisor de
Meta conecta SU Facebook a esa cuenta y el token queda guardado en el servidor bajo ese
usuario, o sea que los revisores de Apple o Play verían en «Cuentas conectadas» la Página de
un tercero y podrían publicar en ella o desconectarla; (2) cualquiera de los tres puede
borrar un cuarto o un proyecto y romperle el flujo a los otros, y lo que Meta tiene que
encontrar sí o sí son los dos proyectos de demostración; (3) la contraseña es una sola y
quien la resetee deja fuera a los demás. Por eso la cuenta de Meta es
**`mindplannerhome+meta@gmail.com`**: Supabase la trata como cuenta distinta y Gmail entrega
el correo en la misma bandeja de siempre, sin tocar Cloudflare.

Por qué hay que prepararla entera y no basta con crearla:

- **Sin `unlock` no pasa de la puerta.** `PuertaUnlock` va antes que la app (main.tsx):
  idioma → cuenta → compra. La cuenta del revisor necesita el unlock por **cupón**
  (`canjear_cupon`), igual que los testers.
- **Sin plan `pro`/`trial` no hay sync, y sin sync no hay casa.** `motor.ts:548` y `:615`
  cortan la sincronización con plan `local`, así que nada de lo preparado aquí le llegaría.
  El cupón concede `trial` (`trial_dias`), que es justo lo que enciende el sync.
- **Los binarios del Studio NO viajan.** `mediosVideo` está fuera de `TABLAS_SYNC` a
  propósito (clips de cientos de MB); solo viaja el guion (`proyectosVideo`). Un proyecto con
  un vídeo importado le llegaría al revisor con el `medioId` sin resolver. Por eso los dos
  proyectos de demostración no tienen **ningún binario**: planos de color y rótulos, que se
  renderizan en cualquier dispositivo. El ejemplo de fábrica del Studio
  (`rooms/video/ejemplos.ts`) está hecho con ese mismo criterio y lo dice en su cabecera.
- **Instagram exige 9:16** (`MenuExportar.tsx:91`), así que hacen falta DOS proyectos: uno
  16:9 para la Página y otro 9:16 para el Reel.
- **Y los proyectos NO pueden ser el ejemplo de fábrica.** Esta es la trampa fina: el
  interruptor de los ejemplos vive en **localStorage** (`mh.ejemplos`, `core/data/ejemplos.ts`)
  y el filtro está en `useAll()` del repositorio, así que una fila con `ejemploDe` se ESCONDE
  en cualquier dispositivo que no tenga el ejemplo encendido — y el navegador del revisor no
  lo tendrá. Encender el ejemplo aquí y renombrarlo parece que funciona y al revisor no le
  llega nada. Los dos proyectos se hacen a mano, con el menú «+ Add → Color / Text».
- **Desde un navegador LIMPIO.** Cerrar sesión no borra la base local, y entrar con la
  cuenta del revisor en un navegador con otra casa dispara `verificarUsuario` (motor.ts:443),
  que pregunta si unir lo local a la cuenta nueva: decir que sí le habría subido esa casa al
  revisor. Se hizo en un Chrome sin sesión previa (la base `mind-home` estaba vacía).

Lo que quedó hecho:

- [x] **Cuenta creada y confirmada**: `mindplannerhome+meta@gmail.com`. Supabase pide
      confirmar el correo antes de entrar; el enlace llega a la bandeja de
      `mindplannerhome@gmail.com` y **caduca en cuanto se usa** (si se vuelve a pulsar sale
      `otp_expired`, que es normal y no rompe nada).
- [x] **Cupón emitido y canjeado**: uno nuevo de **1 uso y 365 días**, creado en el editor
      SQL del panel (el código NO se escribe aquí, como los otros). Resultado comprobado en
      `perfiles`: `unlock = true`, `plan = trial`, `plan_expira = 11-sep-2027`. Con eso el
      sync quedó encendido y la cuenta tiene 700 créditos de IA.
- [x] **Casa con el cuarto del Studio**: asistente de bienvenida → interés **Video ·
      Editor de guion**. Queda un cuarto llamado «Video» con el objeto `camara-video` y el
      grupo «Studio».
- [x] **Idioma en inglés** (la app se puso sola en `en`, que es lo que queremos: el revisor
      lee inglés y el ejemplo de fábrica se materializa en el idioma activo).
- [x] **«Demo video (Facebook)»** — hecho a mano: **16:9**, tres planos de color (morado,
      turquesa y naranja, 4 s cada uno) y un rótulo centrado «Made in the Studio / Mind
      Planner Home». 12 s. Primero se probó con el ejemplo de fábrica renombrado y se
      DESCARTÓ por lo del párrafo anterior: la fila llevaba `ejemploDe` y habría llegado
      invisible. El de fábrica quedó borrado (lápida en `registros`) y la barra «Ejemplo»,
      apagada.
- [x] **«Demo Reel (Instagram)»** — creado a mano: aspecto **9:16**, dos planos de color
      (4 s + 4 s) y un rótulo «Made in the Studio / Mind Planner Home». 8 s. Comprobado en
      el menú Exportar que **Instagram sale habilitado**, o sea que el 9:16 está bien puesto.
- [x] **Sync comprobado en la nube**: `select … from registros where tabla='proyectosVideo'`
      devuelve los dos proyectos con su aspecto, sus clips, `deleted = false` y —lo que
      importa— **`ejemploDe` a NULL** en los dos.
- [x] **El enlace directo funciona**: `https://app.mindplannerhome.com/?app=video` abre el
      Studio sin pasar por la casa. **Ojo**: `abrirApp` se dispara 500 ms después de cargar
      (main.tsx:159), así que en el PRIMER arranque de un navegador limpio la casa todavía
      no ha bajado y el enlace no encuentra el objeto. En las instrucciones va como atajo
      **después** de iniciar sesión, no como punto de entrada.

- [x] **Probada la entrada tal cual la hará el revisor** (10-sep-2026). Se simuló un
      dispositivo nuevo borrando en Chrome la base `mind-home` y las claves de
      localStorage de la cuenta real (respetando las de `probar:` y `demo:`), y se
      comprobó el punto de partida: 0 cuartos, 0 objetos, 0 proyectos y sin sesión.
      Resultado: puerta de idioma → puerta de cuenta → **entra directo a la casa, SIN
      asistente de bienvenida** (`esperarCasaDeCuenta` espera el primer sync, ve que la
      cuenta trae casa y marca la bienvenida como vista), con el cuarto del Studio, los 7
      objetos y los DOS proyectos con su aspecto correcto. El atajo `?app=video` funciona
      en el segundo arranque.

**Y salió un fallo de la app que habría costado la revisión: se pone en ESPAÑOL.** No es
de la cuenta —el idioma es de dispositivo, `mh.idioma` en localStorage, no viaja por el
sync—: es que **pulsar «Next» en la puerta de idioma sin tocar la bandera NO escribe
`mh.idioma`**. `PuertaIdioma.confirmar()` solo marca `mh.idioma.elegido` (su comentario
dice «`setIdioma` ya escribió `mh.idioma`», y eso solo es cierto si tocaste una bandera).
Entonces, al iniciar sesión, el sync baja la casa y pone `mh.bienvenida = '1'`; en la
recarga siguiente `leerIdioma()` (`ajustesStore.ts:139`) no encuentra `mh.idioma`, ve esa
bandera, la interpreta como «instalación veterana» y devuelve **`IDIOMA_BASE` (español)**
en vez del default inglés. Comprobado en vivo: `mh.idioma` inexistente, `elegido = 1`,
`bienvenida = 1`, app en español; escribiendo `mh.idioma = 'en'` vuelve a inglés.

No afecta solo al revisor: le pasa a **cualquiera que estrene dispositivo, acepte el
inglés que ya viene marcado sin tocarlo y tenga casa en la cuenta**. La app le amanece en
español.

**ARREGLADO Y DESPLEGADO el 10-sep-2026**, las dos mitades:

1. `PuertaIdioma.confirmar()` ahora llama a `setIdioma(idioma)` antes de marcar la bandera,
   así que confirmar la puerta SIEMPRE escribe `mh.idioma` — aunque no se toque ninguna
   bandera. Arregla el origen.
2. `leerIdioma()` (`ajustesStore.ts`) solo trata `mh.bienvenida === '1'` como «instalación
   veterana» si `mh.idioma.elegido !== '1'`: un dispositivo que acaba de contestar la puerta
   de idioma es nuevo, no veterano. Rescata además a quien ya estuviera en ese estado.

`tsc -b` en verde, `npm run build` y `wrangler pages deploy dist --project-name
mindplannerhome-app` (deployment `404d1a8c`). Comprobado EN PRODUCCIÓN después de desplegar, las dos mitades por separado: (1) con
`mh.idioma` borrado, `elegido=1` y `bienvenida=1` —el estado exacto que daba español— la
app arranca en inglés; (2) pulsar «Next» en la puerta sin tocar bandera escribe
`mh.idioma='en'`. El parche de «toca la bandera» se quitó de las instrucciones: ya no hace
falta y una instrucción de más al revisor solo confunde.

Decidido y pendiente:

- [x] **Arreglado el idioma en el código y desplegado** (detalle arriba). Sin commit: los
      cambios están en el árbol de trabajo, `--commit-dirty=true`.
- [x] **La contraseña es igual que el correo**, a propósito: se planteó cambiarla —la cuenta
      va a tener conectada la Página de Facebook de un revisor— y Marco decidió dejarla así
      el 10-sep-2026. Ventaja: no hay nada que anotar ni que se pueda perder antes de
      rellenar el formulario de Meta.

### Justificaciones por scope (inglés)

- **Google · youtube.upload** — Mind Planner Home includes a video editor (the Studio).
  When the user taps Publish → YouTube, the app uploads the video the user has just
  created to the user's own YouTube channel, with the title, description, privacy setting
  and made-for-kids declaration entered by the user. The scope is used only at that moment
  and only for that video. The app does not read the channel, its videos, comments or any
  other YouTube data; there is no narrower scope for uploading a video.
- **TikTok · user.info.basic** — Used to show the connected account's display name and
  avatar in the "Connected accounts" screen and, as required by the Content Posting API
  guidelines, the creator's nickname on the publish screen.
- **TikTok · video.publish** — Used to post the video the user edited in the Studio to the
  user's own TikTok account via Direct Post, with the privacy level, comment/duet/stitch
  settings and commercial-content disclosure chosen by the user on the publish screen.
  Posting happens only when the user taps Publish.
- **Meta · pages_show_list** — To list the Facebook Pages the user manages so they can
  choose the Page to publish to. **pages_read_engagement** — To display the selected
  Page's name and picture and to find the Instagram professional account linked to it.
  **pages_manage_posts** — To publish the video or Reel the user created in the app to the
  selected Page when the user taps Publish. **instagram_basic** — To read the id and
  username of the linked Instagram professional account and show it on the publish
  screen. **instagram_content_publish** — To publish the user's Reel to that Instagram
  account when the user taps Publish. The app never reads posts, comments, insights or
  messages.

### Texto para la política de privacidad (base en español; luego a los 18 idiomas)

**Cuentas de redes sociales conectadas.** Si conectas tu cuenta de YouTube, TikTok,
Facebook o Instagram, guardamos los tokens de acceso que esa red nos entrega, cifrados en
nuestro servidor, junto con el nombre y la foto de la cuenta o Página elegida. Los usamos
únicamente para publicar en tu cuenta los videos que tú decides publicar desde el editor
de video, en el momento en que pulsas «Publicar». No leemos tus videos, publicaciones,
comentarios, mensajes ni ningún otro dato de esas cuentas. Los tokens se conservan hasta
que desconectas la cuenta en Configuraciones → Cuentas conectadas o eliminas tu cuenta de
Mind Planner Home; también puedes revocar el acceso desde los ajustes de seguridad de cada
red (Google: myaccount.google.com/permissions). Para YouTube, la app utiliza YouTube API
Services; al conectarla aceptas los Términos de servicio de YouTube (youtube.com/t/terms)
y se aplica la Política de privacidad de Google (policies.google.com/privacy).

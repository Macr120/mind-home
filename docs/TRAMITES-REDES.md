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

- [ ] Grabar el video demo (guion abajo), en inglés, subido a YouTube «No listado». Debe
      verse la barra de direcciones de la pantalla de consentimiento con el `client_id`.
- [ ] Branding → Verify branding → Publish branding (automático, minutos).
- [ ] Verification Center → declarar scopes, justificación de `youtube.upload` (abajo),
      enlace al video y hasta 3 enlaces (privacidad, soporte). Enviar.
- [ ] Contestar los correos del revisor (3–5 días hábiles por vuelta).

### C · Auditoría de cumplimiento y cuota

- [ ] «YouTube API Services – Audit and Quota Extension Form»
      (support.google.com/youtube/contact/yt_api_form): número de proyecto, descripción
      del uso, capturas, enlace a la privacidad con la mención a YouTube API Services y
      la cuota pedida: **50 000 unidades/día** ≈ 30 subidas diarias para toda la app.
- [ ] Al aprobar: `REDES_YT_AUDITADO=1` y `REDES_YT_MAX_DIA` = cuota ÷ 1600 menos margen
      (50 000 → 28).

Mientras no está aprobada: cualquiera puede conectar (pantalla «no verificada», tope
100 usuarios), los videos suben **privados**, cuota 10 000 u/día (5 subidas/día para toda
la app).

## Fase 2 · TikTok

Consola: developers.tiktok.com con tu cuenta de TikTok como desarrollador.
Scopes: `user.info.basic`, `video.publish`.

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
- [x] Explicación de productos y scopes para la revisión: escrita y guardada (938 de los
      **1000 caracteres** que admite el campo; a 1000 lo corta a mitad de palabra).

### B · Sandbox y prueba propia

- [ ] Sandbox → Create sandbox → Target users: tu cuenta. El sandbox tiene **su propio**
      client key/secret: durante las pruebas van en Supabase; al enviar a revisión se
      vuelven a poner los de producción.
- [ ] Publicar un video de prueba desde el Studio (sale «Solo yo») y comprobarlo en el perfil.

### C · Revisión y audit

- [ ] Video demo del flujo completo (hasta 5 videos de 50 MB): entrar, Conectar TikTok,
      consentimiento, pantalla de publicar con nickname, privacidad, interruptores de
      comentarios/dúo/stitch, contenido comercial con casillas y texto de consentimiento,
      y el video ya en TikTok. El dominio visible debe ser el declarado.
- [ ] Submit for review con la justificación por scope. 1–2 semanas.
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
      El **App secret** sigue sin copiarse (App settings → Basic → Show).
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
      carácter a la que arma `callbackUrl()`. `META_CONFIG_ID` se queda VACÍO: la consola
      no obligó a crear ninguna «configuración», así que el código manda los cinco scopes
      sueltos (rama `else` de `urlAutorizacionMeta`).
- [ ] ⚠️ **NUEVO GATE: hay que ser «Tech Provider» para poder enviar la App Review.**
      El panel lo dice literalmente: *«Become a Tech Provider to submit to App Review and
      request access to user data… You'll be required to complete access verification»*, y
      detalla que sin ese estatus un desarrollador solo puede añadir casos de uso,
      personalizar permisos y probar llamadas — **no** completar verificaciones, ni pedir
      acceso a datos, ni enviar a revisión. Va antes que todo lo demás de la fase 3 C y
      cuelga de los datos legales del portafolio.
- [ ] Use cases / Permissions and features: añadir los cinco permisos (acceso estándar =
      funcionan para quien tenga rol en la app).
- [ ] App roles → Roles → Testers si otra persona va a probar.
- [ ] Secretos → `META_APP_ID`, `META_APP_SECRET` (+ `META_CONFIG_ID`). Se puede activar
      «Require App Secret» en Settings → Advanced: las funciones mandan `appsecret_proof`.
- [ ] Probar en modo desarrollo: Conectar → elegir Página → Reel 9:16 en Facebook e
      Instagram y video 16:9 en Facebook.

### C · Verificación y App Review

- [x] **ENVIADA el 3-sep-2026 → «In review»** (Meta: ~2 días hábiles). Lo que la
      desbloqueó fue subir los documentos (constancia como «Constancia de Situación Fiscal
      SAT», que Meta ofrece ya como tipo en México) en el paso «Upload documents», no la
      vía del dominio. Detalle abajo por si hay que repetirlo.
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
- [ ] Screencast (uno por solicitud, inglés o subtítulos): entrar, Conectar Facebook,
      diálogo de permisos con los cinco, elegir Página, publicar desde el Studio, ver el
      video en la Página y el Reel en Instagram, Desconectar en Cuentas conectadas.
- [ ] App Review → Permissions and features → Request advanced access para los cinco:
      descripción de uso (abajo), screencast e **instrucciones con credenciales** (la
      cuenta revisora `mindplannerhome@gmail.com` ya entra a la app; añadir un test user
      de Facebook con Página e Instagram vinculados en App roles → Test users).
- [ ] Enviar y contestar (3–7 días hábiles). Rechazo típico: el revisor no pudo entrar o
      el screencast no enseña el permiso en uso.
- [ ] Pasar la app a **Live** (interruptor App Mode) y `REDES_META_LIVE=1`. Cada año:
      Data Use Checkup.

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
| Web, ventana emergente | Chrome → Exportar → red → Conectar | La ventana se cierra sola y el diálogo pasa al formulario |
| Web, emergente bloqueada | Bloquear emergentes y repetir | La pestaña va al proveedor y vuelve con la cuenta conectada |
| Android (APK) | Conectar desde el Honor | Sale Chrome, vuelve por `com.macr120.mindhome://redes` y cierra la pestaña |
| Escritorio (Electron) | Conectar desde el shell | Sale el navegador del sistema y la app recibe la vuelta |
| YouTube | Publicar un video corto | Aparece en YouTube Studio como privado; el enlace lo abre |
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

1. Abrir `app.mindplannerhome.com` e iniciar sesión (URL visible). Narración o subtítulos
   en inglés: «Mind Planner Home is a personal planner with a built-in video editor».
2. Entrar al Studio de video, abrir un proyecto, reproducir dos segundos.
3. Exportar → la red → Conectar. Mostrar la pantalla de consentimiento **con la barra de
   direcciones visible** y aceptar.
4. Rellenar el formulario y Publicar (en TikTok, pasar despacio por privacidad,
   interacciones y contenido comercial). Esperar el resultado y pulsar «Ver en …».
5. Configuraciones → Cuentas conectadas → Desconectar, y enseñar la política de
   privacidad en el apartado de cuentas conectadas. Un minuto y medio en total.

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

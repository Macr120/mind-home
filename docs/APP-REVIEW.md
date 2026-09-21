# App Review de Mind Planner Home (iOS): la bitácora completa

Todo lo que costó pasar la revisión de Apple de la 1.0, en el orden en que se
aprendió: cinco envíos, cuatro rechazos y el error de verdad, que solo se pudo
leer cuando la app empezó a pintar su código en pantalla. Se conserva ENTERO a
propósito, con los callejones sin salida incluidos: la próxima vez que Apple
rebote algo, la respuesta suele estar aquí.

Origen: las notas de trabajo de Claude (memoria de proyecto) y el plan aprobado
del 21-sep-2026, volcados al repo ese mismo día para que vivan con el código.
Las rutas `src/…` y `supabase/…` son las de la rama `ios-1.0.0`.

---

## Parte 1 — El plan del quinto envío (21-sep-2026)

# Plan: que la 1.0 pase la revisión de Apple (5.º envío)

## Contexto

Cuarto rechazo, 21-sep-2026, **iPad Air 11" (M3), iPadOS 27.0**, build 1.0.0 (4):
**2.1(b) — «the app displayed an error message when we tapped on the purchase
button»**. Sin captura. Solo la app rechazada; los 7 productos siguen en
`Ready for Review`, el hilo (`Messages (4)`) sigue vivo, envío `b4dacfb3` en
`UNRESOLVED_ISSUES`. Es la única app del dueño sin aprobar: urgente.

## Evidencia recogida el 21-sep (ya hecha, no repetir)

- RevenueCat: la cuenta demo **`«cuenta demo del revisor» (correo y contraseña: App Review Information en ASC)` (e9d7…589e)** abrió la app
  el **21-sep 07:06 UTC** (país Singapore; el rechazo se publicó a las 07:18).
  **Sin compra, sin entitlements, `non_subscriptions` vacío** (confirmado por
  dashboard y por `GET /v1/subscribers`). Esta vez SÍ usaron la cuenta demo.
- Supabase `rc_eventos`: **una sola fila en toda su vida**, mi compra de prueba
  del 14-sep (`f6da…`). El webhook nunca ha recibido nada de ningún revisor.
- Otro cliente nuevo `b261…5d54` (US, 20-sep 23:34 UTC), también sin compra.
- Conclusión: **el fallo ocurre ANTES de que RevenueCat registre nada**. O el
  catálogo de StoreKit no cargó (tope de 12 s → «The store didn't respond»), o
  `purchasePackage` lanzó (p. ej. `STORE_PROBLEM`, típico del sandbox de App
  Review, que RevenueCat documenta como inestable), o el revisor cerró la hoja
  de pago y la app se lo enseñó como error rojo.
- Las DOS revisiones que fallaron al comprar fueron **iPadOS 27.0**; nuestras
  pruebas fueron iPhone 15 / iOS 26.6. Nunca se ha probado en iPadOS 27.
- SDKs: `@revenuecat/purchases-capacitor` 13.4.1 (última 13.6.0), purchases-ios
  5.84.0 (última 5.90.2). Sin fix documentado de compra en iOS 27, pero sí
  arreglos de sandbox y de compilación con Xcode 27.

## Lo que hace hoy el código (trazado; no volver a trazar)

- `PuertaUnlock.alComprar` (`src/core/ui/PuertaUnlock.tsx:280-309`): si no hay
  oferta la vuelve a pedir con tope **12 s** (`ESPERA_TIENDA`, `paywall.ts:41`) y
  si falla → `puerta.sinOferta` («The store didn't respond»). Si
  `comprarUnlock` devuelve false → `puerta.compraFallo` («The purchase was not
  completed…»), y devuelve false TANTO si el usuario canceló como si StoreKit
  cobró y el webhook no escribió `perfiles.unlock` en ~15 s
  (`esperarPerfil`, `paywall.ts:185-193`; `comprarUnlock`, `:224-228`).
- `cajaNativa.comprar` (`paywallNativo.ts:106-115`): cancelación → false;
  cualquier otro error → se relanza y sale como `e.message` crudo por
  `textoDeFallo` (`paywall.ts:68-73`), sin código.
- `refrescarPerfil` (`sesionStore.ts:257-280`) descarta el `error` de Supabase.
- Cuenta: `Niveles.alCambiar` (`EditorCuentaSection.tsx:705-716`) y `Creditos`
  (`:640-644`) ignoran el booleano.

## Cambios (build 5, en `ios-1.0.0`; portar a `main` con cherry-pick)

### 1. La tienda: más paciencia, reintentos y sin error prematuro
`paywall.ts`: `ESPERA_TIENDA` 12 s → **30 s** y `ofertas()` con **2 reintentos**
(1 s, 3 s) antes de rendirse. `PuertaUnlock`: mientras carga, el precio muestra
«···» y bajo el botón un aviso neutro nuevo `puerta.conectandoTienda`
(«Connecting to the App Store…»); el botón sigue activo (regla del 9-sep). El
error `puerta.sinOferta` solo tras agotar reintentos, y con el código debajo.

### 2. Cancelar no es fallar
Nueva clase `CompraCancelada` en `paywall.ts` (hermana de `TiendaSinRespuesta`).
`cajaNativa.comprar` y `cajaWeb.comprar` la LANZAN al cancelar en vez de devolver
false. `alComprar` (`PuertaUnlock`), `Niveles.alCambiar`, `Creditos.alComprar` y
`AvisosPlan` (`:336-365`): `CompraCancelada` → sin mensaje.

### 3. Errores con código y con rastro
`textoDeFallo(e, t)` devuelve `{ texto, detalle }`: `detalle` =
`readableErrorCode · underlyingErrorMessage` del `PurchasesError`
(`purchases-typescript-internal-esm/dist/errors.d.ts:7-26`) o `e.message`.
Se pinta en gris bajo el mensaje en `PuertaUnlock` y `EditorCuentaSection`.
Cada fallo se manda a la Edge Function del punto 4 como
`{ resultado:'error', paso:'catalogo'|'compra'|'perfil', codigo, mensaje,
producto, plataforma, os }` → tabla `compras_log`. Así la próxima revisión deja
rastro aunque Apple no adjunte captura.

### 4. La compra la confirma el servidor, no el webhook
Edge Function **`supabase/functions/confirmar-compra`** (verify_jwt; patrón de
`canjear-cupon`: `usuarioDe(clienteUsuario(req))`, `clienteAdmin()`):
- `GET https://api.revenuecat.com/v1/subscribers/{uid}` con secreto `RC_API_KEY`
  (clave secreta v1 de RevenueCat; el dueño la crea en RC › API keys y la pone
  con `supabase secrets set RC_API_KEY=…`; yo no manejo el valor).
- Si `non_subscriptions` trae un id de `UNLOCK_PRODUCTOS` → mismo update que el
  webhook (`unlock=true`; trial 30 d solo si `plan==='local' && !unlock`). Si
  hay suscripción activa → update de `ACTIVAN` (pro, nivel, expira). Recargas
  NO (no idempotente; quedan en el webhook).
- Extraer esas reglas del webhook a **`_shared/compras.ts`** (`idBase`,
  `UNLOCK_PRODUCTOS`, `NIVELES`, `aplicarUnlock`, `aplicarSuscripcion`) y que
  `revenuecat-webhook/index.ts` las importe. Una sola fuente de verdad.
- Migración nueva `compras_log` (id, user_id, plataforma, os, paso, producto,
  resultado, codigo, mensaje, recibido_en; RLS activado, sin policies).

Cliente: `comprarUnlock` → tras `pasarPorCaja` true, llama a `confirmar-compra`
y luego `refrescarPerfil()`; si la función falla, cae a `esperarPerfil`
ampliado (15 × 3 s). Si aun así no hay unlock: **no es error**, estado
`puerta.activando` («Payment received, activating your house…») + botón
«Check again» (reusa `alComprobar` de `FilaRestaurar`, `PuertaUnlock.tsx:473`).
Mismo esquema en `cambiarNivel` y `comprarCreditos`.

### 5. `refrescarPerfil` deja de tragarse errores
`sesionStore.ts:262-266`: si `error` → lanzar; `if (!data) return` se queda.

### 6. Cuenta maneja el booleano
`EditorCuentaSection.tsx:705-716` y `:640-644`: false → mensaje; cancelada →
nada; error → texto + detalle. Claves nuevas en los 16 dicts (patrón del 16-sep:
anclar tras `cuenta.nivel.nota` / `puerta.sinRestaurar` con un script).

### 7. SDKs de RevenueCat al día (higiene, no causa)
`npm i @revenuecat/purchases-capacitor@13.6.0` → `npx cap sync ios` (SPM
resuelve purchases-ios 5.90.x). Gate: `tsc` limpio y la compra en aparato.
Si rompe algo, se revierte y se sube el build sin este punto.

### 8. Build 5
`CURRENT_PROJECT_VERSION = 5` en las 4 configuraciones del `.pbxproj`. Archive
con la receta de memoria; verificar dentro del archive (app y appex 1.0.0 (5),
`ITSAppUsesNonExemptEncryption=false`, dominio horneado, cadenas nuevas). Subir
con el `ExportOptions.plist` de `1.0.0-4`.

## Pruebas en aparato ANTES de subir (y el vídeo)

Orden: servidor primero (función + migración + secreto desplegados y probados
con curl y el JWT de una cuenta de pruebas), luego el build.

1. **iPad del dueño actualizado a iPadOS 27** (decisión del 21-sep): registrar
   su UDID si no está, instalar por cable (`xcrun devicectl device install app`),
   lanzar con `--console`.
2. Cuenta de app de PRUEBAS (**nunca `«cuenta demo del revisor» (correo y contraseña: App Review Information en ASC)`**; mantener su
   `unlock = FALSE`) + sandbox `«alias +sandbox»`.
3. **Grabar pantalla** (Centro de control → Grabar): entrar → «Buy the house» →
   hoja de pago → confirmar → la casa se abre sin mensaje rojo. Este vídeo (en
   iPad) es el adjunto para Apple.
4. Repetir cancelando la hoja: sin error rojo. Repetir en el iPhone 15.
5. Verificar en Supabase: `compras_log` con la fila `ok`, `perfiles.unlock`.
   En la consola: `⚡️ To Native -> Purchases purchasePackage` y la llamada a
   `confirmar-compra`.

## App Store Connect (receta en memoria `mph-alta-app-store`)

1. Notas: PATCH `appStoreReviewDetails` por la API `iris`; bloque «WHAT
   CHANGED» del build 5 (tienda con reintentos y 30 s, cancelación sin error,
   códigos en pantalla, compra confirmada por servidor, probado en iPadOS 27).
2. **Reply** en el hilo (≤ 4 000 car., adjuntar el vídeo del iPad): en nuestros
   registros la compra del 21-sep nunca llegó al backend de la tienda, así que
   el fallo estuvo en el paso StoreKit del sandbox; qué cambiamos; verificado
   en iPad Air con iPadOS 27 en sandbox (vídeo); si vuelve a salir un error,
   ahora enseña un código: pedir que lo incluyan. Paid Apps Agreement activo,
   6 productos en el envío, sin restricción por país.
3. Cambiar el build a 5 SIN cancelar el envío: ⊖ a la derecha de la fila →
   Add Build → Done → Save → «Update Review» (versión) → **recargar la página
   del envío** → «Resubmit to App Review». Verificar por API:
   `WAITING_FOR_REVIEW`, 8 items, build 5, `Messages` intacto.
4. Actualizar memoria (`mph-alta-app-store.md`) con el 5.º envío y la evidencia.

## Verificación
- `npx tsc -b`, `npx eslint` de lo tocado, `npm run traducir:verificar`.
- `supabase functions deploy confirmar-compra revenuecat-webhook`, `supabase db
  push`, `supabase secrets set RC_API_KEY` (el dueño pega la clave).
- Compra en sandbox completa en iPad (iPadOS 27) e iPhone, con vídeo.
- Estado del envío verificado por API tras reenviar.

## Fuera de alcance (a propósito)
- **Nombre nuevo, mockups/capturas nuevas y la versión con Studio**: NO en este
  envío. Cuatro rechazos seguidos por la compra → el 5.º va con el mismo binario
  y solo el arreglo de la compra, sin metadatos nuevos que revisar desde cero.
  Todo eso entra en la 1.1 tras la aprobación (junto con las redes).
- Segunda cuenta demo desbloqueada: el dueño dijo que no (21-sep).
- Layout de la app en iPad («tarjeta diminuta»): no es motivo de rechazo.
- Cambiar precios o crear productos nuevos.

---

## Parte 2 — Bitácora de los cinco envíos (más reciente primero)

Alta de **Mind Planner Home** (repo `Macr120/mind-home`) en el App Store, arrancada
el 24-ago-2026. Datos fijos: **app id 6804840611**, bundle `com.macr120.mindhome`,
equipo Apple **9FA4Z58JF3**, SKU `mind-planner-home`, versión 1.0 (build 1).
El proyecto iOS vive en `ios/` (Capacitor 8 con SPM) en la rama `ios/proyecto-nativo`.

**🚀 ENVIADA A REVISIÓN el 26-ago-2026 ~00:5x**: versión 1.0 con el build
1.0.0(1) y la compra `unlock_casa_v4`, en estado **«Waiting for Review»** y con
**«Automatically release»** (si Apple aprueba, se publica sola). Quedaron FUERA
del envío, por decisión del dueño: `creditos_x1` y las 4 suscripciones —viven en
`Editor › Configuraciones › Cuenta` («Hazte Pro»), no en el paywall, así que la
captura del paywall no las representaba—. Consecuencia a recordar: **la primera
suscripción tendrá que viajar con una versión futura** (la 1.1).

## 🚀 QUINTO ENVÍO: 21-sep-2026 23:10 UTC, build 1.0.0 (6), con el error por fin identificado

Envío **`b4dacfb3`** (el mismo desde el 14-sep) en `WAITING_FOR_REVIEW`, 8 items,
build 6, `AFTER_APPROVAL`, hilo en «Messages (5)» con **vídeo adjunto** de la
compra completa en un iPad mini 6 con iPadOS 27.0 (recortado a 720p, 33 s,
`~/Documents/MPH-builds/1.0.0-6/compra-ipad-sandbox.mp4`; el original de 52 s
está en el escritorio, `ScreenRecording_09-21-2026 16-51-38_1.MP4`).

**EL ERROR DE VERDAD, visto el 21-sep en el iPad** gracias a la línea gris nueva
bajo el aviso: **`8 · INVALID_RECEIPT` — «The purchased product was missing in
the receipt. This is typically due to a bug in StoreKit»**. StoreKit cobra, pero
el recibo que StoreKit 2 le pasa a RevenueCat llega sin el producto. RevenueCat
lo documenta: «lo vemos sobre todo con StoreKit 2», ocurre durante App Review, y
se cura con un **tester de sandbox nuevo** (las cuentas con historial confunden a
Apple). Es casi seguro lo que vio el revisor las dos veces (build 2 y build 4).

Arreglo (`703ee77` en `ios-1.0.0`, `cb361e4` en `main`): `cajaNativa.comprar`
ante error 8/9 llama a `syncPurchases()` hasta 3 veces y comprueba
`allPurchasedProductIdentifiers`; si el producto está, la compra es buena.
Verificado: con el tester nuevo `«alias +sandbox2»` (creado por el
dueño el 21-sep) la compra pasó limpia → `rc_eventos` recibió por fin un
`NON_RENEWING_PURCHASE` (22:52 UTC) para `macr120cme+2bprueba22` (`14b7…`) →
`confirmar-compra` ok → perfil `unlock=true, trial`.

**Cuentas de prueba y su estado** (revisar antes de cualquier envío):
- `«cuenta demo del revisor» (correo y contraseña: App Review Information en ASC)` (e9d7…): REVISOR. `unlock=false`. RevenueCat tiene el
  unlock transferido bajo ella (21-sep, 20:10): si el revisor toca «Restore
  purchases», `confirmar-compra` lo desbloquea — aceptable.
- `macr120cme+2bprueba21` (4bcb…): re-bloqueada a mano el 21-sep (`unlock=false`).
- `macr120cme+2bprueba22` (14b7…): `unlock=true`, trial hasta 21-oct.
- Sandbox `+sandbox` (quemada: historial + borrado) y `+sandbox2` (limpia).

**Lo que se subió a ASC ese día**: builds 5 (15:10) y 6 (15:39), ambos `VALID`;
el 5 nunca se envió (se detectó el error 8 antes). Notas de revisión reescritas
(3 999 car.) con el error 8 explicado y SIN afirmar pruebas en iPhone (el build
6 solo se probó en el iPad). Respuesta a Apple con el error exacto y el vídeo.
Ramas empujadas: `ios-1.0.0` @ `b067944`, `main` @ `cb361e4`.

**Gotchas de ese día**: `file_upload` de Chrome admite < 10 MB (el .MP4 del
iPad pesaba 35 MB → recortar/exportar a 720p con AVFoundation, script
`recortar.swift` en el scratchpad; sin ffmpeg en este Mac); un primer intento
«sin conexión» SÍ llegó y duplicó el adjunto: cancelar el modal y rehacerlo (no
hay botón para quitar un adjunto). `computer wait` tope 10 s.

## ❌ CUARTO RECHAZO, 21-sep-2026: 2.1(b) «error al tocar comprar» — y QUINTO envío en marcha

Build 1.0.0 (4), **iPad Air 11" (M3), iPadOS 27.0**, sin captura. Solo la app
rechazada; los 7 productos siguen `Ready for Review` y el hilo sigue vivo.

**Evidencia** (RevenueCat + Supabase, el 21-sep): el revisor entró con la cuenta
demo `polen.mp4` (e9d7…) a las **07:06 UTC** (país Singapore) y **no llegó
ninguna compra a RevenueCat**; `rc_eventos` tiene UNA fila en su vida (mi prueba
del 14-sep). O sea: el fallo pasa ANTES de que la tienda registre nada — tope de
12 s del catálogo, `purchasePackage` lanzando (STORE_PROBLEM del sandbox), o el
revisor cerrando la hoja (que la app pintaba como error rojo). Las dos revisiones
que fallaron al comprar fueron iPadOS 27.0; nunca se había probado ahí.

**Cómo se mira** (reutilizable): RevenueCat › Customers ordenado por «Last
seen» y el perfil del cliente (proyecto `131ba716`, NO el app id); en Supabase,
SQL editor: `select … from rc_eventos order by recibido_en desc`. Chrome bloquea
esos dominios en esta sesión: se usó el navegador integrado con el dueño
iniciando sesión él mismo. La REST v1 de RC con la clave PÚBLICA de iOS
(`GET /v1/subscribers/{uid}`) también sirve para un uid concreto.

**Lo arreglado en `ios-1.0.0` (commits `5618ba3`, `cff2567`, `9463f6e` =
build 5)**: la compra la confirma el servidor (`confirmar-compra` +
`_shared/compras.ts`, reglas compartidas con el webhook); `CompraCancelada` es
un tipo (cancelar ya no es error); `detalleDeFallo` pinta el código de la tienda
bajo el mensaje; bitácora `compras_log` (migración `20260921000001`); catálogo
con 30 s y 2 reintentos y «Conectando con la tienda…»; `refrescarPerfil` expone
`errorPerfil`; SDK 13.6.0 / purchases-ios 5.89.0. Las funciones de compra
reciben la `OfertaPro` entera. Pendiente de portar a `main`.

**Servidor**: hace falta `RC_API_KEY` (clave secreta v1 de RC) como secreto de
Supabase, `supabase login` + `link --project-ref bzwiexwvpimlellfprip`,
`db push` y `functions deploy confirmar-compra revenuecat-webhook`. Sin la
clave, la función solo registra bitácora y responde `sin-clave` (503): la app
cae a esperar el webhook (15 × 3 s) sin enseñar error.

**TRAMPA del sandbox descubierta el 21-sep (prueba en el iPad)**: la cuenta
sandbox `«alias +sandbox»` YA POSEE `unlock_casa_v4` (no consumible)
desde el 14-sep. Al «comprar» otra vez con ella desde OTRA cuenta de app, StoreKit
la re-entrega gratis y RevenueCat **TRANSFIERE** la compra al app_user_id nuevo
(evento `TRANSFER`, que el webhook solo audita). El dueño la probó —contra lo
acordado— con **`«cuenta demo del revisor» (correo y contraseña: App Review Information en ASC)`**: RevenueCat ahora tiene el unlock bajo
`e9d7…` (la cuenta del revisor). `perfiles.unlock` de e9d7 sigue en FALSE
(verificar SIEMPRE antes de reenviar; si cambió, `update perfiles set
unlock=false, plan='local', plan_expira=null where user_id='e9d7…'`). Para un
vídeo con hoja de pago real: Ajustes › App Store › Cuenta de sandbox › Gestionar
› **Borrar historial de compras**, y una cuenta de app de PRUEBAS nueva.

**Claves de RevenueCat, aprendido el 21-sep**: la API v1 (`GET /v1/subscribers`)
devuelve **401 con una clave secreta v2** (las dos empiezan por `sk_` y el panel
no lo distingue). `confirmar-compra` prueba `RC_API_KEY` y de respaldo
`RC_PUBLIC_IOS_KEY` (la clave PÚBLICA del SDK, que esa lectura sí admite). Los
logs de la función se ven en el panel: Edge Functions › confirmar-compra › Logs.
**Verificado en iPadOS 27.0**: «Restore purchases» → `confirmar` ok → la puerta
se abre en segundos (cuenta `4bcb…` = `macr120cme+prueba21`).

`compras_log` se lee con `npx supabase db query --linked "select …"` (el editor
SQL del panel también vale, pero `form_input` en Monaco puede concatenar texto).
El `db push` NO funciona: la base remota tiene 4 migraciones (`20260916000001`,
`20260916000002`, `20260917000001`, `20260919000001`) que no están en ninguna
rama de git — se aplicaron fuera del repo. La de `compras_log` se aplicó por el
editor SQL y se registró con `supabase migration repair --status applied`.

**iPad del dueño**: iPad mini 6 (`iPad14,1`), **ya en iPadOS 27.0**, UDID
`«UDID del iPad mini (portal de desarrollador)»`, registrado el 21-sep como «iPad mini MaCaSr». Los
perfiles dev cacheados se apartaron a `~/Documents/MPH-builds/perfiles-apartados-0921/`
para que el archive los regenere con el iPad dentro.

## 🚀 CUARTO ENVÍO: 16-sep-2026 21:15 UTC, build 1.0.0 (4), SIN cancelar nada

Envío **`b4dacfb3`** (el mismo de siempre) en `WAITING_FOR_REVIEW` con los 8
elementos y el build 4. Versión en `WAITING_FOR_REVIEW`, `AFTER_APPROVAL`.
**El hilo sobrevivió**: sigue en «Messages (3)» con las dos respuestas y la
captura. Se puede cambiar el build y reenviar SIN cancelar el envío.

**La receta buena, que contradice la nota vieja de «hay que cancelar»**: con la
versión en `REJECTED` y el envío en `UNRESOLVED_ISSUES`, la página de la versión
**ya NO redirige** (eso solo pasa con el envío en `WAITING_FOR_REVIEW`). Entonces:

1. En la VERSIÓN: pasar el ratón por la fila del build → sale un **⊖ rojo a la
   DERECHA** del todo (no a la izquierda) → quitar → **Add Build** → elegir →
   **Done** → **Save**. La versión pasa de `REJECTED` a `PREPARE_FOR_SUBMISSION`.
2. **«Update Review»** (arriba a la derecha de la VERSIÓN): NO envía. Solo deja
   los items en `READY_FOR_REVIEW` y la versión en `READY_FOR_REVIEW`. El envío
   sigue en `UNRESOLVED_ISSUES` y la fecha de envío sin tocar — es fácil creer
   que falló.
3. **RECARGAR la página del ENVÍO**: ahí se activa **«Resubmit to App Review»**
   (estaba apagado antes del paso 2). ESE es el que envía de verdad.

O sea: **son dos botones en dos páginas distintas, y el segundo solo aparece
activo tras recargar.** Verificar siempre por API, que la UI va por detrás.

Las notas llevan ahora una línea nueva al principio explicando que el build
cambió respecto a lo que describen los mensajes del hilo (3 878 car.).

**Verificado en el iPhone 15 antes de subir** (captura en
`~/Desktop/IMG_1635.png`): bajo la escalera de niveles salen el aviso de
renovación completo y los enlaces «Terms · Privacy», y el dueño confirmó que los
dos abren. Es la primera vez que ese bloque se ve pintado.

## 📦 BUILD 1.0.0 (4), el 16-sep-2026: el bloque legal de la 3.1.2

Archive en `~/Documents/MPH-builds/1.0.0-4/MPH.xcarchive` (113 MB), desde
`ios-1.0.0` @ `e7a474c`. **Subido a ASC el 16-sep 13:51** («Upload succeeded»).

**El hueco que lo motivó**: la guideline 3.1.2 exige en la MISMA pantalla donde se
vende una suscripción (a) el nombre, (b) el periodo, (c) el precio, (d) enlaces
que FUNCIONEN a términos y privacidad y (e) el aviso de renovación automática.
El panel de Cuenta tenía a, b y c; **d y e no existían en la rama que se envía**.

**Y la trampa organizativa, que es lo reutilizable**: (d) SÍ estaba hecho —commit
`7d6c488` del 9-sep en `main`, «Cuenta: enlazar términos y privacidad»— pero su
propio mensaje acaba con «**Llega a iOS con la 1.0.1**». Se aparcó a conciencia,
y por eso los tres builds revisados viajaron sin enlaces legales. **Antes de
escribir un arreglo para `ios-1.0.0`, mirar si ya existe en `main`**: esta rama
va por detrás A PROPÓSITO (ver `mph-plan-dos-versiones`) y lo aparcado se
queda aparcado sin que nadie avise.

Resuelto sin duplicar: se portó `7d6c488` a iOS (`f542758`, con conflicto contra
el refactor de la escalera —es anterior y aún asumía `if (plan === 'pro')`—) y el
aviso de renovación se escribió una vez en `main` (`bff312c`) y se cherry-pickeó
(`34f630b`). Las dos ramas quedan con el bloque idéntico.

**Lo que hay que comprobar SIEMPRE en este archive**, porque falla en silencio:
`EnlacesLegales` hace `if (!URL_WEB) return null`, así que sin `VITE_URL_WEB`
horneada se sube un build que sigue incumpliendo la 3.1.2 sin dar ni un error.
Comprobado con `grep -o "https://mindplannerhome\.com"` sobre
`App.app/public/assets/index-*.js` (y que no haya `localhost`). Ídem el aviso:
`grep -rl "renews automatically unless you turn it off" App.app/public/assets`.

**Sin ver renderizado, otra vez**: el panel exige sesión con backend y el modo
demo no tiene sesión, así que ni el trabajo del 9-sep ni el de hoy lo han visto
pintado. Solo se puede verificar en un aparato con la cuenta del dueño.

## ❌❌❌ TERCER RECHAZO, el 16-sep-2026: 2.1(b) + 2.1 + 2.3.2 — y NO era la app

Envío `b4dacfb3` en `UNRESOLVED_ISSUES`, versión en `REJECTED`, revisado en
**iPad Air 11" (M3)** con el build 1.0.0 (3). Solo la APP está rechazada: los 6
productos y el grupo siguen en `READY_FOR_REVIEW`. Tres puntos, **ninguno pide
build nuevo**:

1. **2.1(b)** «we cannot locate the In-App Purchases … Pro x1/x2/x3, Pro x1
   (yearly) within the app». Piden RESPONDER con los pasos.
2. **2.1** «Why user needs to login before purchase?» / «What account based
   features are in in app purchase products?»
3. **2.3.2** «metadata refers to paid content … not clearly identified as
   requiring additional purchase. Please identify in app description that in app
   purchase is mandatory». Este SÍ obliga a tocar la ficha.

### La causa, cazada en RevenueCat (la técnica es lo reutilizable)

El revisor **no compró la casa, así que nunca entró a la app**. Como
`<PuertaUnlock>` envuelve a `<App/>` entero (`src/main.tsx:144`), las cuatro
suscripciones —que viven en Editor › Settings › Account— quedan DETRÁS de la
puerta. Sin comprar, no hay forma de verlas.

La prueba, en `app.revenuecat.com/projects/131ba716/customers`: el cliente
**`a54c8eb0-…-9f0ad3281e21`**, país **Ireland**, primera y última vez
**16-sep 14:52 UTC** (una sola sesión), **USD 0 y sin entitlements**. Y es una
cuenta NUEVA: la de demo `«cuenta demo del revisor» (correo y contraseña: App Review Information en ASC)` (`e9d7…589e`) marca última
apertura el 14-sep, o sea que **el revisor se registró por su cuenta en vez de
usar las credenciales de las notas**. Ojo: el id de PROYECTO de RevenueCat es
`131ba716`, NO el de la app (`app5af132a6f0`); con el de la app la URL da
«Error loading project».

**Receta general**: ante un «no encontramos X», mirar la lista de clientes de
RevenueCat ordenada por «Last Seen» y buscar el de país Irlanda en la fecha de
la revisión. Dice si el revisor llegó, si compró y con qué cuenta.

### Lo que se hizo el 16-sep (todo verificado releyendo, no por el código HTTP)

- **Descripción**: párrafo nuevo al PRINCIPIO en los **16 idiomas**, diciendo que
  la app requiere una compra única y que los créditos de IA y la suscripción Pro
  son compras aparte y opcionales. Sin cifras (ver `mph-ficha-sin-precio`).
  Ninguna pasó de 4 000 caracteres.
- **Notas de revisión**: corregido un error propio —decían «one year of AI
  credits included» cuando el trial son **30 días / 700 créditos**
  (`src/core/edicion.ts:21`)— y metidos los pasos 4-6 detallados. 3 524 car.
- **Dos respuestas a Apple** en el hilo (quedó en «Messages (3)»):
  1. Los pasos exactos + por qué hace falta cuenta + qué es «account-based» en
     cada producto, **con `~/Desktop/IMG_1634.png` adjunta** (iPhone real con
     Editor › Settings › Account y las 4 suscripciones con precio: $6/$12/$18 y
     $60 al año). Esa captura contesta el 2.1(b) mejor que el texto.
  2. Addendum del 2.3.2: qué compran los créditos, con los ejemplos REALES
     sacados del código (`src/core/cuenta/gruposIA.ts`, los `costosIA.ts` de cada
     cuarto y los grupos `id:'ia'` de `ManualComandos.tsx`).

Decisión del dueño: **no** se creó una segunda cuenta demo ya desbloqueada; se
optó por explicar los pasos. Si vuelve a rebotar por lo mismo, ese es el plan B
(dejar `«cuenta demo del revisor» (correo y contraseña: App Review Information en ASC)` bloqueada para que puedan probar `unlock_casa_v4` y
añadir OTRA con `unlock = TRUE` en Supabase).

**Cabo abierto**: el botón **«Resubmit to App Review»** del envío sigue
DESHABILITADO; el que sí está vivo es **«Update Review»**, arriba a la derecha de
la página de la VERSIÓN. Responder NO devuelve el envío a revisión por sí solo.

## 🚀 TERCER ENVÍO: 14-sep-2026 07:47 UTC (00:47 local) — «8 Items Submitted»

Envío **`b4dacfb3-5936-463d-bfda-6945cc18d3eb`** en `WAITING_FOR_REVIEW`, con los
8 elementos y el **build 1.0.0 (3)**. Versión 1.0 en `WAITING_FOR_REVIEW` y
`releaseType = AFTER_APPROVAL`: **si Apple aprueba, la app se publica sola**.
Apple avisa de hasta 48 h y manda correo al terminar.

Revisado elemento por elemento antes de enviar (por API, no de vista):
- Versión 1.0 → build 3; notas 3 124 car. sin `MPH-REVIEW-…`; cuenta demo
  `«cuenta demo del revisor» (correo y contraseña: App Review Information en ASC)` marcada como requerida; contacto `mindplannerhome@gmail.com`.
- `unlock_casa_v4` → nota 508 car. limpia + captura del iPhone real con «$8.99».
- `creditos_x1` → nota 413 car. limpia + captura `COMPLETE`.
- Las 4 suscripciones → ids y periodos correctos (3× `ONE_MONTH`, 1× `ONE_YEAR`),
  notas 405 car., capturas `COMPLETE`.
- Grupo «Mind Planner Home Pro» dentro.

**Dónde está el botón de enviar** (cuesta encontrarlo): la fila del borrador en
`Distribution › App Review` **NO navega**. Se entra por el enlace **«added for
review»** del banner de la página de la VERSIÓN, que abre el panel lateral «Draft
Submission» con el botón azul **«Submit for Review»** al pie.

Cabo suelto asumido: las capturas de revisión de los otros 5 productos enseñan el
panel Cuenta ANTERIOR a la escalera de niveles. No se tocaron porque al entrar al
envío se congelan otra vez, y sacarlas obligaría a repetir todo el baile por una
mejora cosmética.

## 📦 BUILD 1.0.0 (3) SUBIDO el 14-sep-2026 00:09

Archive en `~/Documents/MPH-builds/1.0.0-3/MPH.xcarchive` (113 MB), desde
`ios-1.0.0` @ `7fc16c9`. Lleva los cuatro arreglos del día: cupón fuera (3.1.1),
el `await` sobre el Proxy de RevenueCat (2.1(a), ver
`capacitor-plugin-thenable`), el registro del plugin de widgets y la escalera
de niveles visible sin suscripción. Verificado dentro del .xcarchive antes de
subir: app y appex **ambas en 1.0.0 (3)**, `ITSAppUsesNonExemptEncryption=false`,
bundle web recién compilado y la clave `appl_…`.

**El archive sale firmado con «Apple Development» y eso es NORMAL**: el
certificado de App Store es Cloud Managed y se aplica al EXPORTAR, no al
archivar. Igual que el build 2, que Apple aceptó.

Recetas que funcionaron, para repetirlas sin pensar:
- Subir `CURRENT_PROJECT_VERSION` en las **4** configuraciones del `.pbxproj`
  (Debug y Release × app y appex). Si la appex no lleva el mismo número, Apple
  rechaza el paquete.
- `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release
  -destination 'generic/platform=iOS' -archivePath <dir>/MPH.xcarchive
  -allowProvisioningUpdates archive`
- Y para subir, el mismo `ExportOptions.plist` de `1.0.0-2`
  (`method=app-store-connect`, `destination=upload`, `signingStyle=automatic`,
  `manageAppVersionAndBuildNumber=false`) con
  `xcodebuild -exportArchive … -allowProvisioningUpdates`.
- La fase «Compilar la web (solo Release)» corre `npm run build` + `npx cap copy
  ios` ella sola, así que el archive NUNCA empaqueta un `dist` viejo.

### ✅ ENVÍO REHECHO el 14-sep-2026 (~00:30) — y el truco del desplegable

Envío nuevo **`b4dacfb3-5936-463d-bfda-6945cc18d3eb`**, con los **8 elementos en
`READY_FOR_REVIEW`** y el **build 1.0.0 (3)** adjunto. SIN ENVIAR todavía.

**«Add for Review» es un DESPLEGABLE, no un botón.** Ofrece dos opciones:
«Draft iOS Submission (N)» y «Create New Submission». Ahí estaba el fallo que
costó tres intentos: si NO existe ningún borrador, se va directo a crear uno
nuevo, choca con el envío ya enviado y devuelve `409` con el inútil «Something
went wrong». **La cura es crear primero el borrador desde la VERSIÓN**; a partir
de ahí cada producto ofrece «Draft iOS Submission» y entra sin pelea.

**La página de la versión REDIRIGE al envío mientras haya uno abierto**, así que
no se puede cambiar el build hasta cancelar. Orden que funcionó:

1. Cancelar el envío (botón «Cancel Submission» al pie; pasa por `CANCELING` y
   acaba en `COMPLETE`, y la versión vuelve a `DEVELOPER_REJECTED`).
2. En la versión: **Delete** en la fila del build viejo (el ⊖ sale al pasar por
   encima) → aparece **«Add Build»** → elegir el 3 → **Done** → **Save**.
   La versión pasa a `PREPARE_FOR_SUBMISSION`.
3. En la versión: **«Add for Review»** → crea el borrador con 1 item.
4. En cada producto y **en el GRUPO de suscripción**: «Add for Review» →
   **«Draft iOS Submission»**. El contador sube de uno en uno; comprobarlo.

**`MISSING_METADATA` a nivel de producto (API v2) es un ESPEJISMO**: lo tienen
los seis productos incluso estando dentro del envío como `READY_FOR_REVIEW`.
Es el estado de su próxima versión editable, no del elemento enviado. No
perseguirlo.

Y el coste conocido: **cancelar cerró el hilo de mensajes con Apple**. Se aceptó
a conciencia porque todo lo que había que explicarles ya está en las notas de
revisión de la versión.

### ~~NUDO PENDIENTE~~ (resuelto arriba): `unlock_casa_v4` estaba FUERA del envío

Se sacó del envío `7a581212` para poder editarlo (su ficha se congela mientras
está dentro), se le arregló la nota —fuera la frase del cupón— y se le puso la
captura buena del iPhone (1179×2556 con «$8.99»). **Las dos cosas verificadas
contra la API.** Pero no se ha podido devolver al envío:

«Add for Review» desde la ficha del producto **NO añade al envío existente: crea
uno nuevo** (`POST /iris/v1/reviewSubmissions` → 201), choca con el que ya está
abierto (`POST /iris/v1/reviewSubmissionItems` → **409**) y luego falla al
limpiar el que creó (`DELETE` → 503; comprobado que el huérfano no se quedó).
En el envío el item figura con estado `REMOVED` y la página **no ofrece ningún
control para revivirlo**.

Plan: reintentar el «Add for Review» ahora que hay build nuevo. Si se resiste, el
plan B conocido es cancelar el envío y rehacerlo con los 8 elementos — funciona,
pero CIERRA el hilo de mensajes con Apple.

**Quitar UN elemento del envío NO cierra el hilo** (comprobado el 14-sep: tras
el ⊖, «Reply to App Review» seguía ahí). Lo que lo cierra es cancelar el envío
entero.

## ❌❌ SEGUNDO RECHAZO, el 13-sep-2026: 3.1.1 + 2.1(a) otra vez

Envío `7a581212-48e2-41fe-a021-94c4b832bb75`, build 1.0.0 (2), revisado en
**iPad Air 11" (M3), iPadOS 27.0**. Dos motivos:

**1) Guideline 3.1.1 — «the app uses promo codes to unlock subscriptions».**
Autoinfligido y por escrito: `FilaCupon` se pinta en `PuertaUnlock.tsx` SIN
filtrar por plataforma (línea ~341 en `ios-1.0.0`, ~390 en `main`), y encima las
**notas de revisión del propio IAP `unlock_casa_v4`** decían «The "I have a
coupon" button on this same screen unlocks the app with the code included in the
App Review notes». El canje (`canjear-cupon` → RPC `canjear_cupon`) da
`perfiles.unlock` **+ plan trial**: un plan de pago concedido sin pasar por la
tienda. Apple señala la salida buena: **Offer Codes**, que para `unlock_casa_v4`
(no consumible) SÍ están disponibles — el botón «Create Offer» está en su ficha.
Arreglo mínimo: envolver `FilaCupon` en `canalPago() !== 'iap'` (en web y
escritorio es legal y se queda) y limpiar las DOS notas.

**2) Guideline 2.1(a) — «an error message was displayed when we tapped the
'Buy the house' button».** Las dos capturas del revisor (en
`~/Downloads/Screenshot-0913-1434*.png`) enseñan el precio en **«—»** —que en
`TarjetaPrecio` significa «la tienda no dio catálogo», no «cargando», que es
«···»— y el aviso `puerta.sinOferta`: *«The store didn't respond…»*. O sea: el
arreglo del 9-sep FUNCIONÓ (el botón ya no está muerto), pero **StoreKit devuelve
CERO productos**.

### Todo lo de arriba de StoreKit está verificado BUENO (13-sep-2026)

No hay que volver a mirarlo:
- *Paid Apps Agreement* activo, banco y 3 formularios fiscales OK.
- `com.macr120.mindhome.unlock_casa_v4`: Ready for Review, **All countries**,
  precio con base USD. Ídem `creditos_x1`.
- Offering `default` → paquete `unlock` → el producto correcto del App Store.
- **Prueba definitiva**: con la clave `appl_…` SACADA DEL PROPIO ARCHIVE que
  se envió (`~/Documents/MPH-builds/1.0.0-2/MPH.xcarchive`), un
  `curl https://api.revenuecat.com/v1/subscribers/<id>/offerings` con
  `X-Platform: ios` devuelve los 6 ids correctos. La cadena app → RevenueCat está
  bien; lo que falla es la consulta de productos de StoreKit en el aparato.
- Telemetría del revisor (`e9d7…589e`, país Irlanda, aparato en hora del
  Pacífico): abrió la app el 13-sep 13:33 UTC = 06:33 local, capturas a las 06:34
  y 06:38. **Audiencia Sandbox de RevenueCat: 0 clientes, 0 compras**, igual que
  el 9-sep.

### La causa NO se puede diagnosticar desde el escritorio

**TestFlight → Build Uploads dice INSTALLS: «–» en los dos builds.** La app NUNCA
ha corrido en un aparato Apple real, ni una vez. Todo lo que sabemos del paywall
sale del simulador (donde StoreKit no puede) y de los dos intentos de App Review.
Y al quitar el cupón el revisor se queda SIN puerta trasera: o la compra funciona,
o no entra. **Probar en aparato real es ahora el camino crítico**, por TestFlight
o por cable de datos (ver `mph-plan-dos-versiones`).

Dos cabos menores vistos el 13-sep: en RevenueCat **falta la clave de App Store
Connect API** (los 6 productos del App Store salen «Could not check»; la misma
clave desbloquea `npm run asc:ficha`, ver `asc-formularios-navegador`), y el
*Apple Server Notification URL* dice «No notifications received». Y en las
capturas se ve que en iPad la app se pinta como **una tarjeta diminuta centrada
en una pantalla enorme**: no es motivo de este rechazo, pero Apple ya avisó de
que «apps downloaded onto iPad should function as expected for iPad users».

**Esta vez el envío quedó en `Rejected`, NO en `Removed`: el botón «Reply to App
Review» SIGUE vivo.** No cancelar el envío, que eso cierra el hilo (se aprendió
el 9-sep).

### ✅ CAUSA RAÍZ DEL 2.1(a), ENCONTRADA Y ARREGLADA (13-sep-2026, noche)

**No era Apple, ni StoreKit, ni la ficha.** Era `paywallNativo.ts`: `rc()` devolvía
el SDK de RevenueCat desde una función `async`, y el Proxy de `registerPlugin`
responde a `then`, así que la promesa NO SE RESOLVÍA NUNCA y `getOfferings` no
llegaba a llamarse jamás. Toda la explicación en `capacitor-plugin-thenable`.

Colgaba la caja nativa ENTERA —`ofertas`, `comprar`, `restaurar`, `urlGestion`—,
que es por qué RevenueCat mostraba el cliente registrado (el `configure` nativo sí
corría) y **cero compras de sandbox** desde agosto. La caja de iOS no había
funcionado nunca, ni una vez.

Arreglo: `preparar()` devuelve `void` y el SDK se toca solo como `plugin().metodo()`.
Commits `29eabf5` (`ios-1.0.0`) y `6711955` (`main`, cherry-pick).

**VERIFICADO EN UN IPHONE 15 REAL (iOS 26.6)**, por fin, y **LA COMPRA COMPLETA
TAMBIÉN** (14-sep-2026 ~04:55 UTC). La cadena entera, eslabón por eslabón:
`getOfferings` → 6 productos a $8.99 USD → `purchasePackage` → transacción de
StoreKit → RevenueCat registra la compra de sandbox («This Customer has sandbox
purchases», país US) → **webhook a Supabase `Sent`** (UUID `c88efb78-3a…`, el
PRIMER evento que ese webhook manda en su vida) → `perfiles.unlock` → la puerta
se abrió sola y la casa se pintó.

La cuenta de sandbox es **`«alias +sandbox»`** (United States), creada
en Users and Access › Sandbox. Ojo: las cuentas de sandbox **no se pueden borrar**,
solo editar, y por eso conviene el alias `+` y no un correo de verdad. El webhook
de RevenueCat estaba —y debe seguir— en **«Both Production and Sandbox»**: si
estuviera solo en producción, la compra de sandbox no escribiría el perfil.

La compra se hizo con la cuenta de app **`f6da7976-…`**, NO con la del revisor:
`«cuenta demo del revisor» (correo y contraseña: App Review Information en ASC)` conserva su `unlock = FALSE` y el revisor sigue viendo la
puerta. **No comprar nunca con esa cuenta** sin devolverle el flag después.

**Cómo se instaló en el aparato** (guardar, que costó): el Mac es un Hackintosh y
sus puertos USB hay que mapearlos —el iPhone solo enumera en algunos—; hizo falta
**activar Modo de desarrollador** en el teléfono (Ajustes › Privacidad y seguridad,
al final del todo, y CONFIRMAR el aviso tras el reinicio), **desbloquearlo** (si
está bloqueado, el montaje del DDI falla con `kAMDMobileImageMounterDeviceLocked`),
y **registrar su UDID** (`«UDID del iPhone 15 (portal de desarrollador)»`, alta como «iPhone 15 MaCaSr»;
el «Iphone cdmx» que ya estaba es OTRO aparato). Como Xcode 26.5 es más viejo que
el iOS 26.6 del teléfono, `-destination id=…` falla: se compila con
`-destination 'generic/platform=iOS'` y se instala con
`xcrun devicectl device install app`. Y tras cambiar de rama hace falta
`npm install` o `tsc` revienta con errores ajenos (ver
`git-fetch-antes-de-construir`).

### Arreglado ya del 3.1.1 (13-sep-2026, tarde)

- **Código**: `{canal !== 'iap' && <FilaCupon />}` en `PuertaUnlock.tsx`.
  Commiteado en las DOS ramas —`ios-1.0.0` (1ebd4db) y `main` (4238b9d, sobre
  origin/main ya al día)—, con `tsc -b` y `eslint` limpios. `canalPago()` tapa
  iOS y Android a la vez a propósito: Play Payments prohíbe lo mismo.
- **Notas del envío (App Review Information)**: reescritas y GUARDADAS, 3 124
  caracteres, verificadas tras recargar. Sin `MPH-REVIEW-…`, sin la opción
  «SKIP PAYMENT». Encabezan con «WHAT CHANGED IN THIS BUILD» —sin número, para
  que no caduque— contando solo el 3.1.1: **no se le prometió a Apple ningún
  arreglo del 2.1(a)**, que aún no existe.
- **BLOQUEADO**: la nota de revisión del IAP `unlock_casa_v4` —la que anuncia el
  botón del cupón— es de SOLO LECTURA mientras el producto esté dentro del envío
  (ASC la pinta como `<p>`, sin campo; el Reference Name sí es editable). Hay que
  sacarlo del envío con el ⊖. Se deja para cuando haya captura de aparato real,
  porque **su captura adjunta también hay que cambiarla**: enseña la pantalla con
  el recuadro del cupón que ya no existe. Las dos ediciones en una sola pasada.
- **Auditadas y LIMPIAS**: las notas de `creditos_x1` y de las 4 suscripciones no
  mencionan cupones. La única contaminada era la de `unlock_casa_v4`.

## ❌ RECHAZADA el 9-sep-2026, y por qué (2.1(a))

Apple rechazó la 1.0 build (1): *«We were unable to access the app because Buy the
house button was unresponsive»*, en **iPad Air 11" (M4) y iPhone 17 Pro Max, iOS
26.6.2**. La captura que adjuntó el revisor (`Screenshot-0909-080328.png`) enseña el
precio en «•••» y el botón **descolorido = DESHABILITADO**, sin ningún mensaje.

**Causa raíz**: `PuertaUnlock.tsx` tenía el botón `disabled={ocupado || cargando}`,
`cargando` arrancaba en `true` y solo se apagaba cuando volvía `obtenerUnlock()`. En
la cadena NO había ningún techo de espera, y `getOfferings()` → consulta de productos
de StoreKit **puede no volver nunca**. Promesa que no vuelve = botón muerto para
siempre. **Se reproduce igual en el simulador**, que tampoco tiene productos.

Lo que descarta la telemetría de RevenueCat (mirada el 9-sep): la cuenta del revisor
(`e9d7…589e`, país **US**, locale en-US, storefront USA,
SDK `capacitor (iOS 5.84.0)`, app 1.0.0, última apertura 9-sep 14:02 UTC) **sí habló
con RevenueCat**, y **no hay ni un intento de compra en sandbox** (audiencia Sandbox:
0 clientes). O sea: config de tienda BIEN (offering `default`, paquete `unlock` →
`com.macr120.mindhome.unlock_casa_v4`, el IAP dentro del envío en «Ready for Review»);
lo que falló fue el cliente.

**Arreglado el 9-sep-2026** (sin commitear aún), y VERIFICADO en el simulador de iPad
contra el cuelgue real, no un simulacro:
- `paywall.ts`: `conTecho()` de 12 s sobre `ofertas()` y `restaurar()`. La compra en sí
  NO lleva techo (ahí manda la hoja de pago del sistema).
- El botón ya solo se deshabilita con una compra en curso, nunca por estar cargando.
- Un toque compra: si falta la oferta, la pide y compra en el mismo toque.
- **Vuelven «Restaurar compras» y «Ya la compré»** a la puerta: las claves
  (`puerta.restaurar`, `puerta.yaCompre`, `puerta.sinRestaurar`) llevaban traducidas
  en los 16 idiomas pero NADIE las pintaba — vivían en `Configuraciones › Cuenta`, o
  sea DETRÁS de la puerta, así que quien reinstalaba se quedaba fuera con la casa
  pagada. Apple además las exige (3.1.1): era un segundo rechazo esperando.
- El error del techo va por `textoDeFallo()` en `paywall.ts`, no por `e.message`: el
  mensaje crudo salía **en español dentro de la app en inglés** (se vio en el iPad).
- Build subido a **1.0.0 (2)** en `project.pbxproj`.

**Subido el 9-sep-2026 13:03**: el 1.0.0 (2) ya está en App Store Connect procesándose
(`Uploaded App` + `EXPORT SUCCEEDED`).

**Trampa de la subida, que costó tres intentos**: en el llavero NO hay certificado de
distribución —solo `Apple Development` y el `Developer ID` del .dmg—; el de App Store
es **Cloud Managed**, o sea que lo emite Apple al vuelo y **exige sesión viva**. Cuando
sale `Your session has expired` en `xcodebuild -exportArchive`, abrir la cuenta en
Xcode NO basta: hay que **quitarla con el – y volver a añadirla** en Xcode → Settings →
Accounts. Sin eso fallan las dos cosas, subir Y exportar el .ipa a disco. La cura de
raíz es una **clave de API de App Store Connect** (Users and Access → Integrations, rol
App Manager): no caduca, no pide doble factor y sirve igual para `npm run asc:ficha`.
No hay ninguna creada todavía.

## REENVIADA el 9-sep-2026 a las 16:40, con TODO dentro (8 elementos)

`Waiting for Review`. Va la app **1.0.0 (2)** + los 2 pagos únicos
(`unlock_casa_v4`, `creditos_x1`) + las **4 suscripciones** + el **grupo de
suscripción**. Apple avisa: hasta 48 h.

Hubo que hacerlo en dos tiempos y merece la pena saber por qué:
1. A las 16:26 salió un envío con solo 2 elementos (app + casa). Se **canceló**
   («Removed») para poder meter el resto: una vez enviada, la versión queda
   bloqueada y el borrador de productos no puede engancharse a ella.
2. El borrador daba **«Unable to Submit: your auto-renewable subscription must be
   submitted with its subscription group»**. La causa: el GRUPO en sí
   («Mind Planner Home Pro», id 22335475) estaba en `Prepare for Submission` y
   nunca se había añadido al envío. Se arregla entrando al grupo y pulsando su
   propio **«Add for Review»** → Draft Submission. Las 4 suscripciones ya estaban
   listas; era el grupo el que faltaba.
3. **Al cancelar un envío, sus productos vuelven a `Developer Rejected`** y NO se
   re-añaden solos: el pago de la casa hubo que volver a meterlo a mano desde
   `Distribution › In-App Purchases` (la ruta es `/distribution/iaps`).

También se puso la **disponibilidad en los 175 países**, que estaba SIN configurar
y bloqueaba el envío sin que nadie lo hubiera visto.

**Cancelar el envío CIERRA el hilo de mensajes con Apple.** Una vez el envío queda
en `Removed`, el botón «Reply to App Review» desaparece y ya no se puede contestar
al rechazo. Por eso la explicación del arreglo se metió al principio de las **notas
del revisor** («WHAT CHANGED IN BUILD 2 — PLEASE READ FIRST», 3 839 de 4 000
caracteres), que además es lo que el revisor lee antes de tocar la app. Las notas
SIGUEN siendo editables con el envío en `Waiting for Review`. Truco para escribir en
esos campos de React sin que los revierta: `setSelectionRange(0,0)` +
`document.execCommand('insertText', ...)`, que sí dispara los eventos que React
escucha — a diferencia de `form_input`, ver `asc-formularios-navegador`.

## TestFlight quedó sin funcionar (sin resolver)

Se creó el grupo interno **«Pruebas internas»** con `«tester de TestFlight»` (estado
`Accepted`) y el build en `Ready to Test`. Aun así el iPhone dice **«no está
disponible o no existe»** al instalar. Descartado: Apple ID (el mismo en TestFlight
y en Medios y compras), compatibilidad (app y widget piden iOS 15, el aparato es un
iPhone 15), caché (se reinstaló TestFlight) y el build (firma, bundle IDs y equipo
correctos; un build roto no llega a `Ready to Test`). Puede que fuera propagación:
la disponibilidad se cambió minutos antes y Apple avisa de hasta 24 h.

**El plan B no salió**: el Mac no ve el iPhone por USB (comprobado con `ioreg`, que
sí lista la webcam y el bluetooth internos). El cable es **solo de carga**. Con un
cable de datos se instala directo con Xcode y se salta TestFlight entero.

Cabo suelto: hay una invitación de usuario pendiente a `«correo del dueño»` que
**no sirve** —no es un Apple ID, es su correo de Google— y se puede revocar en
Users and Access.

**LO QUE SIGUE SIN COMPROBARSE NUNCA**: que en un aparato REAL salga el precio y la
compra se complete. El simulador no puede: sin cuenta sandbox no hay productos. Si
StoreKit también se cuelga en dispositivo, ahora se ve «The store didn't respond» y se
entra por el cupón, pero la compra seguiría sin funcionar. **Es la prueba que hay que
hacer por TestFlight antes de reenviar.**

**Hecho** (verificado en la cuenta):
- App creada, **solo iOS**. La plataforma macOS se creó por error y se borró: el
  Mac va por .dmg fuera de la tienda y por «Designed for iPad», no por Mac App Store.
- Clasificación por edad: **9+** (12+ Vietnam, A10 Brasil). Solo puntúa el paintball
  (violencia de fantasía y armas «Infrequent»); Health/Wellness Topics = Yes,
  Medical Information = None.
- Derechos de contenido: **Sí** (RSS del Diario y datos de Finnhub).
- App Privacy: 11 tipos de datos, todos «App Functionality» y ligados a la identidad,
  **ninguno para rastreo**. **YA PUBLICADA** (comprobado el 25-ago-2026: la página no
  tiene botón «Publish» pendiente); la política apunta a
  `mindplannerhome.com/en/privacidad`.
- Ficha **inglés** completa: descripción, promocional, palabras clave, Support URL
  (`https://mindplannerhome.com/soporte`) y Marketing URL, más 4 capturas de iPhone
  6,9" y 1 de iPad 13".
- Ficha **español (es-MX)**: textos completos. Capturas a medias.

**La ficha está COMPLETA en los 16 idiomas** (verificado por API el 14-sep-2026):
en-US, es-MX, it, ja, pt-BR, hi, de-DE, nl-NL, ar-SA, pl, id, fr-FR, zh-Hans, ko,
ru, tr — y cada uno con **4 capturas de iPhone 6.7" + 1 de iPad 12.9"**. La nota
vieja de que faltaban 14 idiomas estaba desfasada.
Las **notas de revisión ya están escritas y pegadas** en App Review Information
(copia y razonamiento en `~/Documents/MPH-builds/1.0.0-1/notas-revision.md`).
La cuenta de prueba final es **`«cuenta demo del revisor» (correo y contraseña: App Review Information en ASC)`** (uid `e9d78cc2-…`), con
perfil plan `local` y **`unlock = FALSE`** — verificado en Supabase el 25-ago—: así
el revisor SÍ ve la `PuertaUnlock` y puede probar `unlock_casa_v4` o canjear el
cupón. El cupón bueno es **`MPH-REVIEW-…`** (5 usos, 365 días, activo, 0 canjes),
que ya existía para los revisores de Google Play. **Verificar SIEMPRE el cupón en la
tabla `cupones` antes de ponerlo en las notas**: en esta sesión se redactó primero
un código inventado que no existía. Al 25-ago-2026 la **App Review Information quedó COMPLETA y verificada**
campo por campo: correo confirmado (ya hay «Last sign in at»), contraseña
actualizada, y el dueño comprobó que el paywall sale. El **envío ya existe** (Draft iOS Submission) con la versión 1.0
y el build 1.0.0(1), y **`unlock_casa_v4` ya está dentro, en «Ready for Review»**.

**Cómo se completa un IAP para poder añadirlo al envío** (cuesta encontrarlo):
cada producto necesita (1) *Availability* fijada —«All countries», 175— y (2) una
**captura en Review Information**; sin las dos, «Add for Review» falla con
«Unable to Add for Review». La *Review Note* es opcional pero conviene.

**El precio NO viaja en el build**: se pide a la App Store en ejecución
(RevenueCat→StoreKit). En SIMULADOR nunca sale (sin cuenta sandbox no hay
productos) y con el producto en «Prepare for Submission» tampoco sale en
dispositivo. Con el producto ya en «Ready for Review» + build por TestFlight en
un iPhone real, el paywall debe pintar «Buy the house — $8.99». La captura del
simulador (sin precio) está subida como provisional en
`~/Documents/MPH-builds/1.0.0-1/paywall-ios.png` y hay que SUSTITUIRLA.

**Pendiente**: captura con precio desde TestFlight; `creditos_x1` sin captura
(el subidor del navegador falla ahí, hay que arrastrar el archivo a mano); y las
4 suscripciones sin revisar —Apple exige que la primera suscripción también
viaje con una versión nueva—. El riesgo 3.1.1 (enlace de pago externo) NO aplica:
`PuertaUnlock` y `AvisosPlan` esconden los CTA de la web cuando
`canalPago() === 'iap'`.

**El ORDEN de los productos lo fija Apple** (leído en la consola el 25-ago-2026): crear
los 6 productos se puede ya, pero «Your first in-app purchase must be submitted with a
new app version», y las suscripciones extra solo se envían una vez subido el binario y
enviada la primera. O sea: crear productos → alta de iOS en RevenueCat → clave `appl_`
→ y SOLO entonces compilar el binario que se sube. Compilar antes es compilar dos veces.

**Los contratos están al día**: el *Paid Apps Agreement* activo (4-mar-2026 →
27-feb-2027, banco y los tres formularios fiscales), y la actualización del
*Apple Developer Program License Agreement* la **aceptó el dueño el 25-ago-2026**
(el banner de developer.apple.com/account ya no sale). Ya nada de contratos
bloquea el envío.

**El binario 1.0.0 (1) YA ESTÁ COMPILADO Y FIRMADO para la tienda (25-ago-2026,
en la Mac)**: `~/Documents/MPH-builds/1.0.0-1/App.ipa` (+ el .xcarchive al lado).
Firmado con certificado «Cloud Managed Apple Distribution» (sesión de Xcode; no
hay cert local de distribución y no hace falta), perfil de tienda, y el App Group
en app y extensión. Adentro van la clave `appl_` y `https://mindplannerhome.com`
horneados, sin localhost. **SUBIDO el 25-ago-2026 22:51**: aparece como
1.0.0 (1) en TestFlight → Build Uploads, en «Processing». El
`.env.local` de la Mac quedó COMPLETO — el dueño
llenó las claves el 25-ago y las `VITE_URL_*` traían localhost: se corrigieron a
`https://mindplannerhome.com` / `https://app.mindplannerhome.com` ANTES de
compilar (con localhost, el correo de restablecer contraseña y los CTA de la web
apuntaban a localhost). Ojo: las `VITE_*` entran al bundle al COMPILAR — tocar
`.env.local` obliga a recompilar. Se subió con
`xcodebuild -exportArchive` + `destination=upload` y `-allowProvisioningUpdates`:
usa la sesión de Xcode ya autenticada, sin pedir contraseña ni claves de API.
`ITSAppUsesNonExemptEncryption=false` ya va en el Info.plist, así que App Store
Connect NO pregunta lo del cifrado en cada envío.

**ANDROID NO PUEDE VENDER** (descubierto el 25-ago-2026 mirando RevenueCat y Play
Console). La app existe en Play Console (`com.macr120.mindhome`, en **prueba cerrada**,
0 instalaciones), pero **Productos únicos y Suscripciones están VACÍOS**, y en
RevenueCat la fila de Play Store no tiene ni un producto. Como la clave `goog_…` sí
lleva meses en el `.env.local`, `hayPagos()` da true y la pantalla de compra sale sin
nada que comprar. No hay nada que importar: hay que CREAR los seis en Play Console
(ids de `docs/BACKEND.md` §3e) y luego importarlos. Ojo: en Play la suscripción cuelga
un plan base (`pro_x1_v2:mensual`) que se fija al crearla y es lo que ve el webhook
antes de que `idBase()` lo recorte.

**iOS, en cambio, quedó listo el 25-ago-2026**: app dada de alta en RevenueCat
(`app5af132a6f0`) con el `.p8`, los 6 productos creados en App Store Connect.
**Los precios de las SUSCRIPCIONES van con números cerrados, no en .99** (decisión
del dueño, confirmada el 14-sep-2026): el nivel ×1 es **$6.00/mes** y la recarga de
créditos **$6.00**, ambos LEÍDOS EN EL APARATO del `priceString` de StoreKit. Solo
el pago único de la casa lleva coma: **$8.99**. La app nunca escribe cifras —pinta
`oferta.precio`, que es `p.product.priceString`, tanto en la puerta
(`PuertaUnlock`) como en Cuenta (`EditorCuentaSection:519`)—, así que lo que se ve
es siempre lo que diga la tienda en la moneda de quien mira, niveles ordenados por servicio
(x3 → x2 → x1 y el anual COMPARTIENDO nivel con el x1 mensual) y localización en-US;
los 6 creados también en RevenueCat y asignados a sus paquetes del offering `default`.
El **webhook SÍ está activo** (Integrations → Webhooks, comprobado el 9-sep-2026; la nota
vieja de que faltaba estaba desfasada). Los precios de la web NO tienen por qué coincidir con los de
Apple: la web no paga comisión.

**La escalera de niveles se pinta SIEMPRE desde el 14-sep-2026** (commits
`41cb714` en `ios-1.0.0` y `e7363e7` en `main`). Antes vivía detrás de
`plan === 'pro'`, y eso dejaba el ×2, el ×3 y el anual **inalcanzables** para
quien no se hubiera suscrito ya: el revisor de Apple llega sin suscripción y no
habría encontrado más que un botón «Hazte Pro», con cuatro productos de
suscripción viajando dentro del envío y las notas diciéndole que están en
«Settings › Account». Se cayó con ello el botón suelto «Hazte Pro — {precio}/mes»,
que era el mismo ×1 de la lista repetido.

**La trampa que vino detrás** (`5891c80` / `41a312e`): el mes que regala la compra
de la casa deja **`nivel = 1`** en el perfil sin que nadie se haya suscrito, y
`const actual = n.nivel === nivelActual` le pintaba «Actual» al ×1 y lo dejaba
`disabled` — o sea que quien estaba en su primer mes NO PODÍA COMPRARLO, el
revisor incluido. Ahora es `plan === 'pro' && n.nivel === nivelActual`. Regla
general: **`nivel` en el perfil NO implica suscripción**; para eso está `plan`. La app nunca enseña esas cifras —
pinta el `priceString` de la tienda (`ui/PuertaUnlock.tsx` lo explica).

Ver `asc-formularios-navegador` para cómo se editan esos formularios sin pelearse
con ellos, y `mph-ficha-sin-precio` para de dónde sale el texto.

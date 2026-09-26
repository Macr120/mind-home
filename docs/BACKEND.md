# Backend: Supabase + RevenueCat

Capa de cuenta, IA con cuota mensual, suscripción Pro y sincronización
multi-dispositivo. **Sin `.env.local` la app es 100% local, idéntica a siempre**
(`hayBackend() === false` apaga toda esta capa).

## Arquitectura

```
Cliente SPA + web pública (web/)           Supabase (hosted)
src/core/cuenta/  supabase.ts (singleton)  Auth email+password
                  sesionStore.ts (Zustand) Postgres: perfiles · limites_plan · uso_ia
                  api.ts (Edge Functions)            · registros · rc_eventos
                  paywall.ts (RevenueCat)  Edge Functions: ia-chat · ia-imagen
src/core/data/sync/ middleware.ts (DBCore)     · revenuecat-webhook · borrar-cuenta
                  syncables.ts · motor.ts  Archivos: Cloudflare R2 (función almacen, §4)
                  blobs.ts                 RevenueCat Web Billing ── Stripe
```

- **Modelo de negocio (20-ago-2026)**: **todo se compra DENTRO de la app, en
  todas las plataformas**; lo que cambia es la caja (`canalPago()` en
  `plataforma.ts`): **compra in-app** en Android e iOS —obligatoria por
  normativa de Apple (3.1.1) y Google Play— y **cobro directo, sin comisión**,
  en el navegador y en el escritorio (RevenueCat Web Billing). Detrás hay una
  sola regla: **6 USD = 700 créditos**, y de cada 6 USD la ganancia mínima son
  2 USD (por eso el bucket va a `techo_factor 1.00` = $3.50 de gasto real máximo
  por cada 700 créditos; ver COSTOS.md). La **demo** (no persistente) es el free
  tier. La **casa** ($8.99 pago único, `unlock_casa_v5` en la web y `unlock_casa_v4` en las tiendas) se vende en las tres
  cajas e incluye el **primer mes** (plan `trial`: 30 días con pool de 700
  créditos + sync, sin tarjeta). **Pro** a 6 / 12 / 18 USD al mes según nivel
  —o **60 USD/año** (`pro_x1_anual`, el ×1 pagado de una vez)— con créditos
  mensuales + sync, y **créditos sueltos** (`creditos_x1`, $6 por 700 que no
  caducan): también en las tres cajas.
  La app de las tiendas se publica **gratis**: instalada ya NO es pagada. Lo que
  abre la casa es `perfiles.unlock`, que cuelga de la CUENTA, así que comprar en
  una plataforma la abre en todas —el webhook recibe igual a las tres cajas
  porque el `app_user_id` es siempre el user.id de Supabase—.
  La puerta cliente es `PuertaUnlock` (main.tsx) y va en dos pasos, iguales en
  todas partes: **cuenta** y **compra**. Ya no hay «ahora no» (con la app gratis
  sería la casa regalada) ni alta por licencia de tienda (ver §3e).
  Instalaciones previas quedan con derechos adquiridos (`mh.unlockLocal`,
  sellado una vez por `sellarDerechos()`) y un build sin backend no tiene
  puerta; lo cobrable lo revalida el servidor. En las apps de tienda **no se
  pinta ningún enlace de pago externo**: Apple lo prohíbe y es motivo de rechazo.
- **Plan**: `perfiles.plan` (`local`/`pro`/`trial`) es la fuente de verdad; lo
  escriben solo el trigger de alta y el webhook de RevenueCat. El cliente lo
  espeja en `localStorage mh.planReal`/`mh.planExpira`/`mh.fuePro`/`mh.unlock`
  para que `esPro()`/`esTrial()`/`tieneUnlock()` respondan síncronos (y
  offline). El trial expira PEREZOSO: `plan_expira` en pasado anula pool y sync
  sin webhook. `fue_pro` ya no es un pase de entrada: solo decide el copy de
  los avisos.
- **Sync solo con acceso** (Pro o trial vigentes): gate en cliente (`motor.ts`)
  y en servidor (`tiene_pro()`, que desde `20260815000001` incluye `trial`, en
  `sync_push`, policy de `registros` y policy del bucket): al cancelar o vencer
  el trial, los datos remotos quedan inaccesibles (sin borrarse) hasta renovar.
- **Niveles de suscripción (15-ago-2026; precios v2 el 18-ago)**: tres productos
  de la MISMA suscripción — `pro_x1_v2` ($6), `pro_x2_v2` ($12) y
  `pro_x3_v2` ($18), todos con entitlement `pro` — y el webhook guarda el
  multiplicador en `perfiles.nivel` (1-3). El pool sale de `pool_mensual()`:
  `creditos_mes × nivel` = 700 / 1400 / 2100. Subir o bajar es un
  PRODUCT_CHANGE (prorrateado por RC), no una compra nueva, y cancelar sigue
  siendo el portal de `urlGestion()`. **`pool_mensual()` es el único sitio donde
  se calcula el pool**: antes el mismo SELECT estaba duplicado en
  `consumir_cuota_ia` y `devolver_cuota_ia`, con un comentario avisando de que
  si divergían el crédito volvía a la bolsa equivocada.
  El nivel multiplica SOLO con plan `pro`: si no, quien cancela un ×3 y compra
  el unlock estrenaría el trial con 2100 créditos. EXPIRATION lo devuelve a 1.
- **`creditos_extra` (recargas)**: vuelven al catálogo el 18-ago-2026 con un
  único producto, `creditos_x1` ($6 = 700 créditos, consumible SIN entitlement).
  El webhook lo abona con `sumar_creditos_extra` en el evento
  NON_RENEWING_PURCHASE y **solo si el evento es nuevo** (`esNuevo`): a
  diferencia de los updates de plan, sumar no es idempotente. No caducan, se
  gastan cuando el pool mensual ya no alcanza y funcionan sin plan.
- **IA**: con sesión y créditos, `ia.ts`/`imagenIA.ts` llaman a las Edge Functions
  con la clave del SERVIDOR y cuota en **créditos POR OPERACIÓN** (`costo_op()`:
  chat/texto/vision/voz = 1, imagen/tts = 3, texto_largo/pdf = 4,
  modelo3d/imagen_alta = 10).
  El cliente declara la `op` y el servidor le impone su tope de `max_tokens`
  (`TOPES` en `ia-chat`) y límites de tamaño de ENTRADA (system, nº/tamaño de
  mensajes, imagen), así que declarar una op barata solo consigue una respuesta
  más corta. Las RPCs de cuota son exclusivas de service_role: `consumir_cuota_ia`
  emite una RESERVA y `devolver_cuota_ia` la exige (un solo uso), así ni un
  cliente modificado ni un bug pueden acuñar créditos (`20260803000001`).
  `ia-chat` usa **prompt caching** de Anthropic (breakpoints en tools estáticas,
  system y último mensaje; telemetría en `uso_ia.tokens_cache_*` y desglose por
  operación en `uso_ia_ops`). Análisis de costos y precio: [`COSTOS.md`](COSTOS.md).
  La IA de FONDO (latidos, efemérides, reparto) exige Pro a propósito: no gasta
  créditos comprados sin que el usuario pida nada.
  Las claves propias del usuario (BYOK) quedan solo como modo desarrollo (`window.mhIA(true)`).
- **Sync**: cada registro de Dexie gana `uid` (UUID) + `updatedAt`; un middleware
  DBCore encola todo cambio en `_outbox`; el motor hace push/pull contra la tabla
  genérica `registros` (JSONB) con conflictos último-gana (LWW) y blobs en Storage.

## Variables de entorno (cliente)

Copia `.env.example` a `.env.local`:

| Variable | Origen |
|---|---|
| `VITE_SUPABASE_URL` | Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Dashboard → Settings → API (anon public) |
| `VITE_REVENUECAT_WEB_KEY` | RevenueCat → API keys (`rcb_...`), caja del navegador y el escritorio |
| `VITE_REVENUECAT_ANDROID_KEY` | RevenueCat → API keys (`goog_...`), compra in-app de Play |
| `VITE_REVENUECAT_IOS_KEY` | RevenueCat → API keys (`appl_...`), compra in-app del App Store |
| `VITE_URL_WEB` | Dominio de la web de venta, sin barra final (dev: `http://localhost:5174`) |
| `VITE_URL_APP` | Dónde vive la app web (dev: `http://localhost:5173`) |

Secretos del servidor (NUNCA en el cliente): `npx supabase secrets set CLAVE=valor`
→ obligatorios `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `RC_WEBHOOK_AUTH`;
recomendados `OPENAI_API_KEY` (imagen principal) y `CORS_ORIGENES` (allowlist
coma-separada de orígenes: dominio de la app, dominio web, `https://localhost`,
`capacitor://localhost`; sin definir responde `*` — solo aceptable en dev).

Opcionales, todos con default y sin redeploy al cambiarlos:

| Secreto | Default | Para qué |
|---|---|---|
| `IMG_CADENA_RAPIDA` | `openai,gemini` | Orden de proveedores de la calidad rápida. Un proveedor sin clave se salta |
| `IMG_CADENA_ALTA` | `gemini,openai` | Orden de proveedores de la calidad buena |
| `IA_CHAT_TTL_TOOLS` | `5m` | `1h` sube el TTL de caché del bloque de tools (escritura 2×: encender solo con tráfico sostenido, ver COSTOS.md) |
| `GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-lite-image` | Modelo de imagen principal |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1-mini` | Modelo de imagen de respaldo |
| `OPENAI_IMAGE_QUALITY` | `low` | Basta: el cliente reescala a 512–1024 px |
| `GEMINI_TEXT_MODEL` | `gemini-3.1-flash-lite` | Respaldo de texto (perfil rápido) |
| `GEMINI_TEXT_MODEL_CALIDAD` | `gemini-3.1-flash` | Respaldo de texto (perfil calidad) |
| `IA_CHAT_GEMINI_PCT` | `0` | % del tráfico rápido que arranca en Gemini para medir su costo |

## Checklist de configuración manual

### 1. Supabase (una vez)
1. Crear proyecto en [supabase.com](https://supabase.com) (guardar la contraseña de BD).
2. Copiar Project URL y anon key a `.env.local`.
3. `npx supabase login` y `npx supabase link --project-ref <ref>` (el `<ref>` está en la URL del proyecto).
4. Aplicar migraciones: `npx supabase db push`.
5. Auth → Providers → Email: dejar activo «Confirm email».
   Auth → URL Configuration → Site URL: `http://localhost:5173` (en producción, el dominio real).

### 2. Proxy de IA
1. `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... GEMINI_API_KEY=... OPENAI_API_KEY=sk-...`
2. `npx supabase functions deploy ia-chat ia-imagen`
   (`ia-imagen` acepta una foto de referencia opcional: sin redesplegar, las texturas
   con foto de base se generan solo a partir del texto.)
   Las dos funciones son una CADENA de proveedores: si el principal falla, entra el
   respaldo y la cuota se cobra una sola vez. Sin `OPENAI_API_KEY` las imágenes
   funcionan igual, pero se quedan sin red de seguridad.
3. Para probar sin pagar: en SQL Editor,
   `update perfiles set plan='pro' where user_id='<uuid>';`
   El límite se ajusta en `limites_plan.creditos_mes`. Para probar el modo local
   con créditos, en lugar del plan: `update perfiles set creditos_extra=200 where
   user_id='<uuid>';`. La tabla de precios por operación vive en `costo_op()`.

### 2b. Redeploy de la migración de créditos (jul 2026) — EN ESTE ORDEN
1. `npx supabase db push` (aplica `20260725000001_creditos_ia.sql`: pool de créditos
   + telemetría de caché; las funciones SQL conservan firma, así que las Edge
   Functions viejas siguen funcionando durante la ventana).
2. `npx supabase functions deploy ia-chat ia-imagen` (caching + modelo de imagen por env).
3. Publicar el build web nuevo (la UI de cuota pasa a una sola barra de créditos;
   un build viejo contra la BD nueva solo oculta el medidor, sin errores).

### 2c. Respaldo de proveedores (jul 2026) — EN ESTE ORDEN
1. `npx supabase db push` (aplica `20260729000001_uso_ia_proveedor.sql`: columnas
   `*_gemini` + `registrar_uso_ia` con `p_proveedor`). **Primero esta**: el proxy
   nuevo llama a la firma de 5 argumentos y contra la BD vieja perdería la
   telemetría (el chat seguiría respondiendo).
2. `npx supabase secrets set OPENAI_API_KEY=sk-...` (sin ella, las imágenes se
   quedan sin respaldo, pero funcionan).
3. `npx supabase functions deploy ia-chat ia-imagen`.
4. Verificar en los logs de la función: `respaldo <proveedor> tras ...` avisa de
   cada vez que entró la red de seguridad.

### 2d. Créditos por operación + dos calidades de imagen (ago 2026) — EN ESTE ORDEN
1. `npx supabase db push`. Aplica las tres migraciones de agosto, y el orden
   entre ellas y las funciones **no es opcional**:
   - `20260802000001_creditos_por_operacion.sql` — `costo_op()` y el fin del
     requisito de plan en `consumir_cuota_ia` (modo local gratis).
   - `20260802000002_calidad_imagen.sql` — la op `imagen_alta` y el arreglo del
     contador (`p_tipo in ('imagen','imagen_alta')` en cuatro sitios).
   - `20260802000003_texto_largo_4.sql` — `texto_largo` de 3 a 4 créditos.

   ⚠️ **Primero la BD, después las funciones.** Contra la BD vieja,
   `costo_op('imagen_alta')` devuelve NULL y `consumir_cuota_ia` rechaza la
   llamada con `motivo: 'tipo'`: **toda imagen en calidad buena falla**. Al
   revés no pasa nada — la BD nueva con funciones viejas solo cobra las tarifas
   anteriores durante la ventana.
2. `npx supabase functions deploy ia-chat ia-imagen` (`op` + `TOPES` por
   operación en `ia-chat`; `calidad` y las dos cadenas de proveedor en
   `ia-imagen`).
3. Publicar el build web (`npm run build`): la UI de precios (`<Creditos>`,
   Configuraciones › Precios de la IA) lee el espejo de
   `src/core/cuenta/costos.ts`. Un build viejo no rompe nada, solo enseña
   precios rancios.
4. Comprobar que la tarifa quedó igual en los tres sitios —`costo_op()` en SQL,
   `CREDITOS` en `costos.ts` y `CREDITOS` en `scripts/medir-costos.mjs`— y que
   `TOPES` de `ia-chat` sigue en 4096 para `texto_largo`.

### 3. RevenueCat (pagos)
1. Crear cuenta en RevenueCat → proyecto → añadir plataforma **Web Billing**
   (pide conectar una cuenta de **Stripe**).
2. Crear los **tres niveles de suscripción mensual** con precio local por región
   (la multimoneda es pura config; el cliente muestra el `formattedPrice` que
   manda RC), los tres con el entitlement `pro` y en el offering `default`:
   `pro_x1_v2` ($6), `pro_x2_v2` ($12) y `pro_x3_v2` ($18). Deben ir en el MISMO
   grupo de suscripción para que cambiar de nivel sea un PRODUCT_CHANGE
   prorrateado y no dos suscripciones a la vez.
3. El **pago único del unlock ($8.99; `unlock_casa_v5` en la web, `unlock_casa_v4` en las tiendas)** se vende en las tres
   cajas (ver 3e y §5): IAP en Android y iOS, caja directa en web y escritorio.
   Los ids anteriores (`unlock_casa_v3` a $6.99, `_v2`, `_v1`) se conservan en
   RevenueCat y el webhook los sigue mapeando a `perfiles.unlock` + plan `trial`
   de 30 días para honrar lo comprado antes, pero ya no se ofrecen. **Sin trial de RC** en ningún producto (el
   «primer mes» lo da el webhook al recibir la compra, sin tarjeta). Ojo: si se
   añadiera un trial de RC habría que excluir `period_type === 'TRIAL'` del
   `fue_pro: true` del webhook, o marcaría como pagador a quien no pagó.
3b. Crear la **recarga `creditos_x1` ($6), consumible y SIN entitlement**, y
   añadirla al offering `default`. El webhook la abona a
   `perfiles.creditos_extra` (700 créditos) solo en el primer evento.
3c. Crear la **anualidad `pro_x1_anual` ($60, ciclo Yearly)** con el entitlement
   `pro`: es el nivel ×1 pagado de una vez, así que el webhook le asigna
   `nivel = 1` y el pool sigue siendo mensual.

   Los ids exactos importan en los seis productos vigentes (`pro_x1_v2`,
   `pro_x2_v2`, `pro_x3_v2`, `pro_x1_anual`, `unlock_casa_v5`/`unlock_casa_v4`, `creditos_x1`):
   tanto el webhook como el cliente los buscan por nombre. Un guion de más y la
   compra se cobra sin conceder nada.

   **Subscription changes** (Web › la app › «Subscription changes»): hay que
   declarar a mano qué producto puede subir o bajar a cuál, o el portal de
   gestión no ofrece el cambio de nivel. Configurado el 19-ago-2026: ×1 sube a
   ×2/×3/anual, ×2 sube a ×3 y baja a ×1, ×3 baja a ×2/×1, y el anual baja a ×1.

### 3d. Cambiar precios — el precio en RC es INMUTABLE
**En RevenueCat el precio de un producto no se puede editar** («Saved pricing
can't be edited afterwards»); el menú del producto solo ofrece «Make Inactive».
Cambiar un precio = **crear otro producto**. Por eso los ids viven como
**listas** en dos espejos —`UNLOCK_PRODUCTOS` y `NIVEL_PRODUCTOS` en
`src/core/cuenta/paywall.ts`, `UNLOCK_PRODUCTOS`/`NIVELES` en
`revenuecat-webhook/index.ts`—, con el **vigente primero**. Los viejos se
conservan para honrar una compra en vuelo y para no dejar sin pool al suscriptor
que sigue en ellos.

Receta para el próximo cambio de precio:
1. Crear el producto nuevo (mismo tipo y, si es suscripción, el MISMO grupo) con
   el precio nuevo. El *display name* debe ser único en la app; el título y la
   descripción de cara al cliente sí se pueden repetir (y sí son editables
   después, a diferencia del precio).
2. Añadirlo al offering `default` como paquete **Custom** y borrar de ahí el
   paquete viejo, para que no se pueda comprar al precio anterior.
3. «Make Inactive» en el producto viejo.
4. Poner el id nuevo al PRINCIPIO de la lista correspondiente, en los dos
   espejos.
5. `functions deploy revenuecat-webhook --no-verify-jwt` + republicar los builds.

Historial: el unlock pasó de $10.99 (`unlock_casa`) a $9.99 (`unlock_casa_v2`,
18-ago), a $6.99 (`unlock_casa_v3`) el mismo día con el cambio de plan de
negocio, a **$8.89 (`unlock_casa_v4`)** el 20-ago con la compra dentro de la
app y a **$8.99** el 25-ago (`unlock_casa_v5` en la web, porque el precio de
RevenueCat es inmutable; en las tiendas sigue el `_v4`, ya reetiquetado);
los niveles pasaron de $5/$10/$15 (`pro_x1`…) a **$6/$12/$18**
(`pro_x1_v2`…). Vigentes hoy: `unlock_casa_v5` (web) y `unlock_casa_v4`
(tiendas), `pro_x1_v2`, `pro_x2_v2`, `pro_x3_v2` y `creditos_x1`; todo lo
anterior, inactivo y fuera del offering.
Textos de cara al cliente en **inglés** (el checkout es un solo idioma para todo
el mundo).

**Ojo con las suscripciones**: al desactivar `pro_x1` no se cancela a quien ya
esté suscrito —sigue cobrándose a $5 hasta que cambie de nivel o cancele—, por
eso los ids viejos siguen en `NIVELES` del webhook. Un suscriptor viejo que
pulse «subir de nivel» compra el producto nuevo y RC lo prorratea.
4. Copiar la public API key `rcb_...` a `.env.local` (`VITE_REVENUECAT_WEB_KEY`).
5. Elegir un secreto largo y configurarlo en ambos lados:
   - RevenueCat → Integrations → Webhooks → Add: URL
     `https://<ref>.functions.supabase.co/revenuecat-webhook`, Authorization = ese secreto.
   - `npx supabase secrets set RC_WEBHOOK_AUTH=<ese secreto>`
6. `npx supabase functions deploy revenuecat-webhook --no-verify-jwt`
7. Probar con el modo test de Stripe (tarjeta `4242 4242 4242 4242`), incluida la
   compra one-time de la recarga y el ciclo comprar → cancelar → expirar → volver
   a comprar con la misma cuenta.

### 3b. Modelo solo-suscriptores (jul 2026) — EN ESTE ORDEN
1. `npx supabase db push` (aplica `20260727000001_sync_solo_pro.sql` — gate
   `tiene_pro` en push/pull/blobs —, `20260727000002_fue_pro.sql` y
   `20260727000003_recargas.sql` — `creditos_extra` + consumo en dos pools).
2. `npx supabase functions deploy revenuecat-webhook --no-verify-jwt` (fue_pro +
   NON_RENEWING_PURCHASE) y `npx supabase functions deploy borrar-cuenta`
   (borrado de cuenta requerido por App Store 5.1.1(v) y Play; SÍ verifica JWT).
3. Publicar los dos builds: `npm run build` (app) y `npm run build:web` (web pública).
4. Para probar el plan Pro sin pagar: `update perfiles set plan='pro', fue_pro=true
   where user_id='<uuid>';` (la PuertaSuscripcion y `window.mhPuerta` ya no existen:
   la app entra directo y el gating es solo de IA/sync).

### 3c. Cupones de acceso (testers y dueño) — 18-ago-2026
Canjear un cupón equivale a comprar el unlock (`perfiles.unlock` + plan `trial`
según `trial_dias`), sin pasar por RevenueCat ni Stripe. El canje vive en la
Edge Function `canjear-cupon` (JWT verificado) → RPC `canjear_cupon`
(solo service_role, migración `20260818000001`). La UI es el enlace
«¿Tienes un cupón?» de la `PuertaUnlock`, visible con sesión iniciada.

1. `npx supabase db push` (aplica `20260818000001_cupones.sql`).
2. `npx supabase functions deploy canjear-cupon` (verify_jwt por defecto).
3. Crear los códigos a mano en el SQL editor del Dashboard — NUNCA commitearlos:

   ```sql
   -- El dueño: un año de IA incluido, uso personal.
   insert into cupones (codigo, descripcion, usos_max, trial_dias)
   values ('CAMBIA-ESTE-CODIGO-1', 'dueño', 1, 365);
   -- Tanda de testers: un código compartido, 14 días de IA cada uno (el
   -- periodo de pruebas). 14 es el default, se pone explícito por claridad.
   insert into cupones (codigo, descripcion, usos_max, trial_dias)
   values ('CAMBIA-ESTE-CODIGO-2', 'testers ago 2026', 20, 14);
   ```

   Códigos LARGOS y aleatorios (p. ej. `MPH-` + 12 caracteres al azar), siempre
   en MAYÚSCULAS (el check de la tabla lo exige; la RPC normaliza lo tecleado).
   Para retirar uno: `update cupones set activo = false where codigo = '...';`
   Quién lo canjeó: `select * from cupones_canjes order by canjeado desc;`

#### Los trials se hacen CON CUPONES (no con los trials de RevenueCat)
Un trial de RC no sirve para probar: no se puede añadir a un producto ya creado
y le daría el mes gratis a TODOS los clientes. El cupón es el mecanismo, y
`trial_dias` es la palanca. **El periodo de pruebas son 2 SEMANAS** (default de
la columna desde `20260818000002`); el mes de 30 días del unlock es otra cosa —
ese es un beneficio de la compra, no el periodo de pruebas:

| Para qué | `usos_max` | `trial_dias` | Efecto del canje |
|---|---|---|---|
| El dueño | 1 | 365 | Casa desbloqueada + un año de IA y sync |
| Tanda de testers | 20 | 14 | Cada tester: casa + 2 semanas de IA y sync |
| Renovar a un tester | 20 | 14 | **Suma** 2 semanas más sobre lo que le quede |
| Regalar solo la app | 50 | 0 | Casa desbloqueada, SIN mes de IA |

**El canje PRORROGA, no fija.** Se cuenta desde el vencimiento actual si aún no
ha pasado (`greatest(plan_expira, now()) + trial_dias`), así que un cupón nunca
acorta lo que ya tenías y se puede topar a un tester tantas veces como haga
falta. Como `cupones_canjes` tiene PK `(codigo, user_id)`, **nadie repite el
mismo código**: para renovar hay que emitir uno nuevo.

Dos guardas que importan: a un **Pro de pago vigente** el canje solo le pone
`unlock` y NO le toca el plan (no se le degrada a trial); y como la expiración es
perezosa, un trial vencido conserva `plan='trial'` — por eso la condición mira si
hay un Pro con fecha viva, no el valor del plan.

Renovar a toda una tanda a la vez, sin cupón, si prefieres:
```sql
update perfiles set plan = 'trial',
       plan_expira = greatest(coalesce(plan_expira, now()), now()) + interval '14 days'
 where user_id in (select user_id from cupones_canjes where codigo = 'MPH-…');
```

### 3e. Compra dentro de la app: IAP en las tiendas, directo en la web — 20-ago-2026

Sustituye al alta por licencia de tienda del 19-ago (`alta-tienda` + Play
Integrity), que valía cuando la app se publicaba **de pago**. Con la app
**gratis** ese camino es un agujero —el veredicto `LICENSED` lo obtiene
cualquiera que la instale—, así que se retira: la migración
`20260820000003_sin_alta_tienda.sql` borra la RPC `alta_tienda` y la Edge
Function responde 410 (conviene además `npx supabase functions delete
alta-tienda`). Quedan sin uso, para borrar cuando se limpie: el plugin
`android/…/tienda/ReciboTiendaPlugin.java` con su dependencia
`com.google.android.play:integrity`, y `supabase/functions/_shared/reciboTienda.ts`.

**Ahora la única puerta que concede `perfiles.unlock` es el webhook de
RevenueCat** (o un cupón). El cliente:

| Plataforma | Caja | Módulo |
|---|---|---|
| Navegador | RevenueCat Web Billing (checkout embebido) | `cuenta/paywallWeb.ts` |
| Escritorio (Electron) | el mismo cobro, abriendo el navegador | enlace a `web/cuenta` |
| Android · iOS | compra in-app (`@revenuecat/purchases-capacitor`) | `cuenta/paywallNativo.ts` |

`cuenta/paywall.ts` es la fachada: elige caja, traduce los paquetes con el
catálogo (`cuenta/productos.ts`) y espera a que el webhook escriba `perfiles`.
El `appUserID` es el user.id de Supabase en las tres cajas: eso es lo que hace
que una compra hecha en Play se vea en el navegador y al revés. Si se compra sin
sesión (no debería: la puerta exige cuenta antes), RevenueCat usa un id anónimo
y `logIn()` transfiere la compra al registrarse.

**Ids de producto por tienda.** El paquete del offering se llama igual en las
tres (`unlock`, `nivel_1/2/3`, `anual`, `creditos`); el producto no: Apple exige
id único global (`com.macr120.mindhome.pro_x1_v2`) y Play cuelga el plan base
(`pro_x1_v2:mensual`). `idBase()` —en el cliente y en el webhook— devuelve el id
canónico quitando bundle y plan base, así que las tablas del webhook siguen
siendo las mismas.

Puesta en marcha:

1. Claves en el `.env`: `VITE_REVENUECAT_ANDROID_KEY` (`goog_…`) y
   `VITE_REVENUECAT_IOS_KEY` (`appl_…`), del mismo proyecto de RevenueCat.
2. En Play Console / App Store Connect: crear los productos con los ids de
   arriba —la casa y las recargas como consumibles/compra única, los niveles
   como suscripción— y publicar la app **gratis**.
3. En RevenueCat: añadir esos productos a los offerings, cada uno en su
   **paquete** canónico, y activar los webhooks de ambas tiendas (mismo endpoint
   y mismo `RC_WEBHOOK_AUTH` que la web).
4. `npx supabase db push` (aplica `20260820000003_sin_alta_tienda.sql`).
5. Probar con cuentas de prueba (licence testers en Play, sandbox en Apple) que
   la compra aparece en `perfiles` y que la MISMA cuenta abre la casa en el
   navegador.

Qué mirar si algo falla: `rc_eventos` guarda el payload íntegro de cada evento,
así que ahí se ve el `product_id` real que manda cada tienda.

### 3f. Créditos proporcionales + proveedor a elección — DESPLEGADO (21-ago-2026)

Dos cambios que viajan juntos (ver `docs/COSTOS.md` § «Créditos proporcionales»):

- **`consumir_cuota_ia` v11**: antes de cobrar la op salda la deuda del gasto
  real (`ceil(usd / ($0.005 × techo_factor)) − créditos cobrados`). Así el pool
  se agota exactamente al llegar al techo y el corte sale por `cuota`, no por
  `techo` con saldo a la vista.
- **Preferencia de proveedor en modo Créditos**: los cuatro proxies aceptan
  `prov` en el cuerpo y lo ponen delante de su cadena (`anthropic`/`gemini`/
  `openai` en el cerebro; `openai`/`gemini` en voz e imagen). `ia-tts` e `ia-voz`
  estrenan el camino de Gemini (TTS preview con envoltura WAV y transcripción
  multimodal), así que ahora **también necesitan `GEMINI_API_KEY`**.
- **Cerebro de OpenAI en `ia-chat`** (`gpt-5.6-luna`, 4–5× más barato que Haiku
  4.5 — análisis en COSTOS.md § «El cerebro de OpenAI»). Usa la
  `OPENAI_API_KEY` que ya estaba puesta para imagen/voz: **ningún secreto
  nuevo**. Opcionales, sin redeploy: `OPENAI_TEXT_MODEL` (otro modelo; los
  5.0/5.1 quieren `OPENAI_TEXT_EFFORT=minimal` en vez de `none`). Los PDF y el
  perfil `calidad` nunca salen por ahí.

**Desplegado el 21-ago-2026**, en este orden (primero la migración: un proxy
nuevo contra la BD vieja solo pierde el saldo de la deuda y cobra como antes;
una BD nueva con proxies viejos es inofensiva, los que no mandan `prov` usan la
cadena por defecto):

1. `npx supabase db push` — aplicó `20260820000002_creditos_proporcionales.sql`
   y `20260820000003_sin_alta_tienda.sql`, que se había quedado atrás. Cero
   pendientes contra el remoto.
2. `npx supabase functions deploy` — las OCHO, no solo las cuatro de IA: el
   endurecimiento de `_shared/cors.ts` (fail-closed sin `CORS_ORIGENES`) lo
   importan todas. `revenuecat-webhook` conserva `verify_jwt = false`
   (verificado tras el despliegue) y `alta-tienda` sigue desplegada a propósito,
   como puerta cerrada que responde 410.

Comprobado en vivo: las funciones responden 401 sin credenciales y el preflight
NO devuelve `*` a un origen cualquiera. `GEMINI_API_KEY` ya estaba puesta.

### 3g. Cuenta del dueño con IA ILIMITADA — 4-sep-2026
La cuenta del dueño (`macr120cme@gmail.com`) no consume cuota: `perfiles.ilimitado`
hace que `consumir_cuota_ia` permita siempre, sin mirar pool, deuda ni techo, y sin
tocar `creditos_extra`. El uso SÍ se sigue registrando (`uso_ia`, `uso_ia_ops`, el
USD real), así que las consultas de `docs/consultas-uso.sql` siguen diciendo lo que
gasta. El medidor recibe `limite = -1` y la UI lo pinta como «∞».

El padrón va por CORREO (tabla `cuentas_ilimitadas`), no por uuid: vale en cualquier
base y sobrevive a que el dueño borre su cuenta y se registre otra vez —
`handle_new_user` marca el perfil al nacer si el correo está en el padrón.

1. `npx supabase db push` (aplica `20260904000001_cuenta_ilimitada.sql`; la propia
   migración sincroniza el perfil que ya existía).
2. Las Edge Functions NO cambian: el contrato de la RPC es el mismo y `limite`
   viaja tal cual. Sí hay que **volver a desplegar la app y la web** para que la
   barra entienda el `-1` (sin eso pintaría «1234/-1»).

Para añadir otra cuenta (o quitarla), desde el SQL editor del Dashboard:

```sql
insert into cuentas_ilimitadas (correo, nota) values ('otro@correo.com', 'motivo');
select sincronizar_cuentas_ilimitadas();   -- marca los perfiles que ya existen
-- Quitarla: borrar del padrón Y apagar la bandera del perfil (no se apaga sola).
delete from cuentas_ilimitadas where correo = 'otro@correo.com';
update perfiles set ilimitado = false where user_id = (
  select id from auth.users where lower(email) = 'otro@correo.com');
```

**OJO**: la bandera salta también el techo de gasto en USD — no hay red de
seguridad y el costo real de los proveedores se paga igual. El límite de tasa
(`consumir_rate_limit`) sí sigue aplicando: frena ráfagas, no créditos.

### 4. Almacén de archivos: Cloudflare R2 (sync de blobs y cuarto Archivo)
Supabase decide QUIÉN y CUÁNTO; los bytes van directo del navegador a R2 con URLs
firmadas de 15 min (egress gratis). Piezas:
- Migración `20260925000001_almacen_r2.sql`: tabla `almacen_objetos` (lo que cada
  usuario tiene en R2, única fuente de la cuota) y RPCs solo service_role
  (`almacen_reservar` / `_confirmar` / `_liberar` / `_vencidos` / `_uso` /
  `_registrar`). Cuota `cuota_almacen()`: Pro ×1/×2/×3 = 10/30/100 GiB, trial 10,
  ilimitado sin tope, el resto 0 (solo lectura: bajar sí, subir no). Tope por
  archivo 2 GiB.
- Edge Function `almacen` (verify_jwt) + `_shared/r2.ts` (firma SigV4 con aws4fetch).
  Claves RELATIVAS del cliente (`sync/…`, `archivo/…`); la función antepone el uid.
- Cliente `src/core/cuenta/almacen.ts`; el sync lo usa en `core/data/sync/blobs.ts`
  y el cuarto Archivo en `rooms/archivos/`. `borrar-cuenta` vacía `<uid>/` en R2.
- Transición: marcadores viejos (sin `r2`) se leen de R2 y, si falta, del bucket
  `sync-blobs` de Storage; sin R2 configurado (503 `sin-almacen`) el push sigue
  subiendo a Storage, así que desplegar el cliente antes que R2 no rompe el sync.

**Pasos manuales (una vez):**
1. Cloudflare → R2 → crear bucket privado `mindhaos-archivos`.
2. En el bucket, Settings → CORS policy: `AllowedMethods` `PUT, GET, HEAD`,
   `AllowedHeaders` `content-type`, `AllowedOrigins` = los de `CORS_ORIGENES`
   (dominio de la app, `https://localhost`, `capacitor://localhost`, el origen de
   Electron y `http://localhost:5173` para dev).
3. R2 → Manage API tokens → token con **Object Read & Write solo sobre ese bucket**.
4. `npx supabase secrets set R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=mindhaos-archivos`
   (`R2_ACCOUNT_ID` es opcional: cae a `CLOUDFLARE_ACCOUNT_ID`).
5. `npx supabase db push` y `npx supabase functions deploy almacen borrar-cuenta`.
6. Copiar lo que ya hay en `sync-blobs`: `node --env-file=.env.almacen
   scripts/almacen/migrar-sync-blobs.mjs --simular` y luego sin `--simular`
   (`.env.almacen` NO se commitea). Vaciar `sync-blobs` cuando R2 lleve tiempo
   sirviendo sin fallos.

**Purga a los 90 días sin plan** (migración `20260926000001_almacen_purga.sql`):
`perfiles.sin_plan_desde` (lo fija el webhook al expirar; el trial usa su
`plan_expira`) → `almacen_purgables()` → función `almacen-purga`
(`verify_jwt=false`, secreto `ALMACEN_PURGA_AUTH`) que borra `<uid>/` en R2,
suelta la cuota y tombstonea sus `archivosNube`. La llama `pg_cron` a las 05:41
UTC con los secretos de Vault `almacen_purga_url` / `almacen_purga_auth` (crearlos
a mano, ver la cabecera de la migración). Primera vez: `{"simular":true}`.

**Papelera (30 días)** — solo cliente, sin migración: borrar desde Archivo sella
`borradoEn` en la fila (y en toda la descendencia de una carpeta, con el mismo
sello); el objeto sigue en R2 y ocupando cuota hasta vaciarla.
`core/cuenta/papelera.ts::purgarPapelera` borra para siempre lo que pasa de 30
días, al abrir Archivo y al final de cada ciclo del sync (una vez por hora).

**Compartir con enlace** (migración `20260927000001_enlaces_archivo.sql`): tabla
`enlaces_archivo` (token de 22 caracteres, vence a 1/7/30 días) y RPC
`enlace_visitar` (cuenta la visita con `for update`, tope 200/día por enlace).
`almacen` gana `compartir` (solo con cuota > 0, máx. 100 vivos por usuario),
`enlaces` y `revocar`; mandar a la papelera revoca los de esas claves, y un objeto
que deja de estar en `almacen_objetos` (borrado o purgado) mata su enlace solo.
La página es `web/descarga.html` (`mindhaos.com/d/<token>`, reescrito en
`web/public/_redirects`) y llama a la función `archivo-publico`
(`verify_jwt=false`), que responde `{nombre, bytes, mime, vista, descarga}` con URLs
firmadas de 15 min, o 404/410/429. Desplegar: `db push` →
`functions deploy almacen archivo-publico` → web.

### 5. Web pública (landing + /cuenta) — YA DESPLEGADA (15-ago-2026)
- Código en `web/` (segundo build de Vite): `npm run dev:web` (puerto 5174) y
  `npm run build:web` (→ `dist-web/`). Ligera a propósito: sin three ni dexie.
- **Qué se vende aquí (20-ago-2026)**: TODO —la casa (8.99 USD, `unlock_casa_v5`),
  la suscripción y las recargas—, por la caja directa y sin comisión de tienda.
  El CTA de la sección de precio lleva a `/cuenta`, y una cuenta sin unlock ve
  «Consigue la app» con su botón de compra (si el build no trae claves de pago,
  cae al enlace de descargas).
- **En producción**: dominio `mindplannerhome.com` (Cloudflare Registrar, renovación
  automática, vence 15-ago-2027) y dos proyectos de Cloudflare Pages:
  `mindplannerhome` (landing, `dist-web`) en el dominio raíz y `mindplannerhome-app`
  (app, `dist`) en `app.mindplannerhome.com`.
- **Se publica por subida directa, NO desde Git**: el repo de GitHub va por detrás
  del local, así que una build en Cloudflare desplegaría código viejo. Se compila
  aquí y se sube:

  ```bash
  npm run build && npm run build:web
  npx wrangler pages deploy dist-web --project-name mindplannerhome --branch main --commit-dirty=true
  npx wrangler pages deploy dist --project-name mindplannerhome-app --branch main --commit-dirty=true
  ```

  Como se compila en local, las `VITE_*` salen de `.env.local` (secretos) y de
  `.env.production` (URLs del dominio, que pisa a `.env.local` solo al construir).
  No hace falta definir variables en el panel de Cloudflare.
- Supabase Auth → URL Configuration: Site URL = `https://mindplannerhome.com/cuenta`
  (el enlace de «olvidé mi contraseña» y el de confirmar correo aterrizan ahí);
  Redirect URLs: `https://mindplannerhome.com/**`, `https://app.mindplannerhome.com/**`
  y los localhost de dev (5173, 5174, 53378, 53390).
- **OAuth (Google/Apple) no conoce el dominio propio y no tiene por qué**: el
  `redirect_uri` que ven los proveedores es SIEMPRE
  `https://<ref>.supabase.co/auth/v1/callback`; el salto final a la app lo hace
  Supabase, gobernado por su lista de Redirect URLs. Al cambiar de dominio solo
  se tocan Supabase y las `VITE_URL_*`, nunca las consolas de Google ni de Apple.
- RevenueCat Web Billing → dominios permitidos: el dominio, `app.<dominio>` y localhost.
- Los instaladores de escritorio (fase Electron) NO caben en Pages (límite
  25 MB/archivo): servirlos desde GitHub Releases y enlazarlos en la landing.

### 6. Publicar en redes desde el Studio de video (sep 2026)

El Editor de video publica en la cuenta del USUARIO de YouTube, TikTok, Facebook
(Páginas) e Instagram (cuenta profesional). Piezas: migración
`20260903000001_redes_sociales.sql` (tres tablas con RLS sin políticas: solo
service_role; tokens cifrados AES-GCM por la función), Edge Functions
`redes-oauth` (OAuth: `iniciar`/`estado`/`elegir`/`desconectar` + el callback
`GET …/redes-oauth/callback`, que llega SIN JWT → `verify_jwt = false` en
`config.toml`; el resto de acciones validan la sesión a mano) y `redes-publicar`
(`opciones`/`iniciar-publicacion`/`trozo`/`finalizar`/`estado-publicacion`/
`token-youtube`). YouTube sube directo desde el cliente (la función inicia la
sesión resumable, que es lo que gasta cuota); TikTok y Meta suben POR TROZOS de
8 MiB a través de la función. Cliente en `src/core/redes/` y
`src/rooms/video/publicar/`.

**Secretos** (`npx supabase secrets set CLAVE=valor`):

| Secreto | Qué es |
|---|---|
| `REDES_STATE_SECRET` | Firma HMAC del `state` del OAuth (≥ 32 bytes aleatorios) |
| `REDES_CIFRADO_KEY` | Clave AES-GCM de 32 bytes en base64 (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Cliente OAuth «Web application» del proyecto de YouTube (NO el del login) |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | App de TikTok for Developers (Login Kit + Content Posting API) |
| `META_APP_ID`, `META_APP_SECRET` (+ `META_CONFIG_ID` opcional) | App de Meta for Developers (Facebook Login; `config_id` si es Facebook Login for Business) |
| `REDES_CALLBACK_URL` (opcional) | Default `${SUPABASE_URL}/functions/v1/redes-oauth/callback` |
| `REDES_YT_MAX_DIA` (default 5) | Tope global diario de `videos.insert` (10 000 u / 1600 u ≈ 6) |
| `REDES_YT_AUDITADO`, `REDES_TIKTOK_AUDITADO`, `REDES_META_LIVE` (0/1, default 0) | Se ponen a 1 al pasar cada auditoría; sin redeploy. Mientras estén a 0 la UI avisa de que el video sale privado / «Solo yo» / solo testers |
| `CORS_ORIGENES` (ya existe) | También valida los orígenes a los que puede volver el callback en la web |

**Alta en las consolas** (la redirect URI es SIEMPRE
`https://<ref>.supabase.co/functions/v1/redes-oauth/callback`; URLs de privacidad
y términos: `https://mindplannerhome.com/privacidad` y `/terminos`, sin `noindex`):

- **Google**: proyecto GCP aparte del login («MPH Studio») → habilitar YouTube Data
  API v3 → pantalla de consentimiento con el scope `…/auth/youtube.upload`
  **publicada en producción** (en «Testing» los refresh tokens caducan a los 7
  días) → cliente OAuth «Web application» con la redirect URI. Sin verificación
  de Google: pantalla «app no verificada» y tope de 100 usuarios; sin el
  *compliance audit* de YouTube: todo video sube PRIVADO. Después: verificación
  (video demo del flujo) + audit + ampliación de cuota.
- **TikTok for Developers**: app con Login Kit + Content Posting API (Direct
  Post), redirect URI, scopes `user.info.basic` y `video.publish`. Sin audit todo
  sale `SELF_ONLY`; la pantalla de publicar cumple sus requisitos de UX
  (nickname, privacidad sin default, toggles apagados, contenido comercial con
  consentimientos) para poder pedirlo.
- **Meta for Developers**: app tipo Business con Facebook Login (for Business) e
  Instagram Graph API; «Valid OAuth Redirect URIs» = la redirect URI; añadir las
  cuentas propias como admin/tester (modo desarrollo). Hace falta una Página de
  Facebook y una cuenta profesional de Instagram vinculada. Después: App Review
  de `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
  `instagram_basic`, `instagram_content_publish` + verificación de empresa.

**Deploy**: `npx supabase db push` → `npx supabase functions deploy redes-oauth
--no-verify-jwt` → `npx supabase functions deploy redes-publicar`. El callback
solo se puede probar contra el proyecto en la nube (las redirect URIs son https
públicas). La app nativa necesita el host `redes` en el `intent-filter` de
`AndroidManifest.xml` (ya está) → `npx cap sync android` y APK nuevo.

**Límites por usuario** (`rate_limits`): OAuth 10/h; publicaciones 3/día en
YouTube y 10/día en el resto; trozos 200/10 min; contador global
`youtube-global` con uid sentinela `00000000-…` que NO falla abierto.

### 7. Buzón: mensajería entre usuarios (16-sep-2026)

Migraciones `20260916000001_buzon.sql` y `20260916000002_buzon_orden_seq.sql`
(APLICADAS). Sin Edge Function: todo son RPCs `security definer` con
`auth.uid()` (patrón `sync_push`), y las tablas `buzon_contactos`,
`buzon_hilos` y `buzon_mensajes` tienen RLS activada y SIN políticas. Ningún
uuid ajeno sale al cliente: los contactos van por `contacto_id`/`hilo_id` y
los mensajes traen `mio`.

- **Identidad pública**: `perfiles.alias` (único, `^[a-z0-9_]{3,20}$`),
  `nombre`, `emoji`. Búsqueda solo por alias EXACTO (`buzon_buscar_alias`):
  no hay forma de listar usuarios.
- **Contactos**: `buzon_solicitar(alias)` → `buzon_responder(contacto,
  aceptar)` crea el hilo. Solo contactos aceptados se escriben; bloquear
  cierra el envío (solo desbloquea quien bloqueó); eliminar borra hilo y
  mensajes para los dos (cascade).
- **Mensajes**: `buzon_enviar(hilo, uid, tipo, texto, adjunto, contenido)`,
  idempotente por `(hilo, uid)`; `buzon_pull(desde)` pagina por `server_seq`
  (cursor por usuario en `_syncMeta` del cliente); `buzon_leido` marca y
  AVANZA `server_seq` para que el leído viaje a los demás dispositivos y al
  remitente. Ambas toman un advisory lock por cada miembro del hilo (misma
  carrera de huecos que el sync).
- **Avisos**: trigger `after insert` → `buzon_avisar(uid, evento, payload)`
  = la costura ÚNICA del push. Hoy `realtime.send` al canal privado
  `buzon:<uid>` (policy de `realtime.messages`); la fase 2 añade ahí
  `net.http_post` a una function `push-enviar` y una tabla
  `buzon_dispositivos` (tokens FCM/APNs/Web Push).
- **Adjuntos**: bucket privado `buzon-adjuntos` (8 MB, jpeg/png/webp/pdf),
  ruta `<hilo>/<mensaje_uid>/<archivo>`; policies select/insert/delete por
  `buzon_es_miembro((foldername)[1])`. Sin `tiene_pro`: el buzón es para
  cualquier cuenta con sesión. El cliente borra la carpeta ANTES de
  `buzon_eliminar` (después ya no es miembro).
- **Límites** (`rate_limits`): alias 10/h, buscar 20/min, solicitar 10/h,
  enviar 30/min. Texto ≤ 4000, `contenido` ≤ 64 KB.
- **Cliente**: `src/core/buzon/` (motor calcado del sync: canal privado + pull
  por cursor a la caché `_buzonContactos`/`_buzonMensajes`, fuera del sync y
  del respaldo). Contenido de los cuartos: registro `compartibles.ts` (cada
  `rooms/<id>/index.tsx` se apunta; hoy cocina, ejercicio, ideas, arte,
  escritura, sala y cómputo).
- **Deuda**: adjuntos huérfanos de cuentas borradas (`borrar-cuenta` no toca
  el bucket) → purga por `pg_cron` en fase 2.

### 8. Partidas: multijugador (visitas y juegos) — 19-sep-2026

Migración `20260919000001_partidas.sql` (**SIN APLICAR**, ver el orden de abajo).
Misma disciplina que el buzón: RLS activada y **cero policies sobre las tablas**,
todo por RPCs `security definer set search_path = public` con contrato
`{error:'<codigo>'}` (nunca `raise`), `revoke … from public, anon` + `grant … to
authenticated` en las de usuario y sin grant en las internas. Nada de la partida
se persiste: las tablas solo sostienen la membresía mientras la sala vive.

- **Tablas**: `partidas` (id, anfitrion, `juego` ∈ visita/paintball/futbol/
  tenis/basquet, `estado` ∈ abierta/jugando/cerrada, `apps text[]` ≤ 32 —
  snapshot al crear—, `proto`, `rev`, `casa`, `latido_en`) y
  `partida_jugadores` (partida_id, user_id, `jugador_id` `^j[0-3]$` bajo
  advisory lock, `equipo` **informativo**, `estado`, `aspecto jsonb` ≤ 4 KB,
  `ultimo_latido`), con `unique (partida_id, jugador_id)`. La **ranura** es lo
  único que viaja por el canal: ningún uuid ajeno sale al cliente.
- **RPCs de usuario**: `partida_crear(juego, apps, proto, aspecto)` (cierra las
  salas anteriores del mismo anfitrión **avisando** a sus invitados),
  `partida_invitar(partida, contacto)` (solo contacto aceptado; timbre por
  `partida_avisar` al canal `buzon:<uid>`, que ya está vivo),
  `partida_entrar(partida, aspecto, proto)` — el ÚNICO sitio donde se aprende la
  ranura propia y el roster con retratos—, `partida_estado(partida)` (roster
  **sin** retratos: el cliente los cachea), `partida_cambiar_juego`,
  `partida_salir`, `partida_expulsar(partida, ranura)`, `partida_latido` y
  `partida_marcar_casa`. Internas: `partida_avisar`, `partida_tocar` (sube `rev`
  y emite el evento `sala`), `partida_roster`, `partida_cortar_con`.
- **Corte inmediato**: `buzon_bloquear` y `buzon_eliminar` se reemplazan con
  `create or replace` (mismo cuerpo + `partida_cortar_con`): bloquear o eliminar
  a alguien lo saca de tu casa AHORA, no cuando cuelgue.
- **Transporte**: DOS topics privados de Realtime por sala y **las primeras
  policies `for insert` sobre `realtime.messages` del repo**, asimétricas a
  propósito (broadcast no firma al emisor, así que con una sola policy cualquier
  invitado podría forjar un veredicto):
  - bajada `partida:<uuid>` — insert **solo el anfitrión**
    (`partida_es_anfitrion`);
  - subida `partida:<uuid>:u` — insert **cualquier miembro**
    (`partida_es_miembro`).
  Las dos reconstruyen el topic (`= 'partida:' || partida_del_topic(...)`), así
  que un sufijo inventado (`partida:<uuid>:x`) queda fuera. El select de escucha
  cubre los dos topics.
- **Bucket** `partida-casa` (privado, 4 MB, `application/gzip`), ruta
  `<partida_id>/casa.json.gz`: lo sube el anfitrión, lo leen los miembros. El
  borrado va por `partida_fui_anfitrion` (**sin** condición de estado) porque el
  plano se borra justo al terminar y Storage **no** borra el archivo físico
  cuando se borra la fila de `storage.objects`: el GC por SQL no sirve. El
  cliente del anfitrión borra el objeto por la API ANTES de `partida_salir` y,
  a mejor esfuerzo, el de su sala anterior al crear una nueva (id en
  `localStorage mh.partida.ultima`). Los huérfanos por caída quedan acotados a
  ≤ 4 MB por sala.
- **Límites** (`rate_limits`): `partida-crear` **20/mes**, `partida-invitar`
  60/h, `partida-entrar` 60/h. Sin `tiene_pro`: basta sesión y ser contacto
  aceptado, como el buzón.
- **Cuota de Realtime** (confirmada en supabase.com/pricing, 19-sep-2026):

  | plan | mensajes/mes | conexiones concurrentes | exceso |
  |---|---|---|---|
  | Free | 2 M | 200 | — (se corta) |
  | Pro | 5 M | 500 | **$2.50 / M** de mensajes · **$10 / 1 000** conexiones |

  Una partida de 10 min consume ~35 700 entregas a 4 jugadores (paintball) y
  ~4 300 en una visita 2p. A $2.50/M eso es ~$0.09 y ~$0.01 fuera de cuota: los
  5 M de Pro dan ~140 partidas 4p al mes. El techo real son las **conexiones**,
  y supabase-js multiplexa todos los canales sobre UN WebSocket, así que una
  partida **no consume una conexión extra** sobre el `buzon:<uid>` que ya está
  vivo. **Por medir**: si el dashboard cuenta entregas (por suscriptor) o
  publicaciones — cambia la factura ×1.6 en 4p.
- **Cliente**: `src/core/partida/` (protocolo validado campo a campo, dos
  transportes intercambiables —BroadcastChannel con red simulada y Realtime—,
  reloj de partida con ping/pong y el motor `sala.ts`). El roster NO viaja por
  el canal: la BD emite `sala` con la revisión y el cliente relee con
  `partida_estado`; el latido va cada 60 s.

**Invitar a jugar desde el chat (20-sep-2026).** «jugar tenis con @ana» **no
añade SQL**: se apoya entero en lo que ya existe. El cliente abre (o reutiliza)
su sala con `partida_crear`, sube el plano al bucket, toca el timbre con
`partida_invitar` y manda por `buzon_enviar` un mensaje `contenido` con
`app:'partida'`, `tipo:'juego'` y `datos {partidaId, juego, apps}` — el buzón
admite cualquier `app` y solo mide los 64 KB—. El enlace del texto es
`?visita=<id>&juego=<juego>[&visitaApps=…]`, que entra por el camino de siempre.
El timbre sigue diciendo «Para pasear juntos» (la sala nace como `visita` para no
subir la cadencia de poses): quien lleva al juego es la tarjeta del buzón.

**Despliegue (EN ESTE ORDEN)**
1. `npx supabase db push` (aplica `20260919000001_partidas.sql`: tablas, RPCs,
   las policies de `realtime.messages`, el bucket `partida-casa` y el
   `create or replace` de `buzon_bloquear`/`buzon_eliminar`). **Primero esta**:
   un build nuevo contra la BD vieja solo puede fallar al invitar, pero la BD
   nueva contra un build viejo no rompe nada.
2. Publicar el build web nuevo.
3. En el dashboard: **Storage → Buckets** debe listar `partida-casa` (privado,
   4 MB, `application/gzip`); **Database → Policies** debe mostrar las tres
   nuevas de `realtime.messages` (una select + dos insert) y las tres de
   `storage.objects`. Comprobar además que `buzon_bloquear` y `buzon_eliminar`
   siguen con su `grant` a `authenticated`.

### 9. Espacios compartidos: calendarios cooperativos y Studio por enlace — 21-sep-2026

Migración `20260921000001_espacios.sql` (**SIN APLICAR**, ver el orden de abajo).
Misma disciplina que el buzón y las partidas: RLS activada y **cero policies
sobre las tablas**, todo por RPCs `security definer set search_path = public`
con contrato `{error:'<codigo>'}` (nunca `raise`), `revoke … from public, anon` +
`grant … to authenticated` en las de usuario y sin grant en las internas. Sin
`tiene_pro`: basta con tener sesión.

Un **espacio** es la unidad de todo lo compartido. Cinco tipos (`calendario`,
`documento`, `dibujo`, `audio`, `video`) sobre el mismo cimiento: **log de
cambios** numerado por `seq` + **snapshot** compactable. Lo que cambia por tipo
es el contenido de `datos`, no la mecánica: calendario = filas de evento (LWW),
documento = updates de Yjs, dibujo = operaciones de trazo, audio/video =
proyecto entero bajo bloqueo por turnos.

- **Tablas**: `espacios` (id, dueno, `tipo`, `titulo` ≤ 80, `meta jsonb` ≤ 2 KB,
  `proto`, `token_ver`/`token_editar` únicos, `enlace_ver`/`enlace_editar`,
  `seq`, `snapshot jsonb` ≤ 2 MB, `snapshot_seq`, `snapshot_en`, `bloqueo_por`,
  `bloqueo_hasta`, `creado_en`, `actualizado_en`), `espacio_miembros`
  (espacio_id, user_id, `miembro_id` `^m[0-9a-f]{12}$`, `rol` ∈
  dueno/editor/lector, `estado` ∈ activo/fuera/expulsado, `entro_en`; pk
  `(espacio_id, user_id)`, `unique (espacio_id, miembro_id)`) y
  `espacio_cambios` (espacio_id, `seq`, `uid` del cliente, `autor` =
  `miembro_id`, `tipo` `^[a-z]{2,16}$`, `datos jsonb` ≤ 64 KB, `creado_en`; pk
  `(espacio_id, seq)`, `unique (espacio_id, uid)`). El **`miembro_id`** es lo
  único que identifica a alguien de cara al cliente: **ningún uuid ajeno sale**,
  misma regla que la ranura de `partidas` y que `contacto_id`/`hilo_id`.
- **Tokens**: 18 bytes de `extensions.gen_random_bytes` → base64 sin relleno
  traducido a base64url (`+/` → `-_`) = **24 caracteres** que caben tal cual en
  la URL. Es la primera migración que pide `pgcrypto` (`create extension if not
  exists pgcrypto with schema extensions`); con `search_path = public` hay que
  llamarla calificada.
- **Helpers internos** (sin grant): `espacio_token`, `espacio_miembro_id`,
  `espacio_avisar` (clon de `buzon_avisar`, blindado con `exception when others`),
  `espacio_miembros_json(id, uid, con_retrato)` y `espacio_resumen(id, uid)` —los
  tokens SOLO se añaden si `dueno = uid`, por eso la ficha se arma en la BD—.
  Con grant a `authenticated` porque los evalúan las policies:
  `espacio_del_topic`, `espacio_es_miembro`, `espacio_puede_editar`.

**RPCs de usuario** (17). Errores posibles: `sin-sesion`, `peticion-invalida`,
`limite`, `no-encontrado`, `no-contacto`, `sin-permiso`, `expulsado`,
`enlace-inactivo`, `bloqueado`, `es-dueno`, `cambio-grande`, `snapshot-grande`,
`version`.

| RPC | Reglas | Errores | Emite |
|---|---|---|---|
| `espacio_crear(tipo, titulo, meta, proto) → {espacio}` | tipo válido, título ≤ 80, `meta` ≤ 2 KB; inserta al dueño como primer miembro | `peticion-invalida`, `limite` | — |
| `espacio_listar() → {espacios}` | miembro activo; orden `actualizado_en desc` | — | — |
| `espacio_estado(id) → {espacio, miembros}` | miembro activo; miembros **con retrato** | `no-encontrado` | — |
| `espacio_editar(id, titulo, meta) → {ok}` | dueño; un parámetro `null` NO borra el valor | `peticion-invalida`, `no-encontrado` | `meta` |
| `espacio_entrar(token, proto) → {espacio, miembros}` | `^[A-Za-z0-9_-]{24}$`, enlace activo, `proto` igual, advisory lock; `token_editar` → editor, `token_ver` → lector; expulsado no vuelve; `fuera` se reactiva; **el rol nunca baja** (editor que abre el enlace de ver sigue editor) pero sí sube | `peticion-invalida`, `limite`, `no-encontrado`, `enlace-inactivo`, `version`, `expulsado` | `miembros` (solo si hubo cambio) |
| `espacio_invitar(id, contacto, rol) → {ok, miembro_id}` | dueño, contacto **aceptado** del buzón, rol editor\|lector; **readmite** a quien estaba fuera o expulsado | `no-encontrado`, `peticion-invalida`, `no-contacto`, `limite` | `buzon_avisar(otro, 'espacio', {espacio_id, tipo, titulo, rol, alias, nombre, emoji})` + `miembros` |
| `espacio_rotar_enlace(id, cual, activo) → {tokens, enlaces}` | dueño, `cual` ∈ ver\|editar; **regenera siempre** el token y fija el interruptor | `peticion-invalida`, `no-encontrado`, `limite` | — |
| `espacio_rol(id, miembro, rol) → {ok}` | dueño; el miembro existe y no es el dueño | `peticion-invalida`, `no-encontrado` | `miembros` |
| `espacio_expulsar(id, miembro) → {ok}` | dueño; `estado = 'expulsado'`; suelta el turno si lo tenía | `peticion-invalida`, `no-encontrado` | `bloqueo` (si tenía turno) + `miembros` |
| `espacio_salir(id) → {ok}` | miembro activo; el dueño no puede | `no-encontrado`, `es-dueno` | `bloqueo` (si tenía turno) + `miembros` |
| `espacio_borrar(id) → {ok}` | dueño; `delete` en cascada | `no-encontrado` | `borrado` **antes** del delete |
| `espacio_push(id, cambios) → {aplicados, max_seq}` | editor; array ≤ 100, lote ≤ 1 MB, `datos` ≤ 64 KB, `uid` `^[0-9a-zA-Z_-]{8,40}$`; **todo o nada** (se valida el lote entero antes de escribir); advisory lock; `seq = seq+1` por ítem + `on conflict (espacio_id, uid) do nothing` | `sin-permiso`, `peticion-invalida`, `cambio-grande`, `limite` | `cambio {v, seq, tipo, de}` si `aplicados > 0` |
| `espacio_pull(id, desde) → {cambios, max_seq, mas, snapshot_seq}` | miembro activo; página de 200; `cambios` lleva TODO el log (también lo propio: al reabrir un documento hay que recuperar lo que uno mismo escribió desde el último snapshot; cada consumidor es idempotente), con `autor` para quien quiera saltárselo | `no-encontrado` | — |
| `espacio_snapshot_leer(id) → {snapshot, snapshot_seq}` | miembro activo | `no-encontrado` | — |
| `espacio_snapshot(id, estado, hasta_seq) → {ok, snapshot_seq}` | editor; ≤ 2 MB; exige `snapshot_seq ≤ hasta ≤ seq`; borra el log ≤ `hasta` | `sin-permiso`, `peticion-invalida`, `snapshot-grande`, `limite` | `cambio {tipo:'snapshot'}` |
| `espacio_bloquear(id) → {por, hasta}` | editor; arriendo de **5 min**; libre si `bloqueo_hasta` venció | `sin-permiso`, `limite`, `bloqueado` | `bloqueo` |
| `espacio_liberar(id) → {ok}` | idempotente: si ya no era mío responde `ok` igual | — | `bloqueo` (si lo tenía) |

- **Topic**: UNO solo por espacio, `espacio:<uuid>`, privado. Dos policies
  nuevas sobre `realtime.messages` (aditivas a las de sync, buzón y partidas):
  select para **miembros activos** (`espacio_es_miembro`) e insert para
  **dueño/editores** (`espacio_puede_editar`, con el topic reconstruido con `=`).
  No hacen falta las dos direcciones de `partidas` porque aquí **no hay
  árbitro**: lo durable es el log y el log solo se escribe por RPC.
  - de la **BD**: `cambio {v, seq, tipo, de}`, `miembros {v}`, `meta {v}`,
    `bloqueo {v, por, hasta}` y `borrado {v}`. El cliente relee con
    `espacio_estado` / `espacio_pull`: por el canal solo viaja el aviso.
  - de los **clientes editores**: `yjs {v, de, u}`, `aw {v, de, s}`,
    `sv {v, de, s}`, `trazo {v, de, op}` y `presencia {v, de, activo}`.
    Broadcasts ≤ 48 KB; lo grande va por RPC.
- **Bucket** `espacio-archivos` (privado, **50 MB** por objeto; png/jpeg/webp,
  mp4/webm/quicktime, mpeg/mp4/wav/webm/ogg), ruta `<espacio_id>/…`. Cuatro
  policies sobre `storage.objects`: select por `espacio_es_miembro`, e
  **insert, update y delete** por `espacio_puede_editar`. El `update` no sobra:
  los PNG de las capas del dibujo se suben con `upsert` a la misma ruta en cada
  compactación.
- **Límites** (`rate_limits`): `espacio-crear` **50/día**, `espacio-entrar`
  60/h, `espacio-invitar` 60/h, `espacio-rotar` 20/h, `espacio-push`
  **600/10 min** (1/s sostenido, frente a un lote cada 2 s por editor),
  `espacio-snapshot` 600/h, `espacio-bloquear` 120/h.

**Decisiones**

- Los espacios **no dependen del vínculo del buzón** una vez dentro:
  `buzon_bloquear` y `buzon_eliminar` **no se tocan** (a diferencia de
  `partidas`, que sí corta con `partida_cortar_con`). Quien quiera sacar a
  alguien usa «Quitar» (`espacio_expulsar`). Motivo: un calendario familiar o un
  documento a medias no debe evaporarse por una discusión en el chat.
- El contacto aceptado solo hace falta para **invitar** (el timbre viaja por
  `buzon:<uid>`). Por **enlace** entra cualquiera con sesión.
- **`espacio_borrar` no toca Storage**: `delete from storage.objects` tira la
  fila y deja el archivo físico huérfano (mismo motivo que en `partidas`). El
  cliente del dueño borra la carpeta `<id>/` por la API, a mejor esfuerzo,
  **antes** de llamar a la RPC.
- **Hueco de `seq`**: un `uid` repetido en `espacio_push` consume un `seq` y no
  inserta nada. Es inocuo —`espacio_pull` pagina por `seq > cursor` y nadie
  exige continuidad— y evita un segundo viaje para detectar el duplicado.
- **Bloqueo sin cron**: el arriendo de 5 min no lo limpia nadie; la caducidad se
  evalúa al leer (`espacio_resumen` devuelve `bloqueo: null` si venció) y al
  pedirlo (`espacio_bloquear`). Expulsar o salir con el turno en la mano lo
  suelta y avisa, para que el espacio no quede congelado 5 minutos.
- **Dos editores compactando a la vez** son inocuos: el servidor exige
  `snapshot_seq ≤ hasta_seq ≤ seq`, así que la foto más vieja se rechaza.
- `espacio_editar` con un parámetro en `null` **no borra** el valor: significa
  «no lo toques».

**Despliegue (EN ESTE ORDEN)**
1. `npx supabase db push` (aplica `20260921000001_espacios.sql` y, si sigue
   pendiente, `20260919000001_partidas.sql`: revisarlo antes). **Primero esta**:
   la BD nueva contra un build viejo no rompe nada; al revés solo falla al
   compartir.
2. Publicar el build web nuevo (`npm run build` + wrangler); el nativo después
   (`npx cap sync`).
3. En el dashboard: **Database → Tables** debe listar `espacios`,
   `espacio_miembros` y `espacio_cambios` con **RLS activada y sin policies**;
   **Database → Policies**, las **2** nuevas de `realtime.messages` (una select +
   una insert) y las **4** de `storage.objects`; **Storage → Buckets**,
   `espacio-archivos` (privado, 50 MB); **Database → Extensions**, `pgcrypto` en
   el esquema `extensions`. Las 17 funciones `espacio_*` de usuario con `grant` a
   `authenticated` y las 5 internas (`espacio_token`, `espacio_miembro_id`,
   `espacio_avisar`, `espacio_miembros_json`, `espacio_resumen`) **sin grant**.
   E2–E6 no llevan SQL.

### 10. Reportes y normas de la comunidad — 24-sep-2026

Lo exigen Google Play (contenido generado por usuarios) y Apple (guideline 1.2)
en cuanto hay mensajería entre personas. Migración
`20260924000001_reportes_normas.sql`.

- **Normas**: `perfiles.normas_aceptadas` (fecha de la primera aceptación).
  `core/buzon/normas.ts` (`asegurarNormas`) las pide en un `confirmar()` antes de
  enviar un mensaje (`motor.enviar`), pedir o aceptar un contacto
  (`ContactosPanel`) y crear o entrar a un espacio (`espacios/api.ts`). RPCs
  `buzon_normas()` y `buzon_aceptar_normas()`. El texto completo vive en la web:
  `terminos#normas` (`term.comunidad.*`).
- **Reportar**: tabla `reportes` (RLS sin políticas), RPCs
  `buzon_reportar(contacto, uid|null, motivo, detalle)` y
  `espacio_reportar(espacio, miembro|null, motivo, detalle)`, con el límite
  `reportar` de 20 por hora. Un reporte de mensaje guarda una **copia** en
  `evidencia` (sobrevive a «borrar para todos», aunque el adjunto de Storage no).
  UI: menú del mensaje, contactos y solicitudes (`ContactosPanel`) y miembros de
  un espacio (`PanelCompartir`); el flujo común está en `core/buzon/reportar.ts`
  y ofrece bloquear (o expulsar, si eres el dueño del espacio).
- **Aviso al dueño**: `reporte_avisar` manda un POST a un webhook de Slack o
  Discord si existe el secreto en Vault (sin él, el reporte se guarda y no avisa):

  ```sql
  select vault.create_secret('https://discord.com/api/webhooks/…', 'reportes_aviso_url');
  ```

- **Actuar en 24 h** (lo que se promete en los términos y en las notas a Apple):

  ```sql
  select id, origen, motivo, detalle, evidencia, reportado, creado_en
    from reportes where estado = 'pendiente' order by creado_en;
  -- Expulsar: borrar la cuenta (cascade a buzón, espacios y partidas).
  -- Authentication → Users → el uuid de `reportado` → Delete user.
  update reportes set estado = 'revisado', revisado_en = now() where id = …;
  ```

- **Borrar la cuenta** (`borrar-cuenta`) ya limpia también `buzon-adjuntos`
  (carpetas de sus hilos), `espacio-archivos` (espacios que compartió) y
  `partida-casa` (salas que abrió): las rutas van por hilo, espacio o sala, así
  que se buscan antes de que el cascade tire las filas.

### 11. Cuentas sin compra, capacidad y optimizaciones — 28-sep-2026

**Cuentas sin compra** (migración `20260928000001_gratis_sin_servidor.sql`):
- Quien no tiene unlock ni plan vigente ni es ilimitado (`public.pago(uid)`) no
  escribe NADA social en el servidor.
- Un trigger `exigir_pago` BEFORE INSERT en `buzon_*`, `partida*` y `espacio*`
  lo impide. Otro trigger impide cambiar alias, retrato y normas del perfil.
  Así quedan cubiertas también las RPCs futuras.
- `redes-*` y el juego de Jev lo comprueban en la función (`_shared/pago.ts`).
- En el cliente, el buzón y los espacios solo arrancan con `uidConPago()`
  (`sesionStore.ts`).
- El cron `cuentas-purga-diaria` (06:07 UTC, SQL puro) borra las cuentas de
  más de 3 días sin ningún rastro de pago: `cuentas_purgables()` enseña la
  lista antes de borrar.
- La puerta avisa la fecha del borrado (`puerta.borrado`, `mi.borrado`), y la
  política de privacidad lo dice (`priv.borrar.p`).

**Capacidad** (migración `20260928000002_capacidad.sql` + función `capacidad`):
- **`capacidad-medir`** (cron SQL cada hora, minuto 12) guarda en
  `capacidad_metricas`:
  - cuentas;
  - activos: sesiones renovadas en la última hora, un buen proxy de «a la vez»;
  - base de datos, Storage, R2;
  - partidas, mensajes y llamadas de IA.
- **`capacidad-hora`** (minuto 17) llama a la función `capacidad`, que:
  - añade CPU, RAM y conexiones de la Metrics API;
  - manda un correo por Resend si algo está en amarillo o rojo, uno al día como
    mucho;
  - **solo con el panel en «Pro»** programa la subida de compute. Requisitos:
    3 días en rojo, un escalón cada vez y como mucho uno por semana. Se aplica
    09–10 UTC con aviso 24 h antes y nunca pasa de `COMPUTE_TECHO`.
- Umbrales por plan en `capacidad_umbrales`.
- El dueño lo ve en Cuenta → Capacidad (`PanelCapacidad.tsx`, RPC
  `capacidad_panel`). Ahí cambia Free/Pro y cancela una subida.
- Secretos de la función:

  | Secreto | Para qué | Si falta |
  |---|---|---|
  | `CAPACIDAD_AUTH` | El cron | — |
  | `RESEND_API_KEY`, `ALERTA_PARA`, `ALERTA_DE` | El correo | No se manda |
  | `SUPABASE_PAT` | La Management API | No hay subida |
  | `COMPUTE_TECHO` | Techo de la subida | `ci_medium` |
  | `COMPUTE_SIMULAR` | Probar sin cambiar nada | Solo simula (`'0'` = de verdad) |

- En Vault van `capacidad_url` y `capacidad_auth`, como en `almacen-purga`.

**Optimizaciones** (migración `20260928000003_optimizar_servidor.sql`):
- `sync_push` devuelve `prev_max`. Si no hay nada ajeno más allá del cursor, el
  cliente se salta el pull que solo le devolvería lo que acaba de subir.
- Los intervalos de sync, buzón y espacios:
  - con la pestaña oculta, no corren;
  - con el canal vivo, pasan a 10 min.
- El debounce del push sube a 2 s, con envío en `pagehide`.
- RLS con `(select auth.uid())`.
- `buzon_pull` va por hilo (antes recorría el índice global).
- `buzon_listar_contactos(p_sin_retrato)` manda la huella del retrato;
  `buzon_retratos` baja solo los que cambian.
- `ia_respuestas` guarda 7 días las respuestas `compartible` (efemérides,
  fichas de obras, macros), con clave = SHA-256 de la petición completa. Un
  acierto no cobra.
- `blobs.ts` ya no sube ni lista en `sync-blobs`; solo lee de ahí como respaldo.
- El cron `retencion-diaria` purga:
  - `rate_limits`;
  - partidas cerradas;
  - `compras_log` a 90 días;
  - enlaces caducados;
  - `ia_respuestas`;
  - métricas de más de 400 días.

**Medios compartidos en R2** (función `compartidos`):
- Los adjuntos del buzón, los archivos de los espacios y el plano de una
  partida viven en R2 bajo `compartido/<ambito>/<ruta>`, con la misma ruta
  relativa que tenían en sus buckets.
- El permiso se comprueba con las funciones SQL de las antiguas policies,
  llamadas con el JWT del usuario.
- Lo viejo se muda solo: el cliente pide `bajar` con `migrar` tras un 404.
- `borrar-cuenta` borra también esos prefijos.
- Los buckets `buzon-adjuntos`, `espacio-archivos` y `partida-casa` quedan de
  solo lectura hasta vaciarlos.
- Riesgo aceptado: un miembro puede subir sin confirmar, y el tope por ámbito
  solo se mide en `confirmar`.

**Poses de las partidas** (migración `20260928000004_partida_poses.sql`):
- Cada invitado publica su pose en `partida:<id>:p:<ranura>` y solo el
  anfitrión la escucha. Los demás la ven dentro del `s` fundido.
- El anfitrión anuncia `pp: 1` en su `s`. Hasta verlo, el invitado sigue
  mandando por la subida compartida, por compatibilidad con anfitriones viejos.
- Con invitados moviéndose, el anfitrión quieto emite igual.

## Comandos útiles

```bash
npx supabase db push                 # aplicar migraciones pendientes
npx supabase functions deploy <fn>   # desplegar una Edge Function
npx supabase secrets list            # ver secretos configurados
npx supabase functions logs <fn>     # logs en vivo de una function
```

## Cómo funciona el sync (resumen técnico)

- **Identidad**: cada registro sincronizable lleva `uid` (UUID, índice único
  `&uid` desde la migración Dexie **v89**) y `updatedAt` (época ms). La PK
  local sigue siendo numérica; las FKs numéricas (`sesionId`, `lugarId`…) se
  traducen a `uid` en la frontera (mapa en `src/core/data/sync/syncables.ts`).
- **Captura**: un middleware DBCore (`sync/middleware.ts`) sella uid/updatedAt
  y encola cada cambio en `_outbox` dentro de la MISMA transacción; cubre
  repos, stores Zustand de la casa, seeds y el restore de Bodega. `db.ts`
  amplía toda transacción de escritura con `_outbox` (patrón dexie-observable).
- **Motor** (`sync/motor.ts`): push del outbox por lotes a la RPC `sync_push`
  (LWW por `updatedAt` en el servidor) y pull incremental por `server_seq`,
  aplicando padres→hijos con `_pendientes` para huérfanos, resolución de
  índices únicos por LWW y dedupe de singletons. Blobs al almacén R2 con
  hash (skip si no cambió) — ver `sync/blobs.ts` y §4.
- **Binarios del Studio** (`mediosVideo`, `grabacionesAudio`, `musicaImportada`,
  `pistasMusica`): viajan SOLO las filas con copia en la nube (`nube`, la pone
  `core/studio/nubeStudio.ts` tras cada ciclo) y NUNCA el blob
  (`CAMPOS_LOCALES`/`esFilaLocal` en `syncables.ts`). El otro dispositivo lo baja
  al usarlo (`asegurarBlob`). Los ids numéricos anidados se traducen fuera del
  motor: el video por `ProyectoVideo.mediosUid`, el audio por el `sello` del clip.
- **Seeds**: las siembras de demo llevan uid determinista (`seed-…`) y
  `updatedAt: 1`, así dos dispositivos no duplican y cualquier edición gana.
- **Primer login** (bootstrap): pull completo → limpieza de seeds vírgenes que
  la cuenta no conoce → se encola TODO lo local (merge-unión LWW, nada se
  destruye). Antes se ofrece descargar un respaldo.
- **Cambio de cuenta**: diálogo para conservar lo local (merge) o vaciar la
  casa y bajar solo lo de la cuenta; el estado de sync se resetea siempre.
- **No sincronizan**: todo lo que no esté en `TABLAS_SYNC` (`syncables.ts`):
  tablas legadas, cachés (`imagenesEjercicio`), efímeros (`edicionesDiario`) y
  localStorage (ajustes por dispositivo).

## Probar el sync en local

Abrir el preview en dos perfiles de navegador distintos (o normal + incógnito) con
la MISMA cuenta. **Nunca borrar la IndexedDB del navegador principal**: contiene los
datos reales. Antes de la primera sincronización, exportar un respaldo desde Bodega.

## Límites del free tier (referencia)

Postgres 500 MB · Storage 1 GB · 500k invocaciones de Edge Functions/mes · el
proyecto se pausa tras ~7 días sin uso (se despausa desde el dashboard). El
proyecto sigue en Free (sep 2026): pasa a Pro cuando Apple apruebe la app, y
entonces se cambia el panel de capacidad a «Pro» (§11). Los archivos ya no van
a Storage sino a R2 (§4).

## Cuota de IA (créditos)

| Plan | Pool mensual | Recargas |
|---|---|---|
| pro | 700 (`limites_plan.creditos_mes`) | sí, se gastan cuando el pool se agota |
| trial (mes incluido del unlock, 30 días) | 700 | sí, igual que pro |
| local | 0 | **único** acceso a la IA |

Las recargas van a `perfiles.creditos_extra`: compra suelta, nunca automática, sin
caducidad, y siguen sirviendo aunque el plan expire.

**Bucket de uso real** (`20260815000002`): cada proxy acumula el costo REAL en
USD de la llamada en `uso_ia.usd` (helper `_shared/costoUsd.ts`) y
`consumir_cuota_ia` deniega con motivo `techo` cuando el gasto real supera
`greatest(techo_piso_usd, créditos consumidos × $0.005 × techo_factor)` —
parámetros por plan en `limites_plan` (1.1 / $0.50). Es el sello del COGS: sin
él, la entrada de tokens viajaba sin tarifa. Detalle en `COSTOS.md § Bucket`.

Precio por operación (`costo_op()`, ancla 1 crédito ≈ $0.005 USD de costo real):

| `op` | Créditos | Tope de salida |
|---|---|---|
| `chat` · `texto` · `vision` · `voz` | 1 | 2048 · 1500 · 1500 · — |
| `texto_largo` (planes IA, mapas, tarjetas) · `pdf` | 4 | 4096 · 1500 |
| `imagen` (gpt-image-1-mini, calidad rápida) · `tts` | 3 | — |
| `modelo3d` (Sonnet 5) · `imagen_alta` (Gemini) | 10 | 8192 · — |

El tope de `chat` (2048) es menor que el de `texto_largo` A PROPÓSITO: con el
mismo tope, declarar la op barata daba la misma salida al 25% del precio.

La calidad de imagen la elige el usuario en Configuraciones › Precios de la IA y
viaja en el body de `ia-imagen` (`calidad: 'rapida' | 'buena'`): decide la op, el
precio y el orden de la cadena de proveedores (`IMG_CADENA_RAPIDA` / `IMG_CADENA_ALTA`).
La tabla completa por cuarto, con lo que cuesta cada operación compuesta, vive en
`src/core/cuenta/catalogoNucleo.ts` + `src/rooms/<id>/costosIA.ts` y se consulta
en la app.

Un modelo 3D pedido por chat consume 11 (el turno del chat + la generación). Los
latidos consumen 1 cuando les toca frase por IA (~10% vía cuenta) y solo con Pro.
Detalle de costos por acción, márgenes y consultas de telemetría: [`COSTOS.md`](COSTOS.md).

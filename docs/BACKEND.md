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
                  syncables.ts · motor.ts  Storage: bucket privado sync-blobs
                  blobs.ts                 RevenueCat Web Billing ── Stripe
```

- **Modelo de negocio (18-ago-2026)**: PAGO ÚNICO + suscripción opcional, con
  una sola regla detrás: **6 USD = 700 créditos**, y de cada 6 USD la ganancia
  mínima son 2 USD (por eso el bucket va a `techo_factor 1.00` = $3.50 de gasto
  real máximo por cada 700 créditos; ver COSTOS.md). La **demo** (no
  persistente) es el free tier. El **unlock** (`unlock_casa_v3`, $6.99 pago
  único) desbloquea la casa propia para siempre e incluye el **primer mes**
  (plan `trial`: 30 días con pool de 700 créditos + sync, sin tarjeta).
  **Pro** a 6 / 12 / 18 USD al mes según nivel —o **60 USD/año**
  (`pro_x1_anual`, el ×1 pagado de una vez)— con créditos mensuales + sync, y
  **créditos sueltos** (`creditos_x1`, $6 por 700 que no caducan), ambos
  vendidos únicamente en la web pública (`web/`, modelo Spotify: las apps de
  tienda no muestran compra). La puerta cliente es `PuertaUnlock` (main.tsx): instalaciones
  previas quedan con derechos adquiridos (`mh.unlockLocal`, marcado por
  `mh.bienvenida`) y un build sin backend no tiene puerta; lo cobrable lo
  revalida el servidor.
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
| `VITE_REVENUECAT_WEB_KEY` | RevenueCat → API keys (`rcb_...`) |
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
3. Crear el **pago único del unlock ($6.99), SIN entitlement**, y añadirlo a
   un offering. El webhook lo mapea a `perfiles.unlock` + plan `trial` de 30
   días; el cliente lo busca por id en TODOS los offerings. **Sin trial de RC**
   en ningún producto (el «primer mes» lo da el webhook, sin tarjeta). Ojo: si
   se añadiera un trial de RC habría que excluir `period_type === 'TRIAL'` del
   `fue_pro: true` del webhook, o marcaría como pagador a quien no pagó.
3b. Crear la **recarga `creditos_x1` ($6), consumible y SIN entitlement**, y
   añadirla al offering `default`. El webhook la abona a
   `perfiles.creditos_extra` (700 créditos) solo en el primer evento.
3c. Crear la **anualidad `pro_x1_anual` ($60, ciclo Yearly)** con el entitlement
   `pro`: es el nivel ×1 pagado de una vez, así que el webhook le asigna
   `nivel = 1` y el pool sigue siendo mensual.

   Los ids exactos importan en los seis productos vigentes (`pro_x1_v2`,
   `pro_x2_v2`, `pro_x3_v2`, `pro_x1_anual`, `unlock_casa_v3`, `creditos_x1`):
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
18-ago) y a **$6.99 (`unlock_casa_v3`)** el mismo día, con el cambio de plan de
negocio; los niveles pasaron de $5/$10/$15 (`pro_x1`…) a **$6/$12/$18**
(`pro_x1_v2`…). Vigentes hoy: `unlock_casa_v3`, `pro_x1_v2`, `pro_x2_v2`,
`pro_x3_v2` y `creditos_x1`; todo lo anterior, inactivo y fuera del offering.
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

### 4. Storage (sync de blobs)
La migración crea el bucket privado `sync-blobs` con acceso por carpeta de usuario;
no requiere pasos manuales. (Desde jul 2026 la policy también exige Pro vigente.)

### 5. Web pública (landing + /cuenta) — YA DESPLEGADA (15-ago-2026)
- Código en `web/` (segundo build de Vite): `npm run dev:web` (puerto 5174) y
  `npm run build:web` (→ `dist-web/`). Ligera a propósito: sin three ni dexie.
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
  índices únicos por LWW y dedupe de singletons. Blobs a Storage con hash
  (skip si no cambió) — ver `sync/blobs.ts`.
- **Seeds**: las siembras de demo llevan uid determinista (`seed-…`) y
  `updatedAt: 1`, así dos dispositivos no duplican y cualquier edición gana.
- **Primer login** (bootstrap): pull completo → limpieza de seeds vírgenes que
  la cuenta no conoce → se encola TODO lo local (merge-unión LWW, nada se
  destruye). Antes se ofrece descargar un respaldo.
- **Cambio de cuenta**: diálogo para conservar lo local (merge) o vaciar la
  casa y bajar solo lo de la cuenta; el estado de sync se resetea siempre.
- **No sincronizan**: tablas legadas, cachés (`imagenesEjercicio`), efímeros
  (`edicionesDiario`), `pistasMusica` (audio pesado) y localStorage (ajustes
  por dispositivo). Lista en `TABLAS_EXCLUIDAS`.

## Probar el sync en local

Abrir el preview en dos perfiles de navegador distintos (o normal + incógnito) con
la MISMA cuenta. **Nunca borrar la IndexedDB del navegador principal**: contiene los
datos reales. Antes de la primera sincronización, exportar un respaldo desde Bodega.

## Límites del free tier (referencia)

Postgres 500 MB · Storage 1 GB · 500k invocaciones de Edge Functions/mes · el
proyecto se pausa tras ~7 días sin uso (se despausa desde el dashboard). Los blobs
van a Storage (no a la tabla) y `pistasMusica` no se sincroniza para proteger el 1 GB.

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

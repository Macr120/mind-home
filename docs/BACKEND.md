# Backend: Supabase + RevenueCat

Capa de cuenta, IA con cuota mensual, suscripción Pro y sincronización
multi-dispositivo. **Sin `.env.local` la app es 100% local, idéntica a siempre**
(`hayBackend() === false` apaga toda esta capa).

## Arquitectura

```
Cliente SPA                                Supabase (hosted)
src/core/cuenta/  supabase.ts (singleton)  Auth email+password
                  sesionStore.ts (Zustand) Postgres: perfiles · limites_plan · uso_ia
                  api.ts (Edge Functions)            · registros · rc_eventos
                  paywall.ts (RevenueCat)  Edge Functions: ia-chat · ia-imagen
src/core/data/sync/ middleware.ts (DBCore)                 · revenuecat-webhook
                  syncables.ts · motor.ts  Storage: bucket privado sync-blobs
                  blobs.ts                 RevenueCat Web Billing ── Stripe
```

- **Plan**: `perfiles.plan` (`local`/`pro`) es la fuente de verdad; lo escriben solo
  el trigger de alta y el webhook de RevenueCat. El cliente lo espeja en
  `localStorage mh.planReal`/`mh.planExpira` para que `esPro()` responda síncrono.
- **IA**: con sesión Pro, `ia.ts`/`imagenIA.ts` llaman a las Edge Functions con la
  clave del SERVIDOR y cuota mensual (tabla `uso_ia`, límites en `limites_plan`).
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

Secretos del servidor (NUNCA en el cliente): `npx supabase secrets set CLAVE=valor`
→ `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `RC_WEBHOOK_AUTH`.

## Checklist de configuración manual

### 1. Supabase (una vez)
1. Crear proyecto en [supabase.com](https://supabase.com) (guardar la contraseña de BD).
2. Copiar Project URL y anon key a `.env.local`.
3. `npx supabase login` y `npx supabase link --project-ref <ref>` (el `<ref>` está en la URL del proyecto).
4. Aplicar migraciones: `npx supabase db push`.
5. Auth → Providers → Email: dejar activo «Confirm email».
   Auth → URL Configuration → Site URL: `http://localhost:5173` (en producción, el dominio real).

### 2. Proxy de IA
1. `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... GEMINI_API_KEY=...`
2. `npx supabase functions deploy ia-chat ia-imagen`
3. Para probar sin pagar: en SQL Editor,
   `update perfiles set plan='pro' where user_id='<uuid>';`
   Los límites se ajustan en la tabla `limites_plan`.

### 3. RevenueCat (pagos)
1. Crear cuenta en RevenueCat → proyecto → añadir plataforma **Web Billing**
   (pide conectar una cuenta de **Stripe**).
2. Crear producto de suscripción, entitlement `pro` y offering `default`.
3. Copiar la public API key `rcb_...` a `.env.local` (`VITE_REVENUECAT_WEB_KEY`).
4. Elegir un secreto largo y configurarlo en ambos lados:
   - RevenueCat → Integrations → Webhooks → Add: URL
     `https://<ref>.functions.supabase.co/revenuecat-webhook`, Authorization = ese secreto.
   - `npx supabase secrets set RC_WEBHOOK_AUTH=<ese secreto>`
5. `npx supabase functions deploy revenuecat-webhook --no-verify-jwt`
6. Probar con el modo test de Stripe (tarjeta `4242 4242 4242 4242`).

### 4. Storage (sync de blobs)
La migración crea el bucket privado `sync-blobs` con acceso por carpeta de usuario;
no requiere pasos manuales.

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

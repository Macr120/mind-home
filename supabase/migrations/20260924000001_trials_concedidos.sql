-- Un trial por COMPRA, no por cuenta (24-sep-2026).
--
-- El pago único de la casa trae 30 días de plan 'trial' (700 créditos). Hasta
-- hoy se concedía a la CUENTA que recibía el unlock, y la tienda deja llevar la
-- misma compra a otras cuentas («Restaurar compras»: RevenueCat la transfiere).
-- Resultado: una compra, tantos trials como cuentas nuevas. La casa sí debe
-- viajar con la compra; los créditos del primer mes, solo una vez.
--
-- La clave es el id de la transacción ORIGINAL de la tienda: el mismo en el
-- webhook (`original_transaction_id`) y en `GET /v1/subscribers`
-- (`store_transaction_id`), y el mismo cuando la compra se restaura.
create table if not exists public.trials_concedidos (
  transaccion  text primary key,
  user_id      uuid,
  concedido_en timestamptz not null default now()
);

-- Solo la escriben las Edge Functions (service_role): RLS activado, sin policies.
alter table public.trials_concedidos enable row level security;

-- Las compras de la casa que ya dieron su trial.
insert into public.trials_concedidos (transaccion, user_id, concedido_en)
select coalesce(payload->>'original_transaction_id', payload->>'transaction_id'),
       nullif(app_user_id, '')::uuid,
       recibido_en
from public.rc_eventos
where tipo = 'NON_RENEWING_PURCHASE'
  and payload->>'product_id' like '%unlock_casa%'
  and coalesce(payload->>'original_transaction_id', payload->>'transaction_id') is not null
on conflict (transaccion) do nothing;

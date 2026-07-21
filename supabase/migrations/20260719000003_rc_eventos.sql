-- Eventos del webhook de RevenueCat: idempotencia + auditoría.
-- Sin policies: solo lo toca el webhook con service_role.

create table public.rc_eventos (
  id text primary key, -- event.id de RevenueCat
  tipo text not null,
  app_user_id text not null,
  payload jsonb not null,
  recibido_en timestamptz not null default now()
);

alter table public.rc_eventos enable row level security;

-- Bitácora de la caja: cada paso de una compra que la app reporta (catálogo,
-- compra, perfil, confirmación), con el código y el mensaje del fallo si lo
-- hubo. Existe porque cuatro revisiones de Apple fallaron al comprar sin dejar
-- rastro de qué vio el revisor (21-sep-2026).
-- Sin policies: solo escribe `confirmar-compra` con service_role; se lee desde
-- el panel.

create table public.compras_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  plataforma text not null default '',
  os text not null default '',
  paso text not null,       -- catalogo | compra | perfil | confirmar
  producto text not null default '',
  resultado text not null,  -- ok | error | cancelada
  codigo text not null default '',
  mensaje text not null default '',
  recibido_en timestamptz not null default now()
);

create index compras_log_recibido_en on public.compras_log (recibido_en desc);
create index compras_log_user_id on public.compras_log (user_id);

alter table public.compras_log enable row level security;

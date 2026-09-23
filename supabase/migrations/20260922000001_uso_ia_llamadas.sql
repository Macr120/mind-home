-- Una fila por llamada de `ia-chat`, con su latencia. `uso_ia` y `uso_ia_ops`
-- solo guardan sumas por mes, así que no dan p50/p95 de tiempo ni de tokens, y
-- el tiempo no se medía en ningún sitio (22-sep-2026). Sirve para decidir con
-- datos el piloto de Jev (enrutado de tools y respuestas rápidas).
-- Sin policies: solo escribe `ia-chat` con service_role; se lee desde el panel.
-- La función purga lo que pase de 30 días de forma oportunista.

create table public.uso_ia_llamadas (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  creado timestamptz not null default now(),
  op text not null,
  proveedor text not null default '',   -- anthropic | gemini | openai | jev (respuesta rápida)
  modelo text not null default '',
  ms integer not null,                  -- de la entrada al proxy a la respuesta
  ms_proveedor integer,                 -- solo el intento que sirvió
  entrada integer not null default 0,
  salida integer not null default 0,
  cache_crear integer not null default 0,
  cache_leer integer not null default 0,
  usd numeric(12, 8) not null default 0,
  respaldo boolean not null default false,
  ruteo jsonb                           -- decisión de Jev, si hubo
);

create index uso_ia_llamadas_creado on public.uso_ia_llamadas (creado desc);
create index uso_ia_llamadas_user_id on public.uso_ia_llamadas (user_id);

alter table public.uso_ia_llamadas enable row level security;

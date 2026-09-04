-- Publicar del Studio de video a las redes del USUARIO (YouTube, TikTok,
-- Facebook e Instagram). Los tokens de cada red viven aquí, CIFRADOS por la
-- Edge Function (`_shared/redes/cifrado.ts`, AES-GCM con un secreto del
-- servidor); el cliente solo recibe metadatos (nombre, avatar, caducidad).
--
-- Las tres tablas tienen RLS activada y SIN políticas: solo las toca el
-- service_role desde `redes-oauth` y `redes-publicar`, con el uid ya validado
-- (mismo patrón que `rate_limits`, migración 20260826000001).

-- 1) Cuentas conectadas ------------------------------------------------------

create table public.redes_cuentas (
  user_id            uuid not null references auth.users (id) on delete cascade,
  plataforma         text not null check (plataforma in ('youtube', 'tiktok', 'facebook', 'instagram')),
  -- sub de Google · open_id de TikTok · page_id · ig_user_id
  cuenta_id          text not null,
  nombre             text not null default '',
  avatar             text,
  -- Cifrados 'v1.<iv>.<ct>'. Meta: `access_token` es el token de PÁGINA (sin
  -- caducidad conocida) y `token_padre` el de usuario long-lived (60 días) del
  -- que deriva; `expira_en` lleva la caducidad de ese padre para avisar.
  access_token       text not null,
  refresh_token      text,
  token_padre        text,
  expira_en          timestamptz,
  -- TikTok: el refresh token dura 365 días.
  refresh_expira_en  timestamptz,
  scopes             text not null default '',
  -- facebook: {page_id, paginas:[{id, nombre, avatar, instagram?:{id, username}}]} (sin tokens)
  -- instagram: {page_id, username}
  extra              jsonb not null default '{}'::jsonb,
  conectado_en       timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  primary key (user_id, plataforma)
);

alter table public.redes_cuentas enable row level security;

-- 2) Estados OAuth en vuelo (un solo uso, caducan a los 10 minutos) -----------

create table public.redes_oauth_pendientes (
  -- Id aleatorio; la firma HMAC viaja aparte en el `state` de la URL.
  state          text primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  proveedor      text not null check (proveedor in ('google', 'tiktok', 'meta')),
  -- La que pidió el cliente ('facebook' e 'instagram' comparten proveedor).
  plataforma     text not null,
  -- PKCE (TikTok): nunca sale del servidor.
  code_verifier  text,
  -- 'app' | 'popup:<origen>' | 'pestana:<origen>' — fijado en `iniciar`, jamás leído de la query del callback.
  retorno        text not null,
  creado_en      timestamptz not null default now()
);

alter table public.redes_oauth_pendientes enable row level security;

-- 3) Sesiones de subida por trozos (TikTok y Meta) ----------------------------
-- YouTube no necesita fila: el cliente sube directo a Google.

create table public.redes_publicaciones (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  plataforma      text not null check (plataforma in ('tiktok', 'facebook', 'instagram')),
  estado          text not null default 'subiendo' check (estado in ('subiendo', 'procesando', 'publicado', 'fallo')),
  tamano          bigint not null,
  trozo           bigint not null,
  -- Offset esperado del siguiente trozo (lo que ya llegó a la red).
  recibido        bigint not null default 0,
  mime            text not null,
  meta            jsonb not null default '{}'::jsonb,
  -- tiktok: {publish_id, upload_url} · facebook: {modo:'reel'|'video', video_id, upload_url | upload_session_id, fin}
  -- instagram: {contenedor, uri} · al terminar: {id, url, fail_reason}
  remoto          jsonb not null default '{}'::jsonb,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create index redes_publicaciones_user on public.redes_publicaciones (user_id, creado_en);

alter table public.redes_publicaciones enable row level security;

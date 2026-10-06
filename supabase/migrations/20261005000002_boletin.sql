-- Boletín diario por correo: salud mental, promociones y noticias importantes.
--
-- Consentimiento EXPLÍCITO (opt-in): nadie recibe nada sin haber dicho que sí.
-- - Registro con correo: la casilla del formulario viaja en
--   `raw_user_meta_data.boletin` y el trigger `al_alta_boletin` la apunta.
-- - Google/Apple (y cuentas anteriores a esto): sin fila = aún no se le ha
--   preguntado; la app le pregunta UNA vez y responde por `boletin_elegir`.
-- Se envía solo a correos confirmados. Cada correo lleva su enlace de baja
-- (`token`, función `boletin-baja`), sin tener que iniciar sesión.
--
-- El envío lo hace la función `boletin-diario` (cron `boletin-diario`, abajo):
-- genera una edición por idioma con IA (consejo de salud mental + los avisos
-- vigentes de `boletin_avisos`, traducidos) y la manda por Resend.

-- 1) Respuesta de cada cuenta --------------------------------------------------------

create table public.boletin_suscripciones (
  user_id uuid primary key references auth.users (id) on delete cascade,
  acepta boolean not null,
  idioma text not null default 'es',
  token uuid not null default gen_random_uuid() unique,
  respondido timestamptz not null default now(),
  ultimo_envio date
);

alter table public.boletin_suscripciones enable row level security;

create policy "boletin propio: leer"
  on public.boletin_suscripciones for select
  using ((select auth.uid()) = user_id);

-- El cliente no escribe la tabla: responde por aquí (sí o no, y en qué idioma).
create function public.boletin_elegir(p_acepta boolean, p_idioma text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_idioma text := coalesce(nullif(left(p_idioma, 5), ''), 'es');
begin
  if v_uid is null then
    raise exception 'sin-sesion';
  end if;
  insert into boletin_suscripciones (user_id, acepta, idioma)
  values (v_uid, p_acepta, v_idioma)
  on conflict (user_id) do update
    set acepta = excluded.acepta,
        idioma = excluded.idioma,
        respondido = now();
end;
$$;

revoke execute on function public.boletin_elegir(boolean, text) from public, anon;
grant execute on function public.boletin_elegir(boolean, text) to authenticated;

-- 2) Alta con la casilla del formulario ----------------------------------------------
--    Trigger aparte de `handle_new_user` para no tocar la creación del perfil.

create function public.boletin_alta()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'boletin' then
    insert into boletin_suscripciones (user_id, acepta, idioma)
    values (
      new.id,
      coalesce((new.raw_user_meta_data ->> 'boletin')::boolean, false),
      coalesce(nullif(left(new.raw_user_meta_data ->> 'idioma', 5), ''), 'es')
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke execute on function public.boletin_alta() from public, anon, authenticated;

create trigger al_alta_boletin
  after insert on auth.users
  for each row execute function public.boletin_alta();

-- 3) Promociones y noticias (las escribe el dueño en español) ------------------------
--    insert into boletin_avisos (tipo, titulo, texto, url, hasta)
--    values ('promo', '…', '…', 'https://…', current_date + 7);
--    Salen en todos los correos entre `desde` y `hasta` (incluidos), traducidos.

create table public.boletin_avisos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('promo', 'noticia')),
  titulo text not null,
  texto text not null,
  url text,
  desde date not null default current_date,
  hasta date not null,
  creado timestamptz not null default now()
);

alter table public.boletin_avisos enable row level security;

-- 4) Ediciones generadas (una por día e idioma) --------------------------------------
--    Si el cron se reintenta no se regenera ni cambia el contenido, y sirve de
--    archivo para no repetir temas.

create table public.boletin_ediciones (
  fecha date not null,
  idioma text not null,
  asunto text not null,
  contenido jsonb not null,
  primary key (fecha, idioma)
);

alter table public.boletin_ediciones enable row level security;

-- 5) A quién toca hoy (solo service_role) --------------------------------------------

create function public.boletin_destinatarios(p_limite int)
returns table (user_id uuid, correo text, idioma text, token uuid)
language sql
security definer set search_path = public
as $$
  select s.user_id, u.email::text, s.idioma, s.token
    from boletin_suscripciones s
    join auth.users u on u.id = s.user_id
   where s.acepta
     and u.email is not null
     and u.email_confirmed_at is not null
     and (s.ultimo_envio is null or s.ultimo_envio < (now() at time zone 'utc')::date)
   order by s.user_id
   limit p_limite;
$$;

revoke execute on function public.boletin_destinatarios(int) from public, anon, authenticated;
grant execute on function public.boletin_destinatarios(int) to service_role;

-- 6) Cron diario ---------------------------------------------------------------------
--    14:07 UTC = 8:07 en Ciudad de México, con dos pasadas más (14:27 y 14:47)
--    que solo mandan a quien aún no recibió hoy: si la primera se corta por el
--    límite de tiempo de la función, las siguientes terminan la lista.
--    Necesita en Vault `boletin_url` (…/functions/v1/boletin-diario) y
--    `boletin_auth` (= secreto BOLETIN_AUTH).

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('boletin-diario')
where exists (select 1 from cron.job where jobname = 'boletin-diario');

select cron.schedule(
  'boletin-diario',
  '7,27,47 14 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'boletin_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'boletin_auth')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $job$
);

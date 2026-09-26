-- Conteo de usuarios y capacidad (28-sep-2026).
--
-- Para que la infraestructura crezca «sola»: cada hora se miden cuentas,
-- activos, base de datos y almacenamiento (SQL puro, cron `capacidad-medir`), y
-- la función `capacidad` añade CPU/RAM del servidor, manda el correo de alerta
-- y, en plan Pro, sube el compute un escalón cuando el rojo se sostiene. El
-- dueño lo ve en su panel (`capacidad_panel`, solo cuentas ilimitadas).
--
-- «Activos» sale de `auth.sessions`: el cliente renueva el token cada hora
-- mientras la app está abierta, así que las sesiones renovadas en la última
-- hora son una buena aproximación de cuánta gente la usa A LA VEZ, sin escribir
-- nada nuevo por usuario.
--
-- La función `capacidad` la dispara el cron `capacidad-hora`. Sus dos secretos
-- viven en Vault, NO en este archivo (mismo patrón que almacen-purga):
--
--   select vault.create_secret(
--     'https://<ref>.supabase.co/functions/v1/capacidad', 'capacidad_url');
--   select vault.create_secret('<el mismo valor que CAPACIDAD_AUTH>', 'capacidad_auth');

-- 1) Tablas -------------------------------------------------------------------------

create table public.capacidad_metricas (
  dia         date not null,
  metrica     text not null,
  valor       numeric not null,
  actualizado timestamptz not null default now(),
  primary key (dia, metrica)
);

create table public.capacidad_umbrales (
  plan     text not null check (plan in ('free', 'pro')),
  metrica  text not null,
  amarillo numeric not null,
  rojo     numeric not null,
  -- Qué hacer al llegar al rojo: la traduce el panel.
  accion   text not null,
  orden    int not null default 0,
  primary key (plan, metrica)
);

-- Una sola fila: el plan de Supabase contratado (elige el juego de umbrales) y
-- el estado de la subida automática de compute.
create table public.capacidad_estado (
  id               int primary key default 1 check (id = 1),
  plan             text not null default 'free' check (plan in ('free', 'pro')),
  colores          jsonb not null default '{}',
  ultimo_correo    date,
  subida_pendiente text,
  subida_desde     timestamptz,
  subida_cancelada boolean not null default false,
  ultima_subida    timestamptz,
  cpu_prev         jsonb
);
insert into public.capacidad_estado default values;

alter table public.capacidad_metricas enable row level security;
alter table public.capacidad_umbrales enable row level security;
alter table public.capacidad_estado enable row level security;

-- Free: 200 conexiones Realtime, 500 MB de base, 1 GB de Storage. El rojo es
-- «contrata Pro ya», aunque Apple no haya aprobado todavía.
-- Pro: 500 conexiones incluidas (más allá se cobra solo con el spend cap
-- apagado), 8 GB de base, 100 GB de Storage; CPU/RAM sostenidas → compute.
insert into public.capacidad_umbrales (plan, metrica, amarillo, rojo, accion, orden) values
  ('free', 'activos_hora_max', 140,   180,   'contratar-pro', 1),
  ('free', 'bd_mb',            350,   450,   'contratar-pro', 2),
  ('free', 'storage_mb',       700,   900,   'contratar-pro', 3),
  ('free', 'cpu_pct',          70,    85,    'contratar-pro', 4),
  ('free', 'ram_pct',          80,    90,    'contratar-pro', 5),
  ('pro',  'activos_hora_max', 350,   450,   'realtime-extra', 1),
  ('pro',  'bd_mb',            5000,  7000,  'retencion', 2),
  ('pro',  'storage_mb',       80000, 95000, 'medios-r2', 3),
  ('pro',  'cpu_pct',          60,    70,    'subir-compute', 4),
  ('pro',  'ram_pct',          75,    85,    'subir-compute', 5);

-- 2) Medición -----------------------------------------------------------------------

-- `maximo`: guarda el mayor valor del día (picos); si no, el último.
create function public.capacidad_guardar(p_metrica text, p_valor numeric, p_maximo boolean default false)
returns void
language sql
security definer set search_path = public
as $$
  insert into capacidad_metricas (dia, metrica, valor)
  values ((now() at time zone 'utc')::date, p_metrica, coalesce(p_valor, 0))
  on conflict (dia, metrica) do update
    set valor = case when p_maximo then greatest(capacidad_metricas.valor, excluded.valor)
                     else excluded.valor end,
        actualizado = now()
$$;

create function public.capacidad_medir()
returns void
language plpgsql
security definer set search_path = public, auth, storage
as $$
declare
  v_hoy date := (now() at time zone 'utc')::date;
  v_ahora timestamp := now() at time zone 'utc';
begin
  perform capacidad_guardar('cuentas', (select count(*) from auth.users));
  perform capacidad_guardar('cuentas_pago', (select count(*) from public.perfiles p where public.pago(p.user_id)));
  perform capacidad_guardar('cuentas_pro', (select count(*) from public.perfiles
    where plan = 'pro' and (plan_expira is null or plan_expira > now())));
  perform capacidad_guardar('cuentas_trial', (select count(*) from public.perfiles
    where plan = 'trial' and plan_expira > now()));

  perform capacidad_guardar('activos_hora_max', (select count(distinct user_id) from auth.sessions
    where coalesce(refreshed_at, updated_at) > v_ahora - interval '1 hour'), true);
  perform capacidad_guardar('activos_dia', (select count(distinct user_id) from auth.sessions
    where coalesce(refreshed_at, updated_at) >= v_hoy), true);
  perform capacidad_guardar('activos_30d', (select count(*) from auth.users
    where last_sign_in_at > now() - interval '30 days'
       or id in (select user_id from auth.sessions
                  where coalesce(refreshed_at, updated_at) > v_ahora - interval '30 days')));

  perform capacidad_guardar('bd_mb', round(pg_database_size(current_database()) / 1048576.0, 1));
  perform capacidad_guardar('storage_mb', round(coalesce((select sum((metadata->>'size')::bigint)
    from storage.objects), 0) / 1048576.0, 1));
  perform capacidad_guardar('r2_gb', round(coalesce((select sum(bytes) from public.almacen_objetos), 0)
    / 1073741824.0, 2));

  perform capacidad_guardar('partidas_dia', (select count(*) from public.partidas where creada_en >= v_hoy));
  perform capacidad_guardar('mensajes_dia', (select count(*) from public.buzon_mensajes where creado_en >= v_hoy));
  perform capacidad_guardar('ia_dia', (select count(*) from public.uso_ia_llamadas where creado >= v_hoy));
end;
$$;

-- Semáforo de hoy con el juego de umbrales del plan contratado.
create function public.capacidad_semaforo()
returns table (metrica text, valor numeric, amarillo numeric, rojo numeric, color text, accion text, orden int)
language sql
stable
security definer set search_path = public
as $$
  select u.metrica, m.valor, u.amarillo, u.rojo,
         case when m.valor is null then 'gris'
              when m.valor >= u.rojo then 'rojo'
              when m.valor >= u.amarillo then 'amarillo'
              else 'verde' end,
         u.accion, u.orden
    from capacidad_umbrales u
    join capacidad_estado e on e.plan = u.plan
    left join capacidad_metricas m
      on m.metrica = u.metrica and m.dia = (now() at time zone 'utc')::date
   order by u.orden
$$;

revoke execute on function public.capacidad_guardar(text, numeric, boolean) from public, anon, authenticated;
revoke execute on function public.capacidad_medir() from public, anon, authenticated;
revoke execute on function public.capacidad_semaforo() from public, anon, authenticated;
grant execute on function public.capacidad_guardar(text, numeric, boolean) to service_role;
grant execute on function public.capacidad_medir() to service_role;
grant execute on function public.capacidad_semaforo() to service_role;

-- 3) Panel del dueño ----------------------------------------------------------------
--
-- Solo la cuenta del dueño (correo confirmado), no cualquier ilimitada. El
-- cliente pregunta con esta misma función si pinta la sección: así el correo no
-- viaja en el bundle.

create function public.capacidad_es_dueno()
returns boolean
language sql
stable
security definer set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users
     where id = auth.uid()
       and lower(email) = 'macr120cme@gmail.com'
       and email_confirmed_at is not null
  )
$$;
revoke execute on function public.capacidad_es_dueno() from public, anon;
grant execute on function public.capacidad_es_dueno() to authenticated;

create function public.capacidad_panel()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not capacidad_es_dueno() then
    raise exception 'solo-dueno' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'estado', (select to_jsonb(e) - 'cpu_prev' - 'colores' from capacidad_estado e),
    'semaforo', coalesce((select jsonb_agg(to_jsonb(s) order by s.orden) from capacidad_semaforo() s), '[]'),
    'series', coalesce((
      select jsonb_object_agg(metrica, puntos)
        from (select metrica, jsonb_agg(jsonb_build_array(dia, valor) order by dia) puntos
                from capacidad_metricas
               where dia > (now() at time zone 'utc')::date - 30
               group by metrica) x), '{}')
  );
end;
$$;

create function public.capacidad_cancelar_subida()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not capacidad_es_dueno() then
    raise exception 'solo-dueno' using errcode = 'P0001';
  end if;
  update capacidad_estado set subida_cancelada = true where id = 1;
end;
$$;

-- Al contratar (o dejar) Supabase Pro, el dueño cambia aquí el juego de umbrales.
create function public.capacidad_fijar_plan(p_plan text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not capacidad_es_dueno() then
    raise exception 'solo-dueno' using errcode = 'P0001';
  end if;
  if p_plan not in ('free', 'pro') then
    raise exception 'plan-invalido' using errcode = 'P0001';
  end if;
  update capacidad_estado set plan = p_plan where id = 1;
end;
$$;

revoke execute on function public.capacidad_panel() from public, anon;
revoke execute on function public.capacidad_cancelar_subida() from public, anon;
revoke execute on function public.capacidad_fijar_plan(text) from public, anon;
grant execute on function public.capacidad_panel() to authenticated;
grant execute on function public.capacidad_cancelar_subida() to authenticated;
grant execute on function public.capacidad_fijar_plan(text) to authenticated;

-- 4) Crons --------------------------------------------------------------------------

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('capacidad-medir')
where exists (select 1 from cron.job where jobname = 'capacidad-medir');
select cron.schedule('capacidad-medir', '12 * * * *', $job$ select public.capacidad_medir(); $job$);

select cron.unschedule('capacidad-hora')
where exists (select 1 from cron.job where jobname = 'capacidad-hora');
-- Cinco minutos después de medir: la función lee el semáforo ya actualizado.
select cron.schedule(
  'capacidad-hora',
  '17 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'capacidad_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', (select decrypted_secret from vault.decrypted_secrets where name = 'capacidad_auth')
    ),
    body := '{}'::jsonb
  );
  $job$
);

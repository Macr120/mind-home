-- Cuota mensual de IA por usuario (la consumen las Edge Functions ia-chat / ia-imagen).

create table public.limites_plan (
  plan text primary key,
  solicitudes_mes int not null,
  imagenes_mes int not null
);

insert into public.limites_plan (plan, solicitudes_mes, imagenes_mes)
values ('pro', 1000, 60), ('local', 0, 0);

alter table public.limites_plan enable row level security;

create policy "limites: leer autenticado"
  on public.limites_plan for select
  to authenticated
  using (true);

create table public.uso_ia (
  user_id uuid not null references auth.users (id) on delete cascade,
  periodo text not null, -- 'YYYY-MM' (UTC)
  solicitudes int not null default 0,
  imagenes int not null default 0,
  tokens_entrada bigint not null default 0,
  tokens_salida bigint not null default 0,
  primary key (user_id, periodo)
);

alter table public.uso_ia enable row level security;

create policy "uso propio: leer"
  on public.uso_ia for select
  using (auth.uid() = user_id);

-- Reserva atómica de una unidad de cuota ('chat' | 'imagen').
-- El upsert condicionado toma row-lock sobre (user_id, periodo): sin carreras
-- entre pestañas o dispositivos del mismo usuario.
create function public.consumir_cuota_ia(p_tipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_per text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_lim record;
  v_fila record;
begin
  if v_uid is null then
    return jsonb_build_object('permitido', false, 'motivo', 'sin-sesion');
  end if;
  if p_tipo not in ('chat', 'imagen') then
    return jsonb_build_object('permitido', false, 'motivo', 'tipo');
  end if;

  select l.* into v_lim
    from perfiles p
    join limites_plan l on l.plan = p.plan
   where p.user_id = v_uid
     and p.plan = 'pro'
     and (p.plan_expira is null or p.plan_expira > now());
  if not found then
    return jsonb_build_object('permitido', false, 'motivo', 'sin-pro');
  end if;

  -- Límite 0 o negativo: ni siquiera la primera inserción.
  if (p_tipo = 'chat' and v_lim.solicitudes_mes < 1)
     or (p_tipo = 'imagen' and v_lim.imagenes_mes < 1) then
    return jsonb_build_object('permitido', false, 'motivo', 'cuota');
  end if;

  insert into uso_ia (user_id, periodo, solicitudes, imagenes)
  values (
    v_uid, v_per,
    case when p_tipo = 'chat' then 1 else 0 end,
    case when p_tipo = 'imagen' then 1 else 0 end
  )
  on conflict (user_id, periodo) do update set
    solicitudes = uso_ia.solicitudes + case when p_tipo = 'chat' then 1 else 0 end,
    imagenes    = uso_ia.imagenes    + case when p_tipo = 'imagen' then 1 else 0 end
  where (p_tipo = 'chat'   and uso_ia.solicitudes < v_lim.solicitudes_mes)
     or (p_tipo = 'imagen' and uso_ia.imagenes    < v_lim.imagenes_mes)
  returning * into v_fila;

  if v_fila is null then
    return jsonb_build_object('permitido', false, 'motivo', 'cuota');
  end if;

  return jsonb_build_object(
    'permitido', true,
    'usadas', case when p_tipo = 'chat' then v_fila.solicitudes else v_fila.imagenes end,
    'limite', case when p_tipo = 'chat' then v_lim.solicitudes_mes else v_lim.imagenes_mes end
  );
end;
$$;

-- Telemetría de tokens reales (tras responder el proveedor).
create function public.registrar_uso_ia(p_entrada bigint, p_salida bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_per text := to_char(now() at time zone 'utc', 'YYYY-MM');
begin
  if v_uid is null then return; end if;
  update uso_ia
     set tokens_entrada = tokens_entrada + greatest(coalesce(p_entrada, 0), 0),
         tokens_salida  = tokens_salida  + greatest(coalesce(p_salida, 0), 0)
   where user_id = v_uid and periodo = v_per;
end;
$$;

-- Compensación: si el proveedor falló (5xx/timeout) se devuelve la unidad reservada.
create function public.devolver_cuota_ia(p_tipo text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_per text := to_char(now() at time zone 'utc', 'YYYY-MM');
begin
  if v_uid is null then return; end if;
  update uso_ia
     set solicitudes = greatest(solicitudes - case when p_tipo = 'chat' then 1 else 0 end, 0),
         imagenes    = greatest(imagenes    - case when p_tipo = 'imagen' then 1 else 0 end, 0)
   where user_id = v_uid and periodo = v_per;
end;
$$;

-- Sin sesión no hay nada que ejecutar.
revoke execute on function public.consumir_cuota_ia(text) from anon;
revoke execute on function public.registrar_uso_ia(bigint, bigint) from anon;
revoke execute on function public.devolver_cuota_ia(text) from anon;

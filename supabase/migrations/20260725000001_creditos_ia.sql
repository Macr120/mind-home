-- Pool ÚNICO de créditos de IA por usuario: chat = 1 crédito, imagen = 10.
-- Sustituye los dos contadores (solicitudes/imágenes) por un solo límite que
-- refleja el costo real de cada acción (una imagen cuesta ~10× un chat).
-- pro = 600 créditos/mes. Las Edge Functions NO cambian su contrato:
-- consumir/devolver conservan la firma (el costo por tipo se mapea aquí).

-- 1) limites_plan: créditos en lugar de contadores separados.
alter table public.limites_plan add column creditos_mes int not null default 0;
update public.limites_plan set creditos_mes = 600 where plan = 'pro';
alter table public.limites_plan drop column solicitudes_mes;
alter table public.limites_plan drop column imagenes_mes;

-- 2) uso_ia: pool de créditos + telemetría del caché de prompts (Anthropic).
--    solicitudes/imagenes se CONSERVAN como telemetría de volumen por tipo.
alter table public.uso_ia add column creditos int not null default 0;
alter table public.uso_ia add column tokens_cache_creacion bigint not null default 0;
alter table public.uso_ia add column tokens_cache_lectura bigint not null default 0;

-- Backfill del mes en curso: el consumo previo se convierte al pool.
update public.uso_ia
   set creditos = solicitudes + imagenes * 10
 where periodo = to_char(now() at time zone 'utc', 'YYYY-MM');

-- 3) consumir_cuota_ia: MISMA FIRMA (p_tipo 'chat' | 'imagen'); el costo va
--    adentro. El upsert condicionado toma row-lock sobre (user_id, periodo):
--    sin carreras entre pestañas o dispositivos del mismo usuario.
create or replace function public.consumir_cuota_ia(p_tipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_per   text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_lim   record;
  v_costo int;
  v_fila  record;
begin
  if v_uid is null then
    return jsonb_build_object('permitido', false, 'motivo', 'sin-sesion');
  end if;
  if p_tipo not in ('chat', 'imagen') then
    return jsonb_build_object('permitido', false, 'motivo', 'tipo');
  end if;
  v_costo := case when p_tipo = 'imagen' then 10 else 1 end;

  select l.* into v_lim
    from perfiles p
    join limites_plan l on l.plan = p.plan
   where p.user_id = v_uid
     and p.plan = 'pro'
     and (p.plan_expira is null or p.plan_expira > now());
  if not found then
    return jsonb_build_object('permitido', false, 'motivo', 'sin-pro');
  end if;

  -- Primera inserción del mes: el INSERT no pasa por el WHERE del upsert,
  -- así que el tope se valida aquí (mismo patrón que la versión original).
  if v_lim.creditos_mes < v_costo then
    return jsonb_build_object('permitido', false, 'motivo', 'cuota');
  end if;

  insert into uso_ia (user_id, periodo, solicitudes, imagenes, creditos)
  values (
    v_uid, v_per,
    case when p_tipo = 'chat' then 1 else 0 end,
    case when p_tipo = 'imagen' then 1 else 0 end,
    v_costo
  )
  on conflict (user_id, periodo) do update set
    solicitudes = uso_ia.solicitudes + case when p_tipo = 'chat' then 1 else 0 end,
    imagenes    = uso_ia.imagenes    + case when p_tipo = 'imagen' then 1 else 0 end,
    creditos    = uso_ia.creditos + v_costo
  where uso_ia.creditos + v_costo <= v_lim.creditos_mes
  returning * into v_fila;

  if v_fila is null then
    return jsonb_build_object('permitido', false, 'motivo', 'cuota');
  end if;

  return jsonb_build_object(
    'permitido', true,
    'usadas', v_fila.creditos,
    'limite', v_lim.creditos_mes
  );
end;
$$;

-- 4) devolver_cuota_ia: MISMA FIRMA; devuelve el costo del tipo al pool.
create or replace function public.devolver_cuota_ia(p_tipo text)
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
         imagenes    = greatest(imagenes    - case when p_tipo = 'imagen' then 1 else 0 end, 0),
         creditos    = greatest(creditos    - case when p_tipo = 'imagen' then 10 else 1 end, 0)
   where user_id = v_uid and periodo = v_per;
end;
$$;

-- 5) registrar_uso_ia: se amplía con los tokens del caché de prompts.
--    DROP + CREATE (no overload: dos firmas harían ambigua la llamada vieja
--    de 2 argumentos). Los DEFAULT 0 mantienen compatible al proxy viejo
--    durante la ventana de deploy.
drop function public.registrar_uso_ia(bigint, bigint);

create function public.registrar_uso_ia(
  p_entrada bigint,
  p_salida bigint,
  p_cache_crear bigint default 0,
  p_cache_leer bigint default 0
)
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
     set tokens_entrada        = tokens_entrada        + greatest(coalesce(p_entrada, 0), 0),
         tokens_salida         = tokens_salida         + greatest(coalesce(p_salida, 0), 0),
         tokens_cache_creacion = tokens_cache_creacion + greatest(coalesce(p_cache_crear, 0), 0),
         tokens_cache_lectura  = tokens_cache_lectura  + greatest(coalesce(p_cache_leer, 0), 0)
   where user_id = v_uid and periodo = v_per;
end;
$$;

-- El drop se llevó los privilegios de la firma vieja: re-aplicar.
revoke execute on function public.registrar_uso_ia(bigint, bigint, bigint, bigint) from anon;

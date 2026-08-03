-- Recargas de créditos: al agotar los 600 del mes, el usuario puede comprar
-- +600 por el mismo precio (producto one-time `recarga_600` en RevenueCat,
-- SIN entitlement). El webhook las abona a `perfiles.creditos_extra`, un pool
-- persistente que NO caduca a fin de mes y se consume solo cuando el pool
-- mensual ya no alcanza. Si el plan expira, los extras quedan latentes (el
-- gate 'sin-pro' va primero) hasta renovar.

alter table public.perfiles add column creditos_extra int not null default 0;

-- Abono atómico desde el webhook (service_role); el cliente jamás lo llama.
create function public.sumar_creditos_extra(p_uid uuid, p_creditos int)
returns void
language sql
security definer set search_path = public
as $$
  update perfiles
     set creditos_extra = creditos_extra + greatest(coalesce(p_creditos, 0), 0)
   where user_id = p_uid;
$$;

revoke execute on function public.sumar_creditos_extra(uuid, int) from anon, authenticated;

-- consumir_cuota_ia v3: MISMA FIRMA. Primero el pool mensual (tope
-- creditos_mes); agotado ese, consume de perfiles.creditos_extra.
-- `uso_ia.creditos` acumula SIEMPRE el total (mensual + extra): la telemetría
-- de COSTOS.md sigue leyendo un solo contador.
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

  -- Intento 1: pool mensual. La primera inserción del mes no pasa por el
  -- WHERE del upsert, así que el tope se pre-valida con el guard del IF.
  if v_lim.creditos_mes >= v_costo then
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
  end if;

  -- Intento 2: créditos extra (recargas). El UPDATE condicionado toma
  -- row-lock sobre el perfil: sin carreras entre pestañas/dispositivos.
  if v_fila is null then
    update perfiles
       set creditos_extra = creditos_extra - v_costo
     where user_id = v_uid and creditos_extra >= v_costo;
    if not found then
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
    returning * into v_fila;
  end if;

  return jsonb_build_object(
    'permitido', true,
    'usadas', v_fila.creditos,
    'limite', v_lim.creditos_mes
  );
end;
$$;

-- devolver_cuota_ia v3: si tras devolver el contador sigue en o sobre el tope
-- mensual, el crédito devuelto salió del pool extra → se reintegra ahí.
-- (Sesgo aceptado en el caso raro de carrera con el cambio de plan.)
create or replace function public.devolver_cuota_ia(p_tipo text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_per     text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_costo   int  := case when p_tipo = 'imagen' then 10 else 1 end;
  v_despues int;
  v_mes     int;
begin
  if v_uid is null then return; end if;
  update uso_ia
     set solicitudes = greatest(solicitudes - case when p_tipo = 'chat' then 1 else 0 end, 0),
         imagenes    = greatest(imagenes    - case when p_tipo = 'imagen' then 1 else 0 end, 0),
         creditos    = greatest(creditos - v_costo, 0)
   where user_id = v_uid and periodo = v_per
   returning creditos into v_despues;
  if v_despues is null then return; end if;

  select creditos_mes into v_mes from limites_plan where plan = 'pro';
  if v_mes is not null and v_despues >= v_mes then
    update perfiles set creditos_extra = creditos_extra + v_costo
     where user_id = v_uid;
  end if;
end;
$$;

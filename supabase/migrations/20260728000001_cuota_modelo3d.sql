-- Tipo de cuota 'modelo3d': la generación de un modelo 3D usa el perfil
-- `calidad` del proxy (modelo mayor + razonamiento adaptativo), que cuesta
-- ~5× un chat en tokens. Se cobra como 5 créditos.
--
-- Solo cambia el mapa de costos y la validación del tipo; el reparto entre el
-- pool mensual y `creditos_extra` es idéntico al de la v3 (ver 20260727000003).

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
  v_chat  int;
begin
  if v_uid is null then
    return jsonb_build_object('permitido', false, 'motivo', 'sin-sesion');
  end if;
  if p_tipo not in ('chat', 'imagen', 'modelo3d') then
    return jsonb_build_object('permitido', false, 'motivo', 'tipo');
  end if;
  v_costo := case p_tipo when 'imagen' then 10 when 'modelo3d' then 5 else 1 end;
  -- 'modelo3d' también pasa por `ia-chat`: cuenta como solicitud.
  v_chat := case when p_tipo = 'imagen' then 0 else 1 end;

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
      v_chat,
      case when p_tipo = 'imagen' then 1 else 0 end,
      v_costo
    )
    on conflict (user_id, periodo) do update set
      solicitudes = uso_ia.solicitudes + v_chat,
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
      v_chat,
      case when p_tipo = 'imagen' then 1 else 0 end,
      v_costo
    )
    on conflict (user_id, periodo) do update set
      solicitudes = uso_ia.solicitudes + v_chat,
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

create or replace function public.devolver_cuota_ia(p_tipo text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_per     text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_costo   int  := case p_tipo when 'imagen' then 10 when 'modelo3d' then 5 else 1 end;
  v_chat    int  := case when p_tipo = 'imagen' then 0 else 1 end;
  v_despues int;
  v_mes     int;
begin
  if v_uid is null then return; end if;
  update uso_ia
     set solicitudes = greatest(solicitudes - v_chat, 0),
         imagenes    = greatest(imagenes - case when p_tipo = 'imagen' then 1 else 0 end, 0),
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

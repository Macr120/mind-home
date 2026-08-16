-- Unlock de pago único + plan 'trial' (el «primer mes incluido»).
--
-- Modelo de negocio (ago 2026): la app pasa a venderse como pago único
-- (`unlock_casa`, $10.99) que desbloquea la casa para siempre e incluye el
-- primer mes: 30 días con el pool mensual de 700 créditos y sync, SIN tarjeta
-- ni suscripción. Al vencer, el usuario conserva la app y sus datos locales;
-- pierde el pool y el sync hasta suscribirse a Pro. Las recargas
-- (`creditos_extra`) siguen funcionando sin plan, como hasta ahora.
--
-- El trial se representa como plan = 'trial' + plan_expira a 30 días, activado
-- por el webhook de RevenueCat al ver la compra de `unlock_casa`
-- (NON_RENEWING_PURCHASE). La expiración es PEREZOSA a propósito: no hay evento
-- de RC para un trial sin suscripción, y no hace falta — un `plan_expira` en
-- pasado ya anula el pool en `consumir_cuota_ia` y el acceso al sync en
-- `tiene_pro()`; el cliente valida el espejo `mh.planExpira` igual que con Pro.

-- 1) perfiles: plan 'trial' + bandera de compra única (persiste aunque el
--    trial venza; es lo que "desbloquea la casa para siempre").
alter table public.perfiles drop constraint perfiles_plan_check;
alter table public.perfiles
  add constraint perfiles_plan_check check (plan in ('local', 'pro', 'trial'));
alter table public.perfiles add column unlock boolean not null default false;

-- 2) El trial tiene el mismo pool mensual que Pro.
insert into public.limites_plan (plan, creditos_mes) values ('trial', 700);

-- 3) Sync: un trial vigente cuenta como acceso. Las policies de `registros`,
--    `sync_push` y `sync-blobs` ya llaman a esta función; no se tocan.
create or replace function public.tiene_pro(p_uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
      from perfiles
     where user_id = p_uid
       and plan in ('pro', 'trial')
       and (plan_expira is null or plan_expira > now())
  )
$$;

-- 4) consumir_cuota_ia v8: el pool mensual vale para pro Y trial vigentes, y el
--    tope se lee de limites_plan por el plan REAL del perfil (la fila 'trial'
--    existe desde §2). Mismo cuerpo que v7 (20260803000001) salvo esa condición.
create or replace function public.consumir_cuota_ia(p_uid uuid, p_tipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_per   text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_costo int;
  v_mes   int;
  v_extra int;
  v_fila  record;
  v_chat  int;
  v_img   int;
  v_res   uuid;
begin
  if p_uid is null then
    return jsonb_build_object('permitido', false, 'motivo', 'sin-sesion');
  end if;
  v_costo := costo_op(p_tipo);
  if v_costo is null then
    return jsonb_build_object('permitido', false, 'motivo', 'tipo');
  end if;
  -- Purga oportunista de reservas huérfanas (llamadas que respondieron bien y
  -- nunca devolvieron): a esta escala sale más barato que un cron.
  delete from reservas_ia where creada < now() - interval '1 day';

  -- Todo lo que pasa por `ia-chat` cuenta como solicitud; las imágenes no.
  v_img  := case when p_tipo in ('imagen', 'imagen_alta') then 1 else 0 end;
  v_chat := 1 - v_img;

  -- Pool mensual: SOLO con pro o trial vigentes. Sin ellos queda en 0 y la
  -- llamada se paga entera con las recargas (modo local o plan caducado).
  select l.creditos_mes into v_mes
    from perfiles p
    join limites_plan l on l.plan = p.plan
   where p.user_id = p_uid
     and p.plan in ('pro', 'trial')
     and (p.plan_expira is null or p.plan_expira > now());
  v_mes := coalesce(v_mes, 0);

  -- Intento 1: pool mensual. La primera inserción del mes no pasa por el WHERE
  -- del upsert, así que el tope se pre-valida con el guard del IF.
  if v_mes >= v_costo then
    insert into uso_ia (user_id, periodo, solicitudes, imagenes, creditos)
    values (p_uid, v_per, v_chat, v_img, v_costo)
    on conflict (user_id, periodo) do update set
      solicitudes = uso_ia.solicitudes + v_chat,
      imagenes    = uso_ia.imagenes    + v_img,
      creditos    = uso_ia.creditos + v_costo
    where uso_ia.creditos + v_costo <= v_mes
    returning * into v_fila;
  end if;

  -- Intento 2: créditos extra (recargas). El UPDATE condicionado toma row-lock
  -- sobre el perfil: sin carreras entre pestañas/dispositivos. En modo local
  -- este es el ÚNICO camino.
  if v_fila is null then
    update perfiles
       set creditos_extra = creditos_extra - v_costo
     where user_id = p_uid and creditos_extra >= v_costo;
    if not found then
      return jsonb_build_object(
        'permitido', false,
        'motivo', 'cuota',
        'limite', v_mes,
        'costo', v_costo
      );
    end if;

    insert into uso_ia (user_id, periodo, solicitudes, imagenes, creditos)
    values (p_uid, v_per, v_chat, v_img, v_costo)
    on conflict (user_id, periodo) do update set
      solicitudes = uso_ia.solicitudes + v_chat,
      imagenes    = uso_ia.imagenes    + v_img,
      creditos    = uso_ia.creditos + v_costo
    returning * into v_fila;
  end if;

  select creditos_extra into v_extra from perfiles where user_id = p_uid;

  insert into reservas_ia (user_id, tipo) values (p_uid, p_tipo) returning id into v_res;

  return jsonb_build_object(
    'permitido', true,
    'usadas', v_fila.creditos,
    'limite', v_mes,
    'extra', coalesce(v_extra, 0),
    'costo', v_costo,
    'reserva', v_res
  );
end;
$$;

-- devolver_cuota_ia v8: misma condición pro/trial que consumir_ — si divergen,
-- el crédito se devuelve al pool equivocado.
create or replace function public.devolver_cuota_ia(p_uid uuid, p_tipo text, p_reserva uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_per     text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_costo   int  := costo_op(p_tipo);
  v_chat    int;
  v_img     int;
  v_despues int;
  v_mes     int;
begin
  if p_uid is null or v_costo is null or p_reserva is null then return; end if;

  -- La reserva es el vale del cobro: consumirla aquí garantiza que una llamada
  -- solo puede devolverse una vez y solo si de verdad se cobró.
  delete from reservas_ia
   where id = p_reserva and user_id = p_uid and tipo = p_tipo;
  if not found then return; end if;

  v_img  := case when p_tipo in ('imagen', 'imagen_alta') then 1 else 0 end;
  v_chat := 1 - v_img;

  update uso_ia
     set solicitudes = greatest(solicitudes - v_chat, 0),
         imagenes    = greatest(imagenes - v_img, 0),
         creditos    = greatest(creditos - v_costo, 0)
   where user_id = p_uid and periodo = v_per
   returning creditos into v_despues;
  if v_despues is null then return; end if;

  -- Si tras devolver el contador sigue en o sobre el tope mensual, el crédito
  -- salió del pool extra → se reintegra ahí. En modo local (tope 0) SIEMPRE.
  select l.creditos_mes into v_mes
    from perfiles p
    join limites_plan l on l.plan = p.plan
   where p.user_id = p_uid
     and p.plan in ('pro', 'trial')
     and (p.plan_expira is null or p.plan_expira > now());
  if v_despues >= coalesce(v_mes, 0) then
    update perfiles set creditos_extra = creditos_extra + v_costo
     where user_id = p_uid;
  end if;
end;
$$;

-- Niveles de suscripción (base ×1, ×2, ×3) en vez de recargas sueltas.
--
-- Por qué: las recargas eran compras one-time. Se sustituyen por tres niveles
-- de la MISMA suscripción, para que subir, bajar o cancelar sea un cambio de
-- plan en el portal de RevenueCat y no una compra nueva. El pool mensual pasa a
-- ser `creditos_mes × nivel`: 700 / 1400 / 2100.
--
-- `creditos_extra` NO se toca: la columna, su consumo y su reintegro siguen
-- vivos para el saldo ya comprado. Solo se deja de vender.
--
-- El techo en USD (20260815000002) no necesita cambios: se calcula sobre los
-- créditos CONSUMIDOS, así que escala solo con el nivel.

-- 1) Nivel del perfil. Solo significa algo con plan 'pro'; el trial y el modo
--    local se quedan en el pool base.
alter table public.perfiles
  add column nivel smallint not null default 1
  check (nivel between 1 and 3);

-- 2) Pool mensual en UN solo sitio. Antes el mismo SELECT estaba copiado en
--    consumir_ y devolver_, con un comentario advirtiendo de que si divergían el
--    crédito se devolvía a la bolsa equivocada. Ahora no pueden divergir.
--
--    El nivel multiplica SOLO en 'pro': si no, quien cancela un ×3 y luego
--    compra el unlock estrenaría el trial con 2100 créditos.
create function public.pool_mensual(p_uid uuid)
returns int
language sql
stable
security definer set search_path = public
as $$
  select coalesce(l.creditos_mes * case when p.plan = 'pro' then p.nivel else 1 end, 0)
    from perfiles p
    join limites_plan l on l.plan = p.plan
   where p.user_id = p_uid
     and p.plan in ('pro', 'trial')
     and (p.plan_expira is null or p.plan_expira > now());
$$;

revoke execute on function public.pool_mensual(uuid) from public, anon, authenticated;
grant execute on function public.pool_mensual(uuid) to service_role;

-- 3) consumir_cuota_ia v10: idéntica a v9 salvo el pool, que ahora sale de
--    pool_mensual().
create or replace function public.consumir_cuota_ia(p_uid uuid, p_tipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_per    text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_costo  int;
  v_mes    int;
  v_extra  int;
  v_fila   record;
  v_chat   int;
  v_img    int;
  v_res    uuid;
  v_usd    numeric;
  v_cred   int;
  v_factor numeric;
  v_piso   numeric;
begin
  if p_uid is null then
    return jsonb_build_object('permitido', false, 'motivo', 'sin-sesion');
  end if;
  v_costo := costo_op(p_tipo);
  if v_costo is null then
    return jsonb_build_object('permitido', false, 'motivo', 'tipo');
  end if;
  delete from reservas_ia where creada < now() - interval '1 day';

  select u.creditos, u.usd into v_cred, v_usd
    from uso_ia u where u.user_id = p_uid and u.periodo = v_per;
  select l.techo_factor, l.techo_piso_usd into v_factor, v_piso
    from perfiles p
    join limites_plan l on l.plan = p.plan
   where p.user_id = p_uid;
  if coalesce(v_usd, 0) >= greatest(
       coalesce(v_piso, 0.50),
       (coalesce(v_cred, 0) + v_costo) * 0.005 * coalesce(v_factor, 1.10)
     ) then
    return jsonb_build_object('permitido', false, 'motivo', 'techo', 'costo', v_costo);
  end if;

  v_img  := case when p_tipo in ('imagen', 'imagen_alta') then 1 else 0 end;
  v_chat := 1 - v_img;

  v_mes := pool_mensual(p_uid);

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

-- 4) devolver_cuota_ia v9: mismo pool que consumir_, por construcción.
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
begin
  if p_uid is null or v_costo is null or p_reserva is null then return; end if;

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

  if v_despues >= pool_mensual(p_uid) then
    update perfiles set creditos_extra = creditos_extra + v_costo
     where user_id = p_uid;
  end if;
end;
$$;

-- Cuentas con IA ILIMITADA (el dueño de la app).
--
-- Por qué: la cuenta del dueño usa la IA para desarrollar y demostrar la app,
-- no para consumir un plan. Regalarle un cupón de trial no sirve (es el mismo
-- pool de 700), y subirle `creditos_extra` a mano se agota y hay que repetirlo
-- cada mes. Esta bandera corta el problema de raíz: `consumir_cuota_ia` no
-- deniega nunca a un perfil `ilimitado` ni le cobra del pool ni de las
-- recargas — pero SIGUE registrando el uso (`uso_ia`, `uso_ia_ops`, el USD
-- real), para que las consultas de costos de `docs/consultas-uso.sql` sigan
-- diciendo la verdad sobre lo que gasta esta cuenta en los proveedores.
--
-- OJO: la bandera también salta el techo de gasto en USD. No hay red de
-- seguridad; el gasto real de Anthropic/OpenAI/Gemini se paga igual. El límite
-- de tasa (`consumir_rate_limit`, 20260826000001) SÍ sigue aplicando: frena
-- ráfagas, no créditos.
--
-- El padrón va por CORREO, no por uuid: así vale en cualquier base (producción,
-- una local, una restaurada) y sobrevive a que el dueño borre su cuenta y se
-- registre otra vez.

-- 1) Bandera del perfil. Solo la escriben el trigger de alta y la función de
--    sincronización, ambos SECURITY DEFINER; el cliente únicamente la lee
--    (la policy de SELECT propio de `perfiles` ya la cubre).
alter table public.perfiles
  add column ilimitado boolean not null default false;

-- 2) Padrón de correos. RLS activada y SIN policies: tabla interna, solo la
--    tocan las funciones definer y el service_role (mismo criterio que
--    `reservas_ia` y `rate_limits`).
create table public.cuentas_ilimitadas (
  correo text primary key check (correo = lower(correo)),
  nota text not null default '',
  creado timestamptz not null default now()
);

alter table public.cuentas_ilimitadas enable row level security;

insert into public.cuentas_ilimitadas (correo, nota)
values ('macr120cme@gmail.com', 'Cuenta del dueño')
on conflict (correo) do nothing;

-- 3) Alta de usuario: si el correo está en el padrón, el perfil NACE con acceso
--    completo (pro sin vencimiento, unlock, nivel máximo e ilimitado). Sin
--    esto, una cuenta recién creada tendría que esperar a la sincronización.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_dueno boolean := exists (
    select 1 from cuentas_ilimitadas where correo = lower(new.email)
  );
begin
  insert into public.perfiles (user_id, revenuecat_app_user_id, plan, unlock, nivel, ilimitado)
  values (
    new.id, new.id::text,
    case when v_dueno then 'pro' else 'local' end,
    v_dueno,
    case when v_dueno then 3 else 1 end,
    v_dueno
  );
  return new;
end;
$$;

-- 4) Sincronización del padrón con los perfiles YA existentes. Se ejecuta aquí
--    (para la cuenta del dueño, que existe desde antes) y a mano desde el SQL
--    editor después de añadir un correo nuevo al padrón:
--        select public.sincronizar_cuentas_ilimitadas();
--    Devuelve cuántos perfiles quedaron marcados.
create function public.sincronizar_cuentas_ilimitadas()
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_n int;
begin
  update perfiles p
     set ilimitado = true,
         plan = 'pro',
         plan_expira = null,
         unlock = true,
         nivel = 3
    from auth.users u
   where u.id = p.user_id
     and lower(u.email) in (select correo from cuentas_ilimitadas)
     and p.ilimitado is distinct from true;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.sincronizar_cuentas_ilimitadas() from public, anon, authenticated;
grant execute on function public.sincronizar_cuentas_ilimitadas() to service_role;

select public.sincronizar_cuentas_ilimitadas();

-- 5) consumir_cuota_ia v12: igual que v11 (20260820000002) salvo el atajo del
--    perfil ilimitado, que se resuelve ANTES de mirar pool, deuda y techo.
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
  v_chat   int;
  v_img    int;
  v_res    uuid;
  v_usd    numeric;
  v_cred   int;
  v_factor numeric;
  v_piso   numeric;
  v_ancla  numeric;
  v_deuda  int;
  v_pool   int;
  v_cobro  int;
  v_de_extra int;
  v_motivo text;
  v_ilim   boolean;
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

  -- Row-lock del perfil ANTES de leer nada: sin él, dos llamadas simultáneas
  -- del mismo usuario leerían el mismo saldo y cobrarían dos veces sobre él.
  select p.creditos_extra, p.ilimitado into v_extra, v_ilim
    from perfiles p where p.user_id = p_uid for update;
  v_extra := coalesce(v_extra, 0);

  v_img  := case when p_tipo in ('imagen', 'imagen_alta') then 1 else 0 end;
  v_chat := 1 - v_img;

  -- Atajo del dueño: se apunta el uso (telemetría) y se permite siempre. Ni
  -- pool, ni deuda, ni techo, ni recargas. `limite = -1` es la señal de «sin
  -- límite» que el cliente pinta como ∞.
  if v_ilim then
    insert into uso_ia (user_id, periodo, solicitudes, imagenes, creditos)
    values (p_uid, v_per, v_chat, v_img, v_costo)
    on conflict (user_id, periodo) do update set
      solicitudes = uso_ia.solicitudes + excluded.solicitudes,
      imagenes    = uso_ia.imagenes    + excluded.imagenes,
      creditos    = uso_ia.creditos    + excluded.creditos
    returning creditos into v_cred;

    insert into reservas_ia (user_id, tipo) values (p_uid, p_tipo) returning id into v_res;

    return jsonb_build_object(
      'permitido', true,
      'usadas', v_cred,
      'limite', -1,
      'extra', v_extra,
      'costo', v_costo,
      'reserva', v_res
    );
  end if;

  select l.techo_factor, l.techo_piso_usd into v_factor, v_piso
    from perfiles p
    join limites_plan l on l.plan = p.plan
   where p.user_id = p_uid;
  v_ancla := 0.005 * coalesce(v_factor, 1.00);

  select u.creditos, u.usd into v_cred, v_usd
    from uso_ia u where u.user_id = p_uid and u.periodo = v_per;
  v_cred := coalesce(v_cred, 0);
  v_usd  := coalesce(v_usd, 0);

  v_mes  := pool_mensual(p_uid);
  v_pool := greatest(0, v_mes - v_cred);
  -- Lo que el gasto real ya consumió y la tarifa nominal no cobró. Con
  -- `techo_factor` en 0 (apagar el techo a mano) no hay ancla que dividir y la
  -- deuda no aplica: se cobra solo la tarifa, como antes de esta migración.
  v_deuda := case when v_ancla > 0 then greatest(0, ceil(v_usd / v_ancla)::int - v_cred) else 0 end;

  -- Qué pasa con ESTA llamada. El orden importa: sin saldo para la op ni
  -- siquiera se mira el techo (el mensaje honesto es «sin créditos»).
  if v_pool + v_extra < v_deuda + v_costo then
    v_motivo := 'cuota';
  elsif v_usd >= greatest(coalesce(v_piso, 0.50), (v_cred + v_deuda + v_costo) * v_ancla) then
    v_motivo := 'techo';
  else
    v_motivo := null;
  end if;

  -- Cargo único: la op + la deuda si se permite; solo la deuda que quepa si no.
  v_cobro := case when v_motivo is null then v_deuda + v_costo
                  else least(v_deuda, v_pool + v_extra) end;
  if v_motivo is not null then
    v_chat := 0;
    v_img  := 0;
  end if;

  if v_cobro > 0 then
    -- El pool del mes primero; lo que no cabe sale de las recargas.
    v_de_extra := greatest(0, v_cobro - v_pool);
    if v_de_extra > 0 then
      update perfiles set creditos_extra = greatest(creditos_extra - v_de_extra, 0)
       where user_id = p_uid;
      v_extra := greatest(v_extra - v_de_extra, 0);
    end if;
    insert into uso_ia (user_id, periodo, solicitudes, imagenes, creditos)
    values (p_uid, v_per, v_chat, v_img, v_cobro)
    on conflict (user_id, periodo) do update set
      solicitudes = uso_ia.solicitudes + excluded.solicitudes,
      imagenes    = uso_ia.imagenes    + excluded.imagenes,
      creditos    = uso_ia.creditos    + excluded.creditos;
    v_cred := v_cred + v_cobro;
  end if;

  if v_motivo is not null then
    return jsonb_build_object(
      'permitido', false,
      'motivo', v_motivo,
      'limite', v_mes,
      'usadas', v_cred,
      'extra', v_extra,
      'costo', v_costo
    );
  end if;

  insert into reservas_ia (user_id, tipo) values (p_uid, p_tipo) returning id into v_res;

  return jsonb_build_object(
    'permitido', true,
    'usadas', v_cred,
    'limite', v_mes,
    'extra', v_extra,
    -- Lo cobrado AHORA: la tarifa de la op más la deuda saldada de las
    -- anteriores. El cliente lo enseña como «lo que costó esta llamada».
    'costo', v_cobro,
    'reserva', v_res
  );
end;
$$;

-- 6) devolver_cuota_ia v10: igual que v9 (20260815000003) salvo el guard del
--    perfil ilimitado. Sin él, una llamada fallida de esta cuenta REGALARÍA
--    créditos de recarga: su uso rebasa el pool mensual todos los meses, que es
--    justo la condición con la que el reintegro va a `creditos_extra`.
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

  -- Al dueño no se le reintegra a las recargas: su uso rebasa el pool y el
  -- reintegro le acuñaría `creditos_extra` con cada fallo de proveedor.
  if exists (select 1 from perfiles where user_id = p_uid and ilimitado) then
    return;
  end if;

  if v_despues >= pool_mensual(p_uid) then
    update perfiles set creditos_extra = creditos_extra + v_costo
     where user_id = p_uid;
  end if;
end;
$$;

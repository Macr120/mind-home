-- Las RPCs de cuota pasan a ser EXCLUSIVAS del servidor (Edge Functions con
-- service_role). Dos agujeros que cierran juntos:
--
-- 1) En Postgres las funciones nacen con EXECUTE concedido a PUBLIC y las
--    migraciones solo revocaban `anon`: cualquier usuario `authenticated` podía
--    llamarlas por PostgREST (/rest/v1/rpc/...). Con `devolver_cuota_ia` eso
--    era ACUÑAR créditos: en modo local el tope mensual vale 0, la condición
--    `v_despues >= 0` es siempre cierta y cada llamada regalaba +costo a
--    `perfiles.creditos_extra`, sin límite. `consumir_` (autolesión) y
--    `registrar_` (envenenar la telemetría con la que se calibran los precios)
--    compartían la puerta abierta.
--
-- 2) Aun llamada solo por el servidor, `devolver_` era un abono incondicional:
--    un bug futuro que la invocara dos veces duplicaría la devolución. Ahora
--    `consumir_` emite una RESERVA (fila en `reservas_ia`) y `devolver_` la
--    exige y la consume: sin reserva no hay abono, y una reserva se devuelve
--    UNA sola vez.
--
-- El uid deja de salir de auth.uid() y viaja como parámetro: la Edge Function
-- valida el JWT (usuarioDe) y llama con el cliente admin, igual que el webhook
-- de RevenueCat hace con `sumar_creditos_extra` desde el principio.
--
-- ⚠️ Desplegar junto con las Edge Functions que llaman con service_role: las
-- funciones viejas desaparecen aquí (DROP) y las nuevas firmas no son
-- invocables con el JWT del usuario. No hay producción todavía, así que no se
-- necesita ventana de compatibilidad (precedente: 20260729000001).

-- 1) Reservas: una fila por cobro pendiente de resolución. Se borra al
--    registrar la devolución; las huérfanas (respuesta entregada, nunca
--    devueltas) se purgan de forma oportunista al consumir.
create table public.reservas_ia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null,
  creada timestamptz not null default now()
);

-- RLS sin policies: ningún rol de la API de datos la ve; solo service_role.
alter table public.reservas_ia enable row level security;

-- 2) Firmas nuevas. DROP + CREATE: cambiar la lista de parámetros crea una
--    sobrecarga, no un reemplazo, y la vieja seguiría expuesta.
drop function public.consumir_cuota_ia(text);
drop function public.devolver_cuota_ia(text);
drop function public.registrar_uso_ia(bigint, bigint, bigint, bigint, text, text);

-- consumir_cuota_ia v7: cuerpo v6 (20260802000002) con p_uid + emisión de reserva.
create function public.consumir_cuota_ia(p_uid uuid, p_tipo text)
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

  -- Pool mensual: SOLO con Pro vigente. Sin él queda en 0 y la llamada se paga
  -- entera con las recargas (modo local o suscripción caducada).
  select l.creditos_mes into v_mes
    from perfiles p
    join limites_plan l on l.plan = p.plan
   where p.user_id = p_uid
     and p.plan = 'pro'
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

-- devolver_cuota_ia v7: cuerpo v6 con p_uid + reserva obligatoria de un solo uso.
create function public.devolver_cuota_ia(p_uid uuid, p_tipo text, p_reserva uuid)
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
  -- Misma condición que en consumir_: si divergen, el crédito se devuelve al
  -- pool equivocado.
  select l.creditos_mes into v_mes
    from perfiles p
    join limites_plan l on l.plan = p.plan
   where p.user_id = p_uid
     and p.plan = 'pro'
     and (p.plan_expira is null or p.plan_expira > now());
  if v_despues >= coalesce(v_mes, 0) then
    update perfiles set creditos_extra = creditos_extra + v_costo
     where user_id = p_uid;
  end if;
end;
$$;

-- registrar_uso_ia: mismo cuerpo (20260802000001 §5) con p_uid.
create function public.registrar_uso_ia(
  p_uid uuid,
  p_entrada bigint,
  p_salida bigint,
  p_cache_crear bigint default 0,
  p_cache_leer bigint default 0,
  p_proveedor text default 'anthropic',
  p_tipo text default 'chat'
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_per text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_gem boolean := p_proveedor = 'gemini';
  v_ent bigint := greatest(coalesce(p_entrada, 0), 0);
  v_sal bigint := greatest(coalesce(p_salida, 0), 0);
  v_cc  bigint := greatest(coalesce(p_cache_crear, 0), 0);
  v_cl  bigint := greatest(coalesce(p_cache_leer, 0), 0);
begin
  if p_uid is null then return; end if;

  update uso_ia
     set tokens_entrada = tokens_entrada + case when v_gem then 0 else v_ent end,
         tokens_salida  = tokens_salida  + case when v_gem then 0 else v_sal end,
         tokens_cache_creacion = tokens_cache_creacion + v_cc,
         tokens_cache_lectura  = tokens_cache_lectura  + v_cl,
         solicitudes_gemini = solicitudes_gemini + case when v_gem then 1 else 0 end,
         tokens_entrada_gemini = tokens_entrada_gemini + case when v_gem then v_ent else 0 end,
         tokens_salida_gemini  = tokens_salida_gemini  + case when v_gem then v_sal else 0 end
   where user_id = p_uid and periodo = v_per;

  insert into uso_ia_ops (
    user_id, periodo, op, proveedor,
    llamadas, creditos, tokens_entrada, tokens_salida,
    tokens_cache_creacion, tokens_cache_lectura
  )
  values (
    p_uid, v_per, p_tipo, p_proveedor,
    1, coalesce(costo_op(p_tipo), 0), v_ent, v_sal, v_cc, v_cl
  )
  on conflict (user_id, periodo, op, proveedor) do update set
    llamadas = uso_ia_ops.llamadas + 1,
    creditos = uso_ia_ops.creditos + coalesce(costo_op(p_tipo), 0),
    tokens_entrada = uso_ia_ops.tokens_entrada + v_ent,
    tokens_salida  = uso_ia_ops.tokens_salida  + v_sal,
    tokens_cache_creacion = uso_ia_ops.tokens_cache_creacion + v_cc,
    tokens_cache_lectura  = uso_ia_ops.tokens_cache_lectura  + v_cl;
end;
$$;

-- 3) La raíz del agujero: revocar también de PUBLIC (el default olvidado) y de
--    authenticated. Solo el servidor (service_role) puede cobrar y devolver.
revoke execute on function public.consumir_cuota_ia(uuid, text) from public, anon, authenticated;
revoke execute on function public.devolver_cuota_ia(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.registrar_uso_ia(uuid, bigint, bigint, bigint, bigint, text, text) from public, anon, authenticated;
grant execute on function public.consumir_cuota_ia(uuid, text) to service_role;
grant execute on function public.devolver_cuota_ia(uuid, text, uuid) to service_role;
grant execute on function public.registrar_uso_ia(uuid, bigint, bigint, bigint, bigint, text, text) to service_role;

-- costo_op queda legible por authenticated a propósito: es la tabla de precios,
-- inmutable y sin efectos. Ya estaba revocada de anon (20260802000001).

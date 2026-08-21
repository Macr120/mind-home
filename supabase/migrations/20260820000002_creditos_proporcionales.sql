-- Créditos PROPORCIONALES al gasto real: el medidor se agota justo en el techo.
--
-- El problema: había DOS medidores midiendo lo mismo con reglas distintas. El
-- crédito tarifa por OPERACIÓN (`costo_op`), pero el costo real de una llamada
-- no es el nominal — un chat con TOOLS_EDITOR sin caché cuesta varias veces su
-- crédito, y una imagen «rápida» servida por el respaldo Gemini cuesta $0.0336
-- habiendo cobrado 3 ($0.015). El bucket de USD (20260815000002 +
-- 20260818000003) sellaba ese agujero por fuera, así que quien gastaba caro
-- chocaba con el motivo 'techo' **con la barra a medias**: «alcanzaste el
-- límite» con 400 de 700 créditos. Y al revés, quien gastaba barato llegaba a
-- 700 habiendo costado $2.30. En ninguno de los dos casos el número que ve el
-- usuario decía la verdad.
--
-- Ahora los dos medidores son UNO. Antes de cobrar la op, la función salda la
-- DEUDA: los créditos que el gasto real ya consumió y que la tarifa nominal no
-- cobró.
--
--   ancla = $0.005 × techo_factor        (con factor 1.00: 700 cr ≡ $3.50)
--   deuda = ceil(usd_mes / ancla) − créditos_cobrados_mes
--
-- Así el tope de gasto queda repartido de forma proporcional sobre los 700
-- créditos: cada centavo real consume 2 créditos, la barra refleja cómo se
-- agotan DE VERDAD y el corte llega al llegar a 700, no antes. La tarifa por op
-- sigue siendo el precio ANUNCIADO (los badges de la UI, que ya se pintan con
-- «≈»), pero es aproximada: el cobro final lo ajusta este saldo. Con el
-- ponderado real medido (~$0.0033/crédito) la deuda es 0 y no cambia nada: solo
-- muerde a quien de verdad cuesta más de lo que su tarifa dice.
--
-- Dos detalles que sostienen la promesa:
--
-- 1. La deuda se cobra HASTA DONDE ALCANCE aunque la op se deniegue — ese gasto
--    ya ocurrió. Si se lleva lo que quedaba, el medidor termina EN el tope y el
--    corte sale por 'cuota' («te quedaste sin créditos»), que es la verdad, en
--    vez de por 'techo' con saldo a la vista.
-- 2. El guard del techo se conserva como red de seguridad, pero con la deuda
--    saldada ya no puede disparar antes que los créditos: tras el cargo se
--    cumple `usd ≤ créditos × ancla`, y el guard exige `usd ≥ (créditos +
--    costo) × ancla`.
--
-- El row-lock del perfil pasa al principio: antes lo tomaba el UPDATE
-- condicionado de `creditos_extra`, y ahora hay que leer saldo y medidor antes
-- de decidir cuánto se cobra. Es lo que serializa dos llamadas del mismo
-- usuario desde dos pestañas o dos dispositivos.

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
  select p.creditos_extra into v_extra from perfiles p where p.user_id = p_uid for update;
  v_extra := coalesce(v_extra, 0);

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
  v_img  := case when v_motivo is null and p_tipo in ('imagen', 'imagen_alta') then 1 else 0 end;
  v_chat := case when v_motivo is null then 1 - v_img else 0 end;

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

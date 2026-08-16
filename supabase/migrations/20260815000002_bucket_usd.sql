-- Bucket de techo en USD REAL: el sello que faltaba sobre los 700 créditos.
--
-- El crédito solo pone precio a la SALIDA de tokens; la entrada la acotan los
-- LIMITES de ia-chat (~60 000 tokens/llamada) pero no tiene tarifa. La
-- auditoría de COSTOS.md § «Corrección de auditoría» midió el agujero: 700
-- créditos gastados en `chat` con TOOLS_EDITOR sin caché cuestan ~$14 contra
-- $3.50 nominales. Ninguna tabla de precios cierra ese techo; este bucket sí.
--
-- Cómo: cada Edge Function calcula el costo REAL en USD de su llamada (tokens
-- por tarifa de proveedor, o costo fijo en imagen/voz/tts) y lo acumula en
-- `uso_ia.usd` vía `registrar_uso_ia`. `consumir_cuota_ia` deniega con motivo
-- 'techo' cuando:
--
--   usd_mes >= greatest(techo_piso_usd, (creditos_mes_consumidos + costo_op) × $0.005 × techo_factor)
--
-- Es decir: el gasto real no puede superar en más de `techo_factor` el valor
-- ancla de los créditos consumidos ($0.005/cr). El techo ESCALA con recargas
-- (más créditos consumidos → más margen) y el piso evita cortar las primeras
-- llamadas del mes. Con factor 1.1: 700 cr → tope $3.85 (< $4.50 netos de Pro
-- web); 600 cr de recarga → $3.30 (< $3.50 netos de tienda al 30%). El
-- ponderado real es $0.0033/cr, así que un usuario normal no lo toca nunca:
-- es un tope anti-abuso, no una tarifa.

-- 1) Acumulador del costo real del periodo.
alter table public.uso_ia add column usd numeric(12, 6) not null default 0;

-- 2) Parámetros del techo, por plan (permite apretar el trial a 1.0 sin tocar
--    funciones). La fila 'local' también los hereda: sin plan, el allowance
--    sale solo de los créditos extra consumidos, que es lo que se quiere.
alter table public.limites_plan add column techo_factor numeric(4, 2) not null default 1.10;
alter table public.limites_plan add column techo_piso_usd numeric(8, 2) not null default 0.50;

-- 3) registrar_uso_ia v3: nueva firma con p_usd. DROP + CREATE: añadir un
--    parámetro con default crearía una SOBRECARGA, no un reemplazo, y la firma
--    vieja quedaría viva (precedente: 20260803000001 §2).
drop function public.registrar_uso_ia(uuid, bigint, bigint, bigint, bigint, text, text);

create function public.registrar_uso_ia(
  p_uid uuid,
  p_entrada bigint,
  p_salida bigint,
  p_cache_crear bigint default 0,
  p_cache_leer bigint default 0,
  p_proveedor text default 'anthropic',
  p_tipo text default 'chat',
  p_usd numeric default 0
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
  v_usd numeric := greatest(coalesce(p_usd, 0), 0);
begin
  if p_uid is null then return; end if;

  update uso_ia
     set tokens_entrada = tokens_entrada + case when v_gem then 0 else v_ent end,
         tokens_salida  = tokens_salida  + case when v_gem then 0 else v_sal end,
         tokens_cache_creacion = tokens_cache_creacion + v_cc,
         tokens_cache_lectura  = tokens_cache_lectura  + v_cl,
         solicitudes_gemini = solicitudes_gemini + case when v_gem then 1 else 0 end,
         tokens_entrada_gemini = tokens_entrada_gemini + case when v_gem then v_ent else 0 end,
         tokens_salida_gemini  = tokens_salida_gemini  + case when v_gem then v_sal else 0 end,
         usd = uso_ia.usd + v_usd
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

revoke execute on function public.registrar_uso_ia(uuid, bigint, bigint, bigint, bigint, text, text, numeric) from public, anon, authenticated;
grant execute on function public.registrar_uso_ia(uuid, bigint, bigint, bigint, bigint, text, text, numeric) to service_role;

-- 4) consumir_cuota_ia v9: cuerpo v8 (20260815000001) + el guard del techo.
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
  -- Purga oportunista de reservas huérfanas (llamadas que respondieron bien y
  -- nunca devolvieron): a esta escala sale más barato que un cron.
  delete from reservas_ia where creada < now() - interval '1 day';

  -- Bucket: el gasto REAL del mes no puede superar el valor ancla de los
  -- créditos consumidos por más del factor del plan. Ver cabecera del archivo.
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

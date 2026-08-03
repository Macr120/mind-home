-- Dos calidades de imagen + arreglo del contador de imágenes.
--
-- 1) gpt-image-1-mini ($0.005) pasa a ser el proveedor PRINCIPAL y la op
--    `imagen` baja de 10 a 3 créditos. Gemini 3.1 Flash Lite Image ($0.0336)
--    queda como calidad opcional en la op nueva `imagen_alta`, que conserva los
--    10. Una dieta completa de la cocina baja así de 55 créditos a 20.
--
-- 2) BUG que destapa el cambio: `consumir_cuota_ia` y `devolver_cuota_ia`
--    discriminan la imagen con `p_tipo = 'imagen'` (igualdad exacta) en cuatro
--    sitios. Con `imagen_alta` esas ramas fallaban en silencio: la llamada se
--    habría contado como `solicitudes` (chat) y `uso_ia.imagenes` nunca habría
--    subido — envenenando justo la telemetría con la que se recalibran los
--    precios. Se sustituyen por `in ('imagen', 'imagen_alta')`.
--
-- ⚠️ Desplegar esta migración ANTES que las Edge Functions: con la BD vieja,
-- `costo_op('imagen_alta')` devuelve NULL y toda imagen «buena» falla con
-- motivo 'tipo'.

create or replace function public.costo_op(p_tipo text)
returns int
language sql
immutable
as $$
  select case p_tipo
    when 'chat'        then 1   -- chat de la casa (con o sin TOOLS_EDITOR)
    when 'texto'       then 1   -- apps: recetas, macros, charlas, resúmenes (≤1500 tok)
    when 'vision'      then 1   -- texto + foto de ENTRADA (la foto son ~1.6k tok de entrada)
    when 'texto_largo' then 3   -- planes IA, mapas, tarjetas, efemérides (≤4096 tok)
    when 'modelo3d'    then 10  -- Sonnet 5 + razonamiento adaptativo
    when 'imagen'      then 3   -- gpt-image-1-mini low ($0.005) — calidad rápida, principal
    when 'imagen_alta' then 10  -- Gemini 3.1 Flash Lite Image ($0.0336) — calidad buena
  end;
$$;

-- consumir_cuota_ia v6: idéntica a la v5 salvo el reconocimiento de las DOS ops
-- de imagen (antes `p_tipo = 'imagen'`).
create or replace function public.consumir_cuota_ia(p_tipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_per   text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_costo int;
  v_mes   int;
  v_extra int;
  v_fila  record;
  v_chat  int;
  v_img   int;
begin
  if v_uid is null then
    return jsonb_build_object('permitido', false, 'motivo', 'sin-sesion');
  end if;
  v_costo := costo_op(p_tipo);
  if v_costo is null then
    return jsonb_build_object('permitido', false, 'motivo', 'tipo');
  end if;
  -- Todo lo que pasa por `ia-chat` cuenta como solicitud; las imágenes no.
  v_img  := case when p_tipo in ('imagen', 'imagen_alta') then 1 else 0 end;
  v_chat := 1 - v_img;

  -- Pool mensual: SOLO con Pro vigente. Sin él queda en 0 y la llamada se paga
  -- entera con las recargas (modo local o suscripción caducada).
  select l.creditos_mes into v_mes
    from perfiles p
    join limites_plan l on l.plan = p.plan
   where p.user_id = v_uid
     and p.plan = 'pro'
     and (p.plan_expira is null or p.plan_expira > now());
  v_mes := coalesce(v_mes, 0);

  -- Intento 1: pool mensual. La primera inserción del mes no pasa por el WHERE
  -- del upsert, así que el tope se pre-valida con el guard del IF.
  if v_mes >= v_costo then
    insert into uso_ia (user_id, periodo, solicitudes, imagenes, creditos)
    values (v_uid, v_per, v_chat, v_img, v_costo)
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
     where user_id = v_uid and creditos_extra >= v_costo;
    if not found then
      return jsonb_build_object(
        'permitido', false,
        'motivo', 'cuota',
        'limite', v_mes,
        'costo', v_costo
      );
    end if;

    insert into uso_ia (user_id, periodo, solicitudes, imagenes, creditos)
    values (v_uid, v_per, v_chat, v_img, v_costo)
    on conflict (user_id, periodo) do update set
      solicitudes = uso_ia.solicitudes + v_chat,
      imagenes    = uso_ia.imagenes    + v_img,
      creditos    = uso_ia.creditos + v_costo
    returning * into v_fila;
  end if;

  select creditos_extra into v_extra from perfiles where user_id = v_uid;

  return jsonb_build_object(
    'permitido', true,
    'usadas', v_fila.creditos,
    'limite', v_mes,
    'extra', coalesce(v_extra, 0),
    'costo', v_costo
  );
end;
$$;

-- devolver_cuota_ia v6: mismo arreglo de las dos ops de imagen.
create or replace function public.devolver_cuota_ia(p_tipo text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_per     text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_costo   int  := costo_op(p_tipo);
  v_chat    int;
  v_img     int;
  v_despues int;
  v_mes     int;
begin
  if v_uid is null or v_costo is null then return; end if;
  v_img  := case when p_tipo in ('imagen', 'imagen_alta') then 1 else 0 end;
  v_chat := 1 - v_img;

  update uso_ia
     set solicitudes = greatest(solicitudes - v_chat, 0),
         imagenes    = greatest(imagenes - v_img, 0),
         creditos    = greatest(creditos - v_costo, 0)
   where user_id = v_uid and periodo = v_per
   returning creditos into v_despues;
  if v_despues is null then return; end if;

  -- Si tras devolver el contador sigue en o sobre el tope mensual, el crédito
  -- salió del pool extra → se reintegra ahí. En modo local (tope 0) SIEMPRE.
  -- Misma condición que en consumir_: si divergen, el crédito se devuelve al
  -- pool equivocado.
  select l.creditos_mes into v_mes
    from perfiles p
    join limites_plan l on l.plan = p.plan
   where p.user_id = v_uid
     and p.plan = 'pro'
     and (p.plan_expira is null or p.plan_expira > now());
  if v_despues >= coalesce(v_mes, 0) then
    update perfiles set creditos_extra = creditos_extra + v_costo
     where user_id = v_uid;
  end if;
end;
$$;

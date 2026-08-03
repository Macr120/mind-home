-- Créditos por OPERACIÓN + apertura del modo local. Dos cambios que van juntos:
--
-- 1) La tabla de costos deja de ser plana. Antes toda llamada de texto valía 1
--    crédito, diera igual un latido de 100 tokens o un plan de metas de 3000: la
--    SALIDA es lo que domina el costo (Haiku 4.5 cobra 5× la entrada) y un
--    `modelo3d` en Sonnet 5 con razonamiento vale ~10 chats, no 5 — gastar los
--    600 créditos del mes solo en 3D costaba más que el precio del plan.
--    Ancla nueva: 1 crédito = $0.005 USD de COGS (la deriva está en docs/COSTOS.md).
--
-- 2) La IA deja de exigir plan Pro. El modo local (gratis, sin suscripción)
--    compra recargas y las gasta contra `perfiles.creditos_extra`, que no
--    caducan. Sin Pro vigente el pool mensual vale 0 y la llamada se paga entera
--    con los extras; agotados, el motivo es 'cuota' (invita a recargar), ya no
--    'sin-pro'. La fila ('local', 0) de `limites_plan` ya existía desde
--    20260719000002 y sigue sirviendo: nadie con plan local tiene pool.
--
-- La firma de consumir/devolver NO cambia (`p_tipo text`): solo se amplía la
-- lista de valores aceptados, así que un proxy a medio desplegar sigue
-- funcionando con 'chat' | 'imagen' | 'modelo3d'.

-- 0) El plan sube de 600 a 700 créditos. Es la contrapartida al aumento de precio
--    (67 MXN ≈ $3.60 → $4.99): con el techo de COGS ya sellado por la tabla de
--    abajo, 700 créditos son $3.50 en el peor caso absoluto, no un cheque abierto.
update public.limites_plan set creditos_mes = 700 where plan = 'pro';

-- 1) Fuente ÚNICA de la tabla de precios. Antes el mapa estaba copiado en
--    consumir_ y en devolver_, y ya se habían desincronizado una vez.
--    NULL = operación desconocida; es también la validación de entrada.
create function public.costo_op(p_tipo text)
returns int
language sql
immutable
as $$
  select case p_tipo
    when 'chat'        then 1   -- chat de la casa (con o sin TOOLS_EDITOR)
    when 'texto'       then 1   -- apps: recetas, macros, charlas, resúmenes (≤1500 tok)
    when 'vision'      then 1   -- texto + foto de ENTRADA: la imagen a 768px son
                                -- ~1.6k tokens de ENTRADA ($1/M) y la respuesta es
                                -- corta; sale igual de barata que 'texto'. Va
                                -- aparte solo para poder medirla en uso_ia_ops.
    when 'texto_largo' then 3   -- planes IA, mapas, tarjetas, efemérides (≤4096 tok)
    when 'modelo3d'    then 10  -- Sonnet 5 + razonamiento adaptativo
    when 'imagen'      then 10  -- generación de imagen
  end;
$$;

-- 2) consumir_cuota_ia v5: costos por operación y sin gate de suscripción.
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
begin
  if v_uid is null then
    return jsonb_build_object('permitido', false, 'motivo', 'sin-sesion');
  end if;
  v_costo := costo_op(p_tipo);
  if v_costo is null then
    return jsonb_build_object('permitido', false, 'motivo', 'tipo');
  end if;
  -- Todo lo que pasa por `ia-chat` cuenta como solicitud; 'imagen' no.
  v_chat := case when p_tipo = 'imagen' then 0 else 1 end;

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

-- 3) devolver_cuota_ia v5: mismo mapa vía costo_op().
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
  v_despues int;
  v_mes     int;
begin
  if v_uid is null or v_costo is null then return; end if;
  v_chat := case when p_tipo = 'imagen' then 0 else 1 end;

  update uso_ia
     set solicitudes = greatest(solicitudes - v_chat, 0),
         imagenes    = greatest(imagenes - case when p_tipo = 'imagen' then 1 else 0 end, 0),
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

-- 4) Telemetría POR OPERACIÓN. `uso_ia` agrega todas las llamadas de texto en un
--    solo contador: no se puede distinguir un latido de un plan IA, así que la
--    tabla de precios no se podía revisar con datos reales. Esta es la que
--    responde «¿cuánto cuesta de verdad cada operación?».
create table public.uso_ia_ops (
  user_id uuid not null references auth.users (id) on delete cascade,
  periodo text not null, -- 'YYYY-MM' (UTC)
  op text not null,
  proveedor text not null default 'anthropic',
  llamadas int not null default 0,
  creditos int not null default 0,
  tokens_entrada bigint not null default 0,
  tokens_salida bigint not null default 0,
  tokens_cache_creacion bigint not null default 0,
  tokens_cache_lectura bigint not null default 0,
  primary key (user_id, periodo, op, proveedor)
);

alter table public.uso_ia_ops enable row level security;

create policy "uso por op propio: leer"
  on public.uso_ia_ops for select
  using (auth.uid() = user_id);

-- 5) registrar_uso_ia: se amplía con la operación. DROP + CREATE (no overload:
--    la llamada vieja de 5 argumentos sería ambigua con una firma de 6 y default).
--    Solo se llama tras responder el proveedor, así que `uso_ia_ops` cuenta
--    llamadas EFECTIVAS: las que fallaron ya se devolvieron.
drop function public.registrar_uso_ia(bigint, bigint, bigint, bigint, text);

create function public.registrar_uso_ia(
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
  v_uid uuid := auth.uid();
  v_per text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_gem boolean := p_proveedor = 'gemini';
  v_ent bigint := greatest(coalesce(p_entrada, 0), 0);
  v_sal bigint := greatest(coalesce(p_salida, 0), 0);
  v_cc  bigint := greatest(coalesce(p_cache_crear, 0), 0);
  v_cl  bigint := greatest(coalesce(p_cache_leer, 0), 0);
begin
  if v_uid is null then return; end if;

  update uso_ia
     set tokens_entrada = tokens_entrada + case when v_gem then 0 else v_ent end,
         tokens_salida  = tokens_salida  + case when v_gem then 0 else v_sal end,
         tokens_cache_creacion = tokens_cache_creacion + v_cc,
         tokens_cache_lectura  = tokens_cache_lectura  + v_cl,
         solicitudes_gemini = solicitudes_gemini + case when v_gem then 1 else 0 end,
         tokens_entrada_gemini = tokens_entrada_gemini + case when v_gem then v_ent else 0 end,
         tokens_salida_gemini  = tokens_salida_gemini  + case when v_gem then v_sal else 0 end
   where user_id = v_uid and periodo = v_per;

  insert into uso_ia_ops (
    user_id, periodo, op, proveedor,
    llamadas, creditos, tokens_entrada, tokens_salida,
    tokens_cache_creacion, tokens_cache_lectura
  )
  values (
    v_uid, v_per, p_tipo, p_proveedor,
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

-- El drop se llevó los privilegios de la firma vieja: re-aplicar.
revoke execute on function public.registrar_uso_ia(bigint, bigint, bigint, bigint, text, text) from anon;
revoke execute on function public.costo_op(text) from anon;

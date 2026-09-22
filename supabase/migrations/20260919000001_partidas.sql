-- Partidas: salas efímeras de multijugador (visitas y juegos), 19-sep-2026.
--
-- Una sala es un uuid con hasta 4 ranuras ('j0'..'j3'). La ranura es lo ÚNICO
-- que viaja por el canal: ningún uuid ajeno sale al cliente (misma regla que
-- `buzon/tipos.ts:1-6`). Nada de la partida se persiste: las tablas solo
-- sostienen la membresía, el aspecto del avatar y el permiso por app mientras
-- la sala vive; `partida_latido` barre las muertas de gorra.
--
-- El transporte son DOS topics privados de Realtime por sala:
--   partida:<uuid>     bajada — publica SOLO el anfitrión (veredictos, mundo, fin)
--   partida:<uuid>:u   subida — publican los miembros (pose, disparo, salir)
-- Son las PRIMERAS policies `for insert` sobre `realtime.messages` del repo.
-- Asimétricas a propósito: broadcast no firma al emisor, así que con una sola
-- policy cualquier miembro podría forjar un veredicto o un `fin`.
--
-- El roster y los cortes NO los dice un peer: los emite la BD con
-- `partida_avisar` (realtime.send no pasa por RLS de inserción, igual que
-- `buzon_avisar`). El canal solo lleva la revisión; el cliente relee con
-- `partida_estado`.
--
-- Igual que el buzón: sin `tiene_pro`. Basta con tener sesión y ser contacto
-- aceptado del anfitrión.

-- 1) Tablas (RLS activada y SIN políticas: solo las RPCs) ---------------------

create table public.partidas (
  id         uuid primary key default gen_random_uuid(),
  anfitrion  uuid not null references auth.users (id) on delete cascade,
  juego      text not null check (juego in ('visita', 'paintball', 'futbol', 'tenis', 'basquet')),
  estado     text not null default 'abierta' check (estado in ('abierta', 'jugando', 'cerrada')),
  -- SNAPSHOT de las apps que el anfitrión abrió A ESTA sala. Se copia al crear:
  -- cambiar el default después no reabre una partida viva, ni al revés.
  apps       text[] not null default '{}' check (cardinality(apps) <= 32),
  -- Versión de protocolo del cliente que creó la sala: un despliegue a medias
  -- falla con explicación en vez de producir partidas rotas.
  proto      int not null default 1,
  -- Sube con cada alta/baja/expulsión/corte. Es lo único que viaja en `sala`.
  rev        int not null default 1,
  -- Hay plano de la casa subido a partida-casa/<id>/casa.json.gz.
  casa       boolean not null default false,
  creada_en  timestamptz not null default now(),
  latido_en  timestamptz not null default now()
);

create index partidas_anfitrion on public.partidas (anfitrion, estado);
create index partidas_barrer    on public.partidas (latido_en) where estado <> 'cerrada';

alter table public.partidas enable row level security;

create table public.partida_jugadores (
  partida_id uuid not null references public.partidas (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- RANURA EFÍMERA. Lo único que viaja por el canal; se asigna bajo advisory
  -- lock para que dos `partida_entrar` simultáneos no compitan por la misma.
  jugador_id text not null check (jugador_id ~ '^j[0-3]$'),
  -- INFORMATIVO. El reparto de equipos que manda es el del ÁRBITRO y viaja en
  -- `w.js[].eq` / `fin.js[].eq`: es autoridad del mundo, no de la BD. Aquí solo
  -- queda el valor con el que se invitó, para pintar la sala antes de empezar.
  equipo     smallint not null default 0 check (equipo between 0 and 3),
  estado     text not null default 'invitado'
             check (estado in ('invitado', 'dentro', 'fuera', 'expulsado')),
  -- `Avatar` podado, sin un solo Blob. El tope lo vuelve a comprobar el cliente
  -- campo a campo contra su catálogo local antes de montar el cuerpo.
  aspecto    jsonb not null default '{}'::jsonb check (pg_column_size(aspecto) <= 4096),
  entro_en   timestamptz,
  ultimo_latido timestamptz not null default now(),
  primary key (partida_id, user_id),
  unique (partida_id, jugador_id)
);

create index partida_jugadores_mias on public.partida_jugadores (user_id, estado);

alter table public.partida_jugadores enable row level security;

-- 2) Helpers -----------------------------------------------------------------

-- El uuid de la sala a partir del topic, para las DOS direcciones
-- ('partida:<uuid>' y 'partida:<uuid>:u'). El prefijo va ANCLADO por el `like`
-- de cada policy; aquí solo se recorta. OJO: `substring(topic from 9)` a secas
-- devuelve '<uuid>:u' en la subida y el cast a uuid lo rechazaría.
create function public.partida_del_topic(p_topic text)
returns text
language sql
immutable
as $$
  select case when p_topic like 'partida:%'
              then split_part(substring(p_topic from 9), ':', 1) end
$$;

revoke execute on function public.partida_del_topic(text) from public, anon;
grant  execute on function public.partida_del_topic(text) to authenticated;

-- ¿El usuario de la sesión está dentro de esta sala? Lo consultan las policies
-- de `realtime.messages` y las de Storage. Solo responde sobre auth.uid().
-- Cast defensivo con `exception when others`, igual que `buzon_es_miembro`.
create function public.partida_es_miembro(p_partida text)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or p_partida is null then
    return false;
  end if;
  begin
    v_id := p_partida::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from partida_jugadores j
      join partidas p on p.id = j.partida_id
     where j.partida_id = v_id
       and j.user_id = v_uid
       and j.estado in ('invitado', 'dentro')
       and p.estado <> 'cerrada'
  );
end;
$$;

revoke execute on function public.partida_es_miembro(text) from public, anon;
grant  execute on function public.partida_es_miembro(text) to authenticated;

create function public.partida_es_anfitrion(p_partida text)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or p_partida is null then
    return false;
  end if;
  begin
    v_id := p_partida::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from partidas where id = v_id and anfitrion = v_uid and estado <> 'cerrada'
  );
end;
$$;

revoke execute on function public.partida_es_anfitrion(text) from public, anon;
grant  execute on function public.partida_es_anfitrion(text) to authenticated;

-- Como la anterior pero SIN mirar el estado. Es la que autoriza BORRAR el plano
-- del bucket, que hay que poder hacer justo DESPUÉS de cerrar la sala: con
-- `partida_es_anfitrion` el archivo quedaría inaccesible para siempre en cuanto
-- `estado = 'cerrada'`, y Storage no borra el objeto físico por SQL.
create function public.partida_fui_anfitrion(p_partida text)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or p_partida is null then
    return false;
  end if;
  begin
    v_id := p_partida::uuid;
  exception when others then
    return false;
  end;
  return exists (select 1 from partidas where id = v_id and anfitrion = v_uid);
end;
$$;

revoke execute on function public.partida_fui_anfitrion(text) from public, anon;
grant  execute on function public.partida_fui_anfitrion(text) to authenticated;

-- Costura de avisos de partida. Clon literal de `buzon_avisar` (:133-148):
-- blindada, porque sin Realtime la RPC no debe fallar. El evento 'partida' va
-- al canal personal del invitado (ya vivo en todo cliente con sesión) y el
-- evento 'sala' al canal de bajada de la sala.
create function public.partida_avisar(p_uid uuid, p_evento text, p_payload jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  begin
    perform realtime.send(p_payload, p_evento, 'buzon:' || p_uid::text, true);
  exception when others then
    null;
  end;
end;
$$;

revoke execute on function public.partida_avisar(uuid, text, jsonb) from public, anon, authenticated;

-- Sube `rev` y avisa a la sala por su canal de bajada. Es el único emisor de
-- `sala`: el roster, la expulsión y el corte son verdad del servidor.
create function public.partida_tocar(p_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_rev int;
begin
  update partidas set rev = rev + 1 where id = p_id returning rev into v_rev;
  if v_rev is null then
    return;
  end if;
  begin
    perform realtime.send(
      jsonb_build_object('v', 1, 'r', v_rev), 'sala', 'partida:' || p_id::text, true);
  exception when others then
    null;
  end;
end;
$$;

revoke execute on function public.partida_tocar(uuid) from public, anon, authenticated;

-- Roster serializado (sin un solo uuid ajeno). Lo comparten `partida_entrar`
-- y `partida_estado`. `p_con_retrato`: el retrato son ≤64 KB por persona y el
-- roster se relee en CADA evento `sala`; va solo en `partida_entrar` y el
-- cliente lo cachea.
create function public.partida_roster(p_id uuid, p_con_retrato boolean)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'jugador_id', j.jugador_id,
      'equipo', j.equipo,
      'estado', j.estado,
      'anfitrion', (p.anfitrion = j.user_id),
      'alias', pe.alias,
      'nombre', pe.nombre,
      'emoji', pe.emoji,
      'retrato', case when p_con_retrato then pe.retrato end,
      'aspecto', j.aspecto
    ) order by j.jugador_id), '[]'::jsonb)
    from partida_jugadores j
    join partidas p on p.id = j.partida_id
    left join perfiles pe on pe.user_id = j.user_id
   where j.partida_id = p_id and j.estado <> 'expulsado'
$$;

revoke execute on function public.partida_roster(uuid, boolean) from public, anon, authenticated;

-- 3) Policies sobre realtime.messages ----------------------------------------
-- Las PRIMERAS `for insert` del repo. Permissive: se OR-ean con las dos
-- existentes (20260823000001:14 y 20260916000001:169), que solo son `for select`
-- sobre `sync:<uid>` y `buzon:<uid>`. Cambio aditivo puro.

create policy "partida: escuchar"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'partida:%'
    and public.partida_es_miembro(public.partida_del_topic(realtime.topic()))
  );

-- BAJADA: solo el anfitrión. El `=` reconstruido rechaza cualquier sufijo
-- inventado ('partida:<uuid>:x') además del ':u' de la subida.
create policy "partida bajada: publicar (solo anfitrion)"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'partida:%'
    and realtime.topic() = 'partida:' || public.partida_del_topic(realtime.topic())
    and public.partida_es_anfitrion(public.partida_del_topic(realtime.topic()))
  );

-- SUBIDA: cualquier miembro (el anfitrión no la necesita, pero no estorba).
create policy "partida subida: publicar (miembros)"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'partida:%:u'
    and realtime.topic() = 'partida:' || public.partida_del_topic(realtime.topic()) || ':u'
    and public.partida_es_miembro(public.partida_del_topic(realtime.topic()))
  );

-- 4) RPCs de usuario ----------------------------------------------------------

-- Abre una sala. Cierra las anteriores del mismo anfitrión: una viva por cuenta.
create function public.partida_crear(p_juego text, p_apps text[], p_proto int, p_aspecto jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_apps text[] := coalesce(p_apps, '{}');
  v_app text;
  v_id uuid;
  v_vieja uuid;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if p_juego not in ('visita', 'paintball', 'futbol', 'tenis', 'basquet') then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if cardinality(v_apps) > 32 then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  foreach v_app in array v_apps loop
    if v_app !~ '^[a-z0-9_-]{2,40}$' then
      return jsonb_build_object('error', 'peticion-invalida');
    end if;
  end loop;
  if pg_column_size(coalesce(p_aspecto, '{}'::jsonb)) > 4096 then
    return jsonb_build_object('error', 'aspecto-grande');
  end if;
  -- 20 salas al mes por cuenta: es la cuota con la que se contiene la factura
  -- de Realtime (ver docs/BACKEND.md §8).
  if not consumir_rate_limit(v_uid, 'partida-crear', 20, 2592000) then
    return jsonb_build_object('error', 'limite');
  end if;

  -- Una sala viva por cuenta. Se cierran AVISANDO: sin el `partida_tocar` los
  -- invitados de la anterior se quedan con el roster viejo hasta el latido.
  for v_vieja in
    with cerradas as (
      update partidas set estado = 'cerrada'
       where anfitrion = v_uid and estado <> 'cerrada'
       returning id
    )
    select id from cerradas
  loop
    perform partida_tocar(v_vieja);
  end loop;

  insert into partidas (anfitrion, juego, apps, proto)
    values (v_uid, p_juego, v_apps, coalesce(p_proto, 1))
    returning id into v_id;
  insert into partida_jugadores (partida_id, user_id, jugador_id, equipo, estado, aspecto, entro_en)
    values (v_id, v_uid, 'j0', 0, 'dentro', coalesce(p_aspecto, '{}'::jsonb), now());

  return jsonb_build_object(
    'partida_id', v_id, 'jugador_id', 'j0', 'juego', p_juego,
    'apps', to_jsonb(v_apps), 'proto', coalesce(p_proto, 1), 'rev', 1);
end;
$$;

revoke execute on function public.partida_crear(text, text[], int, jsonb) from public, anon;
grant  execute on function public.partida_crear(text, text[], int, jsonb) to authenticated;

-- Invita por `contacto_id` (nunca por uuid). Exige contacto ACEPTADO y sala con
-- hueco. El timbre sale gratis: el canal `buzon:<uid>` ya está vivo y suscrito
-- en todo cliente con sesión (buzon/motor.ts:149-163).
create function public.partida_invitar(p_partida uuid, p_contacto uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_p partidas;
  v_c buzon_contactos;
  v_otro uuid;
  v_yo perfiles;
  v_ranura text;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select * into v_p from partidas where id = p_partida and anfitrion = v_uid and estado <> 'cerrada';
  if not found then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  select * into v_c from buzon_contactos
   where id = p_contacto and v_uid in (solicitante, destinatario) and estado = 'aceptado';
  if not found then
    return jsonb_build_object('error', 'no-contacto');
  end if;
  v_otro := case when v_c.solicitante = v_uid then v_c.destinatario else v_c.solicitante end;
  if not consumir_rate_limit(v_uid, 'partida-invitar', 60, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;

  -- MISMO lock que `partida_entrar`. Sin él, dos invitaciones simultáneas eligen
  -- la misma ranura, el `unique (partida_id, jugador_id)` hace `raise` y rompe el
  -- contrato `{error}` del repo (el cliente recibiría un 500, no un código).
  perform pg_advisory_xact_lock(hashtext('partida:' || p_partida::text));

  -- Reinvitar a quien ya estaba no consume ranura ni falla.
  select jugador_id into v_ranura from partida_jugadores
   where partida_id = p_partida and user_id = v_otro and estado <> 'expulsado';
  if v_ranura is null then
    -- La primera j1..j3 libre. NULL = no queda sitio: se devuelve el código, no
    -- se deja que reviente el `not null` de la columna.
    select 'j' || g into v_ranura from generate_series(1, 3) g
     where not exists (select 1 from partida_jugadores k
                        where k.partida_id = p_partida and k.jugador_id = 'j' || g)
     order by g limit 1;
    if v_ranura is null then
      return jsonb_build_object('error', 'sala-llena');
    end if;
    insert into partida_jugadores (partida_id, user_id, jugador_id, equipo, estado)
      values (p_partida, v_otro, v_ranura, 1, 'invitado');
  end if;

  select * into v_yo from perfiles where user_id = v_uid;
  perform partida_avisar(v_otro, 'invitacion', jsonb_build_object(
    'partida_id', p_partida, 'juego', v_p.juego, 'proto', v_p.proto,
    'apps', to_jsonb(v_p.apps), 'casa', v_p.casa,
    'alias', v_yo.alias, 'nombre', v_yo.nombre, 'emoji', v_yo.emoji, 'retrato', v_yo.retrato));
  perform partida_tocar(p_partida);
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.partida_invitar(uuid, uuid) from public, anon;
grant  execute on function public.partida_invitar(uuid, uuid) to authenticated;

-- Entrar. ÚNICO sitio donde el cliente aprende su ranura y las de los demás.
-- La asignación va bajo advisory lock de transacción: dos entradas simultáneas
-- no compiten por la misma ranura.
create function public.partida_entrar(p_partida uuid, p_aspecto jsonb, p_proto int)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_p partidas;
  v_j partida_jugadores;
  v_ranura text;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if pg_column_size(coalesce(p_aspecto, '{}'::jsonb)) > 4096 then
    return jsonb_build_object('error', 'aspecto-grande');
  end if;
  if not consumir_rate_limit(v_uid, 'partida-entrar', 60, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;
  select * into v_p from partidas where id = p_partida and estado <> 'cerrada';
  if not found then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  if v_p.proto <> coalesce(p_proto, 1) then
    return jsonb_build_object('error', 'version');
  end if;

  perform pg_advisory_xact_lock(hashtext('partida:' || p_partida::text));

  select * into v_j from partida_jugadores where partida_id = p_partida and user_id = v_uid;
  if not found then
    return jsonb_build_object('error', 'no-invitado');
  end if;
  if v_j.estado = 'expulsado' then
    return jsonb_build_object('error', 'expulsado');
  end if;
  v_ranura := v_j.jugador_id;

  update partida_jugadores
     set estado = 'dentro', aspecto = coalesce(p_aspecto, '{}'::jsonb),
         entro_en = coalesce(entro_en, now()), ultimo_latido = now()
   where partida_id = p_partida and user_id = v_uid;

  perform partida_tocar(p_partida);
  return jsonb_build_object(
    'partida_id', p_partida, 'jugador_id', v_ranura, 'juego', v_p.juego,
    'anfitrion', (v_p.anfitrion = v_uid), 'apps', to_jsonb(v_p.apps),
    'casa', v_p.casa, 'proto', v_p.proto, 'rev', v_p.rev,
    'jugadores', partida_roster(p_partida, true));
end;
$$;

revoke execute on function public.partida_entrar(uuid, jsonb, int) from public, anon;
grant  execute on function public.partida_entrar(uuid, jsonb, int) to authenticated;

-- Re-sync del roster tras el evento `sala` y tras cada SUBSCRIBED.
create function public.partida_estado(p_partida uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_p partidas;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if not partida_es_miembro(p_partida::text) then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  select * into v_p from partidas where id = p_partida;
  return jsonb_build_object(
    'partida_id', v_p.id, 'juego', v_p.juego, 'estado', v_p.estado,
    'anfitrion', (v_p.anfitrion = v_uid), 'apps', to_jsonb(v_p.apps),
    'casa', v_p.casa, 'proto', v_p.proto, 'rev', v_p.rev,
    'jugadores', partida_roster(v_p.id, false));
end;
$$;

revoke execute on function public.partida_estado(uuid) from public, anon;
grant  execute on function public.partida_estado(uuid) to authenticated;

-- Cambiar de juego SIN rehacer la sala. El flujo real es «te invito a mi casa
-- (visita) → caminamos a la cancha → jugamos → volvemos a pasear»: sin esto
-- habría que crear una sala nueva por cada partido y volver a invitar (y gastar
-- otra unidad de la cuota `partida-crear`).
create function public.partida_cambiar_juego(p_partida uuid, p_juego text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if p_juego not in ('visita', 'paintball', 'futbol', 'tenis', 'basquet') then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  update partidas
     set juego = p_juego,
         estado = case when p_juego = 'visita' then 'abierta' else 'jugando' end
   where id = p_partida and anfitrion = v_uid and estado <> 'cerrada';
  if not found then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  -- `rev + 1` + aviso: los invitados releen con `partida_estado` y cambian de
  -- motor. Los EQUIPOS no se tocan aquí: los reparte el árbitro y viajan en `w`.
  perform partida_tocar(p_partida);
  return jsonb_build_object('ok', true, 'juego', p_juego);
end;
$$;

revoke execute on function public.partida_cambiar_juego(uuid, text) from public, anon;
grant  execute on function public.partida_cambiar_juego(uuid, text) to authenticated;

-- Salir. El anfitrión cierra la sala; un invitado solo se retira a sí mismo.
create function public.partida_salir(p_partida uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_p partidas;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select * into v_p from partidas where id = p_partida;
  if not found then
    return jsonb_build_object('ok', true);
  end if;
  if v_p.anfitrion = v_uid then
    update partidas set estado = 'cerrada' where id = p_partida;
  else
    update partida_jugadores set estado = 'fuera'
     where partida_id = p_partida and user_id = v_uid;
  end if;
  perform partida_tocar(p_partida);
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.partida_salir(uuid) from public, anon;
grant  execute on function public.partida_salir(uuid) to authenticated;

-- Expulsar SIEMPRE por ranura, nunca por uuid.
create function public.partida_expulsar(p_partida uuid, p_jugador text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if p_jugador !~ '^j[0-3]$' then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if not exists (select 1 from partidas where id = p_partida and anfitrion = v_uid) then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  update partida_jugadores set estado = 'expulsado'
   where partida_id = p_partida and jugador_id = p_jugador and user_id <> v_uid;
  perform partida_tocar(p_partida);
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.partida_expulsar(uuid, text) from public, anon;
grant  execute on function public.partida_expulsar(uuid, text) to authenticated;

-- Latido (1/60 s) + GC de gorra: sin cron ni Edge Function.
--
-- NO borra objetos de Storage: `delete from storage.objects` tira la FILA y deja
-- el archivo físico huérfano. El plano lo borra el ANFITRIÓN por la API de
-- Storage antes de `partida_salir`, y a mejor esfuerzo el de su sala anterior al
-- crear una nueva. Los huérfanos por caída quedan acotados (≤4 MB por sala); si
-- alguna vez pesan, se limpian con el precedente de cron
-- `20260908000001_redes_mantenimiento_cron.sql`.
create function public.partida_latido(p_partida uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n int;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  update partida_jugadores set ultimo_latido = now()
   where partida_id = p_partida and user_id = v_uid;
  update partidas set latido_en = now()
   where id = p_partida and anfitrion = v_uid and estado <> 'cerrada';

  -- El hueco del desconectado se reserva 30 s en la escena; a los 5 minutos sin
  -- latido la BD lo da por ido y avisa, para que el roster no mienta.
  update partida_jugadores set estado = 'fuera'
   where partida_id = p_partida and estado = 'dentro'
     and ultimo_latido < now() - interval '5 minutes';
  get diagnostics v_n = row_count;
  if v_n > 0 then
    perform partida_tocar(p_partida);
  end if;

  update partidas set estado = 'cerrada'
   where estado <> 'cerrada' and latido_en < now() - interval '5 minutes';
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.partida_latido(uuid) from public, anon;
grant  execute on function public.partida_latido(uuid) to authenticated;

-- Marca la sala como «con plano»: el anfitrión lo llama tras subir el objeto.
create function public.partida_marcar_casa(p_partida uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  update partidas set casa = true
   where id = p_partida and anfitrion = v_uid and estado <> 'cerrada';
  if not found then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  perform partida_tocar(p_partida);
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.partida_marcar_casa(uuid) from public, anon;
grant  execute on function public.partida_marcar_casa(uuid) to authenticated;

-- 5) Corte por bloqueo / eliminación de contacto ------------------------------

-- Bloquear o eliminar a alguien lo saca de tu casa AHORA, no cuando cuelgue.
-- Interna: la llaman `buzon_bloquear` y `buzon_eliminar`, que son definer.
create function public.partida_cortar_con(p_a uuid, p_b uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  for v_id in
    select p.id from partidas p
     where p.estado <> 'cerrada'
       and exists (select 1 from partida_jugadores j
                    where j.partida_id = p.id and j.user_id = p_a and j.estado <> 'expulsado')
       and exists (select 1 from partida_jugadores j
                    where j.partida_id = p.id and j.user_id = p_b and j.estado <> 'expulsado')
  loop
    -- Si uno de los dos es el anfitrión, la sala entera se cierra; si no, sale
    -- el invitado (el que no es anfitrión de esa sala).
    if exists (select 1 from partidas where id = v_id and anfitrion in (p_a, p_b)) then
      update partidas set estado = 'cerrada' where id = v_id;
    else
      update partida_jugadores set estado = 'expulsado'
       where partida_id = v_id and user_id in (p_a, p_b);
    end if;
    perform partida_tocar(v_id);
  end loop;
end;
$$;

revoke execute on function public.partida_cortar_con(uuid, uuid) from public, anon, authenticated;

-- `create or replace` de las dos RPCs del buzón: MISMO cuerpo que
-- 20260916000001_buzon.sql:405-434 y :442-464, con el corte añadido antes del
-- aviso. Los grants no se pierden con `create or replace`; se repiten por
-- claridad, como en el resto del repo.
create or replace function public.buzon_bloquear(p_contacto uuid, p_bloquear boolean)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_c buzon_contactos;
  v_otro uuid;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select * into v_c from buzon_contactos where id = p_contacto and v_uid in (solicitante, destinatario);
  if not found then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  v_otro := case when v_c.solicitante = v_uid then v_c.destinatario else v_c.solicitante end;
  if p_bloquear then
    update buzon_contactos set estado = 'bloqueado', bloqueado_por = v_uid, actualizado_en = now() where id = v_c.id;
    -- Bloquear saca al otro de tus partidas AHORA.
    perform partida_cortar_con(v_uid, v_otro);
  else
    if v_c.estado <> 'bloqueado' or v_c.bloqueado_por <> v_uid then
      return jsonb_build_object('error', 'no-encontrado');
    end if;
    if exists (select 1 from buzon_hilos where contacto_id = v_c.id) then
      update buzon_contactos set estado = 'aceptado', bloqueado_por = null, actualizado_en = now() where id = v_c.id;
    else
      delete from buzon_contactos where id = v_c.id;
    end if;
  end if;
  perform buzon_avisar(v_otro, 'contactos', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.buzon_bloquear(uuid, boolean) from public, anon;
grant  execute on function public.buzon_bloquear(uuid, boolean) to authenticated;

create or replace function public.buzon_eliminar(p_contacto uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_c buzon_contactos;
  v_otro uuid;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select * into v_c from buzon_contactos where id = p_contacto and v_uid in (solicitante, destinatario);
  if not found then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  v_otro := case when v_c.solicitante = v_uid then v_c.destinatario else v_c.solicitante end;
  -- Antes del delete: después ya no hay vínculo que consultar.
  perform partida_cortar_con(v_uid, v_otro);
  delete from buzon_contactos where id = v_c.id;
  perform buzon_avisar(v_otro, 'contactos', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.buzon_eliminar(uuid) from public, anon;
grant  execute on function public.buzon_eliminar(uuid) to authenticated;

-- 6) Storage: bucket privado del plano de la casa ------------------------------
-- Ruta: <partida_id>/casa.json.gz. Lo sube el anfitrión, lo leen los miembros.
-- Sin `tiene_pro`: visitar es gratis, como el buzón. Sin `update`: si hay que
-- rehacer el plano se borra y se vuelve a subir.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partida-casa', 'partida-casa', false, 4194304, array['application/gzip'])
on conflict (id) do nothing;

create policy "partida-casa: leer de la sala"
  on storage.objects for select to authenticated
  using (bucket_id = 'partida-casa' and public.partida_es_miembro((storage.foldername(name))[1]));

create policy "partida-casa: subir (solo anfitrion)"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'partida-casa' and public.partida_es_anfitrion((storage.foldername(name))[1]));

-- Sin condición de estado (`partida_fui_anfitrion`): borrar el plano es lo que
-- se hace JUSTO al terminar, y con `partida_es_anfitrion` el archivo quedaría
-- inaccesible para siempre en cuanto la sala pasa a 'cerrada'.
create policy "partida-casa: borrar (solo anfitrion)"
  on storage.objects for delete to authenticated
  using (bucket_id = 'partida-casa' and public.partida_fui_anfitrion((storage.foldername(name))[1]));

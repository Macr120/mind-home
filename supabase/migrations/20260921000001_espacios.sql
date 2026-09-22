-- Espacios compartidos: calendarios cooperativos y Studio por enlace, 21-sep-2026.
--
-- Un «espacio» es la UNIDAD de cosas compartidas. Cinco tipos sobre el mismo
-- cimiento: 'calendario' (filas de evento), 'documento' (updates de Yjs),
-- 'dibujo' (operaciones de trazo), 'audio' y 'video' (proyecto entero bajo
-- bloqueo por turnos). Lo que cambia por tipo es el CONTENIDO de `datos`, no la
-- mecánica: log de cambios con `seq` + snapshot compactable.
--
-- Roles: `dueno` (invita, rota enlaces, cambia roles, expulsa y borra), `editor`
-- (publica cambios y snapshots, toma el turno) y `lector` (solo lee). El rol
-- NUNCA se degrada al entrar por un enlace: un editor que abre el enlace de ver
-- sigue siendo editor.
--
-- DOS enlaces por espacio (`token_ver` / `token_editar`), de 24 caracteres
-- base64url, revocables por separado (`enlace_ver` / `enlace_editar`) y
-- regenerables. Entrar EXIGE sesión: no hay edición anónima. Los enlaces no
-- dependen del buzón; `espacio_invitar` sí (contacto aceptado), porque toca el
-- timbre por el canal `buzon:<uid>` que ya está vivo en todo cliente.
--
-- UN SOLO topic privado de Realtime por espacio: `espacio:<uuid>`. La BD emite
-- `cambio|miembros|meta|bloqueo|borrado` con `espacio_avisar` (realtime.send no
-- pasa por RLS de inserción, igual que `buzon_avisar`); los clientes EDITORES
-- publican los eventos efímeros de coedición (`yjs|aw|sv|trazo|presencia`). No
-- hacen falta dos topics como en `partidas` porque aquí no hay árbitro: la
-- autoridad durable es el log, y el log solo se escribe por RPC.
--
-- Ningún uuid ajeno sale al cliente: los miembros viajan por `miembro_id`
-- opaco ('m' + 12 hex), misma regla que la ranura de `partidas` y que
-- `contacto_id`/`hilo_id` del buzón. `autor` en el log es un `miembro_id`.
--
-- Disciplina del repo: tablas con RLS activada y CERO policies (todo por RPCs
-- `security definer set search_path = public` con `auth.uid()`), contrato
-- `{error:'<codigo>'}` y nunca `raise` en los caminos esperables, `revoke …
-- from public, anon` + `grant … to authenticated` en las RPCs de usuario y sin
-- grant en las internas (ver config.toml).
--
-- Sin `tiene_pro`: basta con tener sesión, como el buzón y las partidas.

-- 0) pgcrypto para los tokens --------------------------------------------------
-- Primera migración del repo que la pide. En Supabase suele venir ya instalada
-- en `extensions`; el `if not exists` la deja como esté. Con
-- `set search_path = public` hay que llamarla calificada: `extensions.…`.

create extension if not exists pgcrypto with schema extensions;

-- 1) Tablas (RLS activada y SIN políticas: solo las RPCs) ---------------------

-- Token de enlace: 18 bytes → 24 caracteres base64 SIN relleno, traducido a
-- base64url para que quepa tal cual en la URL (`?espacio=<token>`). Va ANTES de
-- la tabla porque es su DEFAULT.
create function public.espacio_token()
returns text
language plpgsql
security definer set search_path = public
as $$
begin
  return translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
end;
$$;

-- Identidad opaca del miembro dentro de UN espacio. No es global: la misma
-- persona tiene un `miembro_id` distinto en cada espacio.
create function public.espacio_miembro_id()
returns text
language plpgsql
security definer set search_path = public
as $$
begin
  return 'm' || encode(extensions.gen_random_bytes(6), 'hex');
end;
$$;

create table public.espacios (
  id            uuid primary key default gen_random_uuid(),
  dueno         uuid not null references auth.users (id) on delete cascade,
  tipo          text not null check (tipo in ('calendario', 'documento', 'dibujo', 'audio', 'video')),
  titulo        text not null default '' check (char_length(titulo) <= 80),
  -- Ajustes del tipo (p. ej. `color` del calendario). Nada de contenido.
  meta          jsonb not null default '{}'::jsonb check (pg_column_size(meta) <= 2048),
  -- Versión de protocolo del cliente que creó el espacio: un despliegue a
  -- medias falla con explicación en vez de corromper el log.
  proto         int not null default 1,
  token_ver     text not null unique default public.espacio_token(),
  token_editar  text not null unique default public.espacio_token(),
  enlace_ver    boolean not null default true,
  enlace_editar boolean not null default true,
  -- Reloj del log. Lo mueve SOLO `espacio_push`, bajo advisory lock.
  seq           bigint not null default 0,
  -- Estado compactado hasta `snapshot_seq`. 2 MB: un Y.Doc de un documento
  -- largo o el índice de capas de un dibujo (los PNG van al bucket).
  snapshot      jsonb check (snapshot is null or pg_column_size(snapshot) <= 2097152),
  snapshot_seq  bigint not null default 0,
  snapshot_en   timestamptz,
  -- Turno de audio/video: arriendo de 5 min que se renueva; vencido, cualquiera
  -- puede tomarlo (sin cron: lo resuelve la comparación con now()).
  bloqueo_por   uuid references auth.users (id) on delete set null,
  bloqueo_hasta timestamptz,
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index espacios_dueno on public.espacios (dueno);

alter table public.espacios enable row level security;

create table public.espacio_miembros (
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- LO ÚNICO que sale al cliente para identificar a alguien.
  miembro_id text not null check (miembro_id ~ '^m[0-9a-f]{12}$'),
  rol        text not null check (rol in ('dueno', 'editor', 'lector')),
  -- 'fuera' = se salió (puede volver por el enlace); 'expulsado' = no vuelve.
  estado     text not null default 'activo' check (estado in ('activo', 'fuera', 'expulsado')),
  entro_en   timestamptz not null default now(),
  primary key (espacio_id, user_id),
  unique (espacio_id, miembro_id)
);

create index espacio_miembros_mios on public.espacio_miembros (user_id, estado);

alter table public.espacio_miembros enable row level security;

create table public.espacio_cambios (
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  seq        bigint not null,
  -- Lo genera el cliente: un reintento tras perder red no duplica.
  uid        text not null check (uid ~ '^[0-9a-zA-Z_-]{8,40}$'),
  -- `miembro_id` del autor, nunca su uuid.
  autor      text not null,
  tipo       text not null check (tipo ~ '^[a-z]{2,16}$'),
  datos      jsonb not null check (pg_column_size(datos) <= 65536),
  creado_en  timestamptz not null default now(),
  primary key (espacio_id, seq),
  unique (espacio_id, uid)
);

alter table public.espacio_cambios enable row level security;

-- 2) Helpers -----------------------------------------------------------------

-- El uuid del espacio a partir del topic. Un solo formato ('espacio:<uuid>'),
-- así que basta recortar; devuelve '' si el prefijo no cuadra para que el cast
-- de `espacio_es_miembro` falle limpio. Calcado de `partida_del_topic`.
create function public.espacio_del_topic(p_topic text)
returns text
language sql
immutable
as $$
  select case when p_topic like 'espacio:%' then substring(p_topic from 9) else '' end
$$;

-- ¿El usuario de la sesión es miembro ACTIVO? Lo consultan las policies de
-- `realtime.messages` y las de Storage. Solo responde sobre auth.uid().
-- Cast defensivo con `exception when others`, igual que `partida_es_miembro`.
create function public.espacio_es_miembro(p_espacio text)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or p_espacio is null then
    return false;
  end if;
  begin
    v_id := p_espacio::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from espacio_miembros
     where espacio_id = v_id and user_id = v_uid and estado = 'activo'
  );
end;
$$;

-- Como la anterior + rol de escritura. Autoriza publicar en el topic y escribir
-- en el bucket: un lector puede escuchar la coedición pero no meter ruido.
create function public.espacio_puede_editar(p_espacio text)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or p_espacio is null then
    return false;
  end if;
  begin
    v_id := p_espacio::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from espacio_miembros
     where espacio_id = v_id and user_id = v_uid and estado = 'activo'
       and rol in ('dueno', 'editor')
  );
end;
$$;

-- Costura de avisos del espacio. Clon literal de `buzon_avisar`/`partida_avisar`:
-- blindada, porque sin Realtime la RPC no debe fallar.
create function public.espacio_avisar(p_id uuid, p_evento text, p_payload jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  begin
    perform realtime.send(p_payload, p_evento, 'espacio:' || p_id::text, true);
  exception when others then
    null;
  end;
end;
$$;

-- Lista de miembros serializada (sin un solo uuid ajeno). `p_con_retrato`: el
-- retrato son ≤64 KB por persona y la lista se relee en CADA evento `miembros`;
-- va solo donde el cliente la cachea. Los expulsados no aparecen.
create function public.espacio_miembros_json(p_id uuid, p_uid uuid, p_con_retrato boolean)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'miembro_id', m.miembro_id,
      'rol', m.rol,
      'estado', m.estado,
      'alias', pe.alias,
      'nombre', pe.nombre,
      'emoji', pe.emoji,
      'retrato', case when p_con_retrato then pe.retrato end,
      'yo', (m.user_id = p_uid)
    ) order by (case when m.rol = 'dueno' then 0 else 1 end), m.entro_en), '[]'::jsonb)
    from espacio_miembros m
    left join perfiles pe on pe.user_id = m.user_id
   where m.espacio_id = p_id and m.estado <> 'expulsado'
$$;

-- Ficha del espacio TAL COMO la ve `p_uid`. Los tokens SOLO para el dueño: es
-- la razón de que el resumen se calcule aquí y no en el cliente.
create function public.espacio_resumen(p_id uuid, p_uid uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_e espacios;
  v_rol text;
  v_yo text;
  v_alias text;
  v_bloqueo_por text;
  v_n int;
  v_out jsonb;
begin
  select * into v_e from espacios where id = p_id;
  if not found then
    return null;
  end if;
  select m.rol, m.miembro_id into v_rol, v_yo
    from espacio_miembros m where m.espacio_id = p_id and m.user_id = p_uid;
  select pe.alias into v_alias from perfiles pe where pe.user_id = v_e.dueno;
  -- Un arriendo vencido es lo mismo que no tener bloqueo (no hay cron que lo
  -- limpie): se resuelve aquí, al leer.
  if v_e.bloqueo_por is not null and v_e.bloqueo_hasta is not null
     and v_e.bloqueo_hasta > now() then
    select m.miembro_id into v_bloqueo_por
      from espacio_miembros m where m.espacio_id = p_id and m.user_id = v_e.bloqueo_por;
  end if;
  select count(*) into v_n
    from espacio_miembros m where m.espacio_id = p_id and m.estado = 'activo';

  v_out := jsonb_build_object(
    'espacio_id', v_e.id,
    'tipo', v_e.tipo,
    'titulo', v_e.titulo,
    'meta', v_e.meta,
    'proto', v_e.proto,
    'rol', v_rol,
    'yo', v_yo,
    'dueno_alias', v_alias,
    'seq', v_e.seq,
    'snapshot_seq', v_e.snapshot_seq,
    'bloqueo', case when v_bloqueo_por is null then null::jsonb
                    else jsonb_build_object('por', v_bloqueo_por, 'hasta', v_e.bloqueo_hasta) end,
    'n_miembros', v_n,
    'creado_en', v_e.creado_en,
    'actualizado_en', v_e.actualizado_en);

  if v_e.dueno = p_uid then
    v_out := v_out || jsonb_build_object(
      'token_ver', v_e.token_ver,
      'token_editar', v_e.token_editar,
      'enlace_ver', v_e.enlace_ver,
      'enlace_editar', v_e.enlace_editar);
  end if;
  return v_out;
end;
$$;

-- 3) Policies sobre realtime.messages ----------------------------------------
-- Permissive y aditivas: se OR-ean con las de 20260823000001 (sync),
-- 20260916000001 (buzón) y 20260919000001 (partidas). Un solo topic por
-- espacio: aquí no hacen falta las dos direcciones de `partidas` porque no hay
-- árbitro —lo durable es el log, y el log solo se escribe por RPC—. El insert
-- reconstruye el topic con `=` (cinturón: un sufijo inventado como
-- 'espacio:<uuid>:x' ya lo tumba el cast a uuid de `espacio_puede_editar`).

create policy "espacio: escuchar"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'espacio:%'
    and public.espacio_es_miembro(public.espacio_del_topic(realtime.topic()))
  );

create policy "espacio: publicar (editores)"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'espacio:%'
    and realtime.topic() = 'espacio:' || public.espacio_del_topic(realtime.topic())
    and public.espacio_puede_editar(public.espacio_del_topic(realtime.topic()))
  );

-- 4) RPCs de usuario ----------------------------------------------------------
-- Códigos de error: sin-sesion, peticion-invalida, limite, no-encontrado,
-- no-contacto, sin-permiso, expulsado, enlace-inactivo, bloqueado, es-dueno,
-- cambio-grande, snapshot-grande, version.

-- Crea el espacio y mete a su dueño como primer miembro.
create function public.espacio_crear(p_tipo text, p_titulo text, p_meta jsonb, p_proto int)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_titulo text := coalesce(p_titulo, '');
  v_meta jsonb := coalesce(p_meta, '{}'::jsonb);
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if p_tipo not in ('calendario', 'documento', 'dibujo', 'audio', 'video') then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if char_length(v_titulo) > 80 then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if pg_column_size(v_meta) > 2048 then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  -- 50 espacios al día por cuenta: suficiente para cualquier uso humano y
  -- techo contra el abuso automatizado (ver docs/BACKEND.md §9).
  if not consumir_rate_limit(v_uid, 'espacio-crear', 50, 86400) then
    return jsonb_build_object('error', 'limite');
  end if;

  insert into espacios (dueno, tipo, titulo, meta, proto)
    values (v_uid, p_tipo, v_titulo, v_meta, coalesce(p_proto, 1))
    returning id into v_id;
  insert into espacio_miembros (espacio_id, user_id, miembro_id, rol)
    values (v_id, v_uid, espacio_miembro_id(), 'dueno');

  return jsonb_build_object('espacio', espacio_resumen(v_id, v_uid));
end;
$$;

-- Mis espacios (los que sigo activo), lo primero que pide el cliente al
-- arrancar. El orden es el de la lista: lo último tocado, arriba.
create function public.espacio_listar()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select coalesce(jsonb_agg(espacio_resumen(e.id, v_uid) order by e.actualizado_en desc), '[]'::jsonb)
    into v_rows
    from espacios e
    join espacio_miembros m on m.espacio_id = e.id and m.user_id = v_uid
   where m.estado = 'activo';
  return jsonb_build_object('espacios', v_rows);
end;
$$;

-- Re-sync tras el evento `miembros`/`meta`/`bloqueo` y tras cada SUBSCRIBED.
-- No distingue «no existe» de «no eres miembro»: los dos son `no-encontrado`.
create function public.espacio_estado(p_id uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if not exists (select 1 from espacio_miembros
                  where espacio_id = p_id and user_id = v_uid and estado = 'activo') then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  return jsonb_build_object(
    'espacio', espacio_resumen(p_id, v_uid),
    'miembros', espacio_miembros_json(p_id, v_uid, true));
end;
$$;

-- Título y ajustes del tipo. Solo el dueño. Un parámetro en null NO borra el
-- valor: significa «no lo toques».
create function public.espacio_editar(p_id uuid, p_titulo text, p_meta jsonb)
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
  if p_titulo is not null and char_length(p_titulo) > 80 then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if p_meta is not null and pg_column_size(p_meta) > 2048 then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  update espacios
     set titulo = coalesce(p_titulo, titulo),
         meta = coalesce(p_meta, meta),
         actualizado_en = now()
   where id = p_id and dueno = v_uid;
  if not found then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  perform espacio_avisar(p_id, 'meta', jsonb_build_object('v', 1));
  return jsonb_build_object('ok', true);
end;
$$;

-- Entrar por enlace. El token dice el rol de ENTRADA; el rol que ya se tenía
-- nunca baja (un editor que abre el enlace de ver sigue editor) pero sí sube.
create function public.espacio_entrar(p_token text, p_proto int)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_e espacios;
  v_m espacio_miembros;
  v_rol_enlace text;
  v_enlace boolean;
  v_rol text;
  v_yo text;
  v_cambio boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{24}$' then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if not consumir_rate_limit(v_uid, 'espacio-entrar', 60, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;

  select * into v_e from espacios where token_editar = p_token;
  if found then
    v_rol_enlace := 'editor';
    v_enlace := v_e.enlace_editar;
  else
    select * into v_e from espacios where token_ver = p_token;
    if not found then
      return jsonb_build_object('error', 'no-encontrado');
    end if;
    v_rol_enlace := 'lector';
    v_enlace := v_e.enlace_ver;
  end if;
  if not v_enlace then
    return jsonb_build_object('error', 'enlace-inactivo');
  end if;
  if v_e.proto <> coalesce(p_proto, 1) then
    return jsonb_build_object('error', 'version');
  end if;

  -- Mismo lock que `espacio_push`/`espacio_invitar`: dos entradas simultáneas
  -- no pueden crear dos filas ni chocar contra `unique (espacio_id, miembro_id)`
  -- (un `raise` rompería el contrato `{error}` del repo).
  perform pg_advisory_xact_lock(hashtext('espacio:' || v_e.id::text));

  select * into v_m from espacio_miembros where espacio_id = v_e.id and user_id = v_uid;
  if found then
    if v_m.estado = 'expulsado' then
      return jsonb_build_object('error', 'expulsado');
    end if;
    v_yo := v_m.miembro_id;
    v_rol := case when v_m.rol in ('dueno', 'editor') then v_m.rol else v_rol_enlace end;
    if v_m.estado <> 'activo' or v_rol <> v_m.rol then
      update espacio_miembros set estado = 'activo', rol = v_rol
       where espacio_id = v_e.id and user_id = v_uid;
      v_cambio := true;
    end if;
  else
    v_yo := espacio_miembro_id();
    insert into espacio_miembros (espacio_id, user_id, miembro_id, rol)
      values (v_e.id, v_uid, v_yo, v_rol_enlace);
    v_cambio := true;
  end if;

  if v_cambio then
    perform espacio_avisar(v_e.id, 'miembros', jsonb_build_object('v', 1));
  end if;
  return jsonb_build_object(
    'espacio', espacio_resumen(v_e.id, v_uid),
    'miembros', espacio_miembros_json(v_e.id, v_uid, true));
end;
$$;

-- Invita por `contacto_id` (nunca por uuid), como `partida_invitar`. Exige
-- contacto ACEPTADO: el timbre sale gratis por el canal `buzon:<uid>`, que ya
-- está vivo y suscrito en todo cliente con sesión.
create function public.espacio_invitar(p_id uuid, p_contacto uuid, p_rol text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_e espacios;
  v_c buzon_contactos;
  v_otro uuid;
  v_yo perfiles;
  v_mid text;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select * into v_e from espacios where id = p_id and dueno = v_uid;
  if not found then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  if p_rol not in ('editor', 'lector') then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  select * into v_c from buzon_contactos
   where id = p_contacto and v_uid in (solicitante, destinatario) and estado = 'aceptado';
  if not found then
    return jsonb_build_object('error', 'no-contacto');
  end if;
  v_otro := case when v_c.solicitante = v_uid then v_c.destinatario else v_c.solicitante end;
  if not consumir_rate_limit(v_uid, 'espacio-invitar', 60, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;

  perform pg_advisory_xact_lock(hashtext('espacio:' || p_id::text));

  -- Invitar READMITE: si estaba 'fuera' o 'expulsado' vuelve a 'activo' con el
  -- rol dado. `v_otro` nunca es el dueño (un contacto no se hace consigo mismo).
  select miembro_id into v_mid from espacio_miembros
   where espacio_id = p_id and user_id = v_otro;
  if v_mid is null then
    v_mid := espacio_miembro_id();
    insert into espacio_miembros (espacio_id, user_id, miembro_id, rol)
      values (p_id, v_otro, v_mid, p_rol);
  else
    update espacio_miembros set estado = 'activo', rol = p_rol
     where espacio_id = p_id and user_id = v_otro;
  end if;

  select * into v_yo from perfiles where user_id = v_uid;
  perform buzon_avisar(v_otro, 'espacio', jsonb_build_object(
    'espacio_id', p_id, 'tipo', v_e.tipo, 'titulo', v_e.titulo, 'rol', p_rol,
    'alias', v_yo.alias, 'nombre', v_yo.nombre, 'emoji', v_yo.emoji));
  perform espacio_avisar(p_id, 'miembros', jsonb_build_object('v', 1));
  return jsonb_build_object('ok', true, 'miembro_id', v_mid);
end;
$$;

-- Regenera SIEMPRE el token del enlace elegido y fija si está activo: «revocar»
-- y «regenerar» son la misma operación, así nadie se queda con el enlace viejo.
create function public.espacio_rotar_enlace(p_id uuid, p_cual text, p_activo boolean)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_e espacios;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if p_cual not in ('ver', 'editar') then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if not exists (select 1 from espacios where id = p_id and dueno = v_uid) then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  if not consumir_rate_limit(v_uid, 'espacio-rotar', 20, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;

  if p_cual = 'ver' then
    update espacios
       set token_ver = espacio_token(), enlace_ver = coalesce(p_activo, true)
     where id = p_id and dueno = v_uid
     returning * into v_e;
  else
    update espacios
       set token_editar = espacio_token(), enlace_editar = coalesce(p_activo, true)
     where id = p_id and dueno = v_uid
     returning * into v_e;
  end if;
  return jsonb_build_object(
    'token_ver', v_e.token_ver, 'token_editar', v_e.token_editar,
    'enlace_ver', v_e.enlace_ver, 'enlace_editar', v_e.enlace_editar);
end;
$$;

-- Cambia el rol de un miembro. SIEMPRE por `miembro_id`, nunca por uuid.
create function public.espacio_rol(p_id uuid, p_miembro text, p_rol text)
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
  if p_rol not in ('editor', 'lector') then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if not exists (select 1 from espacios where id = p_id and dueno = v_uid) then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  update espacio_miembros set rol = p_rol
   where espacio_id = p_id and miembro_id = p_miembro and rol <> 'dueno';
  if not found then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  perform espacio_avisar(p_id, 'miembros', jsonb_build_object('v', 1));
  return jsonb_build_object('ok', true);
end;
$$;

-- Quitar a alguien: no vuelve ni con el enlace (solo readmite `espacio_invitar`).
create function public.espacio_expulsar(p_id uuid, p_miembro text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_otro uuid;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if not exists (select 1 from espacios where id = p_id and dueno = v_uid) then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  select user_id into v_otro from espacio_miembros
   where espacio_id = p_id and miembro_id = p_miembro and rol <> 'dueno';
  if v_otro is null then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  update espacio_miembros set estado = 'expulsado'
   where espacio_id = p_id and user_id = v_otro;

  -- Si se va con el turno en la mano, el espacio quedaría bloqueado 5 minutos.
  update espacios set bloqueo_por = null, bloqueo_hasta = null
   where id = p_id and bloqueo_por = v_otro;
  if found then
    perform espacio_avisar(p_id, 'bloqueo',
      jsonb_build_object('v', 1, 'por', null, 'hasta', null));
  end if;

  perform espacio_avisar(p_id, 'miembros', jsonb_build_object('v', 1));
  return jsonb_build_object('ok', true);
end;
$$;

-- Salirse. El dueño no puede: para deshacerse del espacio, `espacio_borrar`.
create function public.espacio_salir(p_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_m espacio_miembros;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select * into v_m from espacio_miembros
   where espacio_id = p_id and user_id = v_uid and estado = 'activo';
  if not found then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  if v_m.rol = 'dueno' then
    return jsonb_build_object('error', 'es-dueno');
  end if;
  update espacio_miembros set estado = 'fuera'
   where espacio_id = p_id and user_id = v_uid;

  update espacios set bloqueo_por = null, bloqueo_hasta = null
   where id = p_id and bloqueo_por = v_uid;
  if found then
    perform espacio_avisar(p_id, 'bloqueo',
      jsonb_build_object('v', 1, 'por', null, 'hasta', null));
  end if;

  perform espacio_avisar(p_id, 'miembros', jsonb_build_object('v', 1));
  return jsonb_build_object('ok', true);
end;
$$;

-- Borra el espacio entero (miembros y log por cascade). El aviso va ANTES del
-- delete: después ya no hay miembros y la policy de escucha cerraría el topic.
--
-- NO toca Storage: `delete from storage.objects` tira la FILA y deja el archivo
-- físico huérfano (mismo motivo que en `partidas`). La carpeta `<id>/` la borra
-- el cliente del dueño por la API, a mejor esfuerzo, ANTES de llamar aquí.
create function public.espacio_borrar(p_id uuid)
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
  if not exists (select 1 from espacios where id = p_id and dueno = v_uid) then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  perform espacio_avisar(p_id, 'borrado', jsonb_build_object('v', 1));
  delete from espacios where id = p_id and dueno = v_uid;
  return jsonb_build_object('ok', true);
end;
$$;

-- Publica un lote de cambios en el log. TODO o NADA: se valida el lote entero
-- ANTES de tocar la tabla, así una operación mal formada no deja medio lote
-- aplicado. Idempotente por `uid`: un reintento tras perder red no duplica.
--
-- Un `uid` repetido consume un `seq` y no inserta nada: queda un HUECO en la
-- numeración. Es inocuo — `espacio_pull` pagina por `seq > cursor` y nadie
-- exige continuidad— y evita un segundo round-trip para detectar el duplicado.
create function public.espacio_push(p_id uuid, p_cambios jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mid text;
  v_rol text;
  v_n int;
  v_it jsonb;
  v_seq bigint;
  v_max_seq bigint;
  v_aplicados int := 0;
  v_ultimo text;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select m.miembro_id, m.rol into v_mid, v_rol
    from espacio_miembros m
   where m.espacio_id = p_id and m.user_id = v_uid and m.estado = 'activo';
  if v_mid is null or v_rol not in ('dueno', 'editor') then
    return jsonb_build_object('error', 'sin-permiso');
  end if;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'array' then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  v_n := jsonb_array_length(p_cambios);
  if v_n > 100 then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if pg_column_size(p_cambios) > 1048576 then
    return jsonb_build_object('error', 'cambio-grande');
  end if;

  -- Primer bucle: validar. Nada se escribe hasta que el lote entero pasa.
  for v_it in select value from jsonb_array_elements(p_cambios) loop
    if jsonb_typeof(v_it) <> 'object' then
      return jsonb_build_object('error', 'peticion-invalida');
    end if;
    if coalesce(v_it->>'uid', '') !~ '^[0-9a-zA-Z_-]{8,40}$' then
      return jsonb_build_object('error', 'peticion-invalida');
    end if;
    if coalesce(v_it->>'tipo', '') !~ '^[a-z]{2,16}$' then
      return jsonb_build_object('error', 'peticion-invalida');
    end if;
    if v_it->'datos' is null or jsonb_typeof(v_it->'datos') = 'null' then
      return jsonb_build_object('error', 'peticion-invalida');
    end if;
    if pg_column_size(v_it->'datos') > 65536 then
      return jsonb_build_object('error', 'cambio-grande');
    end if;
  end loop;

  if v_n = 0 then
    select e.seq into v_max_seq from espacios e where e.id = p_id;
    return jsonb_build_object('aplicados', 0, 'max_seq', coalesce(v_max_seq, 0));
  end if;

  -- 600 llamadas cada 10 min = 1/s sostenido por cuenta: muy por encima de la
  -- cadencia real (un lote cada 2 s por editor) y por debajo de una ráfaga.
  if not consumir_rate_limit(v_uid, 'espacio-push', 600, 600) then
    return jsonb_build_object('error', 'limite');
  end if;

  perform pg_advisory_xact_lock(hashtext('espacio:' || p_id::text));

  for v_it in select value from jsonb_array_elements(p_cambios) loop
    update espacios set seq = seq + 1, actualizado_en = now()
     where id = p_id
     returning seq into v_seq;
    insert into espacio_cambios (espacio_id, seq, uid, autor, tipo, datos)
      values (p_id, v_seq, v_it->>'uid', v_mid, v_it->>'tipo', v_it->'datos')
      on conflict (espacio_id, uid) do nothing;
    if found then
      v_aplicados := v_aplicados + 1;
      v_ultimo := v_it->>'tipo';
    end if;
  end loop;

  v_max_seq := v_seq;
  if v_aplicados > 0 then
    perform espacio_avisar(p_id, 'cambio', jsonb_build_object(
      'v', 1, 'seq', v_max_seq, 'tipo', v_ultimo, 'de', v_mid));
  end if;
  return jsonb_build_object('aplicados', v_aplicados, 'max_seq', coalesce(v_max_seq, 0));
end;
$$;

-- Lee el log a partir de un cursor. Devuelve TODO el log, también lo propio: al
-- reabrir un documento o un dibujo (cuyo estado se reconstruye desde el
-- snapshot) hay que recuperar lo que uno mismo escribió desde la última
-- compactación. Cada consumidor es idempotente (Yjs, LWW por `updatedAt`,
-- dedupe de trazos por `uid`), y `autor` viaja para quien quiera saltárselo.
create function public.espacio_pull(p_id uuid, p_desde bigint)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mid text;
  v_desde bigint := coalesce(p_desde, 0);
  v_rows jsonb;
  v_max bigint;
  v_n int;
  v_snap bigint;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select m.miembro_id into v_mid from espacio_miembros m
   where m.espacio_id = p_id and m.user_id = v_uid and m.estado = 'activo';
  if v_mid is null then
    return jsonb_build_object('error', 'no-encontrado');
  end if;

  select coalesce(jsonb_agg(to_jsonb(f) order by f.seq), '[]'::jsonb),
         max(f.seq), count(*)
    into v_rows, v_max, v_n
    from (
      select c.seq, c.uid, c.autor, c.tipo, c.datos, c.creado_en
        from espacio_cambios c
       where c.espacio_id = p_id and c.seq > v_desde
       order by c.seq
       limit 200
    ) f;
  select e.snapshot_seq into v_snap from espacios e where e.id = p_id;

  return jsonb_build_object(
    'cambios', v_rows,
    'max_seq', coalesce(v_max, v_desde),
    'mas', v_n >= 200,
    'snapshot_seq', coalesce(v_snap, 0));
end;
$$;

-- El estado compactado. Es lo PRIMERO que pide el cliente al abrir: carga el
-- snapshot y luego tira del log desde `snapshot_seq`.
create function public.espacio_snapshot_leer(p_id uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_snapshot jsonb;
  v_seq bigint;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if not exists (select 1 from espacio_miembros
                  where espacio_id = p_id and user_id = v_uid and estado = 'activo') then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  select e.snapshot, e.snapshot_seq into v_snapshot, v_seq from espacios e where e.id = p_id;
  return jsonb_build_object('snapshot', v_snapshot, 'snapshot_seq', coalesce(v_seq, 0));
end;
$$;

-- Compacta: guarda el estado hasta `p_hasta_seq` y BORRA el log ya incluido.
-- Dos editores compactando a la vez son inocuos: el `snapshot_seq <= p_hasta_seq`
-- rechaza al que llegue con una foto más vieja que la ya guardada.
create function public.espacio_snapshot(p_id uuid, p_estado jsonb, p_hasta_seq bigint)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mid text;
  v_rol text;
  v_hasta bigint := coalesce(p_hasta_seq, 0);
  v_seq bigint;
  v_snap bigint;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select m.miembro_id, m.rol into v_mid, v_rol
    from espacio_miembros m
   where m.espacio_id = p_id and m.user_id = v_uid and m.estado = 'activo';
  if v_mid is null or v_rol not in ('dueno', 'editor') then
    return jsonb_build_object('error', 'sin-permiso');
  end if;
  if p_estado is null then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if pg_column_size(p_estado) > 2097152 then
    return jsonb_build_object('error', 'snapshot-grande');
  end if;
  if not consumir_rate_limit(v_uid, 'espacio-snapshot', 600, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;

  perform pg_advisory_xact_lock(hashtext('espacio:' || p_id::text));

  select e.seq, e.snapshot_seq into v_seq, v_snap from espacios e where e.id = p_id;
  if v_seq is null or v_snap > v_hasta or v_hasta > v_seq then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;

  update espacios
     set snapshot = p_estado, snapshot_seq = v_hasta, snapshot_en = now(),
         actualizado_en = now()
   where id = p_id;
  delete from espacio_cambios where espacio_id = p_id and seq <= v_hasta;

  perform espacio_avisar(p_id, 'cambio', jsonb_build_object(
    'v', 1, 'seq', v_hasta, 'tipo', 'snapshot', 'de', v_mid));
  return jsonb_build_object('ok', true, 'snapshot_seq', v_hasta);
end;
$$;

-- Turno de audio/video. Arriendo de 5 minutos que el cliente renueva cada 2;
-- vencido, lo toma cualquiera. Sin cron: la caducidad se evalúa al pedirlo.
create function public.espacio_bloquear(p_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mid text;
  v_rol text;
  v_por uuid;
  v_hasta timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select m.miembro_id, m.rol into v_mid, v_rol
    from espacio_miembros m
   where m.espacio_id = p_id and m.user_id = v_uid and m.estado = 'activo';
  if v_mid is null or v_rol not in ('dueno', 'editor') then
    return jsonb_build_object('error', 'sin-permiso');
  end if;
  if not consumir_rate_limit(v_uid, 'espacio-bloquear', 120, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;

  perform pg_advisory_xact_lock(hashtext('espacio:' || p_id::text));

  select e.bloqueo_por, e.bloqueo_hasta into v_por, v_hasta from espacios e where e.id = p_id;
  if v_por is not null and v_por <> v_uid and v_hasta is not null and v_hasta >= now() then
    return jsonb_build_object('error', 'bloqueado');
  end if;

  update espacios set bloqueo_por = v_uid, bloqueo_hasta = now() + interval '5 minutes'
   where id = p_id
   returning bloqueo_hasta into v_hasta;
  if v_hasta is null then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  perform espacio_avisar(p_id, 'bloqueo',
    jsonb_build_object('v', 1, 'por', v_mid, 'hasta', v_hasta));
  return jsonb_build_object('por', v_mid, 'hasta', v_hasta);
end;
$$;

-- Soltar el turno. Idempotente: si ya no era mío, responde `ok` igual.
create function public.espacio_liberar(p_id uuid)
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
  update espacios set bloqueo_por = null, bloqueo_hasta = null
   where id = p_id and bloqueo_por = v_uid;
  if found then
    perform espacio_avisar(p_id, 'bloqueo',
      jsonb_build_object('v', 1, 'por', null, 'hasta', null));
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 5) Storage: bucket privado de los archivos del espacio -----------------------
-- Ruta de los objetos: <espacio_id>/…  (E4: `img/<uid>.png` y las capas del
-- snapshot; E6: `medios/<remotoId>`). El tope de tamaño y los MIME los aplica el
-- bucket; la pertenencia y el rol, las policies. Hay `update` porque los PNG de
-- las capas se suben con `upsert` a la MISMA ruta en cada compactación.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('espacio-archivos', 'espacio-archivos', false, 52428800,
        array['image/png', 'image/jpeg', 'image/webp',
              'video/mp4', 'video/webm', 'video/quicktime',
              'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg'])
on conflict (id) do nothing;

create policy "espacio-archivos: leer del espacio"
  on storage.objects for select to authenticated
  using (bucket_id = 'espacio-archivos'
         and public.espacio_es_miembro((storage.foldername(name))[1]));

create policy "espacio-archivos: subir (editores)"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'espacio-archivos'
              and public.espacio_puede_editar((storage.foldername(name))[1]));

create policy "espacio-archivos: reemplazar (editores)"
  on storage.objects for update to authenticated
  using (bucket_id = 'espacio-archivos'
         and public.espacio_puede_editar((storage.foldername(name))[1]))
  with check (bucket_id = 'espacio-archivos'
              and public.espacio_puede_editar((storage.foldername(name))[1]));

create policy "espacio-archivos: borrar (editores)"
  on storage.objects for delete to authenticated
  using (bucket_id = 'espacio-archivos'
         and public.espacio_puede_editar((storage.foldername(name))[1]));

-- 6) Grants --------------------------------------------------------------------
-- Las funciones nuevas NO se exponen sin grant explícito (ver config.toml). Las
-- 17 RPCs de usuario quedan en `authenticated`; las internas se revocan también
-- de `authenticated` y no llevan grant: solo las llaman las RPCs, que son
-- definer. Los tres helpers de policy sí necesitan grant (los evalúa el rol de
-- la sesión al comprobar `realtime.messages` y `storage.objects`).

revoke execute on function public.espacio_token() from public, anon, authenticated;
revoke execute on function public.espacio_miembro_id() from public, anon, authenticated;
revoke execute on function public.espacio_avisar(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.espacio_miembros_json(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.espacio_resumen(uuid, uuid) from public, anon, authenticated;

revoke execute on function public.espacio_del_topic(text) from public, anon;
grant  execute on function public.espacio_del_topic(text) to authenticated;
revoke execute on function public.espacio_es_miembro(text) from public, anon;
grant  execute on function public.espacio_es_miembro(text) to authenticated;
revoke execute on function public.espacio_puede_editar(text) from public, anon;
grant  execute on function public.espacio_puede_editar(text) to authenticated;

revoke execute on function public.espacio_crear(text, text, jsonb, int) from public, anon;
grant  execute on function public.espacio_crear(text, text, jsonb, int) to authenticated;
revoke execute on function public.espacio_listar() from public, anon;
grant  execute on function public.espacio_listar() to authenticated;
revoke execute on function public.espacio_estado(uuid) from public, anon;
grant  execute on function public.espacio_estado(uuid) to authenticated;
revoke execute on function public.espacio_editar(uuid, text, jsonb) from public, anon;
grant  execute on function public.espacio_editar(uuid, text, jsonb) to authenticated;
revoke execute on function public.espacio_entrar(text, int) from public, anon;
grant  execute on function public.espacio_entrar(text, int) to authenticated;
revoke execute on function public.espacio_invitar(uuid, uuid, text) from public, anon;
grant  execute on function public.espacio_invitar(uuid, uuid, text) to authenticated;
revoke execute on function public.espacio_rotar_enlace(uuid, text, boolean) from public, anon;
grant  execute on function public.espacio_rotar_enlace(uuid, text, boolean) to authenticated;
revoke execute on function public.espacio_rol(uuid, text, text) from public, anon;
grant  execute on function public.espacio_rol(uuid, text, text) to authenticated;
revoke execute on function public.espacio_expulsar(uuid, text) from public, anon;
grant  execute on function public.espacio_expulsar(uuid, text) to authenticated;
revoke execute on function public.espacio_salir(uuid) from public, anon;
grant  execute on function public.espacio_salir(uuid) to authenticated;
revoke execute on function public.espacio_borrar(uuid) from public, anon;
grant  execute on function public.espacio_borrar(uuid) to authenticated;
revoke execute on function public.espacio_push(uuid, jsonb) from public, anon;
grant  execute on function public.espacio_push(uuid, jsonb) to authenticated;
revoke execute on function public.espacio_pull(uuid, bigint) from public, anon;
grant  execute on function public.espacio_pull(uuid, bigint) to authenticated;
revoke execute on function public.espacio_snapshot_leer(uuid) from public, anon;
grant  execute on function public.espacio_snapshot_leer(uuid) to authenticated;
revoke execute on function public.espacio_snapshot(uuid, jsonb, bigint) from public, anon;
grant  execute on function public.espacio_snapshot(uuid, jsonb, bigint) to authenticated;
revoke execute on function public.espacio_bloquear(uuid) from public, anon;
grant  execute on function public.espacio_bloquear(uuid) to authenticated;
revoke execute on function public.espacio_liberar(uuid) from public, anon;
grant  execute on function public.espacio_liberar(uuid) to authenticated;

-- Buzón: mensajería entre usuarios de MPH (16-sep-2026).
--
-- Identidad pública (alias/nombre/emoji en `perfiles`), contactos con
-- solicitud + aceptación, hilos 1:1 y mensajes (texto, imagen, PDF o contenido
-- de un cuarto). Todo pasa por RPCs `security definer` con `auth.uid()` (patrón
-- `sync_push`): las tablas tienen RLS activada y SIN políticas, y ningún uuid
-- ajeno sale al cliente (los contactos se identifican por `contacto_id`/`hilo_id`
-- y los mensajes traen `mio` calculado aquí). Los adjuntos van directo a Storage
-- (bucket `buzon-adjuntos`) con policies por pertenencia al hilo, resuelta por
-- `buzon_es_miembro` (security definer: una policy con `exists (select … from
-- buzon_hilos)` correría como `authenticated` contra una tabla sin políticas y
-- denegaría todo).
--
-- Las funciones nuevas NO se exponen sin grant explícito (ver config.toml), así
-- que cada RPC de usuario lleva su `revoke … from public, anon` + `grant … to
-- authenticated`. Las internas quedan sin grant: solo las llama el dueño.
--
-- Avisos: el trigger de mensajes y las RPCs de contactos pasan por
-- `buzon_avisar()`, la costura ÚNICA para el push con la app cerrada (fase 2):
-- hoy emite el campanazo Realtime al canal privado `buzon:<uid>`.

-- 1) Identidad pública en perfiles ---------------------------------------------

alter table public.perfiles
  add column if not exists alias  text,
  add column if not exists nombre text not null default '',
  add column if not exists emoji  text not null default '🙂';

alter table public.perfiles
  add constraint perfiles_alias_formato check (alias is null or alias ~ '^[a-z0-9_]{3,20}$'),
  add constraint perfiles_nombre_largo  check (char_length(nombre) <= 40),
  add constraint perfiles_emoji_largo   check (char_length(emoji) between 1 and 8);

create unique index perfiles_alias_unico on public.perfiles (lower(alias)) where alias is not null;

-- 2) Tablas (RLS activada y SIN políticas: solo las RPCs) ---------------------

create table public.buzon_contactos (
  id             uuid primary key default gen_random_uuid(),
  solicitante    uuid not null references auth.users (id) on delete cascade,
  destinatario   uuid not null references auth.users (id) on delete cascade,
  estado         text not null default 'pendiente' check (estado in ('pendiente', 'aceptado', 'bloqueado')),
  bloqueado_por  uuid,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (solicitante <> destinatario)
);

-- Un solo vínculo por par, en cualquier dirección.
create unique index buzon_contactos_par on public.buzon_contactos
  (least(solicitante, destinatario), greatest(solicitante, destinatario));
create index buzon_contactos_dest on public.buzon_contactos (destinatario, estado);

alter table public.buzon_contactos enable row level security;

-- El hilo nace al aceptar. Va aparte del contacto para poder crecer a grupos
-- (fase 4) sin migrar mensajes.
create table public.buzon_hilos (
  id          uuid primary key default gen_random_uuid(),
  usuario_a   uuid not null references auth.users (id) on delete cascade,
  usuario_b   uuid not null references auth.users (id) on delete cascade,
  contacto_id uuid not null references public.buzon_contactos (id) on delete cascade,
  creado_en   timestamptz not null default now(),
  check (usuario_a < usuario_b),
  unique (usuario_a, usuario_b)
);

alter table public.buzon_hilos enable row level security;

create sequence public.buzon_seq;

create table public.buzon_mensajes (
  id         bigint generated always as identity primary key,
  hilo_id    uuid not null references public.buzon_hilos (id) on delete cascade,
  de         uuid not null references auth.users (id) on delete cascade,
  -- Lo genera el cliente: un reintento tras perder red no duplica.
  uid        text not null,
  tipo       text not null check (tipo in ('texto', 'imagen', 'pdf', 'contenido')),
  texto      text not null default '' check (char_length(texto) <= 4000),
  -- {path, size, mime, nombre, ancho?, alto?}: el objeto vive en Storage.
  adjunto    jsonb,
  -- Paquete de un cuarto (receta, rutina…); sus blobs también en Storage.
  contenido  jsonb check (contenido is null or pg_column_size(contenido) <= 65536),
  server_seq bigint not null default nextval('public.buzon_seq'),
  creado_en  timestamptz not null default now(),
  leido_en   timestamptz,
  unique (hilo_id, uid)
);

create index buzon_mensajes_pull on public.buzon_mensajes (server_seq);
create index buzon_mensajes_hilo on public.buzon_mensajes (hilo_id, server_seq);

alter table public.buzon_mensajes enable row level security;

-- 3) Helpers ------------------------------------------------------------------

-- ¿El usuario de la sesión pertenece al hilo? Es lo que consultan las policies
-- de Storage (la carpeta raíz del objeto es el id del hilo). Solo responde sobre
-- auth.uid(): no filtra nada de otros.
create function public.buzon_es_miembro(p_hilo text)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or p_hilo is null then
    return false;
  end if;
  begin
    v_id := p_hilo::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from buzon_hilos where id = v_id and v_uid in (usuario_a, usuario_b)
  );
end;
$$;

revoke execute on function public.buzon_es_miembro(text) from public, anon;
grant execute on function public.buzon_es_miembro(text) to authenticated;

-- Costura de los avisos. Hoy: campanazo al canal privado del usuario (la app
-- abierta lo escucha). Fase 2 (push con la app cerrada): aquí se añade
--   if exists (select 1 from buzon_dispositivos d where d.user_id = p_uid) then
--     perform net.http_post(url := <push-enviar>, headers := …, body := …);
--   end if;
-- Blindada: sin Realtime el envío no debe fallar.
create function public.buzon_avisar(p_uid uuid, p_evento text, p_payload jsonb)
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

revoke execute on function public.buzon_avisar(uuid, text, jsonb) from public, anon, authenticated;

-- Un mensaje nuevo avisa a AMBOS miembros: así los otros dispositivos del
-- remitente también se enteran (el emisor ignora su propio seq).
create function public.buzon_notificar()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_h buzon_hilos;
begin
  select * into v_h from buzon_hilos where id = new.hilo_id;
  if found then
    perform buzon_avisar(v_h.usuario_a, 'mensaje', jsonb_build_object('seq', new.server_seq, 'hilo', new.hilo_id));
    perform buzon_avisar(v_h.usuario_b, 'mensaje', jsonb_build_object('seq', new.server_seq, 'hilo', new.hilo_id));
  end if;
  return new;
end;
$$;

create trigger buzon_mensajes_notificar
  after insert on public.buzon_mensajes
  for each row execute procedure public.buzon_notificar();

-- Escuchar el canal propio (mismo patrón que el campanazo del sync). Nadie
-- publica desde el cliente: publica la BD vía realtime.send.
create policy "buzon propio: escuchar"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() = 'buzon:' || auth.uid()::text
  );

-- El vínculo entre dos usuarios, en cualquier dirección (o null).
create function public.buzon_vinculo(p_a uuid, p_b uuid)
returns public.buzon_contactos
language sql
stable
security definer set search_path = public
as $$
  select c.* from buzon_contactos c
   where least(c.solicitante, c.destinatario) = least(p_a, p_b)
     and greatest(c.solicitante, c.destinatario) = greatest(p_a, p_b)
   limit 1
$$;

revoke execute on function public.buzon_vinculo(uuid, uuid) from public, anon, authenticated;

-- 4) RPCs de usuario ----------------------------------------------------------

-- Fija (o cambia) el alias público. Devuelve el perfil o {error}.
create function public.buzon_fijar_alias(p_alias text, p_nombre text, p_emoji text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_alias text := lower(trim(coalesce(p_alias, '')));
  v_nombre text := left(trim(coalesce(p_nombre, '')), 40);
  v_emoji text := coalesce(nullif(trim(p_emoji), ''), '🙂');
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if v_alias !~ '^[a-z0-9_]{3,20}$' then
    return jsonb_build_object('error', 'alias-invalido');
  end if;
  if v_alias in ('admin', 'mph', 'soporte', 'mindplanner', 'mindplannerhome', 'ayuda', 'sistema') then
    return jsonb_build_object('error', 'alias-ocupado');
  end if;
  if char_length(v_emoji) > 8 then
    v_emoji := '🙂';
  end if;
  if not consumir_rate_limit(v_uid, 'buzon-alias', 10, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;
  begin
    update perfiles set alias = v_alias, nombre = v_nombre, emoji = v_emoji where user_id = v_uid;
  exception when unique_violation then
    return jsonb_build_object('error', 'alias-ocupado');
  end;
  return jsonb_build_object('alias', v_alias, 'nombre', v_nombre, 'emoji', v_emoji);
end;
$$;

revoke execute on function public.buzon_fijar_alias(text, text, text) from public, anon;
grant execute on function public.buzon_fijar_alias(text, text, text) to authenticated;

-- Búsqueda por alias EXACTO. {resultado: null} si no hay nadie (o si esa persona
-- me bloqueó: para mí no existe). Nunca devuelve el uuid ajeno.
create function public.buzon_buscar_alias(p_alias text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_alias text := lower(trim(coalesce(p_alias, '')));
  v_p perfiles;
  v_c buzon_contactos;
  v_estado text;
  v_hilo uuid;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if v_alias !~ '^[a-z0-9_]{3,20}$' then
    return jsonb_build_object('error', 'alias-invalido');
  end if;
  if not consumir_rate_limit(v_uid, 'buzon-buscar', 20, 60) then
    return jsonb_build_object('error', 'limite');
  end if;
  select * into v_p from perfiles where lower(alias) = v_alias;
  if not found then
    return jsonb_build_object('resultado', null);
  end if;
  if v_p.user_id = v_uid then
    v_estado := 'yo';
  else
    v_c := buzon_vinculo(v_uid, v_p.user_id);
    if v_c.id is null then
      v_estado := 'ninguno';
    elsif v_c.estado = 'bloqueado' then
      if v_c.bloqueado_por = v_uid then
        v_estado := 'bloqueado';
      else
        return jsonb_build_object('resultado', null);
      end if;
    elsif v_c.estado = 'aceptado' then
      v_estado := 'aceptado';
      select id into v_hilo from buzon_hilos where contacto_id = v_c.id;
    elsif v_c.solicitante = v_uid then
      v_estado := 'pendiente-enviada';
    else
      v_estado := 'pendiente-recibida';
    end if;
  end if;
  return jsonb_build_object('resultado', jsonb_build_object(
    'alias', v_p.alias,
    'nombre', v_p.nombre,
    'emoji', v_p.emoji,
    'estado', v_estado,
    'contacto_id', v_c.id,
    'hilo_id', v_hilo
  ));
end;
$$;

revoke execute on function public.buzon_buscar_alias(text) from public, anon;
grant execute on function public.buzon_buscar_alias(text) to authenticated;

-- Solicitud de contacto por alias. Si la otra persona ya me había pedido, se
-- acepta directo (los dos quisieron). Exige tener alias: quien recibe la
-- solicitud tiene que poder ver quién es.
create function public.buzon_solicitar(p_alias text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_alias text := lower(trim(coalesce(p_alias, '')));
  v_otro uuid;
  v_c buzon_contactos;
  v_hilo uuid;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if v_alias !~ '^[a-z0-9_]{3,20}$' then
    return jsonb_build_object('error', 'alias-invalido');
  end if;
  if (select alias from perfiles where user_id = v_uid) is null then
    return jsonb_build_object('error', 'sin-alias');
  end if;
  if not consumir_rate_limit(v_uid, 'buzon-solicitar', 10, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;
  select user_id into v_otro from perfiles where lower(alias) = v_alias;
  if not found or v_otro = v_uid then
    return jsonb_build_object('error', 'no-encontrado');
  end if;

  v_c := buzon_vinculo(v_uid, v_otro);
  if v_c.id is not null then
    if v_c.estado = 'aceptado' then
      return jsonb_build_object('error', 'ya-contacto');
    elsif v_c.estado = 'bloqueado' then
      -- Ni quien bloquea ni el bloqueado pueden re-solicitar; para el bloqueado
      -- la persona «no existe».
      return jsonb_build_object('error', 'no-encontrado');
    elsif v_c.solicitante = v_uid then
      return jsonb_build_object('ok', true, 'estado', 'pendiente-enviada', 'contacto_id', v_c.id);
    end if;
    -- Solicitud cruzada: se acepta.
    update buzon_contactos set estado = 'aceptado', actualizado_en = now() where id = v_c.id;
    insert into buzon_hilos (usuario_a, usuario_b, contacto_id)
      values (least(v_uid, v_otro), greatest(v_uid, v_otro), v_c.id)
      returning id into v_hilo;
    perform buzon_avisar(v_otro, 'contactos', '{}'::jsonb);
    return jsonb_build_object('ok', true, 'estado', 'aceptado', 'contacto_id', v_c.id, 'hilo_id', v_hilo);
  end if;

  insert into buzon_contactos (solicitante, destinatario) values (v_uid, v_otro) returning * into v_c;
  perform buzon_avisar(v_otro, 'contactos', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'estado', 'pendiente-enviada', 'contacto_id', v_c.id);
end;
$$;

revoke execute on function public.buzon_solicitar(text) from public, anon;
grant execute on function public.buzon_solicitar(text) to authenticated;

-- Aceptar (crea el hilo) o rechazar (borra) una solicitud recibida.
create function public.buzon_responder(p_contacto uuid, p_aceptar boolean)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_c buzon_contactos;
  v_hilo uuid;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select * into v_c from buzon_contactos
   where id = p_contacto and destinatario = v_uid and estado = 'pendiente';
  if not found then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  if p_aceptar then
    update buzon_contactos set estado = 'aceptado', actualizado_en = now() where id = v_c.id;
    insert into buzon_hilos (usuario_a, usuario_b, contacto_id)
      values (least(v_uid, v_c.solicitante), greatest(v_uid, v_c.solicitante), v_c.id)
      returning id into v_hilo;
  else
    delete from buzon_contactos where id = v_c.id;
  end if;
  perform buzon_avisar(v_c.solicitante, 'contactos', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'hilo_id', v_hilo);
end;
$$;

revoke execute on function public.buzon_responder(uuid, boolean) from public, anon;
grant execute on function public.buzon_responder(uuid, boolean) to authenticated;

-- Bloquear conserva el hilo pero cierra el envío en ambos sentidos; solo quien
-- bloqueó puede desbloquear (vuelve a 'aceptado' si había hilo; si no, el
-- vínculo desaparece).
create function public.buzon_bloquear(p_contacto uuid, p_bloquear boolean)
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
grant execute on function public.buzon_bloquear(uuid, boolean) to authenticated;

-- Eliminar el contacto borra el hilo y sus mensajes para los dos (cascade).
-- Los adjuntos de Storage los borra el cliente ANTES de llamar aquí (después el
-- hilo ya no existe y la policy denegaría).
create function public.buzon_eliminar(p_contacto uuid)
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
  delete from buzon_contactos where id = v_c.id;
  perform buzon_avisar(v_otro, 'contactos', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.buzon_eliminar(uuid) from public, anon;
grant execute on function public.buzon_eliminar(uuid) to authenticated;

-- Mis contactos (todas las filas donde soy parte, salvo las que el OTRO bloqueó).
create function public.buzon_listar_contactos()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lista jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'contacto_id', c.id,
      'hilo_id', h.id,
      'alias', p.alias,
      'nombre', p.nombre,
      'emoji', p.emoji,
      'estado', c.estado,
      'direccion', case when c.solicitante = v_uid then 'enviada' else 'recibida' end,
      'bloqueado_por_mi', c.bloqueado_por = v_uid,
      'actualizado_en', c.actualizado_en
    ) order by c.actualizado_en desc), '[]'::jsonb)
    into v_lista
    from buzon_contactos c
    join perfiles p on p.user_id = case when c.solicitante = v_uid then c.destinatario else c.solicitante end
    left join buzon_hilos h on h.contacto_id = c.id
   where v_uid in (c.solicitante, c.destinatario)
     and not (c.estado = 'bloqueado' and c.bloqueado_por <> v_uid);
  return jsonb_build_object('contactos', v_lista);
end;
$$;

revoke execute on function public.buzon_listar_contactos() from public, anon;
grant execute on function public.buzon_listar_contactos() to authenticated;

-- Enviar un mensaje a un hilo del que soy miembro, con el contacto aceptado.
-- Idempotente por (hilo, uid): un reintento devuelve el mensaje ya guardado.
create function public.buzon_enviar(
  p_hilo uuid,
  p_uid text,
  p_tipo text,
  p_texto text,
  p_adjunto jsonb default null,
  p_contenido jsonb default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_h buzon_hilos;
  v_c buzon_contactos;
  v_texto text := coalesce(p_texto, '');
  v_prefijo text;
  v_path text;
  v_size bigint;
  v_b jsonb;
  v_seq bigint;
  v_creado timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if p_uid is null or p_uid !~ '^[0-9a-f-]{36}$' then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  select * into v_h from buzon_hilos where id = p_hilo and v_uid in (usuario_a, usuario_b);
  if not found then
    return jsonb_build_object('error', 'no-contacto');
  end if;
  select * into v_c from buzon_contactos where id = v_h.contacto_id;
  if not found or v_c.estado <> 'aceptado' then
    return jsonb_build_object('error', case when v_c.estado = 'bloqueado' then 'bloqueado' else 'no-contacto' end);
  end if;
  if p_tipo not in ('texto', 'imagen', 'pdf', 'contenido') then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if char_length(v_texto) > 4000 then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if p_tipo = 'texto' and btrim(v_texto) = '' then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;

  -- Los objetos de Storage de este mensaje viven bajo <hilo>/<uid>/.
  v_prefijo := p_hilo::text || '/' || p_uid || '/';

  if p_tipo in ('imagen', 'pdf') then
    if p_adjunto is null then
      return jsonb_build_object('error', 'peticion-invalida');
    end if;
    v_path := p_adjunto->>'path';
    if v_path is null or position(v_prefijo in v_path) <> 1 then
      return jsonb_build_object('error', 'peticion-invalida');
    end if;
    if coalesce(p_adjunto->>'size', '') !~ '^[0-9]+$' then
      return jsonb_build_object('error', 'peticion-invalida');
    end if;
    v_size := (p_adjunto->>'size')::bigint;
    if v_size > 8388608 then
      return jsonb_build_object('error', 'adjunto-grande');
    end if;
    if coalesce(p_adjunto->>'mime', '') not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') then
      return jsonb_build_object('error', 'peticion-invalida');
    end if;
  end if;

  if p_tipo = 'contenido' then
    if p_contenido is null then
      return jsonb_build_object('error', 'peticion-invalida');
    end if;
    if pg_column_size(p_contenido) > 65536 then
      return jsonb_build_object('error', 'contenido-grande');
    end if;
    -- Los blobs del paquete también tienen que colgar de este mensaje.
    if jsonb_typeof(p_contenido->'blobs') = 'object' then
      for v_b in select value from jsonb_each(p_contenido->'blobs') loop
        if position(v_prefijo in coalesce(v_b->>'path', '')) <> 1 then
          return jsonb_build_object('error', 'peticion-invalida');
        end if;
      end loop;
    end if;
  end if;

  if not consumir_rate_limit(v_uid, 'buzon-enviar', 30, 60) then
    return jsonb_build_object('error', 'limite');
  end if;

  insert into buzon_mensajes (hilo_id, de, uid, tipo, texto, adjunto, contenido)
    values (p_hilo, v_uid, p_uid, p_tipo, v_texto,
            case when p_tipo in ('imagen', 'pdf') then p_adjunto else null end,
            case when p_tipo = 'contenido' then p_contenido else null end)
    on conflict (hilo_id, uid) do nothing
    returning server_seq, creado_en into v_seq, v_creado;
  if v_seq is null then
    select server_seq, creado_en into v_seq, v_creado
      from buzon_mensajes where hilo_id = p_hilo and uid = p_uid;
  end if;
  return jsonb_build_object('uid', p_uid, 'server_seq', v_seq, 'creado_en', v_creado);
end;
$$;

revoke execute on function public.buzon_enviar(uuid, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.buzon_enviar(uuid, text, text, text, jsonb, jsonb) to authenticated;

-- Pull incremental de mis mensajes (todos mis hilos) a partir de un cursor.
create function public.buzon_pull(p_desde bigint)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_desde bigint := coalesce(p_desde, 0);
  v_rows jsonb;
  v_max bigint;
  v_n int;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select coalesce(jsonb_agg(to_jsonb(f) order by f.server_seq), '[]'::jsonb), max(f.server_seq), count(*)
    into v_rows, v_max, v_n
    from (
      select m.uid, m.hilo_id, (m.de = v_uid) as mio, m.tipo, m.texto, m.adjunto, m.contenido,
             m.server_seq, m.creado_en, m.leido_en
        from buzon_mensajes m
        join buzon_hilos h on h.id = m.hilo_id
       where v_uid in (h.usuario_a, h.usuario_b)
         and m.server_seq > v_desde
       order by m.server_seq
       limit 200
    ) f;
  return jsonb_build_object('mensajes', v_rows, 'max_seq', coalesce(v_max, v_desde), 'mas', v_n >= 200);
end;
$$;

revoke execute on function public.buzon_pull(bigint) from public, anon;
grant execute on function public.buzon_pull(bigint) to authenticated;

-- Marca como leídos los mensajes del otro hasta un seq. Avanza `server_seq`
-- de las filas tocadas para que el «leído» viaje: a mis otros dispositivos (el
-- contador de no leídos baja en todos) y al remitente (sus ✓✓).
create function public.buzon_leido(p_hilo uuid, p_hasta bigint)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_h buzon_hilos;
  v_n int;
  v_max bigint;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select * into v_h from buzon_hilos where id = p_hilo and v_uid in (usuario_a, usuario_b);
  if not found then
    return jsonb_build_object('ok', false);
  end if;
  update buzon_mensajes
     set leido_en = now(), server_seq = nextval('public.buzon_seq')
   where hilo_id = p_hilo and de <> v_uid and leido_en is null and server_seq <= coalesce(p_hasta, 0);
  get diagnostics v_n = row_count;
  if v_n > 0 then
    select max(server_seq) into v_max from buzon_mensajes where hilo_id = p_hilo;
    perform buzon_avisar(v_h.usuario_a, 'mensaje', jsonb_build_object('seq', v_max, 'hilo', p_hilo));
    perform buzon_avisar(v_h.usuario_b, 'mensaje', jsonb_build_object('seq', v_max, 'hilo', p_hilo));
  end if;
  return jsonb_build_object('ok', true, 'leidos', v_n);
end;
$$;

revoke execute on function public.buzon_leido(uuid, bigint) from public, anon;
grant execute on function public.buzon_leido(uuid, bigint) to authenticated;

-- 5) Storage: bucket privado de adjuntos ---------------------------------------
-- Ruta de los objetos: <hilo_id>/<mensaje_uid>/<archivo>. El tope de tamaño y
-- los MIME los aplica el propio bucket; la pertenencia al hilo, las policies.
-- Sin `tiene_pro`: el buzón es para cualquier cuenta con sesión. Sin `update`:
-- cada mensaje tiene su carpeta y no hay upsert.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('buzon-adjuntos', 'buzon-adjuntos', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "buzon-adjuntos: leer del hilo"
  on storage.objects for select to authenticated
  using (bucket_id = 'buzon-adjuntos' and public.buzon_es_miembro((storage.foldername(name))[1]));

create policy "buzon-adjuntos: subir al hilo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'buzon-adjuntos' and public.buzon_es_miembro((storage.foldername(name))[1]));

create policy "buzon-adjuntos: borrar del hilo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'buzon-adjuntos' and public.buzon_es_miembro((storage.foldername(name))[1]));

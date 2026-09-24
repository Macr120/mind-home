-- Buzón: audio y video como adjuntos (notas de voz, canciones, clips) y
-- borrar un mensaje propio para los dos.
--
-- Mismo camino que imagen y PDF: el binario va al bucket `buzon-adjuntos` bajo
-- <hilo>/<uid>/ y el mensaje lleva el marcador. Cambian tres cosas:
--   1. el check de `buzon_mensajes.tipo` admite 'audio' y 'video';
--   2. el bucket acepta sus MIME y sube el tope a 20 MB (la RPC mantiene 8 MB
--      para imagen y PDF, así que para ellos nada cambia);
--   3. `buzon_enviar` (copia literal de 20260916000002 con esos tipos añadidos)
--      valida el MIME según el tipo del mensaje.

alter table public.buzon_mensajes drop constraint if exists buzon_mensajes_tipo_check;
alter table public.buzon_mensajes
  add constraint buzon_mensajes_tipo_check
  check (tipo in ('texto', 'imagen', 'pdf', 'audio', 'video', 'contenido', 'borrado'));

update storage.buckets
   set file_size_limit = 20971520,
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
         'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/wav', 'audio/x-wav',
         'video/mp4', 'video/webm', 'video/quicktime'
       ]
 where id = 'buzon-adjuntos';

create or replace function public.buzon_enviar(
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
  if p_tipo not in ('texto', 'imagen', 'pdf', 'audio', 'video', 'contenido') then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if char_length(v_texto) > 4000 then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if p_tipo = 'texto' and btrim(v_texto) = '' then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;

  v_prefijo := p_hilo::text || '/' || p_uid || '/';

  if p_tipo in ('imagen', 'pdf', 'audio', 'video') then
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
    -- Imagen y PDF siguen en 8 MB; audio y video llegan a 20 MB (tope del bucket).
    -- Sin `case … end then` en una línea: el separador de sentencias de la CLI lo parte mal.
    if p_tipo in ('audio', 'video') and v_size > 20971520 then
      return jsonb_build_object('error', 'adjunto-grande');
    end if;
    if p_tipo in ('imagen', 'pdf') and v_size > 8388608 then
      return jsonb_build_object('error', 'adjunto-grande');
    end if;
    if not (
      (p_tipo = 'imagen' and p_adjunto->>'mime' in ('image/jpeg', 'image/png', 'image/webp'))
      or (p_tipo = 'pdf' and p_adjunto->>'mime' = 'application/pdf')
      or (p_tipo = 'audio' and p_adjunto->>'mime' in ('audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/wav', 'audio/x-wav'))
      or (p_tipo = 'video' and p_adjunto->>'mime' in ('video/mp4', 'video/webm', 'video/quicktime'))
    ) then
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

  -- Serializa las escrituras que tocan a cualquiera de los dos miembros.
  perform pg_advisory_xact_lock(hashtext('buzon:' || v_h.usuario_a::text));
  perform pg_advisory_xact_lock(hashtext('buzon:' || v_h.usuario_b::text));

  insert into buzon_mensajes (hilo_id, de, uid, tipo, texto, adjunto, contenido)
    values (p_hilo, v_uid, p_uid, p_tipo, v_texto,
            case when p_tipo in ('imagen', 'pdf', 'audio', 'video') then p_adjunto else null end,
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

-- «Borrar para todos»: solo quien lo mandó. El mensaje no desaparece de la
-- tabla: pasa a tipo 'borrado' sin texto ni adjunto y con `server_seq` nuevo,
-- así el pull incremental de los dos lo recibe y lo pinta como «Mensaje
-- eliminado». Los binarios de Storage los borra el cliente antes (las policies
-- ya dejan borrar a los miembros del hilo).
create function public.buzon_borrar_mensaje(p_hilo uuid, p_uid text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_h buzon_hilos;
  v_seq bigint;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select * into v_h from buzon_hilos where id = p_hilo and v_uid in (usuario_a, usuario_b);
  if not found then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  perform pg_advisory_xact_lock(hashtext('buzon:' || v_h.usuario_a::text));
  perform pg_advisory_xact_lock(hashtext('buzon:' || v_h.usuario_b::text));
  update buzon_mensajes
     set tipo = 'borrado', texto = '', adjunto = null, contenido = null,
         server_seq = nextval('public.buzon_seq')
   where hilo_id = p_hilo and uid = p_uid and de = v_uid
  returning server_seq into v_seq;
  if v_seq is null then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  perform buzon_avisar(v_h.usuario_a, 'mensaje', jsonb_build_object('seq', v_seq, 'hilo', p_hilo));
  perform buzon_avisar(v_h.usuario_b, 'mensaje', jsonb_build_object('seq', v_seq, 'hilo', p_hilo));
  return jsonb_build_object('ok', true, 'server_seq', v_seq);
end;
$$;

revoke execute on function public.buzon_borrar_mensaje(uuid, text) from public, anon;
grant  execute on function public.buzon_borrar_mensaje(uuid, text) to authenticated;

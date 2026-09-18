-- Buzón: orden de `server_seq` garantizado por usuario.
--
-- Dos escrituras concurrentes pueden confirmar fuera de orden (la de seq 10
-- termina después de la de seq 11): un pull en medio avanzaría el cursor a 11 y
-- se saltaría la 10 para siempre. Misma carrera que cerró el sync con un
-- advisory lock (20260823000001). Aquí el mensaje toca a DOS usuarios, así que
-- `buzon_enviar` y `buzon_leido` (que también reasigna seq) toman el candado
-- de ambos miembros, siempre en el mismo orden (usuario_a < usuario_b por el
-- check del hilo) para no interbloquearse.

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
  if p_tipo not in ('texto', 'imagen', 'pdf', 'contenido') then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if char_length(v_texto) > 4000 then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if p_tipo = 'texto' and btrim(v_texto) = '' then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;

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

create or replace function public.buzon_leido(p_hilo uuid, p_hasta bigint)
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
  perform pg_advisory_xact_lock(hashtext('buzon:' || v_h.usuario_a::text));
  perform pg_advisory_xact_lock(hashtext('buzon:' || v_h.usuario_b::text));
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

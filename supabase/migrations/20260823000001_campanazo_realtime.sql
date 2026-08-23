-- Campanazo Realtime: sync_push avisa por broadcast al canal privado del
-- usuario (`sync:<user_id>`) cuando aplica cambios, con payload mínimo {seq}:
-- los demás dispositivos reaccionan con un pull inmediato en vez de esperar el
-- intervalo. Además serializa los push del MISMO usuario (advisory lock) para
-- cerrar una carrera de huecos de server_seq que ya existía: dos push
-- concurrentes podían confirmar fuera de orden y un pull intermedio avanzaba
-- el cursor saltándose para siempre la fila del seq menor.

-- Escuchar el canal propio (join de canal privado; RLS de realtime.messages).
-- Nadie publica desde el cliente: publica la BD vía realtime.send, que no pasa
-- por RLS. El payload es solo {seq}, sin datos: escuchar tu propio canal sin
-- plan vigente no filtra nada (y el cliente ni se suscribe sin plan).
create policy "campanazo sync propio: escuchar"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() = 'sync:' || auth.uid()::text
  );

-- Mismo cuerpo que 20260727000001 + advisory lock + max_seq + campanazo.
create or replace function public.sync_push(p_cambios jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_c jsonb;
  v_aplicados int := 0;
  v_seq bigint;
  v_max_seq bigint := 0;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if not public.tiene_pro(v_uid) then
    return jsonb_build_object('error', 'sin-pro');
  end if;

  -- Un push a la vez por usuario: sus server_seq se confirman en orden y el
  -- pull jamás se salta filas por huecos abiertos.
  perform pg_advisory_xact_lock(hashtext('sync_push:' || v_uid::text));

  for v_c in select * from jsonb_array_elements(coalesce(p_cambios, '[]'::jsonb)) loop
    if coalesce(v_c->>'tabla', '') = '' or coalesce(v_c->>'uid', '') = '' then
      continue;
    end if;
    v_seq := null;
    insert into registros (user_id, tabla, uid, datos, deleted, updated_at)
    values (
      v_uid,
      v_c->>'tabla',
      v_c->>'uid',
      case when coalesce((v_c->>'deleted')::boolean, false) then null else v_c->'datos' end,
      coalesce((v_c->>'deleted')::boolean, false),
      coalesce((v_c->>'updatedAt')::bigint, 0)
    )
    on conflict (user_id, tabla, uid) do update set
      datos = excluded.datos,
      deleted = excluded.deleted,
      updated_at = excluded.updated_at,
      server_seq = nextval('public.registros_seq')
    where excluded.updated_at >= registros.updated_at
    returning server_seq into v_seq;
    if v_seq is not null then
      v_aplicados := v_aplicados + 1;
      v_max_seq := greatest(v_max_seq, v_seq);
    end if;
  end loop;

  -- Campanazo SOLO si algo se aplicó (un push de puros perdedores LWW no
  -- despierta a nadie). Blindado: sin Realtime (p. ej. entorno local sin el
  -- esquema) el push no debe fallar.
  if v_aplicados > 0 then
    begin
      perform realtime.send(
        jsonb_build_object('seq', v_max_seq),
        'cambio',
        'sync:' || v_uid::text,
        true
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('aplicados', v_aplicados, 'max_seq', v_max_seq);
end;
$$;

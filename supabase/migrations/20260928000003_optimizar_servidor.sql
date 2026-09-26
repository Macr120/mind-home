-- Optimizaciones del servidor (28-sep-2026). Nada cambia de comportamiento:
-- lo mismo, con menos lecturas, menos bytes y menos filas viejas.

-- 1) sync_push devuelve `prev_max` ----------------------------------------------------
--
-- El pull que sigue a un push devolvía las filas recién subidas (el prefiltro
-- LWW las descartaba DESPUÉS de viajar). Con el `server_seq` máximo del usuario
-- ANTES del push —calculado dentro del advisory lock, que serializa sus
-- pushes—, el cliente sabe si hay algo ajeno más allá de su cursor. Si no lo
-- hay, avanza el cursor a `max_seq` y se ahorra el pull entero.
-- Mismo cuerpo que 20260823000001 + prev_max.
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
  v_prev bigint;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if not public.tiene_pro(v_uid) then
    return jsonb_build_object('error', 'sin-pro');
  end if;

  perform pg_advisory_xact_lock(hashtext('sync_push:' || v_uid::text));
  -- Lectura hacia atrás del índice registros_pull (user_id, server_seq).
  select coalesce(max(server_seq), 0) into v_prev from registros where user_id = v_uid;

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

  return jsonb_build_object('aplicados', v_aplicados, 'max_seq', v_max_seq, 'prev_max', v_prev);
end;
$$;

-- 2) RLS: auth.uid() y tiene_pro una vez por consulta, no por fila --------------------
--
-- Envueltos en `(select …)` Postgres los evalúa como initplan (recomendación
-- del advisor de Supabase). En `registros` era `tiene_pro` —otra consulta a
-- `perfiles`— hasta 500 veces por página de pull.

alter policy "registros propios: leer" on public.registros
  using ((select auth.uid()) = user_id and (select public.tiene_pro((select auth.uid()))));
alter policy "uso por op propio: leer" on public.uso_ia_ops
  using ((select auth.uid()) = user_id);
alter policy "uso propio: leer" on public.uso_ia
  using ((select auth.uid()) = user_id);
alter policy "perfil propio: leer" on public.perfiles
  using ((select auth.uid()) = user_id);
alter policy "almacen_objetos: leer los propios" on public.almacen_objetos
  using (user_id = (select auth.uid()));

-- 3) buzon_pull por hilo ----------------------------------------------------------------
--
-- Antes recorría `buzon_mensajes` por el índice GLOBAL de server_seq, filtrando
-- los de todos los usuarios hasta juntar 200 propios: crecía con el tráfico de
-- toda la app. Ahora baja por hilo con `buzon_mensajes_hilo (hilo_id,
-- server_seq)` y se queda con los 200 primeros del conjunto: mismo resultado.

create index if not exists buzon_hilos_usuario_b on public.buzon_hilos (usuario_b);
create index if not exists buzon_contactos_solicitante on public.buzon_contactos (solicitante);

create or replace function public.buzon_pull(p_desde bigint)
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
        from buzon_hilos h
        cross join lateral (
          select *
            from buzon_mensajes x
           where x.hilo_id = h.id and x.server_seq > v_desde
           order by x.server_seq
           limit 200
        ) m
       where h.usuario_a = v_uid or h.usuario_b = v_uid
       order by m.server_seq
       limit 200
    ) f;
  return jsonb_build_object('mensajes', v_rows, 'max_seq', coalesce(v_max, v_desde), 'mas', v_n >= 200);
end;
$$;

-- 4) Retratos bajo demanda ----------------------------------------------------------
--
-- `buzon_listar_contactos` corre cada 2 minutos, al volver a la pestaña y con
-- cada evento de contactos, y mandaba el retrato de cada contacto (hasta 64 KB
-- en base64). Con `p_sin_retrato` manda solo una huella (`retrato_v`) y el
-- cliente pide con `buzon_retratos` los que no tiene o cambiaron. Sin el
-- parámetro responde como antes: las versiones viejas de las tiendas siguen igual.

drop function if exists public.buzon_listar_contactos();

create function public.buzon_listar_contactos(p_sin_retrato boolean default false)
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
      'retrato', case when p_sin_retrato then null else p.retrato end,
      'retrato_v', case when p.retrato is null then null else left(md5(p.retrato), 12) end,
      'estado', c.estado,
      'direccion', case when c.solicitante = v_uid then 'enviada' else 'recibida' end,
      'bloqueado_por_mi', c.bloqueado_por = v_uid,
      'actualizado_en', c.actualizado_en
    ) order by c.actualizado_en desc), '[]'::jsonb)
    into v_lista
    from buzon_contactos c
    join perfiles p on p.user_id = case when c.solicitante = v_uid then c.destinatario else c.solicitante end
    left join buzon_hilos h on h.contacto_id = c.id
   where (c.solicitante = v_uid or c.destinatario = v_uid)
     and not (c.estado = 'bloqueado' and c.bloqueado_por <> v_uid);
  return jsonb_build_object('contactos', v_lista);
end;
$$;

revoke execute on function public.buzon_listar_contactos(boolean) from public, anon;
grant execute on function public.buzon_listar_contactos(boolean) to authenticated;

-- Retratos de MIS contactos (los ajenos no salen): {contacto_id: data URL}.
create function public.buzon_retratos(p_contactos uuid[])
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
  return jsonb_build_object('retratos', coalesce((
    select jsonb_object_agg(c.id, p.retrato)
      from buzon_contactos c
      join perfiles p on p.user_id = case when c.solicitante = v_uid then c.destinatario else c.solicitante end
     where c.id = any (p_contactos[1:50])
       and (c.solicitante = v_uid or c.destinatario = v_uid)
       and not (c.estado = 'bloqueado' and c.bloqueado_por <> v_uid)
       and p.retrato is not null), '{}'::jsonb));
end;
$$;

revoke execute on function public.buzon_retratos(uuid[]) from public, anon;
grant execute on function public.buzon_retratos(uuid[]) to authenticated;

-- 5) Respuestas de IA compartidas ----------------------------------------------------
--
-- Peticiones que son idénticas para todos (las efemérides de un día en un
-- idioma, la ficha de una película, los macros de «2 huevos revueltos»): el
-- cliente las marca `compartible` y `ia-chat` guarda la respuesta 7 días bajo
-- el SHA-256 de la petición entera. Como la clave es la petición completa,
-- nadie puede envenenar la respuesta de otra: solo acierta quien pide
-- exactamente lo mismo. Un acierto no llama al modelo ni cobra créditos.

create table public.ia_respuestas (
  clave     text primary key,
  texto     text not null,
  creado_en timestamptz not null default now()
);
alter table public.ia_respuestas enable row level security;

-- 6) Retención ------------------------------------------------------------------------
--
-- Tablas que solo crecían. SQL puro en un cron diario (sin Edge Function ni
-- secretos). Los tombstones de `registros` se quedan: pesan poco (sin datos) y
-- purgarlos obligaría a resincronizar a los dispositivos atrasados.

create function public.retencion_diaria()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v jsonb := '{}';
  n int;
begin
  delete from rate_limits where ventana_inicio < now() - interval '1 day';
  get diagnostics n = row_count; v := v || jsonb_build_object('rate_limits', n);

  delete from partidas where estado = 'cerrada' and latido_en < now() - interval '7 days';
  get diagnostics n = row_count; v := v || jsonb_build_object('partidas', n);

  delete from compras_log where recibido_en < now() - interval '90 days';
  get diagnostics n = row_count; v := v || jsonb_build_object('compras_log', n);

  delete from enlaces_archivo
   where (revocado or expira_en < now()) and coalesce(expira_en, creado_en) < now() - interval '30 days';
  get diagnostics n = row_count; v := v || jsonb_build_object('enlaces_archivo', n);

  delete from ia_respuestas where creado_en < now() - interval '7 days';
  get diagnostics n = row_count; v := v || jsonb_build_object('ia_respuestas', n);

  delete from capacidad_metricas where dia < (now() at time zone 'utc')::date - 400;
  get diagnostics n = row_count; v := v || jsonb_build_object('capacidad_metricas', n);
  return v;
end;
$$;

revoke execute on function public.retencion_diaria() from public, anon, authenticated;

select cron.unschedule('retencion-diaria')
where exists (select 1 from cron.job where jobname = 'retencion-diaria');
select cron.schedule('retencion-diaria', '23 6 * * *', $job$ select public.retencion_diaria(); $job$);

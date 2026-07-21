-- Tabla genérica de sincronización: un registro JSONB por fila local de Dexie.
-- El servidor NUNCA interpreta `datos`; el cursor de pull es `server_seq`
-- (asignado aquí) y `updated_at` (época ms del cliente) SOLO resuelve LWW.

create sequence public.registros_seq;

create table public.registros (
  user_id uuid not null references auth.users (id) on delete cascade,
  tabla text not null,
  uid text not null,
  datos jsonb,
  deleted boolean not null default false,
  updated_at bigint not null,
  server_seq bigint not null default nextval('public.registros_seq'),
  primary key (user_id, tabla, uid)
);

create index registros_pull on public.registros (user_id, server_seq);

alter table public.registros enable row level security;

create policy "registros propios: leer"
  on public.registros for select
  using (auth.uid() = user_id);

-- Push por lotes con guarda LWW. `user_id` SIEMPRE es auth.uid(): se ignora
-- cualquier user_id del payload. Cada cambio: {tabla, uid, datos, deleted, updatedAt}.
create function public.sync_push(p_cambios jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_c jsonb;
  v_aplicados int := 0;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;

  for v_c in select * from jsonb_array_elements(coalesce(p_cambios, '[]'::jsonb)) loop
    if coalesce(v_c->>'tabla', '') = '' or coalesce(v_c->>'uid', '') = '' then
      continue;
    end if;
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
    where excluded.updated_at >= registros.updated_at;
    if found then
      v_aplicados := v_aplicados + 1;
    end if;
  end loop;

  return jsonb_build_object('aplicados', v_aplicados);
end;
$$;

revoke execute on function public.sync_push(jsonb) from anon;

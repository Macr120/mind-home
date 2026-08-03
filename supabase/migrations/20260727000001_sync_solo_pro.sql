-- El sync entre dispositivos es exclusivo del plan Pro VIGENTE: quien cancela
-- conserva sus datos locales, pero los registros y blobs remotos quedan
-- inaccesibles (sin borrarse) hasta renovar. Gate en las tres puertas del
-- servidor: lectura de registros (pull), sync_push (push) y storage (blobs).

create function public.tiene_pro(p_uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
      from perfiles
     where user_id = p_uid
       and plan = 'pro'
       and (plan_expira is null or plan_expira > now())
  )
$$;

-- Pull: leer registros exige Pro vigente.
alter policy "registros propios: leer"
  on public.registros
  using (auth.uid() = user_id and public.tiene_pro(auth.uid()));

-- Push: mismo cuerpo que 20260719000004 + gate 'sin-pro' al inicio (el motor
-- del cliente mapea ese error a un mensaje amable y detiene el sync).
create or replace function public.sync_push(p_cambios jsonb)
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
  if not public.tiene_pro(v_uid) then
    return jsonb_build_object('error', 'sin-pro');
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

-- Blobs: carpeta propia + Pro vigente.
alter policy "sync-blobs propios"
  on storage.objects
  using (
    bucket_id = 'sync-blobs'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.tiene_pro(auth.uid())
  )
  with check (
    bucket_id = 'sync-blobs'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.tiene_pro(auth.uid())
  );

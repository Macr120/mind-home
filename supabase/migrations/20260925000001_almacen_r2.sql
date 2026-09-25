-- Almacenamiento en Cloudflare R2 con cuota por nivel (25-sep-2026).
--
-- Por qué: los archivos del sync y los del cuarto Archivo pasan de Supabase
-- Storage a R2 (egress gratis). Supabase sigue siendo el cerebro: esta tabla es
-- el registro de lo que cada usuario tiene en R2 y la única fuente de la cuota.
-- Los bytes nunca pasan por aquí: la Edge Function `almacen` firma URLs y el
-- cliente sube/baja directo contra R2.
--
-- Claves: el cliente habla en claves RELATIVAS (`sync/<tabla>/<uid>/<campo>`,
-- `archivo/<uid>`); la función antepone `<user_id>/` al firmar, así nadie puede
-- tocar la carpeta de otro.
--
-- Cuota: Pro ×1 = 10 GiB, ×2 = 30 GiB, ×3 = 100 GiB; trial = 10 GiB; cuenta
-- ilimitada = sin tope; el resto = 0 (solo lectura: quien cancela conserva y
-- puede bajar lo suyo, pero no subir). Tope por archivo: 2 GiB.
--
-- Reserva → confirmación: `almacen_reservar` apunta los bytes DECLARADOS antes
-- de firmar el PUT (estado 'pendiente'); `almacen_confirmar` los corrige con el
-- tamaño REAL que da el HEAD de R2 y vuelve a mirar la cuota. Las reservas que
-- nadie confirmó en 1 h las devuelve `almacen_vencidos` para que la función
-- borre el objeto en R2 (la URL firmada dura 15 min).
--
-- Disciplina del repo: RLS con solo SELECT propio; RPCs `security definer`
-- revocadas de public/anon/authenticated y concedidas a service_role (patrón de
-- la cuota de IA, 20260803000001).

create table public.almacen_objetos (
  user_id   uuid not null references auth.users (id) on delete cascade,
  clave     text not null check (char_length(clave) between 1 and 400),
  bytes     bigint not null check (bytes >= 0),
  mime      text not null default 'application/octet-stream',
  estado    text not null default 'pendiente' check (estado in ('pendiente', 'listo')),
  creado_en timestamptz not null default now(),
  primary key (user_id, clave)
);

create index almacen_pendientes on public.almacen_objetos (user_id, creado_en) where estado = 'pendiente';

alter table public.almacen_objetos enable row level security;

create policy "almacen_objetos: leer los propios"
  on public.almacen_objetos for select to authenticated
  using (user_id = auth.uid());

-- Cuota en bytes; NULL = sin tope (cuenta ilimitada).
create function public.cuota_almacen(p_uid uuid)
returns bigint
language sql
stable
security definer set search_path = public
as $$
  select case
           when p.ilimitado then null
           when p.plan = 'pro' and (p.plan_expira is null or p.plan_expira > now())
             then (case p.nivel when 1 then 10 when 2 then 30 else 100 end)::bigint * 1073741824
           when p.plan = 'trial' and (p.plan_expira is null or p.plan_expira > now())
             then 10::bigint * 1073741824
           else 0
         end
    from perfiles p
   where p.user_id = p_uid;
$$;

create function public.almacen_uso(p_uid uuid)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'usados', coalesce((select sum(bytes) from almacen_objetos where user_id = p_uid), 0),
    'cuota', public.cuota_almacen(p_uid)
  );
$$;

-- Reservas sin confirmar de más de 1 h: se borran aquí y la función borra sus
-- objetos en R2. Devuelve las claves.
create function public.almacen_vencidos(p_uid uuid)
returns setof text
language sql
security definer set search_path = public
as $$
  delete from almacen_objetos
   where user_id = p_uid
     and estado = 'pendiente'
     and creado_en < now() - interval '1 hour'
  returning clave;
$$;

-- 'ok' | 'sin-pro' | 'cuota' | 'grande'
create function public.almacen_reservar(p_uid uuid, p_clave text, p_bytes bigint, p_mime text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_cuota  bigint;
  v_usados bigint;
begin
  -- Serializa las reservas del mismo usuario: dos subidas simultáneas no
  -- pueden colarse ambas por el mismo hueco de cuota.
  perform 1 from perfiles where user_id = p_uid for update;
  if not found then return 'sin-pro'; end if;

  v_cuota := public.cuota_almacen(p_uid);
  if v_cuota = 0 then return 'sin-pro'; end if;
  if p_bytes < 0 or p_bytes > 2147483648 then return 'grande'; end if;

  select coalesce(sum(bytes), 0) into v_usados
    from almacen_objetos
   where user_id = p_uid and clave <> p_clave;
  if v_cuota is not null and v_usados + p_bytes > v_cuota then return 'cuota'; end if;

  -- Reemplazar una clave que ya estaba 'listo' la deja 'listo' con el mayor de
  -- los dos tamaños: si la subida nueva nunca se confirma, el objeto viejo
  -- sigue en R2 y sigue contando (no lo purga `almacen_vencidos`).
  insert into almacen_objetos (user_id, clave, bytes, mime)
  values (p_uid, p_clave, p_bytes, coalesce(nullif(p_mime, ''), 'application/octet-stream'))
  on conflict (user_id, clave) do update
    set bytes = greatest(almacen_objetos.bytes, excluded.bytes),
        mime = excluded.mime,
        creado_en = case when almacen_objetos.estado = 'pendiente' then now() else almacen_objetos.creado_en end;
  return 'ok';
end;
$$;

-- Tamaño real tras el PUT. 'ok' | 'cuota' (el objeto real no cabe: la función
-- lo borra de R2 y aquí se suelta la fila) | 'sin-reserva'.
create function public.almacen_confirmar(p_uid uuid, p_clave text, p_bytes bigint)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_cuota  bigint;
  v_usados bigint;
begin
  perform 1 from perfiles where user_id = p_uid for update;
  perform 1 from almacen_objetos where user_id = p_uid and clave = p_clave;
  if not found then return 'sin-reserva'; end if;

  v_cuota := public.cuota_almacen(p_uid);
  select coalesce(sum(bytes), 0) into v_usados
    from almacen_objetos
   where user_id = p_uid and clave <> p_clave;
  if p_bytes > 2147483648 or (v_cuota is not null and v_usados + p_bytes > v_cuota) then
    delete from almacen_objetos where user_id = p_uid and clave = p_clave;
    return 'cuota';
  end if;

  update almacen_objetos
     set bytes = p_bytes, estado = 'listo'
   where user_id = p_uid and clave = p_clave;
  return 'ok';
end;
$$;

-- Suelta claves sueltas y/o todo lo que cuelga de un prefijo (`sync/<tabla>/<uid>`).
-- Devuelve las claves soltadas para que la función las borre de R2.
create function public.almacen_liberar(p_uid uuid, p_claves text[], p_prefijo text default null)
returns setof text
language sql
security definer set search_path = public
as $$
  delete from almacen_objetos
   where user_id = p_uid
     and (clave = any (coalesce(p_claves, '{}'))
          or (p_prefijo is not null and p_prefijo <> ''
              and left(clave, char_length(p_prefijo) + 1) = p_prefijo || '/'))
  returning clave;
$$;

-- Alta directa de un objeto ya subido (script de migración de `sync-blobs`).
create function public.almacen_registrar(p_uid uuid, p_clave text, p_bytes bigint, p_mime text)
returns void
language sql
security definer set search_path = public
as $$
  insert into almacen_objetos (user_id, clave, bytes, mime, estado)
  values (p_uid, p_clave, p_bytes, coalesce(nullif(p_mime, ''), 'application/octet-stream'), 'listo')
  on conflict (user_id, clave) do update
    set bytes = excluded.bytes, mime = excluded.mime, estado = 'listo';
$$;

revoke execute on function public.cuota_almacen(uuid) from public, anon, authenticated;
revoke execute on function public.almacen_uso(uuid) from public, anon, authenticated;
revoke execute on function public.almacen_vencidos(uuid) from public, anon, authenticated;
revoke execute on function public.almacen_reservar(uuid, text, bigint, text) from public, anon, authenticated;
revoke execute on function public.almacen_confirmar(uuid, text, bigint) from public, anon, authenticated;
revoke execute on function public.almacen_liberar(uuid, text[], text) from public, anon, authenticated;
revoke execute on function public.almacen_registrar(uuid, text, bigint, text) from public, anon, authenticated;

grant execute on function public.cuota_almacen(uuid) to service_role;
grant execute on function public.almacen_uso(uuid) to service_role;
grant execute on function public.almacen_vencidos(uuid) to service_role;
grant execute on function public.almacen_reservar(uuid, text, bigint, text) to service_role;
grant execute on function public.almacen_confirmar(uuid, text, bigint) to service_role;
grant execute on function public.almacen_liberar(uuid, text[], text) to service_role;
grant execute on function public.almacen_registrar(uuid, text, bigint, text) to service_role;

-- Compartir un archivo de la nube con un enlace (27-sep-2026).
--
-- El dueño (con Pro) crea un enlace desde el cuarto Archivo: `almacen`
-- {accion:'compartir'}. Quien lo abre en mindhaos.com/d/<token> no necesita
-- cuenta: la función `archivo-publico` (verify_jwt=false) valida el enlace y
-- devuelve una URL firmada de R2 de 15 minutos.
--
-- Un enlace vale mientras:
--   - no venza (1, 7 o 30 días) ni lo revoque su dueño;
--   - el objeto siga contado en `almacen_objetos` (borrarlo o la purga de los
--     90 días quitan esa fila, y con ella el enlace muere solo);
--   - no pase de 200 descargas en el día (freno contra el abuso: un enlace
--     publicado en todas partes no convierte la cuenta en un CDN gratis).

create table public.enlaces_archivo (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  clave text not null,
  nombre text not null,
  mime text not null default '',
  bytes bigint not null default 0,
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null,
  revocado boolean not null default false,
  descargas integer not null default 0,
  dia date not null default current_date,
  descargas_dia integer not null default 0
);

create index enlaces_archivo_dueno on public.enlaces_archivo (user_id, clave);

-- Sin políticas: solo `service_role` (las funciones) la toca.
alter table public.enlaces_archivo enable row level security;

-- Cuenta una visita y dice si el enlace sirve. Atómica (`for update`): dos
-- visitas a la vez no se saltan el tope del día.
create function public.enlace_visitar(p_token text, p_tope integer default 200)
returns table (motivo text, dueno uuid, clave text, nombre text, mime text, bytes bigint)
language plpgsql
security definer set search_path = public
as $$
declare
  e public.enlaces_archivo;
begin
  select * into e from public.enlaces_archivo where token = p_token for update;
  if not found or e.revocado then
    return query select 'no-existe'::text, null::uuid, null::text, null::text, null::text, null::bigint;
    return;
  end if;
  if e.expira_en < now() then
    return query select 'vencido'::text, null::uuid, null::text, null::text, null::text, null::bigint;
    return;
  end if;
  if not exists (
    select 1 from public.almacen_objetos o
     where o.user_id = e.user_id and o.clave = e.clave and o.estado = 'listo'
  ) then
    return query select 'no-existe'::text, null::uuid, null::text, null::text, null::text, null::bigint;
    return;
  end if;
  if e.dia <> current_date then
    e.descargas_dia := 0;
  end if;
  if e.descargas_dia >= p_tope then
    return query select 'tope'::text, null::uuid, null::text, null::text, null::text, null::bigint;
    return;
  end if;
  update public.enlaces_archivo
     set descargas = descargas + 1,
         descargas_dia = e.descargas_dia + 1,
         dia = current_date
   where token = p_token;
  return query select 'ok'::text, e.user_id, e.clave, e.nombre, e.mime, e.bytes;
end;
$$;

revoke execute on function public.enlace_visitar(text, integer) from public, anon, authenticated;
grant execute on function public.enlace_visitar(text, integer) to service_role;

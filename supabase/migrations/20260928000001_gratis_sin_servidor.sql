-- Las cuentas sin compra no guardan nada en el servidor (28-sep-2026).
--
-- Por qué: PuertaUnlock solo cerraba la INTERFAZ. Con una sesión cualquiera
-- podía fijar alias y retrato, pedir contactos, escribir en el buzón, abrir
-- partidas y crear espacios, todo sin haber pagado nada. La decisión: quien no
-- tiene el unlock (ni plan vigente) no escribe en el servidor, y su cuenta se
-- borra sola a los 3 días si no compra.
--
-- En vez de reescribir cada RPC, un trigger BEFORE en las tablas donde nace lo
-- social. Así cubre también las RPCs futuras. Los accesos de servicio
-- (webhook, Edge Functions con service_role) llegan con `auth.uid()` nulo y
-- pasan. Los buckets y los canales Realtime ya exigen ser miembro de un hilo,
-- sala o espacio, y sin poder crear filas nadie llega a ser miembro, así que
-- sus policies no se tocan.

-- 1) ¿Pagó algo? ------------------------------------------------------------------

create function public.pago(p_uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
      from perfiles
     where user_id = p_uid
       and (unlock
            or ilimitado
            or (plan in ('pro', 'trial') and (plan_expira is null or plan_expira > now())))
  )
$$;

revoke execute on function public.pago(uuid) from public, anon, authenticated;
grant execute on function public.pago(uuid) to service_role;

-- 2) Guardas ------------------------------------------------------------------------

create function public.exigir_pago()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.pago(auth.uid()) then
    raise exception 'sin-unlock' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Perfil: solo las columnas del buzón. El resto lo escribe el servidor.
create function public.exigir_pago_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null
     and (new.alias, new.nombre, new.emoji, new.retrato, new.normas_aceptadas)
         is distinct from (old.alias, old.nombre, old.emoji, old.retrato, old.normas_aceptadas)
     and not public.pago(auth.uid()) then
    raise exception 'sin-unlock' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.exigir_pago() from public, anon, authenticated;
revoke execute on function public.exigir_pago_perfil() from public, anon, authenticated;

create trigger exigir_pago before insert on public.buzon_contactos
  for each row execute function public.exigir_pago();
create trigger exigir_pago before insert on public.buzon_hilos
  for each row execute function public.exigir_pago();
create trigger exigir_pago before insert on public.buzon_mensajes
  for each row execute function public.exigir_pago();
create trigger exigir_pago before insert on public.partidas
  for each row execute function public.exigir_pago();
create trigger exigir_pago before insert on public.partida_jugadores
  for each row execute function public.exigir_pago();
create trigger exigir_pago before insert on public.espacios
  for each row execute function public.exigir_pago();
create trigger exigir_pago before insert on public.espacio_miembros
  for each row execute function public.exigir_pago();
create trigger exigir_pago before insert on public.espacio_cambios
  for each row execute function public.exigir_pago();
create trigger exigir_pago_perfil before update on public.perfiles
  for each row execute function public.exigir_pago_perfil();

-- 3) Purga de cuentas sin compra a los 3 días -------------------------------------
--
-- Sin Edge Function: una cuenta que nunca pagó no pudo subir nada a Storage ni a
-- R2, así que basta con borrar la fila de `auth.users`; todas las tablas que la
-- referencian caen en cascada. Se salva quien tenga cualquier rastro de pago:
-- unlock, plan, fue Pro, créditos, cupón canjeado, compra confirmada, evento de
-- RevenueCat o correo en el padrón de ilimitados.

create function public.cuentas_purgables(p_limite int default 500)
returns setof uuid
language sql
stable
security definer set search_path = public, auth
as $$
  select u.id
    from auth.users u
    join public.perfiles p on p.user_id = u.id
   where u.created_at < now() - interval '3 days'
     -- Las cuentas anteriores a esta migración son testers: nunca se purgan.
     and u.created_at >= timestamptz '2026-09-26 06:00:00+00'
     and p.plan = 'local'
     and not p.unlock
     and not p.ilimitado
     and not p.fue_pro
     and p.creditos_extra = 0
     and not exists (select 1 from public.cupones_canjes c where c.user_id = u.id)
     and not exists (select 1 from public.compras_log l
                      where l.user_id = u.id and l.resultado = 'ok'
                        and l.paso in ('compra', 'confirmar'))
     and not exists (select 1 from public.rc_eventos e where e.app_user_id = u.id::text)
     and not exists (select 1 from public.cuentas_ilimitadas i where i.correo = lower(u.email))
   order by u.created_at
   limit p_limite
$$;

create function public.cuentas_purgar()
returns int
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_n int;
begin
  delete from auth.users where id in (select public.cuentas_purgables());
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.cuentas_purgables(int) from public, anon, authenticated;
revoke execute on function public.cuentas_purgar() from public, anon, authenticated;

create extension if not exists pg_cron with schema extensions;

select cron.unschedule('cuentas-purga-diaria')
where exists (select 1 from cron.job where jobname = 'cuentas-purga-diaria');

-- 06:07 UTC: lejos de redes-mantenimiento (04:17) y almacen-purga (05:41).
select cron.schedule('cuentas-purga-diaria', '7 6 * * *', $job$ select public.cuentas_purgar(); $job$);

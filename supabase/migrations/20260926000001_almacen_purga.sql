-- Purga de la nube a los 90 días de quedarse sin plan (26-sep-2026).
--
-- Por qué: la cuota de `almacen_objetos` (20260925000001) deja a quien cancela
-- en solo lectura, pero sus archivos seguían en R2 para siempre, pagados por
-- nosotros. La política decidida: 90 días para bajarlos y luego se borran.
--
-- Hasta hoy no se sabía CUÁNDO se canceló: `aplicarExpiracion` (webhook de
-- RevenueCat) pone `plan_expira = null`. Nace `perfiles.sin_plan_desde`, que
-- escribe el webhook al expirar y limpia al reactivar. El trial vencido no pasa
-- por el webhook (expiración perezosa: se queda en 'trial' con `plan_expira` en
-- el pasado), así que para él cuenta `plan_expira`.
--
-- La función `almacen-purga` (verify_jwt=false + secreto `ALMACEN_PURGA_AUTH`)
-- la llama un cron diario. Los dos secretos viven en Vault, NO en este archivo:
--
--   select vault.create_secret(
--     'https://<ref>.supabase.co/functions/v1/almacen-purga', 'almacen_purga_url');
--   select vault.create_secret('<el mismo valor que ALMACEN_PURGA_AUTH>',
--     'almacen_purga_auth');
--
-- Sin ellos el job corre y no hace nada. Comprobar con
-- `select * from cron.job_run_details order by start_time desc limit 5;`.

-- 1) Desde cuándo está sin plan ---------------------------------------------------

alter table public.perfiles add column if not exists sin_plan_desde timestamptz;

-- Backfill: los ex-Pro toman su última EXPIRATION; sin evento registrado, hoy
-- (el reloj de 90 días empieza ahora en vez de borrar de golpe).
update public.perfiles p
   set sin_plan_desde = coalesce(
         (select max(e.recibido_en) from public.rc_eventos e
           where e.tipo = 'EXPIRATION' and e.app_user_id = p.user_id::text),
         now())
 where p.plan = 'local' and p.fue_pro and p.sin_plan_desde is null;

-- 2) Candidatos a purga -----------------------------------------------------------

create function public.almacen_purgables(p_limite int default 200)
returns setof uuid
language sql
stable
security definer set search_path = public
as $$
  select o.user_id
    from (select distinct user_id from almacen_objetos) o
    join perfiles p on p.user_id = o.user_id
   where not p.ilimitado
     and public.cuota_almacen(o.user_id) = 0
     and coalesce(p.sin_plan_desde, case when p.plan = 'trial' then p.plan_expira end)
         < now() - interval '90 days'
   limit greatest(1, least(p_limite, 1000));
$$;

-- 3) Tras borrar sus objetos en R2 ----------------------------------------------------
-- Suelta la cuota y tombstonea los archivos del cuarto Archivo (solo existían en
-- la nube: sin esto sus otros dispositivos enseñarían archivos que ya no abren).
-- Los medios del Studio NO se tocan: el dispositivo que los creó conserva su
-- copia local. Mismo candado que `sync_push`, para no abrir huecos de server_seq.

create function public.almacen_purgar(p_uid uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('sync_push:' || p_uid::text));
  update registros
     set deleted = true,
         datos = null,
         updated_at = (extract(epoch from now()) * 1000)::bigint,
         server_seq = nextval('public.registros_seq')
   where user_id = p_uid and tabla = 'archivosNube' and not deleted;
  delete from almacen_objetos where user_id = p_uid;
end;
$$;

revoke execute on function public.almacen_purgables(int) from public, anon, authenticated;
revoke execute on function public.almacen_purgar(uuid) from public, anon, authenticated;
grant execute on function public.almacen_purgables(int) to service_role;
grant execute on function public.almacen_purgar(uuid) to service_role;

-- 4) Cron diario --------------------------------------------------------------------

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('almacen-purga-diaria')
where exists (select 1 from cron.job where jobname = 'almacen-purga-diaria');

-- 05:41 UTC: otro minuto que el de redes-mantenimiento (04:17).
select cron.schedule(
  'almacen-purga-diaria',
  '41 5 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'almacen_purga_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'almacen_purga_auth')
    ),
    body := '{}'::jsonb
  );
  $job$
);

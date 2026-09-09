-- Poda diaria de conexiones inactivas de redes sociales.
--
-- Por qué: la auditoría de YouTube API Services (Developer Policies III.E.4)
-- exige refrescar o borrar lo almacenado al menos cada 30 días. MPH no guarda
-- API Data de YouTube —solo la credencial OAuth, que la política permite
-- conservar hasta que el usuario revoque—, pero `cuentaVigente` solo refresca
-- al publicar: quien conecta una cuenta y nunca publica dejaba su fila de
-- `redes_cuentas` ahí para siempre. Este cron llama cada día a la Edge Function
-- `redes-mantenimiento`, que revalida las filas dormidas contra el proveedor y
-- borra las que ya no sirven.
--
-- Los dos secretos viven en Vault, NO en este archivo (la migración va a git):
--
--   select vault.create_secret(
--     'https://<ref>.supabase.co/functions/v1/redes-mantenimiento',
--     'redes_mantenimiento_url');
--   select vault.create_secret('<el mismo valor que REDES_MANTENIMIENTO_AUTH>',
--     'redes_mantenimiento_auth');
--
-- Sin ellos el job corre igual pero `net.http_post` recibe url nula y no hace
-- nada: no rompe, solo no poda. Comprobar con
-- `select * from cron.job_run_details order by start_time desc limit 5;`.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Idempotente: si la migración se reaplica, se reemplaza el job en vez de
-- duplicarlo (dos jobs con el mismo nombre son dos llamadas al día).
select cron.unschedule('redes-mantenimiento-diario')
where exists (select 1 from cron.job where jobname = 'redes-mantenimiento-diario');

-- 04:17 UTC: fuera de la hora punta y con minuto no redondo, para no coincidir
-- con el resto de crons del mundo.
select cron.schedule(
  'redes-mantenimiento-diario',
  '17 4 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'redes_mantenimiento_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'redes_mantenimiento_auth')
    ),
    body := '{}'::jsonb
  );
  $job$
);

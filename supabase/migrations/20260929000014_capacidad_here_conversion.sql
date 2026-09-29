-- Dos métricas más para el panel Capacidad (auditoría de escalabilidad,
-- 25-sep-2026):
-- - `transporte_mes`: búsquedas de transporte público del mes (op `transporte`,
--   Edge Function `navegar`). El plan Base de HERE regala 2 500 al mes para
--   toda la app; en amarillo toca revisar el plan de HERE, porque cada búsqueda
--   ya se cobra a 1 crédito y el excedente sale a ~$2.50 por mil.
-- - `conversion_pro_pct`: % de quienes compraron la casa que hoy tienen Pro.
--   Por debajo del ~6 % la infraestructura depende de vender unlocks nuevos
--   (COSTOS.md § Escalabilidad por etapas). Solo informa: el semáforo avisa
--   cuando un valor SUBE, y aquí lo malo es que baje.
--
-- Copia íntegra de `capacidad_medir` (20260928000002) + las dos líneas nuevas.

insert into public.capacidad_umbrales (plan, metrica, amarillo, rojo, accion, orden) values
  ('free', 'transporte_mes', 1750, 2500, 'here-cupo', 6),
  ('pro',  'transporte_mes', 1750, 2500, 'here-cupo', 6);

create or replace function public.capacidad_medir()
returns void
language plpgsql
security definer set search_path = public, auth, storage
as $$
declare
  v_hoy date := (now() at time zone 'utc')::date;
  v_ahora timestamp := now() at time zone 'utc';
begin
  perform capacidad_guardar('cuentas', (select count(*) from auth.users));
  perform capacidad_guardar('cuentas_pago', (select count(*) from public.perfiles p where public.pago(p.user_id)));
  perform capacidad_guardar('cuentas_pro', (select count(*) from public.perfiles
    where plan = 'pro' and (plan_expira is null or plan_expira > now())));
  perform capacidad_guardar('cuentas_trial', (select count(*) from public.perfiles
    where plan = 'trial' and plan_expira > now()));

  perform capacidad_guardar('activos_hora_max', (select count(distinct user_id) from auth.sessions
    where coalesce(refreshed_at, updated_at) > v_ahora - interval '1 hour'), true);
  perform capacidad_guardar('activos_dia', (select count(distinct user_id) from auth.sessions
    where coalesce(refreshed_at, updated_at) >= v_hoy), true);
  perform capacidad_guardar('activos_30d', (select count(*) from auth.users
    where last_sign_in_at > now() - interval '30 days'
       or id in (select user_id from auth.sessions
                  where coalesce(refreshed_at, updated_at) > v_ahora - interval '30 days')));

  perform capacidad_guardar('bd_mb', round(pg_database_size(current_database()) / 1048576.0, 1));
  perform capacidad_guardar('storage_mb', round(coalesce((select sum((metadata->>'size')::bigint)
    from storage.objects), 0) / 1048576.0, 1));
  perform capacidad_guardar('r2_gb', round(coalesce((select sum(bytes) from public.almacen_objetos), 0)
    / 1073741824.0, 2));

  perform capacidad_guardar('partidas_dia', (select count(*) from public.partidas where creada_en >= v_hoy));
  perform capacidad_guardar('mensajes_dia', (select count(*) from public.buzon_mensajes where creado_en >= v_hoy));
  perform capacidad_guardar('ia_dia', (select count(*) from public.uso_ia_llamadas where creado >= v_hoy));

  perform capacidad_guardar('transporte_mes', (select coalesce(sum(llamadas), 0) from public.uso_ia_ops
    where op = 'transporte' and periodo = to_char(v_hoy, 'YYYY-MM')));
  perform capacidad_guardar('conversion_pro_pct', (select round(100.0
      * count(*) filter (where plan = 'pro' and (plan_expira is null or plan_expira > now()))
      / nullif(count(*), 0), 1)
    from public.perfiles where unlock and not ilimitado));
end;
$$;

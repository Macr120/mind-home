-- Tres niveles y la casa gratis (5-oct-2026).
--
-- Se dejan de vender el pago único de la casa, el anual y la recarga: solo
-- quedan las suscripciones Nivel 1/2/3 (7/14/20 USD). Registrarse y usar la
-- casa es gratis, también lo social (buzón, partidas, espacios) con los topes
-- diarios de 20260929000012. Lo que cuesta dinero (IA, sync, nube) sigue
-- exigiendo plan vigente por `consumir_cuota_ia`, `tiene_pro` y `cuota_almacen`.

-- 1) Lo social deja de exigir el unlock: basta con tener perfil. -------------------
-- `exigir_pago` y `exigir_pago_perfil` siguen colgando de esta función, así que
-- no hace falta tocar los triggers.
create or replace function public.pago(p_uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from perfiles where user_id = p_uid)
$$;

-- 2) Los topes diarios pasan a valer para cualquiera sin plan vigente. --------------
-- Se conserva el nombre para no reescribir los triggers que la usan.
create or replace function public.solo_unlock(p_uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
      from perfiles
     where user_id = p_uid
       and not ilimitado
       and not (plan in ('pro', 'trial') and (plan_expira is null or plan_expira > now()))
  )
$$;

-- 3) Las cuentas gratis ya no se borran a los 3 días. ------------------------------
select cron.unschedule('cuentas-purga-diaria')
where exists (select 1 from cron.job where jobname = 'cuentas-purga-diaria');

-- 4) Capacidad: «de pago» = con plan vigente, y la conversión se mide sobre todas
-- las cuentas (antes, sobre las que compraron la casa). Copia íntegra de
-- `capacidad_medir` (20260929000014) con esas dos líneas cambiadas.
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
  perform capacidad_guardar('cuentas_pago', (select count(*) from public.perfiles
    where ilimitado or (plan in ('pro', 'trial') and (plan_expira is null or plan_expira > now()))));
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
    from public.perfiles where not ilimitado));
end;
$$;

-- Endurecimiento de la auditoría de seguridad del 26-ago-2026.
--
-- 1) sync_reset() exige confirmación explícita (H-08). Borra toda la nube del
--    PROPIO usuario (usa auth.uid(), nunca datos ajenos), pero es destructiva:
--    ahora pide un parámetro `p_confirmar` en true para no dispararse por error.
-- 2) Límite de tasa por usuario para el proxy de IA (H-04). La cuota de créditos
--    ya frena el gasto, pero no la ráfaga: un usuario con saldo podía saturar el
--    proxy. `consumir_rate_limit` cuenta llamadas por ventana y solo la puede
--    ejecutar el service_role (las Edge Functions, con el uid ya validado).

-- 1) sync_reset con confirmación -------------------------------------------------

-- La firma cambia (antes no tenía parámetros): se retira la anterior para no
-- dejar una sobrecarga sin confirmación llamable por PostgREST.
drop function if exists public.sync_reset();

create or replace function public.sync_reset(p_confirmar boolean default false)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_borrados int;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  -- Salvaguarda contra un borrado accidental de la nube del usuario.
  if p_confirmar is not true then
    return jsonb_build_object('error', 'sin-confirmar');
  end if;
  delete from registros where user_id = v_uid;
  get diagnostics v_borrados = row_count;
  return jsonb_build_object('borrados', v_borrados);
end;
$$;

revoke execute on function public.sync_reset(boolean) from anon;

-- 2) Límite de tasa del proxy de IA ---------------------------------------------

create table if not exists public.rate_limits (
  uid uuid not null,
  bucket text not null,
  ventana_inicio timestamptz not null default now(),
  cuenta int not null default 0,
  primary key (uid, bucket)
);

-- RLS activada y SIN políticas: la tabla es interna, solo la toca el service_role
-- a través de la RPC. Ningún cliente la lee ni la escribe directamente.
alter table public.rate_limits enable row level security;

/**
 * Cuenta una llamada en la ventana fija (uid, bucket) y dice si sigue dentro del
 * máximo. Ventana vencida => se reinicia. Devuelve true si se permite la llamada.
 */
create or replace function public.consumir_rate_limit(
  p_uid uuid,
  p_bucket text,
  p_max int,
  p_ventana_seg int
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_cuenta int;
begin
  insert into public.rate_limits as rl (uid, bucket, ventana_inicio, cuenta)
    values (p_uid, p_bucket, now(), 1)
  on conflict (uid, bucket) do update
    set
      ventana_inicio = case
        when now() - rl.ventana_inicio > make_interval(secs => p_ventana_seg) then now()
        else rl.ventana_inicio end,
      cuenta = case
        when now() - rl.ventana_inicio > make_interval(secs => p_ventana_seg) then 1
        else rl.cuenta + 1 end
  returning rl.cuenta into v_cuenta;
  return v_cuenta <= p_max;
end;
$$;

-- Igual que las RPCs de cuota (20260803000001): fuera del alcance de anon y
-- authenticated; solo el service_role de las Edge Functions.
revoke execute on function public.consumir_rate_limit(uuid, text, int, int) from public;
revoke execute on function public.consumir_rate_limit(uuid, text, int, int) from anon;
revoke execute on function public.consumir_rate_limit(uuid, text, int, int) from authenticated;
grant execute on function public.consumir_rate_limit(uuid, text, int, int) to service_role;

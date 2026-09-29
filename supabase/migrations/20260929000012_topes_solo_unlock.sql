-- Topes diarios suaves para quien solo pagó el unlock (auditoría de precios,
-- 25-sep-2026).
--
-- Por qué: el unlock ($8.99) se paga una vez y deja usar el buzón, las
-- partidas y los espacios de por vida. Es un costo pequeño pero sin tope ni
-- ingreso recurrente. Pro y trial vigentes (y las cuentas ilimitadas) quedan
-- como estaban; los topes son para el uso normal de una persona, no para
-- cortarla.
--
-- Mismo mecanismo que `exigir_pago` (20260928000001): triggers BEFORE INSERT,
-- así cubren también las RPCs futuras. El contador es `consumir_rate_limit`
-- (20260826000001) con ventana de un día; el cliente convierte el 'tope-diario'
-- del raise en su aviso (`plan.topeDiario`).

-- 1) ¿Solo unlock? ---------------------------------------------------------------

create function public.solo_unlock(p_uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
      from perfiles
     where user_id = p_uid
       and unlock
       and not ilimitado
       and not (plan in ('pro', 'trial') and (plan_expira is null or plan_expira > now()))
  )
$$;

revoke execute on function public.solo_unlock(uuid) from public, anon, authenticated;
grant execute on function public.solo_unlock(uuid) to service_role;

-- 2) Topes --------------------------------------------------------------------------

-- Buzón: 15 mensajes con adjunto al día (el texto sigue con su 30/min).
create function public.tope_buzon_adjunto()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.adjunto is not null
     and auth.uid() is not null
     and public.solo_unlock(auth.uid())
     and not public.consumir_rate_limit(auth.uid(), 'dia-buzon-adjunto', 15, 86400) then
    raise exception 'tope-diario' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Partidas: 5 salas nuevas al día (además del 20 cada 30 días de `partida_crear`).
create function public.tope_partida()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null
     and public.solo_unlock(auth.uid())
     and not public.consumir_rate_limit(auth.uid(), 'dia-partida', 5, 86400) then
    raise exception 'tope-diario' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Espacios: como mucho 3 propios a la vez.
create function public.tope_espacios()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null
     and public.solo_unlock(auth.uid())
     and (select count(*) from espacios where dueno = new.dueno) >= 3 then
    raise exception 'tope-diario' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.tope_buzon_adjunto() from public, anon, authenticated;
revoke execute on function public.tope_partida() from public, anon, authenticated;
revoke execute on function public.tope_espacios() from public, anon, authenticated;

-- El nombre empieza después de `exigir_pago` en orden alfabético: Postgres
-- dispara los triggers por nombre, y así quien no pagó nada recibe 'sin-unlock'
-- antes de que se le cuente el tope.
create trigger tope_solo_unlock before insert on public.buzon_mensajes
  for each row execute function public.tope_buzon_adjunto();
create trigger tope_solo_unlock before insert on public.partidas
  for each row execute function public.tope_partida();
create trigger tope_solo_unlock before insert on public.espacios
  for each row execute function public.tope_espacios();

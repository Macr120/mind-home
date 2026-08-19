-- Alta de la compra hecha en una TIENDA. Desde ago 2026 la app se publica como
-- app de PAGO en Google Play y el App Store, y la web deja de venderla: allí
-- solo se pagan la suscripción y las recargas. Instalada = pagada, así que el
-- alta la pide la propia app nativa al registrar el correo y concede lo mismo
-- que concedía la compra del unlock por RevenueCat: `perfiles.unlock` + el
-- primer mes (plan 'trial' de 30 días con pool y sync).
--
-- El unlock es además lo que abre la casa en el NAVEGADOR: allí no hay tienda
-- que garantice nada, se entra con la cuenta que compró en el móvil.
--
-- Quién puede pedir el alta lo decide la Edge Function `alta-tienda`, que antes
-- verifica el recibo de la tienda (Play Integrity con veredicto LICENSED en
-- Android, recibo de aplicación en iOS; ver `_shared/reciboTienda.ts`). Esta
-- RPC solo la puede llamar service_role, así que aquí no se vuelve a comprobar.

-- De dónde vino la compra: 'android' | 'ios' (null = web/RevenueCat).
alter table public.perfiles add column tienda text;

create function public.alta_tienda(p_uid uuid, p_tienda text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_perfil perfiles%rowtype;
begin
  if p_uid is null then return 'invalido'; end if;

  -- FOR UPDATE: la app puede reintentar desde dos dispositivos a la vez.
  select * into v_perfil from perfiles where user_id = p_uid for update;
  if not found then return 'invalido'; end if;

  -- Idempotente: la app llama en cada arranque mientras no vea el unlock, así
  -- que el segundo intento no puede regalar otro mes.
  if v_perfil.unlock then return 'ya'; end if;

  -- El primer mes se concede salvo que ya haya un Pro vigente (a un suscriptor
  -- de pago no se le toca el plan). Mismo criterio que `canjear_cupon`.
  if v_perfil.plan = 'pro'
     and (v_perfil.plan_expira is null or v_perfil.plan_expira > now())
  then
    update perfiles set unlock = true, tienda = p_tienda where user_id = p_uid;
  else
    update perfiles
       set unlock = true,
           tienda = p_tienda,
           plan = 'trial',
           plan_expira = greatest(coalesce(plan_expira, now()), now()) + interval '30 days'
     where user_id = p_uid;
  end if;

  return 'ok';
end;
$$;

-- Solo el servidor da altas (patrón 20260803000001): por PostgREST cualquiera
-- se concedería la app y un mes de créditos.
revoke execute on function public.alta_tienda(uuid, text) from public, anon, authenticated;
grant execute on function public.alta_tienda(uuid, text) to service_role;

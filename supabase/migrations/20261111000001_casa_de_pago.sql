-- La casa vuelve a ser de pago (11-nov-2026): 5 USD, pago único.
--
-- Sin pagar se construye la casa en el modo probar (sin guardar). El pago
-- (`unlock`) guarda la casa, abre lo social con los topes diarios y trae una
-- semana de IA: plan 'trial' de 7 días con 175 créditos (TRIAL_DIAS en
-- `_shared/compras.ts`). La IA, el sync y la nube siguen siendo de suscripción.

-- 1) Regalo: toda cuenta que existe hoy se queda con su casa. ------------------------
update public.perfiles set unlock = true where not unlock;

-- 2) Lo social vuelve a exigir el pago (o un plan vigente). ---------------------------
-- Misma definición que 20260928000001; `exigir_pago` y `exigir_pago_perfil`
-- siguen colgando de aquí.
create or replace function public.pago(p_uid uuid)
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

-- 3) La semana de IA: el pool del trial es un cuarto del Nivel 1. ---------------------
update public.limites_plan set creditos_mes = 175 where plan = 'trial';

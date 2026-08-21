-- Cierra una fuga menor: `tiene_pro(uuid)` es SECURITY DEFINER y quedaba
-- ejecutable por cualquier `authenticated`, que —conociendo el uuid de otra
-- cuenta— podía averiguar si esa cuenta tiene plan pro/trial vigente (un bit).
--
-- Las policies de `registros`, la función `sync_push` y las de `sync-blobs`
-- SIEMPRE la llaman con `auth.uid()`, así que un guard que exige `p_uid =
-- auth.uid()` cierra la fuga SIN tocar ninguna policy ni revocar EXECUTE
-- (revocarla rompería esos accesos, que dependen de esta función). Para el
-- dueño el resultado es idéntico al anterior.
create or replace function public.tiene_pro(p_uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select p_uid is not distinct from auth.uid()
     and exists (
    select 1
      from perfiles
     where user_id = p_uid
       and plan in ('pro', 'trial')
       and (plan_expira is null or plan_expira > now())
  )
$$;

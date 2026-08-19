-- Cupones de acceso (testers y dueño): canjear uno equivale a comprar el
-- unlock — `perfiles.unlock = true` + el «primer mes» (plan trial), la misma
-- alta que hace el webhook de RevenueCat al ver `unlock_casa`. Sin pasar por
-- RevenueCat ni Stripe: es la vía para regalar acceso sin tarjeta.
--
-- Los códigos se crean a mano en el SQL editor del Dashboard (ver BACKEND.md
-- §Cupones); NUNCA se commitean códigos reales al repo. `usos_max` permite un
-- código compartido para una tanda de testers; `trial_dias` gradúa el regalo
-- (0 = solo unlock sin mes de IA; 365 = un año para el dueño).

-- 1) Catálogo y canjes. RLS sin policies: solo service_role (la Edge Function
--    `canjear-cupon`) las toca — mismo criterio que reservas_ia (20260803000001).
create table public.cupones (
  -- Siempre en MAYÚSCULAS; la RPC normaliza lo que teclea el usuario.
  codigo text primary key check (codigo = upper(codigo)),
  descripcion text not null default '',
  -- Cuántas cuentas distintas pueden canjearlo (1 = personal).
  usos_max integer not null default 1 check (usos_max > 0),
  -- Días de plan trial que concede (o prorroga) el canje.
  trial_dias integer not null default 30 check (trial_dias >= 0),
  activo boolean not null default true,
  creado timestamptz not null default now()
);

create table public.cupones_canjes (
  codigo text not null references public.cupones (codigo) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  canjeado timestamptz not null default now(),
  -- Una cuenta no canjea dos veces el mismo código.
  primary key (codigo, user_id)
);

alter table public.cupones enable row level security;
alter table public.cupones_canjes enable row level security;

-- 2) Canje atómico. El uid viaja como parámetro tras validar el JWT en la Edge
--    Function (patrón de 20260803000001). Devuelve un código de resultado:
--    'ok' | 'ya-canjeado' | 'invalido' (inexistente, inactivo O agotado: el
--    mismo mensaje a propósito, para no regalar pistas a quien adivina códigos).
create function public.canjear_cupon(p_uid uuid, p_codigo text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_cupon  cupones%rowtype;
  v_perfil perfiles%rowtype;
begin
  if p_uid is null then return 'invalido'; end if;

  -- FOR UPDATE: dos canjes simultáneos del mismo código se serializan y el
  -- conteo contra usos_max no se pasa de largo.
  select * into v_cupon
    from cupones
   where codigo = upper(trim(p_codigo)) and activo
     for update;
  if not found then return 'invalido'; end if;

  if exists (
    select 1 from cupones_canjes
     where codigo = v_cupon.codigo and user_id = p_uid
  ) then
    return 'ya-canjeado';
  end if;

  if (select count(*) from cupones_canjes where codigo = v_cupon.codigo)
     >= v_cupon.usos_max then
    return 'invalido';
  end if;

  insert into cupones_canjes (codigo, user_id) values (v_cupon.codigo, p_uid);

  -- El unlock se concede SIEMPRE. El trial se concede o se PRORROGA salvo que
  -- haya un Pro vigente (a un Pro de pago no se le toca el plan). Prorrogar en
  -- vez de fijar es lo que permite renovarle el acceso a un tester con otro
  -- cupón: se cuenta desde el vencimiento actual si todavía no ha pasado, así
  -- un cupón nunca acorta lo que ya tenías. Ojo: la expiración es PEREZOSA, así
  -- que un trial vencido conserva plan='trial' — por eso la condición no mira
  -- el plan, solo si hay un Pro con fecha viva.
  select * into v_perfil from perfiles where user_id = p_uid for update;
  if not found then return 'invalido'; end if;

  if v_cupon.trial_dias > 0
     and not (v_perfil.plan = 'pro'
              and (v_perfil.plan_expira is null or v_perfil.plan_expira > now()))
  then
    update perfiles
       set unlock = true,
           plan = 'trial',
           plan_expira = greatest(coalesce(plan_expira, now()), now())
                         + make_interval(days => v_cupon.trial_dias)
     where user_id = p_uid;
  else
    update perfiles set unlock = true where user_id = p_uid;
  end if;

  return 'ok';
end;
$$;

-- 3) Solo el servidor puede canjear (y nadie de la API de datos lee la tabla:
--    los códigos vigentes serían visibles con un SELECT).
revoke execute on function public.canjear_cupon(uuid, text) from public, anon, authenticated;
grant execute on function public.canjear_cupon(uuid, text) to service_role;

-- Varias cuentas por red (hasta 16) para las cuentas de la lista blanca
-- `REDES_MULTICUENTA_EMAILS` de las Edge Functions: un canal, Página o cuenta
-- por idioma. Cada conexión ocupa una «ranura» (0-15); el resto de usuarios
-- solo usa la 0, así que para ellos nada cambia.

alter table public.redes_cuentas
  add column ranura smallint not null default 0 check (ranura between 0 and 15);

alter table public.redes_cuentas drop constraint redes_cuentas_pkey;
alter table public.redes_cuentas add primary key (user_id, plataforma, ranura);

alter table public.redes_oauth_pendientes
  add column ranura smallint not null default 0 check (ranura between 0 and 15);

alter table public.redes_publicaciones
  add column ranura smallint not null default 0 check (ranura between 0 and 15);

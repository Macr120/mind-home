-- El boletín sale en el idioma en que está configurada MindHaOS.
--
-- La app guarda su idioma en `user_metadata.idioma` (al iniciar sesión y cada
-- vez que se cambia: `idiomaACuenta` en sesionStore.ts). Es el mismo dato con
-- el que salen los correos de Auth; aquí se copia a `boletin_suscripciones`
-- para que el boletín y la página de baja lo sigan.

create function public.boletin_idioma_cambio()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update boletin_suscripciones
     set idioma = left(new.raw_user_meta_data ->> 'idioma', 5)
   where user_id = new.id;
  return new;
exception when others then
  -- Corre dentro de las escrituras de Auth: un fallo aquí no debe tumbar un login.
  return new;
end;
$$;

revoke execute on function public.boletin_idioma_cambio() from public, anon, authenticated;

create trigger al_cambiar_idioma_boletin
  after update of raw_user_meta_data on auth.users
  for each row
  when (
    nullif(new.raw_user_meta_data ->> 'idioma', '') is not null
    and new.raw_user_meta_data ->> 'idioma' is distinct from old.raw_user_meta_data ->> 'idioma'
  )
  execute function public.boletin_idioma_cambio();

-- Las respuestas que ya existen toman el idioma actual de su cuenta.
update public.boletin_suscripciones s
   set idioma = left(u.raw_user_meta_data ->> 'idioma', 5)
  from auth.users u
 where u.id = s.user_id
   and nullif(u.raw_user_meta_data ->> 'idioma', '') is not null
   and s.idioma is distinct from left(u.raw_user_meta_data ->> 'idioma', 5);

-- Perfiles de cuenta: plan (local/pro) por usuario.
-- El plan lo escriben SOLO el trigger de alta y el webhook de RevenueCat
-- (service_role); el cliente únicamente lo lee (no hay policy de UPDATE).

create table public.perfiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'local' check (plan in ('local', 'pro')),
  plan_expira timestamptz,
  revenuecat_app_user_id text,
  created_at timestamptz not null default now()
);

alter table public.perfiles enable row level security;

create policy "perfil propio: leer"
  on public.perfiles for select
  using (auth.uid() = user_id);

-- Alta automática del perfil al crear el usuario.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (user_id, revenuecat_app_user_id)
  values (new.id, new.id::text);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

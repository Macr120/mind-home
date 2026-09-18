-- Buzón: retrato (busto del personaje 3D) en la identidad pública.
--
-- El cliente renderiza el busto de su avatar a una imagen pequeña (data URL
-- webp/png de ~10-30 KB) cada vez que cambia el diseño, y la sube con
-- `buzon_fijar_retrato`. Viaja con los contactos y con la búsqueda por alias,
-- igual que el alias, el nombre y el emoji. Va en `perfiles` (texto acotado) y
-- no en Storage: así no hace falta ninguna policy nueva y una lista de
-- contactos se resuelve en una sola RPC.

alter table public.perfiles add column if not exists retrato text;

alter table public.perfiles
  add constraint perfiles_retrato_forma check (
    retrato is null
    or (char_length(retrato) <= 65536 and retrato ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$')
  );

create function public.buzon_fijar_retrato(p_retrato text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if p_retrato is not null
     and (char_length(p_retrato) > 65536 or p_retrato !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$') then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if not consumir_rate_limit(v_uid, 'buzon-retrato', 20, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;
  update perfiles set retrato = p_retrato where user_id = v_uid;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.buzon_fijar_retrato(text) from public, anon;
grant execute on function public.buzon_fijar_retrato(text) to authenticated;

-- Mismo cuerpo que 20260916000001 + `retrato`.
create or replace function public.buzon_listar_contactos()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lista jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'contacto_id', c.id,
      'hilo_id', h.id,
      'alias', p.alias,
      'nombre', p.nombre,
      'emoji', p.emoji,
      'retrato', p.retrato,
      'estado', c.estado,
      'direccion', case when c.solicitante = v_uid then 'enviada' else 'recibida' end,
      'bloqueado_por_mi', c.bloqueado_por = v_uid,
      'actualizado_en', c.actualizado_en
    ) order by c.actualizado_en desc), '[]'::jsonb)
    into v_lista
    from buzon_contactos c
    join perfiles p on p.user_id = case when c.solicitante = v_uid then c.destinatario else c.solicitante end
    left join buzon_hilos h on h.contacto_id = c.id
   where v_uid in (c.solicitante, c.destinatario)
     and not (c.estado = 'bloqueado' and c.bloqueado_por <> v_uid);
  return jsonb_build_object('contactos', v_lista);
end;
$$;

-- Mismo cuerpo que 20260916000001 + `retrato`.
create or replace function public.buzon_buscar_alias(p_alias text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_alias text := lower(trim(coalesce(p_alias, '')));
  v_p perfiles;
  v_c buzon_contactos;
  v_estado text;
  v_hilo uuid;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if v_alias !~ '^[a-z0-9_]{3,20}$' then
    return jsonb_build_object('error', 'alias-invalido');
  end if;
  if not consumir_rate_limit(v_uid, 'buzon-buscar', 20, 60) then
    return jsonb_build_object('error', 'limite');
  end if;
  select * into v_p from perfiles where lower(alias) = v_alias;
  if not found then
    return jsonb_build_object('resultado', null);
  end if;
  if v_p.user_id = v_uid then
    v_estado := 'yo';
  else
    v_c := buzon_vinculo(v_uid, v_p.user_id);
    if v_c.id is null then
      v_estado := 'ninguno';
    elsif v_c.estado = 'bloqueado' then
      if v_c.bloqueado_por = v_uid then
        v_estado := 'bloqueado';
      else
        return jsonb_build_object('resultado', null);
      end if;
    elsif v_c.estado = 'aceptado' then
      v_estado := 'aceptado';
      select id into v_hilo from buzon_hilos where contacto_id = v_c.id;
    elsif v_c.solicitante = v_uid then
      v_estado := 'pendiente-enviada';
    else
      v_estado := 'pendiente-recibida';
    end if;
  end if;
  return jsonb_build_object('resultado', jsonb_build_object(
    'alias', v_p.alias,
    'nombre', v_p.nombre,
    'emoji', v_p.emoji,
    'retrato', v_p.retrato,
    'estado', v_estado,
    'contacto_id', v_c.id,
    'hilo_id', v_hilo
  ));
end;
$$;

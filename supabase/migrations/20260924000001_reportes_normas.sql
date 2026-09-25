-- Reportes de contenido entre usuarios y aceptación de las normas de la
-- comunidad (24-sep-2026).
--
-- Por qué: con mensajería entre personas, Google Play (política de contenido
-- generado por usuarios) y Apple (guideline 1.2) exigen poder reportar el
-- contenido y a quien lo manda, unas normas aceptadas antes de escribir y que
-- el dueño se entere para actuar en 24 h. Bloquear ya existía
-- (`buzon_bloquear`).
--
-- Disciplina del repo: tabla con RLS activada y CERO policies (solo RPCs
-- `security definer` con `auth.uid()`), contrato `{error:'<codigo>'}` sin
-- `raise`, `revoke … from public, anon` + `grant … to authenticated` en las RPCs
-- de usuario y sin grant en las internas.
--
-- Aviso al dueño: `reporte_avisar` hace un `net.http_post` a un webhook cuya
-- URL vive en Vault (NO en este archivo). El cuerpo lleva `text` y `content`,
-- así sirve tal cual para Slack y para Discord:
--
--   select vault.create_secret('https://discord.com/api/webhooks/…', 'reportes_aviso_url');
--
-- Sin el secreto el reporte se guarda igual y no se avisa. Revisar pendientes:
--   select * from reportes where estado = 'pendiente' order by creado_en;

create extension if not exists pg_net with schema extensions;

-- 1) Normas ---------------------------------------------------------------------

alter table public.perfiles add column if not exists normas_aceptadas timestamptz;

-- 2) Reportes -------------------------------------------------------------------

create table public.reportes (
  id          bigint generated always as identity primary key,
  -- `set null`: el reporte sobrevive a que cualquiera de los dos borre su cuenta.
  reporta     uuid references auth.users (id) on delete set null,
  reportado   uuid references auth.users (id) on delete set null,
  origen      text not null check (origen in ('mensaje', 'contacto', 'espacio')),
  motivo      text not null check (motivo in ('acoso', 'odio', 'sexual', 'violencia', 'spam', 'otro')),
  detalle     text not null default '' check (char_length(detalle) <= 500),
  contacto_id uuid,
  hilo_id     uuid,
  espacio_id  uuid,
  -- Copia de lo reportado (el mensaje, o el título y tipo del espacio): si su
  -- autor lo borra para todos, la prueba no desaparece con él.
  evidencia   jsonb check (evidencia is null or pg_column_size(evidencia) <= 131072),
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'revisado', 'descartado')),
  creado_en   timestamptz not null default now(),
  revisado_en timestamptz
);

create index reportes_pendientes on public.reportes (creado_en) where estado = 'pendiente';

alter table public.reportes enable row level security;

-- 3) Helpers internos -------------------------------------------------------------

-- A mejor esfuerzo: un webhook caído o sin configurar no puede tumbar el
-- reporte, que ya quedó guardado.
create function public.reporte_avisar(p_id bigint, p_origen text, p_motivo text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_url text;
  v_txt text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'reportes_aviso_url';
  if v_url is null then
    return;
  end if;
  v_txt := format('MindHaOS · reporte #%s (%s, %s). Revisar en 24 h: select * from reportes where id = %s;',
                  p_id, p_origen, p_motivo, p_id);
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('text', v_txt, 'content', v_txt)
  );
exception when others then
  raise warning '[reporte_avisar] %', sqlerrm;
end;
$$;

revoke execute on function public.reporte_avisar(bigint, text, text) from public, anon, authenticated;

create function public.reporte_motivo_valido(p_motivo text)
returns boolean
language sql
immutable
as $$
  select p_motivo in ('acoso', 'odio', 'sexual', 'violencia', 'spam', 'otro');
$$;

revoke execute on function public.reporte_motivo_valido(text) from public, anon, authenticated;

-- 4) RPCs de usuario ----------------------------------------------------------------

-- ¿Ya aceptó las normas? Se consulta la primera vez que se usa algo social en
-- la sesión; no va en el `select` del perfil para no romper la carga del plan
-- si esta migración aún no está aplicada.
create function public.buzon_normas()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ts timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  select normas_aceptadas into v_ts from perfiles where user_id = v_uid;
  return jsonb_build_object('aceptadas', v_ts);
end;
$$;

-- Guarda la PRIMERA aceptación (la fecha no se pisa al aceptar otra vez).
create function public.buzon_aceptar_normas()
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
  update perfiles set normas_aceptadas = coalesce(normas_aceptadas, now()) where user_id = v_uid;
  return jsonb_build_object('ok', true);
end;
$$;

-- Reportar a un contacto (p_uid null) o uno de SUS mensajes (p_uid = el uid
-- del mensaje). Solo se puede reportar lo que mandó la otra persona.
create function public.buzon_reportar(p_contacto uuid, p_uid text, p_motivo text, p_detalle text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_c buzon_contactos;
  v_otro uuid;
  v_hilo uuid;
  v_ev jsonb;
  v_id bigint;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if not reporte_motivo_valido(p_motivo) then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if not consumir_rate_limit(v_uid, 'reportar', 20, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;
  select * into v_c from buzon_contactos where id = p_contacto and v_uid in (solicitante, destinatario);
  if not found then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  v_otro := case when v_c.solicitante = v_uid then v_c.destinatario else v_c.solicitante end;
  select id into v_hilo from buzon_hilos where contacto_id = v_c.id;

  if p_uid is not null then
    select jsonb_build_object('uid', m.uid, 'tipo', m.tipo, 'texto', m.texto, 'adjunto', m.adjunto,
                              'contenido', m.contenido, 'creado_en', m.creado_en)
      into v_ev
      from buzon_mensajes m
     where m.hilo_id = v_hilo and m.uid = p_uid and m.de = v_otro;
    if v_ev is null then
      return jsonb_build_object('error', 'no-encontrado');
    end if;
  end if;

  insert into reportes (reporta, reportado, origen, motivo, detalle, contacto_id, hilo_id, evidencia)
  values (v_uid, v_otro, case when p_uid is null then 'contacto' else 'mensaje' end, p_motivo,
          left(coalesce(p_detalle, ''), 500), v_c.id, v_hilo, v_ev)
  returning id into v_id;

  perform reporte_avisar(v_id, case when p_uid is null then 'contacto' else 'mensaje' end, p_motivo);
  return jsonb_build_object('ok', true);
end;
$$;

-- Reportar un espacio compartido (p_miembro null = a quien lo compartió) o a
-- uno de sus miembros. Basta con haber entrado alguna vez: quien se salió
-- también puede reportar lo que vio.
create function public.espacio_reportar(p_id uuid, p_miembro text, p_motivo text, p_detalle text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_e espacios;
  v_otro uuid;
  v_id bigint;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if not reporte_motivo_valido(p_motivo) then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if not consumir_rate_limit(v_uid, 'reportar', 20, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;
  if not exists (select 1 from espacio_miembros where espacio_id = p_id and user_id = v_uid) then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  select * into v_e from espacios where id = p_id;
  if p_miembro is null then
    v_otro := v_e.dueno;
  else
    select user_id into v_otro from espacio_miembros where espacio_id = p_id and miembro_id = p_miembro;
  end if;
  if v_otro is null or v_otro = v_uid then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;

  insert into reportes (reporta, reportado, origen, motivo, detalle, espacio_id, evidencia)
  values (v_uid, v_otro, 'espacio', p_motivo, left(coalesce(p_detalle, ''), 500), p_id,
          jsonb_build_object('titulo', v_e.titulo, 'tipo', v_e.tipo, 'seq', v_e.seq, 'miembro', p_miembro))
  returning id into v_id;

  perform reporte_avisar(v_id, 'espacio', p_motivo);
  return jsonb_build_object('ok', true);
end;
$$;

-- 5) Grants -----------------------------------------------------------------------

revoke execute on function public.buzon_normas() from public, anon;
grant  execute on function public.buzon_normas() to authenticated;
revoke execute on function public.buzon_aceptar_normas() from public, anon;
grant  execute on function public.buzon_aceptar_normas() to authenticated;
revoke execute on function public.buzon_reportar(uuid, text, text, text) from public, anon;
grant  execute on function public.buzon_reportar(uuid, text, text, text) to authenticated;
revoke execute on function public.espacio_reportar(uuid, text, text, text) from public, anon;
grant  execute on function public.espacio_reportar(uuid, text, text, text) to authenticated;

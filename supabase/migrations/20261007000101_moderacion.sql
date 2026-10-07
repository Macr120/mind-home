-- Moderación del contenido de usuarios y de la IA (7-oct-2026).
--
-- Por qué: Apple (guidelines 1.2 y 1.1 para IA generativa) pide filtrar el
-- contenido ofensivo, poder reportarlo DONDE se ve —también en las partidas y
-- en las respuestas de la IA— y que el dueño se entere para actuar en 24 h.
-- Esta migración:
--   1) amplía `reportes` con los orígenes 'partida' e 'ia' (+ `partida_id`);
--   2) `texto_prohibido()`: lista corta multilingüe (espejo EXACTO de
--      `src/core/moderacion/palabras.ts` y `supabase/functions/_shared/moderacion.ts`)
--      y triggers que la aplican al alias/nombre de `perfiles`, al texto de
--      `buzon_mensajes` y al título de `espacios`. La charla de partida NO se
--      guarda en el servidor (viaja por Realtime, `core/partida/charla.ts`):
--      ahí se filtra en el cliente al mandar y al recibir;
--   3) `partida_reportar` (con bloqueo opcional) e `ia_reportar`;
--   4) `reporte_avisar` manda además un correo por Resend.
--
-- Disciplina del repo (la de 20260924000001_reportes_normas.sql): RPCs
-- `security definer` con `auth.uid()`, contrato `{error:'<codigo>'}` sin
-- `raise`, `revoke … from public, anon` + `grant … to authenticated` en las de
-- usuario y sin grant en las internas. Los triggers sí hacen `raise` (como
-- `exigir_pago`): 'texto-prohibido' con errcode P0001, que el cliente traduce.
--
-- Aviso por correo: sin estos secretos el reporte se guarda igual y solo se
-- avisa al webhook (si existe). El dueño los crea UNA vez en el SQL editor:
--
--   select vault.create_secret('re_…', 'resend_api_key');
--   select vault.create_secret('mindplannerhome@gmail.com', 'reportes_aviso_correo');
--
-- (Sin `reportes_aviso_correo` el correo va a mindplannerhome@gmail.com.)

create extension if not exists pg_net with schema extensions;

-- 1) Reportes: orígenes nuevos ---------------------------------------------------

alter table public.reportes drop constraint if exists reportes_origen_check;
alter table public.reportes add constraint reportes_origen_check
  check (origen in ('mensaje', 'contacto', 'espacio', 'partida', 'ia'));

-- Sin FK: la sala se borra con su anfitrión y el reporte tiene que sobrevivirle.
alter table public.reportes add column if not exists partida_id uuid;

-- 2) Filtro de palabras -----------------------------------------------------------

-- Minúsculas, sin acentos (con `translate`: `unaccent` no está en el repo y no
-- es immutable) y todo lo que no es [a-z0-9] hecho un espacio; luego se busca
-- cada término como PALABRA o FRASE entera. Mismo criterio que `textoProhibido`
-- del cliente.
create or replace function public.texto_prohibido(p text)
returns boolean
language sql
immutable
parallel safe
as $$
  select case when p is null or p = '' then false else exists (
    select 1
      from unnest(array[
        -- es
        'maricon', 'maricones', 'sudaca', 'sudacas', 'negrata', 'negratas', 'pornografia infantil', 'porno infantil',
        -- en
        'nigger', 'niggers', 'nigga', 'niggas', 'faggot', 'faggots', 'wetback', 'wetbacks', 'tranny', 'trannies',
        'child porn', 'childporn', 'blowjob', 'cumshot', 'gangbang',
        -- pt
        'viado', 'viados',
        -- fr
        'bougnoule', 'bougnoules', 'youpin', 'youpins', 'pedopornographie',
        -- de
        'kanake', 'kanaken', 'neger', 'schwuchtel', 'schwuchteln', 'kinderporno', 'kinderpornos', 'kinderpornografie',
        -- it
        'frocio', 'froci', 'ricchione', 'ricchioni', 'pedopornografia'
      ]) as w(palabra)
     where position(' ' || w.palabra || ' ' in
             ' ' || regexp_replace(
                      translate(lower(p), 'áàâäãåéèêëíìîïóòôöõúùûüñçýÿ', 'aaaaaaeeeeiiiiooooouuuuncyy'),
                      '[^a-z0-9]+', ' ', 'g') || ' ') > 0
  ) end
$$;

revoke execute on function public.texto_prohibido(text) from public, anon, authenticated;

-- Triggers. `security definer` como `exigir_pago`: así `texto_prohibido` no
-- necesita grant para `authenticated`. Solo miran lo que CAMBIA: un alias viejo
-- no bloquea guardar el emoji.
create or replace function public.filtrar_texto_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT' or new.alias is distinct from old.alias) and texto_prohibido(new.alias) then
    raise exception 'texto-prohibido' using errcode = 'P0001';
  end if;
  if (tg_op = 'INSERT' or new.nombre is distinct from old.nombre) and texto_prohibido(new.nombre) then
    raise exception 'texto-prohibido' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.filtrar_texto_mensaje()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT' or new.texto is distinct from old.texto) and texto_prohibido(new.texto) then
    raise exception 'texto-prohibido' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.filtrar_texto_espacio()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT' or new.titulo is distinct from old.titulo) and texto_prohibido(new.titulo) then
    raise exception 'texto-prohibido' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.filtrar_texto_perfil() from public, anon, authenticated;
revoke execute on function public.filtrar_texto_mensaje() from public, anon, authenticated;
revoke execute on function public.filtrar_texto_espacio() from public, anon, authenticated;

drop trigger if exists filtrar_texto on public.perfiles;
create trigger filtrar_texto before insert or update of alias, nombre on public.perfiles
  for each row execute procedure public.filtrar_texto_perfil();

drop trigger if exists filtrar_texto on public.buzon_mensajes;
create trigger filtrar_texto before insert or update of texto on public.buzon_mensajes
  for each row execute procedure public.filtrar_texto_mensaje();

drop trigger if exists filtrar_texto on public.espacios;
create trigger filtrar_texto before insert or update of titulo on public.espacios
  for each row execute procedure public.filtrar_texto_espacio();

-- 3) Aviso al dueño: webhook (como antes) + correo por Resend ----------------------

-- Cada canal en su propio bloque: que falle uno no se lleva al otro, y ninguno
-- tumba el reporte, que ya quedó guardado.
create or replace function public.reporte_avisar(p_id bigint, p_origen text, p_motivo text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_url text;
  v_key text;
  v_para text;
  v_txt text;
begin
  v_txt := format('MindHaOS · reporte #%s (%s, %s). Revisar en 24 h: select * from reportes where id = %s;',
                  p_id, p_origen, p_motivo, p_id);

  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'reportes_aviso_url';
    if v_url is not null then
      perform net.http_post(
        url := v_url,
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('text', v_txt, 'content', v_txt)
      );
    end if;
  exception when others then
    raise warning '[reporte_avisar] webhook: %', sqlerrm;
  end;

  begin
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key';
    if v_key is not null then
      select decrypted_secret into v_para from vault.decrypted_secrets where name = 'reportes_aviso_correo';
      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
        body := jsonb_build_object(
          'from', 'MindHaOS <no-responder@mindhaos.com>',
          'to', jsonb_build_array(coalesce(nullif(trim(v_para), ''), 'mindplannerhome@gmail.com')),
          'subject', format('MindHaOS · reporte #%s', p_id),
          'text', v_txt)
      );
    end if;
  exception when others then
    raise warning '[reporte_avisar] correo: %', sqlerrm;
  end;
end;
$$;

revoke execute on function public.reporte_avisar(bigint, text, text) from public, anon, authenticated;

-- 4) RPCs de usuario ----------------------------------------------------------------

-- Reportar a otro jugador de una sala (por RANURA, nunca por uuid). Basta con
-- que los dos hayan estado en esa sala, aunque ya se hayan ido o los hayan
-- expulsado. La charla no se guarda en el servidor: `p_charla` son las últimas
-- líneas que VIO quien reporta (array de {tx, hora}), recortadas aquí; vale
-- como contexto, no como prueba firmada. Con `p_bloquear` se bloquea además al
-- otro como en `buzon_bloquear` —aunque no fueran contactos: el vínculo nace ya
-- bloqueado— y se le saca de tus salas ahora.
create or replace function public.partida_reportar(
  p_partida uuid, p_jugador text, p_motivo text, p_detalle text,
  p_bloquear boolean default false, p_charla jsonb default null)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_otro uuid;
  v_p partidas;
  v_charla jsonb;
  v_alias text;
  v_c buzon_contactos;
  v_id bigint;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  if p_jugador is null or p_jugador !~ '^j[0-3]$' or not reporte_motivo_valido(p_motivo) then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  if not consumir_rate_limit(v_uid, 'reportar', 20, 3600) then
    return jsonb_build_object('error', 'limite');
  end if;
  if not exists (select 1 from partida_jugadores where partida_id = p_partida and user_id = v_uid) then
    return jsonb_build_object('error', 'no-encontrado');
  end if;
  select user_id into v_otro from partida_jugadores where partida_id = p_partida and jugador_id = p_jugador;
  if v_otro is null or v_otro = v_uid then
    return jsonb_build_object('error', 'peticion-invalida');
  end if;
  select * into v_p from partidas where id = p_partida;
  select alias into v_alias from perfiles where user_id = v_otro;

  -- Solo un array, solo las 20 últimas líneas y con tope de tamaño.
  if jsonb_typeof(p_charla) = 'array' then
    select coalesce(jsonb_agg(jsonb_build_object('tx', left(s.x->>'tx', 500), 'hora', s.x->'hora') order by s.n), '[]'::jsonb)
      into v_charla
      from (select e.x, e.n from jsonb_array_elements(p_charla) with ordinality as e(x, n)
             order by e.n desc limit 20) s;
    if pg_column_size(v_charla) > 32768 then
      v_charla := null;
    end if;
  end if;

  insert into reportes (reporta, reportado, origen, motivo, detalle, partida_id, evidencia)
  values (v_uid, v_otro, 'partida', p_motivo, left(coalesce(p_detalle, ''), 500), p_partida,
          jsonb_build_object('juego', v_p.juego, 'jugador', p_jugador, 'alias', v_alias,
                             'anfitrion', v_p.anfitrion = v_otro, 'charla', v_charla))
  returning id into v_id;

  if coalesce(p_bloquear, false) then
    select * into v_c from buzon_contactos
     where least(solicitante, destinatario) = least(v_uid, v_otro)
       and greatest(solicitante, destinatario) = greatest(v_uid, v_otro);
    if found then
      update buzon_contactos set estado = 'bloqueado', bloqueado_por = v_uid, actualizado_en = now() where id = v_c.id;
    else
      insert into buzon_contactos (solicitante, destinatario, estado, bloqueado_por)
        values (v_uid, v_otro, 'bloqueado', v_uid);
    end if;
    perform partida_cortar_con(v_uid, v_otro);
    perform buzon_avisar(v_otro, 'contactos', '{}'::jsonb);
  end if;

  perform reporte_avisar(v_id, 'partida', p_motivo);
  return jsonb_build_object('ok', true);
end;
$$;

-- Reportar una respuesta de la IA (texto o imagen). No hay «reportado»: es el
-- modelo. La evidencia la manda el cliente (el hilo vive en su IndexedDB) y se
-- poda aquí campo a campo; una imagen va como referencia corta, nunca en bytes.
create or replace function public.ia_reportar(p_motivo text, p_detalle text, p_evidencia jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
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
  if jsonb_typeof(p_evidencia) = 'object' then
    v_ev := jsonb_strip_nulls(jsonb_build_object(
      'asistente', left(p_evidencia->>'asistente', 60),
      'prompt', left(p_evidencia->>'prompt', 4000),
      'respuesta', left(p_evidencia->>'respuesta', 8000),
      'imagen', left(p_evidencia->>'imagen', 2048),
      'creado', left(p_evidencia->>'creado', 40)));
  end if;

  insert into reportes (reporta, reportado, origen, motivo, detalle, evidencia)
  values (v_uid, null, 'ia', p_motivo, left(coalesce(p_detalle, ''), 500), v_ev)
  returning id into v_id;

  perform reporte_avisar(v_id, 'ia', p_motivo);
  return jsonb_build_object('ok', true);
end;
$$;

-- 5) Grants -----------------------------------------------------------------------

revoke execute on function public.partida_reportar(uuid, text, text, text, boolean, jsonb) from public, anon;
grant  execute on function public.partida_reportar(uuid, text, text, text, boolean, jsonb) to authenticated;
revoke execute on function public.ia_reportar(text, text, jsonb) from public, anon;
grant  execute on function public.ia_reportar(text, text, jsonb) to authenticated;

-- Poses de los invitados por su propio topic (28-sep-2026).
--
-- En la subida compartida `partida:<id>:u` cada pose de un invitado (hasta 12
-- por segundo) le llegaba también a los demás invitados, que ya la reciben
-- dentro del `s` fundido del anfitrión: con 4 jugadores eran ~160 mensajes/s
-- entregados en vez de ~60. Ahora cada invitado publica su pose en
-- `partida:<id>:p:<ranura>` y solo el anfitrión se une a esos topics.
--
-- Escuchar ya lo cubre la policy «partida: escuchar» (cualquier topic
-- `partida:%` de una sala de la que se es miembro). Publicar: solo en el topic
-- de la ranura propia.

create function public.partida_es_jugador(p_partida text, p_ranura text)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or p_partida is null or p_ranura is null then
    return false;
  end if;
  begin
    v_id := p_partida::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from partida_jugadores j
      join partidas p on p.id = j.partida_id
     where j.partida_id = v_id
       and j.user_id = v_uid
       and j.jugador_id = p_ranura
       and j.estado in ('invitado', 'dentro')
       and p.estado <> 'cerrada'
  );
end;
$$;

revoke execute on function public.partida_es_jugador(text, text) from public, anon;
grant  execute on function public.partida_es_jugador(text, text) to authenticated;

create policy "partida poses: publicar (la ranura propia)"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'partida:%:p:j_'
    and realtime.topic() = 'partida:' || public.partida_del_topic(realtime.topic()) || ':p:'
                           || split_part(realtime.topic(), ':', 4)
    and public.partida_es_jugador(public.partida_del_topic(realtime.topic()),
                                  split_part(realtime.topic(), ':', 4))
  );

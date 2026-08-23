-- Vaciar la nube de la PROPIA cuenta: borra todos los registros de sync del
-- usuario autenticado (filas vivas y tombstones). Herramienta de recuperación:
-- tras un accidente de fusión (p. ej. tombstones que aniquilan la casa en cada
-- pull), el dispositivo con la casa buena resetea su _syncMeta y vuelve a
-- subir todo a una nube limpia. No toca Storage (los blobs huérfanos se
-- reescriben al resubir).
create or replace function public.sync_reset()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_borrados int;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'sin-sesion');
  end if;
  delete from registros where user_id = v_uid;
  get diagnostics v_borrados = row_count;
  return jsonb_build_object('borrados', v_borrados);
end;
$$;

revoke execute on function public.sync_reset() from anon;

-- Bucket privado para los blobs del sync (fotos, .glb, texturas, grafitis…).
-- Ruta: <user_id>/<tabla>/<uid>/<campo>. Acceso solo a la carpeta propia.

insert into storage.buckets (id, name, public)
values ('sync-blobs', 'sync-blobs', false)
on conflict (id) do nothing;

create policy "sync-blobs propios"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'sync-blobs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'sync-blobs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

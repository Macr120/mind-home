/**
 * Borrado de la cuenta del usuario que llama (requisito de App Store 5.1.1(v)
 * y de Google Play). Borra sus blobs de Storage y de R2 (sync, Archivo,
 * adjuntos de sus hilos, archivos de los espacios que compartió y planos de
 * sus visitas) y luego el
 * usuario de auth; perfiles / uso_ia / registros / buzón / espacios / partidas
 * caen por `on delete cascade`. rc_eventos se conserva como auditoría
 * financiera (no referencia a auth.users) y `reportes` queda con el usuario en
 * null.
 *
 * Se despliega con verify_jwt (por defecto): solo el propio usuario puede
 * borrarse. Los datos LOCALES del dispositivo no se tocan.
 */
import { json, preflight, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, usuarioDe } from '../_shared/auth.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { borrarObjetos, listarPrefijo, r2Configurado } from '../_shared/r2.ts'

/** Borra recursivamente una carpeta del bucket (list no es recursivo). */
async function borrarCarpeta(
  admin: ReturnType<typeof createClient>,
  prefijo: string,
  nombreBucket = 'sync-blobs',
): Promise<void> {
  const bucket = admin.storage.from(nombreBucket)
  // Un nivel puede tener más de 1000 entradas: repetir hasta vaciarlo.
  for (;;) {
    const { data, error } = await bucket.list(prefijo, { limit: 1000 })
    if (error || !data || data.length === 0) return
    const archivos = data.filter((e) => e.id !== null).map((e) => `${prefijo}/${e.name}`)
    const carpetas = data.filter((e) => e.id === null).map((e) => `${prefijo}/${e.name}`)
    if (archivos.length > 0) {
      const { error } = await bucket.remove(archivos)
      // No seguir si el borrado falla: nunca eliminar la cuenta de auth dejando
      // blobs personales huérfanos (ya no se podrían reasociar ni borrar).
      if (error) throw new Error(error.message)
    }
    for (const c of carpetas) await borrarCarpeta(admin, c, nombreBucket)
    if (archivos.length < 1000 && carpetas.length === 0) return
    if (archivos.length === 0 && carpetas.length > 0) return
  }
}

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  const cors = corsDe(req)
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400, cors)

  const usuario = await usuarioDe(clienteUsuario(req))
  if (!usuario) return json({ error: 'sin-sesion' }, 401, cors)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    await borrarCarpeta(admin, usuario.id)
    // Su carpeta en R2 (sync y cuarto Archivo, migración 20260925000001).
    if (r2Configurado()) await borrarObjetos(await listarPrefijo(`${usuario.id}/`))
    // Buzón, espacios y visitas guardan sus archivos por hilo, espacio o sala,
    // no por usuario: se buscan ANTES de borrar la cuenta, porque el cascade
    // tira esas filas y con ellas la única forma de saber qué carpetas eran suyas.
    const [hilos, espacios, partidas] = await Promise.all([
      admin.from('buzon_hilos').select('id').or(`usuario_a.eq.${usuario.id},usuario_b.eq.${usuario.id}`),
      admin.from('espacios').select('id').eq('dueno', usuario.id),
      admin.from('partidas').select('id').eq('anfitrion', usuario.id),
    ])
    for (const r of [hilos, espacios, partidas]) if (r.error) throw new Error(r.error.message)
    for (const h of hilos.data ?? []) await borrarCarpeta(admin, h.id as string, 'buzon-adjuntos')
    for (const e of espacios.data ?? []) await borrarCarpeta(admin, e.id as string, 'espacio-archivos')
    for (const p of partidas.data ?? []) await borrarCarpeta(admin, p.id as string, 'partida-casa')
  } catch (e) {
    // Blobs sin borrar del todo: no tocar la cuenta de auth, el usuario reintenta.
    console.error('[borrar-cuenta] fallo al borrar los blobs:', e)
    return json({ error: 'blobs' }, 500, cors)
  }

  const { error } = await admin.auth.admin.deleteUser(usuario.id)
  if (error) return json({ error: 'bd' }, 500, cors)

  return json({ ok: true }, 200, cors)
})

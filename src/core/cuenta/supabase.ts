/**
 * Cliente único de Supabase (cuenta, sync y Edge Functions), cargado BAJO
 * DEMANDA: el SDK no entra al chunk de arranque; se descarga en la primera
 * llamada real (hidratar la sesión, sync, Edge Functions).
 *
 * Si el build no trae las variables `VITE_SUPABASE_*` (no hay `.env.local`),
 * `obtenerSupabase()` resuelve null y toda la capa de cuenta queda apagada: la
 * app se comporta 100% local, exactamente como antes de existir el backend.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { esAppNativa, esEscritorio } from '../plataforma'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let cliente: Promise<SupabaseClient | null> | null = null

/** ¿El build tiene backend configurado? (URL + anon key presentes) */
export function hayBackend(): boolean {
  return !!(url && anon)
}

/** El cliente (o null sin backend). El fallo de red NO se cachea: se reintenta. */
export function obtenerSupabase(): Promise<SupabaseClient | null> {
  cliente ??= (async () => {
    if (!url || !anon) return null
    try {
      const { createClient } = await import('@supabase/supabase-js')
      // En la app nativa Y en el escritorio el login social sale al navegador
      // del sistema y vuelve por deep link con un `code`: eso es PKCE, y el
      // canje lo hace a mano `escucharDeepLinkAuth` (no hay URL de página que
      // el SDK pueda mirar; la del escritorio es `mph://app/index.html`, que
      // además ningún proveedor aceptaría como destino).
      // En web se deja el flujo de siempre para no tocar lo que ya funciona.
      return esAppNativa() || esEscritorio()
        ? createClient(url, anon, { auth: { flowType: 'pkce', detectSessionInUrl: false } })
        : createClient(url, anon)
    } catch (e) {
      cliente = null
      console.warn('[MPH] No se pudo cargar el SDK de Supabase', e)
      return null
    }
  })()
  return cliente
}

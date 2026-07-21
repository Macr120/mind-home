/**
 * Cliente único de Supabase (cuenta, sync y Edge Functions).
 *
 * Si el build no trae las variables `VITE_SUPABASE_*` (no hay `.env.local`),
 * `supabase` es null y toda la capa de cuenta queda apagada: la app se
 * comporta 100% local, exactamente como antes de existir el backend.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null

/** ¿El build tiene backend configurado? (URL + anon key presentes) */
export function hayBackend(): boolean {
  return supabase !== null
}

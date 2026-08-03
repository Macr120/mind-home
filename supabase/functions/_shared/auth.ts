/** Cliente Supabase con el JWT del usuario que llama (RLS y auth.uid() activos). */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export function clienteUsuario(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
}

/**
 * Cliente con service_role para las RPCs de cuota, que desde 20260803000001
 * están revocadas de anon/authenticated (un usuario podía acuñarse créditos
 * llamándolas por PostgREST). El uid viaja como parámetro `p_uid` tras validar
 * el JWT con `usuarioDe`.
 */
export function clienteAdmin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

export async function usuarioDe(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

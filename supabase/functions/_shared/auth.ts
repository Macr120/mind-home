/** Cliente Supabase con el JWT del usuario que llama (RLS y auth.uid() activos). */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export function clienteUsuario(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
}

export async function usuarioDe(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

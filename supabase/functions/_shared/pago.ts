/**
 * ¿La cuenta pagó algo? (unlock, plan vigente o ilimitada). Las cuentas sin
 * compra no usan el servidor (migración 20260928000001). Falla ABIERTO, como
 * `dentroDeLimite`: si la consulta falla, un problema de infraestructura no debe
 * dejar fuera a quien sí pagó.
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export async function tienePago(admin: SupabaseClient, uid: string): Promise<boolean> {
  const { data, error } = await admin.rpc('pago', { p_uid: uid })
  if (error) return true
  return data !== false
}

/**
 * ¿La cuenta tiene plan vigente (o es ilimitada)? Desde el 5-oct-2026 la casa
 * y lo social son gratis; esto lo exige solo lo que cuesta dinero sin pasar por
 * los créditos (redes). `solo_unlock` significa «sin plan vigente» desde
 * 20261005000001_tres_niveles.sql. Falla ABIERTO, como `dentroDeLimite`: si la
 * consulta falla, un problema de infraestructura no debe dejar fuera a quien sí
 * paga.
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export async function tienePlan(admin: SupabaseClient, uid: string): Promise<boolean> {
  const { data, error } = await admin.rpc('solo_unlock', { p_uid: uid })
  if (error) return true
  return data !== true
}

/**
 * Límite de tasa por usuario para el proxy de IA (auditoría 26-ago-2026). Va
 * ADEMÁS de la cuota de créditos: la cuota frena el gasto del mes, esto frena la
 * ráfaga (un usuario con saldo saturando el proxy). Cuenta las llamadas en una
 * ventana fija con la RPC `consumir_rate_limit`, que solo puede ejecutar el
 * service_role.
 *
 * Falla ABIERTO a propósito: si el chequeo de límite falla (infra), se deja pasar
 * la petición — no queremos que un problema del contador tumbe la IA. Con
 * `fallaAbierto = false` ocurre lo contrario (el contador global de subidas a
 * YouTube: dejar pasar quemaría la cuota de toda la app).
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export async function dentroDeLimite(
  admin: SupabaseClient,
  uid: string,
  bucket: string,
  max: number,
  ventanaSeg: number,
  fallaAbierto = true,
): Promise<boolean> {
  const { data, error } = await admin.rpc('consumir_rate_limit', {
    p_uid: uid,
    p_bucket: bucket,
    p_max: max,
    p_ventana_seg: ventanaSeg,
  })
  if (error) return fallaAbierto
  return data !== false
}

/**
 * Cómo aterriza una compra en `perfiles`: las reglas que comparten el webhook
 * de RevenueCat (`revenuecat-webhook`) y la confirmación directa que pide la
 * app nada más pagar (`confirmar-compra`). Viven aquí para que las dos puertas
 * apliquen EXACTAMENTE lo mismo: si un día cambia qué da la casa o un nivel,
 * se cambia en un solo sitio.
 *
 * Todo es idempotente a propósito —repetir un update con los mismos valores es
 * inocuo—, salvo las recargas de créditos, que SUMAN y por eso se quedan solo
 * en el webhook, donde `rc_eventos` distingue el primer intento.
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * Niveles de la suscripción (product_id de RC → multiplicador del pool). El
 * nivel se guarda en `perfiles.nivel` y `pool_mensual()` lo multiplica por los
 * créditos base: 700 / 1400 / 2100.
 *
 * Los ids `_v2` son los de $6/$12/$18 (ago 2026); los viejos ($5/$10/$15) se
 * conservan para no dejar sin pool a quien siga suscrito a ellos —en RevenueCat
 * el precio es inmutable, así que cambiarlo obliga a crear productos nuevos—.
 * Espejo de `NIVELES` en src/core/cuenta/productos.ts.
 */
export const NIVELES: Record<string, number> = {
  pro_x1_v2: 1,
  pro_x2_v2: 2,
  pro_x3_v2: 3,
  // Anualidad ($60/año): es el nivel ×1 pagado de una vez, no un escalón más.
  // El pool sigue siendo mensual (700/mes), y `plan_expira` viene a un año.
  pro_x1_anual: 1,
  pro_x1: 1,
  pro_x2: 2,
  pro_x3: 3,
}

/**
 * Recargas de créditos (consumible, SIN entitlement): se abonan a
 * `perfiles.creditos_extra`, que no caduca y funciona sin plan. $6 = 700
 * créditos, el mismo precio por crédito que un nivel de la suscripción.
 */
export const CREDITOS: Record<string, number> = {
  creditos_x1: 700,
}

/**
 * Pago único que desbloquea la app para siempre e incluye el «primer mes»:
 * 30 días de plan 'trial' (pool de 700 créditos + sync) sin tarjeta ni
 * suscripción (20260815000001). One-time SIN entitlement, como las recargas.
 *
 * Es una LISTA porque en RevenueCat el precio de un producto es INMUTABLE: cada
 * cambio de precio obliga a crear otro producto. Los ids viejos se conservan
 * para seguir honrando una compra en vuelo. Espejo de `UNLOCK_PRODUCTOS` en
 * src/core/cuenta/productos.ts.
 */
export const UNLOCK_PRODUCTOS = ['unlock_casa_v5', 'unlock_casa_v4', 'unlock_casa_v3', 'unlock_casa_v2', 'unlock_casa']
export const TRIAL_DIAS = 30

/** En Apple el id de producto es único en TODO el App Store: lleva el bundle. */
const BUNDLE = 'com.macr120.mindhome.'

/**
 * El mismo producto se llama distinto en cada tienda. Aquí se devuelve al id
 * canónico —el de las tablas de arriba— quitando lo que le añade la tienda:
 * el bundle por delante (Apple) y el plan base de la suscripción por detrás
 * (`pro_x1_v2:mensual`, Google Play). Espejo de `idBase()` en
 * src/core/cuenta/productos.ts.
 */
export function idBase(id: string): string {
  const sinPlan = id.split(':')[0]
  return sinPlan.startsWith(BUNDLE) ? sinPlan.slice(BUNDLE.length) : sinPlan
}

export const esUnlock = (productId: string): boolean => UNLOCK_PRODUCTOS.includes(idBase(productId))
export const esNivel = (productId: string): boolean => idBase(productId) in NIVELES

/**
 * Suscripción activa (compra, renovación, cambio de nivel): plan pro, el nivel
 * que viaja en el product_id y la fecha de expiración. Un producto desconocido
 * se queda en el nivel base en vez de dejar al usuario sin pool.
 *
 * fue_pro: sin trials configurados en RC, todo evento de activación implica
 * cobro real. Si algún día se añade trial, excluir `period_type === 'TRIAL'`.
 */
export async function aplicarSuscripcion(
  admin: SupabaseClient,
  uid: string,
  productId: string,
  expiraMs: number,
): Promise<Error | null> {
  const nivel = NIVELES[idBase(productId)] ?? 1
  const { error } = await admin
    .from('perfiles')
    .update({
      plan: 'pro',
      plan_expira: expiraMs > 0 ? new Date(expiraMs).toISOString() : null,
      fue_pro: true,
      nivel,
    })
    .eq('user_id', uid)
  return error
}

/**
 * El pago único de la casa. `unlock = true` se aplica SIEMPRE (idempotente); el
 * trial de 30 días solo la primera vez que el flag cambia y solo si el perfil
 * sigue en 'local' (no degradar a un Pro que además compró el unlock). Así un
 * reintento tras un update fallido sí completa el alta, y uno tras un alta
 * exitosa no re-extiende el trial.
 */
export async function aplicarUnlock(admin: SupabaseClient, uid: string): Promise<Error | null> {
  const { data: perfil, error: errSel } = await admin
    .from('perfiles')
    .select('plan, unlock')
    .eq('user_id', uid)
    .single()
  if (errSel) return errSel
  const cambios: Record<string, unknown> = { unlock: true }
  if (perfil && !perfil.unlock && perfil.plan === 'local') {
    cambios.plan = 'trial'
    cambios.plan_expira = new Date(Date.now() + TRIAL_DIAS * 86_400_000).toISOString()
  }
  const { error } = await admin.from('perfiles').update(cambios).eq('user_id', uid)
  return error
}

/**
 * Fin de la suscripción. El nivel vuelve a la base: si no, quien cancela un
 * ×3 y luego compra el unlock estrenaría el trial multiplicado.
 */
export async function aplicarExpiracion(admin: SupabaseClient, uid: string): Promise<Error | null> {
  const { error } = await admin
    .from('perfiles')
    .update({ plan: 'local', plan_expira: null, nivel: 1 })
    .eq('user_id', uid)
  return error
}

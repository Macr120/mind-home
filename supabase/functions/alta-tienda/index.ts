/**
 * RETIRADA (ago 2026). Concedía la casa a quien demostrara la LICENCIA de la
 * instalación (Play Integrity con veredicto `LICENSED`), porque la app se
 * publicaba de PAGO: instalada era pagada.
 *
 * Ya no: la casa se compra DENTRO de la app —in-app en Android e iOS, checkout
 * directo en la web— y la única puerta que concede `perfiles.unlock` es el
 * webhook de RevenueCat (o un cupón). Con la app gratis, `LICENSED` lo obtiene
 * cualquiera que la instale, así que mantener este alta sería regalar la casa.
 *
 * Se deja como puerta cerrada, y no como archivo borrado, porque la función
 * puede seguir desplegada: mientras exista, tiene que responder que no. Para
 * retirarla del todo: `npx supabase functions delete alta-tienda`. La RPC que
 * usaba (`alta_tienda`) se elimina en la migración 20260820000003.
 */
import { json, preflight, corsDe } from '../_shared/cors.ts'

Deno.serve((req) => {
  const pf = preflight(req)
  if (pf) return pf
  return json({ error: 'retirado', mensaje: 'La casa se compra dentro de la app.' }, 410, corsDe(req))
})

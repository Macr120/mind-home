/**
 * Webhook de RevenueCat → perfiles.plan.
 *
 * Es la ÚNICA puerta por la que entra una compra, venga de donde venga: el
 * checkout web (sin comisión), Google Play o el App Store. Como el
 * `app_user_id` es siempre el user.id de Supabase, comprar en una plataforma
 * se ve en todas las demás en cuanto refrescan el perfil.
 *
 * Se despliega con `--no-verify-jwt` (RC no manda JWT de Supabase); la
 * autenticación es el header Authorization comparado con RC_WEBHOOK_AUTH.
 *
 * Idempotente: el evento se archiva en rc_eventos (duplicados ignorados) y la
 * actualización del plan se aplica SIEMPRE — repetirla con los mismos valores
 * es inocua, así los reintentos de RC pueden completar un update fallido.
 */
import { json } from '../_shared/cors.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  CREDITOS,
  aplicarExpiracion,
  aplicarSuscripcion,
  aplicarUnlock,
  esUnlock,
  idBase,
} from '../_shared/compras.ts'

/** Error de BD: se registra el detalle en el log del servidor, no en la respuesta. */
function errorBd(e: unknown): Response {
  console.error('[rc-webhook] error de base de datos:', e)
  return json({ error: 'bd' }, 500)
}

/**
 * Eventos que activan o renuevan la suscripción. Subir o bajar de nivel es un
 * PRODUCT_CHANGE, no una compra nueva. Qué da cada producto (niveles, unlock,
 * recargas) vive en `_shared/compras.ts`, compartido con `confirmar-compra`.
 */
const ACTIVAN = ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Comparación en tiempo constante: se comparan los SHA-256 de ambos valores
 * byte a byte, sin cortocircuito, para no filtrar por timing cuántos
 * caracteres del secreto coinciden. El guard `!secreto` evita el fail-open si
 * falta la variable.
 */
async function autorizado(auth: string, secreto: string): Promise<boolean> {
  if (!secreto) return false
  const sha = (s: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  const [a, b] = await Promise.all([sha(auth), sha(secreto)])
  const va = new Uint8Array(a)
  const vb = new Uint8Array(b)
  let dif = 0
  for (let i = 0; i < va.length; i++) dif |= va[i] ^ vb[i]
  return dif === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400)

  const secreto = Deno.env.get('RC_WEBHOOK_AUTH') ?? ''
  const auth = req.headers.get('Authorization') ?? ''
  if (!(await autorizado(auth, secreto))) return json({ error: 'no-autorizado' }, 401)

  interface EventoRC {
    id?: unknown
    type?: unknown
    app_user_id?: unknown
    expiration_at_ms?: unknown
    product_id?: unknown
  }
  let evento: EventoRC | undefined
  try {
    evento = ((await req.json()) as { event?: EventoRC }).event
  } catch {
    return json({ error: 'peticion-invalida', mensaje: 'JSON inválido.' }, 400)
  }
  if (!evento?.id || !evento?.type) {
    return json({ error: 'peticion-invalida', mensaje: 'Evento incompleto.' }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Auditoría. `esNuevo` distingue el primer intento de los reintentos de RC:
  // los updates de plan se aplican SIEMPRE (idempotentes), pero el abono de
  // recargas solo en el primero (sumar créditos dos veces NO es inocuo).
  const { data: auditado } = await admin
    .from('rc_eventos')
    .upsert(
      {
        id: String(evento.id),
        tipo: String(evento.type),
        app_user_id: String(evento.app_user_id ?? ''),
        payload: evento,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    .select('id')
  const esNuevo = (auditado?.length ?? 0) > 0

  const uid = String(evento.app_user_id ?? '')
  if (!UUID_RE.test(uid)) {
    // Compra anónima u otro alias: queda auditada pero no mapea a un perfil.
    return json({ ok: true, ignorado: 'app_user_id no es un uuid de Supabase' })
  }

  const tipo = String(evento.type)
  if (ACTIVAN.includes(tipo)) {
    // El nivel viaja en el product_id. PRODUCT_CHANGE (subir o bajar de nivel)
    // entra por aquí, así que el mismo update lo actualiza.
    const error = await aplicarSuscripcion(
      admin,
      uid,
      String(evento.product_id ?? ''),
      Number(evento.expiration_at_ms ?? 0),
    )
    if (error) return errorBd(error)
  } else if (tipo === 'NON_RENEWING_PURCHASE') {
    const productoTienda = String(evento.product_id ?? '')
    const producto = idBase(productoTienda)
    if (esUnlock(productoTienda)) {
      const error = await aplicarUnlock(admin, uid)
      if (error) return errorBd(error)
    } else if (producto in CREDITOS) {
      // Recarga de créditos. A diferencia de los updates de plan, sumar NO es
      // idempotente: solo se abona en el primer intento (`esNuevo`); un
      // reintento de RC sobre un evento ya archivado no vuelve a acreditar.
      if (esNuevo) {
        const { error } = await admin.rpc('sumar_creditos_extra', {
          p_uid: uid,
          p_creditos: CREDITOS[producto],
        })
        if (error) return errorBd(error)
      }
    }
    // Cualquier otro one-time queda auditado y sin efecto.
  } else if (tipo === 'EXPIRATION') {
    const error = await aplicarExpiracion(admin, uid)
    if (error) return errorBd(error)
  }
  // CANCELLATION: sigue Pro hasta EXPIRATION → no tocar.
  // BILLING_ISSUE / TRANSFER / etc.: solo auditoría.

  return json({ ok: true })
})

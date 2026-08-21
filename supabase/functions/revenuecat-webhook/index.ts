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

/** Error de BD: se registra el detalle en el log del servidor, no en la respuesta. */
function errorBd(e: unknown): Response {
  console.error('[rc-webhook] error de base de datos:', e)
  return json({ error: 'bd' }, 500)
}

const ACTIVAN = ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE']
/**
 * Niveles de la suscripción (product_id de RC → multiplicador del pool). El
 * nivel se guarda en `perfiles.nivel` y `pool_mensual()` lo multiplica por los
 * créditos base: 700 / 1400 / 2100.
 *
 * Subir o bajar de nivel es un PRODUCT_CHANGE, no una compra nueva. Los ids
 * `_v2` son los de $6/$12/$18 (ago 2026); los viejos ($5/$10/$15) se conservan
 * para no dejar sin pool a quien siga suscrito a ellos —en RevenueCat el precio
 * es inmutable, así que cambiarlo obliga a crear productos nuevos—. Espejo de
 * `NIVELES` en src/core/cuenta/productos.ts.
 */
const NIVELES: Record<string, number> = {
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
const CREDITOS: Record<string, number> = {
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
const UNLOCK_PRODUCTOS = ['unlock_casa_v4', 'unlock_casa_v3', 'unlock_casa_v2', 'unlock_casa']
const TRIAL_DIAS = 30

/** En Apple el id de producto es único en TODO el App Store: lleva el bundle. */
const BUNDLE = 'com.macr120.mindhome.'

/**
 * El mismo producto se llama distinto en cada tienda. Aquí se devuelve al id
 * canónico —el de las tablas de arriba— quitando lo que le añade la tienda:
 * el bundle por delante (Apple) y el plan base de la suscripción por detrás
 * (`pro_x1_v2:mensual`, Google Play). Espejo de `idBase()` en
 * src/core/cuenta/productos.ts.
 */
function idBase(id: string): string {
  const sinPlan = id.split(':')[0]
  return sinPlan.startsWith(BUNDLE) ? sinPlan.slice(BUNDLE.length) : sinPlan
}
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
    const expiraMs = Number(evento.expiration_at_ms ?? 0)
    // El nivel viaja en el product_id. PRODUCT_CHANGE (subir o bajar de nivel)
    // entra por aquí, así que el mismo update lo actualiza. Un producto
    // desconocido se queda en el nivel base en vez de dejar al usuario sin pool.
    const nivel = NIVELES[idBase(String(evento.product_id ?? ''))] ?? 1
    // fue_pro: sin trials configurados en RC, todo evento de ACTIVAN implica
    // cobro real. Si algún día se añade trial, excluir aquí period_type==='TRIAL'.
    const { error } = await admin
      .from('perfiles')
      .update({
        plan: 'pro',
        plan_expira: expiraMs > 0 ? new Date(expiraMs).toISOString() : null,
        fue_pro: true,
        nivel,
      })
      .eq('user_id', uid)
    if (error) return errorBd(error)
  } else if (tipo === 'NON_RENEWING_PURCHASE') {
    const producto = idBase(String(evento.product_id ?? ''))
    if (UNLOCK_PRODUCTOS.includes(producto)) {
      // unlock=true se aplica SIEMPRE (idempotente, como los updates de plan);
      // el trial de 30 días solo la primera vez que el flag cambia y solo si el
      // perfil sigue en 'local' (no degradar a un Pro que además compró el
      // unlock). Así un reintento tras un update fallido sí completa el alta,
      // y uno tras un alta exitosa no re-extiende el trial.
      const { data: perfil, error: errSel } = await admin
        .from('perfiles')
        .select('plan, unlock')
        .eq('user_id', uid)
        .single()
      if (errSel) return errorBd(errSel)
      const cambios: Record<string, unknown> = { unlock: true }
      if (perfil && !perfil.unlock && perfil.plan === 'local') {
        cambios.plan = 'trial'
        cambios.plan_expira = new Date(Date.now() + TRIAL_DIAS * 86_400_000).toISOString()
      }
      const { error } = await admin.from('perfiles').update(cambios).eq('user_id', uid)
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
    // El nivel vuelve a la base: si no, quien cancela un ×3 y luego compra el
    // unlock estrenaría el trial multiplicado.
    const { error } = await admin
      .from('perfiles')
      .update({ plan: 'local', plan_expira: null, nivel: 1 })
      .eq('user_id', uid)
    if (error) return errorBd(error)
  }
  // CANCELLATION: sigue Pro hasta EXPIRATION → no tocar.
  // BILLING_ISSUE / TRANSFER / etc.: solo auditoría.

  return json({ ok: true })
})

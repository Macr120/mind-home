/**
 * Webhook de RevenueCat → perfiles.plan.
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

const ACTIVAN = ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE']
/**
 * Compras sueltas de créditos (product_id de RC → créditos que abona). No
 * caducan y no requieren suscripción: son el único acceso a la IA en modo local.
 */
const RECARGAS: Record<string, number> = {
  recarga_150: 150,
  recarga_600: 600,
  recarga_1500: 1500,
}
/**
 * Pago único que desbloquea la app para siempre e incluye el «primer mes»:
 * 30 días de plan 'trial' (pool de 700 créditos + sync) sin tarjeta ni
 * suscripción (20260815000001). One-time SIN entitlement, como las recargas.
 */
const UNLOCK_PRODUCTO = 'unlock_casa'
const TRIAL_DIAS = 30
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
    // fue_pro: sin trials configurados en RC, todo evento de ACTIVAN implica
    // cobro real. Si algún día se añade trial, excluir aquí period_type==='TRIAL'.
    const { error } = await admin
      .from('perfiles')
      .update({
        plan: 'pro',
        plan_expira: expiraMs > 0 ? new Date(expiraMs).toISOString() : null,
        fue_pro: true,
      })
      .eq('user_id', uid)
    if (error) return json({ error: 'bd', mensaje: error.message }, 500)
  } else if (tipo === 'NON_RENEWING_PURCHASE') {
    const producto = String(evento.product_id ?? '')
    if (producto === UNLOCK_PRODUCTO) {
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
      if (errSel) return json({ error: 'bd', mensaje: errSel.message }, 500)
      const cambios: Record<string, unknown> = { unlock: true }
      if (perfil && !perfil.unlock && perfil.plan === 'local') {
        cambios.plan = 'trial'
        cambios.plan_expira = new Date(Date.now() + TRIAL_DIAS * 86_400_000).toISOString()
      }
      const { error } = await admin.from('perfiles').update(cambios).eq('user_id', uid)
      if (error) return json({ error: 'bd', mensaje: error.message }, 500)
    } else {
      // Recarga de créditos: abono atómico, solo la primera vez que llega el evento.
      const creditos = RECARGAS[producto] ?? 0
      if (creditos > 0 && esNuevo) {
        const { error } = await admin.rpc('sumar_creditos_extra', {
          p_uid: uid,
          p_creditos: creditos,
        })
        if (error) return json({ error: 'bd', mensaje: error.message }, 500)
      }
    }
  } else if (tipo === 'EXPIRATION') {
    const { error } = await admin
      .from('perfiles')
      .update({ plan: 'local', plan_expira: null })
      .eq('user_id', uid)
    if (error) return json({ error: 'bd', mensaje: error.message }, 500)
  }
  // CANCELLATION: sigue Pro hasta EXPIRATION → no tocar.
  // BILLING_ISSUE / TRANSFER / etc.: solo auditoría.

  return json({ ok: true })
})

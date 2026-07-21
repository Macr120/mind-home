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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400)

  const secreto = Deno.env.get('RC_WEBHOOK_AUTH') ?? ''
  const auth = req.headers.get('Authorization') ?? ''
  if (!secreto || auth !== secreto) return json({ error: 'no-autorizado' }, 401)

  interface EventoRC {
    id?: unknown
    type?: unknown
    app_user_id?: unknown
    expiration_at_ms?: unknown
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

  // Auditoría (los duplicados de reintentos no estorban).
  await admin.from('rc_eventos').upsert(
    {
      id: String(evento.id),
      tipo: String(evento.type),
      app_user_id: String(evento.app_user_id ?? ''),
      payload: evento,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  )

  const uid = String(evento.app_user_id ?? '')
  if (!UUID_RE.test(uid)) {
    // Compra anónima u otro alias: queda auditada pero no mapea a un perfil.
    return json({ ok: true, ignorado: 'app_user_id no es un uuid de Supabase' })
  }

  const tipo = String(evento.type)
  if (ACTIVAN.includes(tipo)) {
    const expiraMs = Number(evento.expiration_at_ms ?? 0)
    const { error } = await admin
      .from('perfiles')
      .update({ plan: 'pro', plan_expira: expiraMs > 0 ? new Date(expiraMs).toISOString() : null })
      .eq('user_id', uid)
    if (error) return json({ error: 'bd', mensaje: error.message }, 500)
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

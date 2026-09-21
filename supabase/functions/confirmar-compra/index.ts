/**
 * Confirmación directa de una compra, y bitácora de lo que la tienda contestó.
 *
 * Hasta el 21-sep-2026 la app daba una compra por buena SOLO cuando el webhook
 * de RevenueCat había escrito `perfiles`: si el webhook tardaba más de ~15 s,
 * quien acababa de pagar veía «la compra no se completó». Esta función quita
 * esa dependencia: la app la llama nada más volver de la hoja de pago y AQUÍ
 * se le pregunta a RevenueCat qué tiene la cuenta (servidor a servidor, con la
 * clave secreta) y se aplica al perfil con las MISMAS reglas que el webhook
 * (`_shared/compras.ts`). El webhook sigue existiendo para renovaciones,
 * expiraciones y recargas; esto solo adelanta el resultado.
 *
 * Además archiva en `compras_log` cada paso que la app reporta (catálogo,
 * compra, perfil), con su código de error si lo hubo: cuatro revisiones de
 * Apple fallaron en la compra sin que quedara rastro de qué vio el revisor.
 *
 * Se despliega con verify_jwt (por defecto): el uid sale del JWT, nunca del
 * cuerpo, así nadie confirma compras ajenas.
 *
 * Secreto: `RC_API_KEY` (clave secreta v1 de RevenueCat). Sin ella la función
 * solo registra la bitácora y responde `sin-clave`; la app cae a esperar el
 * webhook, como antes.
 */
import { json, preflight, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, usuarioDe, clienteAdmin } from '../_shared/auth.ts'
import { aplicarSuscripcion, aplicarUnlock, esNivel, esUnlock } from '../_shared/compras.ts'

const PASOS = new Set(['catalogo', 'compra', 'perfil', 'confirmar'])
const RESULTADOS = new Set(['ok', 'error', 'cancelada'])

/** Un campo de texto del cuerpo, acotado: es bitácora, no hay que confiar en él. */
function texto(v: unknown, max: number): string {
  return String(v ?? '').slice(0, max)
}

interface Suscripcion {
  expires_date?: string | null
}

/** La respuesta de `GET /v1/subscribers/{uid}` en lo que aquí importa. */
interface SubscriberRC {
  non_subscriptions?: Record<string, unknown[]>
  subscriptions?: Record<string, Suscripcion>
}

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  const cors = corsDe(req)
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400, cors)

  const usuario = await usuarioDe(clienteUsuario(req))
  if (!usuario) return json({ error: 'sin-sesion' }, 401, cors)

  let cuerpo: Record<string, unknown> = {}
  try {
    cuerpo = (await req.json()) as Record<string, unknown>
  } catch {
    // Sin cuerpo o JSON inválido: se trata como una confirmación a secas.
  }
  const paso = PASOS.has(String(cuerpo.paso)) ? String(cuerpo.paso) : 'confirmar'
  const resultado = RESULTADOS.has(String(cuerpo.resultado)) ? String(cuerpo.resultado) : 'ok'

  const admin = clienteAdmin()

  // Bitácora primero: aunque RevenueCat no conteste, el paso queda escrito.
  const { error: errLog } = await admin.from('compras_log').insert({
    user_id: usuario.id,
    plataforma: texto(cuerpo.plataforma, 20),
    os: texto(cuerpo.os, 200),
    paso,
    producto: texto(cuerpo.producto, 80),
    resultado,
    codigo: texto(cuerpo.codigo, 80),
    mensaje: texto(cuerpo.mensaje, 500),
  })
  if (errLog) console.error('[confirmar-compra] bitácora:', errLog)

  // Solo hay algo que confirmar cuando la app dice que la tienda cobró.
  if (resultado !== 'ok' || paso === 'catalogo') return json({ ok: true, confirmado: false }, 200, cors)

  const clave = Deno.env.get('RC_API_KEY') ?? ''
  if (!clave) return json({ ok: false, error: 'sin-clave' }, 503, cors)

  let subscriber: SubscriberRC
  try {
    const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(usuario.id)}`, {
      headers: { Authorization: `Bearer ${clave}`, Accept: 'application/json' },
    })
    if (!r.ok) {
      console.error('[confirmar-compra] RevenueCat respondió', r.status)
      return json({ ok: false, error: 'tienda' }, 502, cors)
    }
    subscriber = ((await r.json()) as { subscriber?: SubscriberRC }).subscriber ?? {}
  } catch (e) {
    console.error('[confirmar-compra] RevenueCat no contestó:', e)
    return json({ ok: false, error: 'tienda' }, 502, cors)
  }

  // La casa: cualquier pago único de unlock, de cualquier tienda.
  let unlock = false
  for (const producto of Object.keys(subscriber.non_subscriptions ?? {})) {
    if (!esUnlock(producto)) continue
    const error = await aplicarUnlock(admin, usuario.id)
    if (error) {
      console.error('[confirmar-compra] unlock:', error)
      return json({ ok: false, error: 'bd' }, 500, cors)
    }
    unlock = true
    break
  }

  // La suscripción vigente con la expiración más lejana (RC deja las vencidas
  // en la lista con su `expires_date` pasada).
  let plan: 'pro' | null = null
  let mejor: { producto: string; expiraMs: number } | null = null
  for (const [producto, s] of Object.entries(subscriber.subscriptions ?? {})) {
    if (!esNivel(producto)) continue
    const expiraMs = s.expires_date ? Date.parse(s.expires_date) : 0
    if (expiraMs <= Date.now()) continue
    if (!mejor || expiraMs > mejor.expiraMs) mejor = { producto, expiraMs }
  }
  if (mejor) {
    const error = await aplicarSuscripcion(admin, usuario.id, mejor.producto, mejor.expiraMs)
    if (error) {
      console.error('[confirmar-compra] suscripción:', error)
      return json({ ok: false, error: 'bd' }, 500, cors)
    }
    plan = 'pro'
  }

  return json({ ok: true, confirmado: unlock || plan === 'pro', unlock, plan }, 200, cors)
})

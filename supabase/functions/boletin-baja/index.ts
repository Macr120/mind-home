/**
 * Baja del boletín diario con el enlace del correo, sin iniciar sesión
 * (migración 20261005000002). GET = el clic en «Darme de baja»; POST = la baja
 * de un clic que piden Gmail/Yahoo por `List-Unsubscribe-Post`.
 *
 *   GET|POST …/boletin-baja?t=<token>
 *
 * Responde texto plano: Supabase sirve como text/plain el HTML de las
 * funciones en su dominio, así que una página no se vería.
 */
import { clienteAdmin } from '../_shared/auth.ts'
import { textosDe } from '../_shared/boletinTextos.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return new Response(null, { status: 405 })
  const token = new URL(req.url).searchParams.get('t') ?? ''
  if (!UUID.test(token)) return new Response('Enlace no válido / Invalid link', { status: 400 })

  const { data } = await clienteAdmin()
    .from('boletin_suscripciones')
    .update({ acepta: false, respondido: new Date().toISOString() })
    .eq('token', token)
    .select('idioma')
    .maybeSingle()

  // Token desconocido (o el de un correo de prueba): se responde igual, sin
  // revelar si existe.
  return new Response(textosDe(data?.idioma ?? 'es').bajaHecha, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
})

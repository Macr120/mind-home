/**
 * Proxy de generación de imágenes (Gemini) con cuota mensual por usuario.
 * Mismos errores tipados que ia-chat. Devuelve base64 + mime.
 */
import { preflight, json } from '../_shared/cors.ts'
import { clienteUsuario, usuarioDe } from '../_shared/auth.ts'

const MODELO = 'gemini-2.5-flash-image'

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') {
    return json({ error: 'peticion-invalida', mensaje: 'Método no soportado.' }, 400)
  }

  const supabase = clienteUsuario(req)
  const usuario = await usuarioDe(supabase)
  if (!usuario) return json({ error: 'sin-sesion', mensaje: 'Inicia sesión para usar la IA.' }, 401)

  let prompt: string
  try {
    const body = (await req.json()) as { prompt?: unknown }
    prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  } catch {
    return json({ error: 'peticion-invalida', mensaje: 'JSON inválido.' }, 400)
  }
  if (!prompt) return json({ error: 'peticion-invalida', mensaje: 'Sin prompt.' }, 400)

  const { data: cuota, error: errCuota } = await supabase.rpc('consumir_cuota_ia', { p_tipo: 'imagen' })
  if (errCuota) return json({ error: 'proveedor', mensaje: 'No se pudo verificar la cuota.' }, 502)
  if (!cuota?.permitido) {
    if (cuota?.motivo === 'sin-pro') {
      return json({ error: 'sin-pro', mensaje: 'La IA es parte del plan Pro.' }, 403)
    }
    return json({ error: 'cuota-agotada', mensaje: 'Agotaste tus imágenes de IA de este mes.' }, 429)
  }

  let resp: Response
  try {
    resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') ?? '',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      },
    )
  } catch {
    await supabase.rpc('devolver_cuota_ia', { p_tipo: 'imagen' })
    return json({ error: 'proveedor', mensaje: 'El proveedor de imágenes no respondió.' }, 502)
  }

  if (!resp.ok) {
    await supabase.rpc('devolver_cuota_ia', { p_tipo: 'imagen' })
    return json({ error: 'proveedor', mensaje: `Proveedor de imágenes: error ${resp.status}.` }, 502)
  }

  interface ParteGemini {
    inlineData?: { data?: string; mimeType?: string }
  }
  const data = (await resp.json()) as {
    candidates?: { content?: { parts?: ParteGemini[] } }[]
  }
  const partes = data.candidates?.[0]?.content?.parts ?? []
  const img = partes.find((p) => p.inlineData?.data)?.inlineData
  if (!img?.data) {
    await supabase.rpc('devolver_cuota_ia', { p_tipo: 'imagen' })
    return json({ error: 'proveedor', mensaje: 'El proveedor no devolvió imagen.' }, 502)
  }

  return json({
    base64: img.data,
    mime: img.mimeType || 'image/png',
    uso: { usadas: cuota.usadas, limite: cuota.limite },
  })
})

/**
 * Proxy de chat IA (Anthropic) con cuota mensual por usuario.
 *
 * Flujo: JWT → consumir_cuota_ia('chat') → Anthropic Messages → registrar
 * tokens reales → responder. Si el proveedor falla, se devuelve la unidad.
 * Errores tipados para el cliente: sin-sesion 401 · sin-pro 403 ·
 * cuota-agotada 429 · proveedor 502 · peticion-invalida 400.
 */
import { preflight, json } from '../_shared/cors.ts'
import { clienteUsuario, usuarioDe } from '../_shared/auth.ts'

const MODELO = 'claude-haiku-4-5'
const MAX_TOKENS_TOPE = 4096

interface MensajeIn {
  rol: 'usuario' | 'asistente'
  texto: string
  imagen?: { base64: string; mediaType: string }
}

interface BodyIn {
  system?: string
  mensajes?: MensajeIn[]
  tools?: { name: string; description: string; schema: Record<string, unknown> }[]
  maxTokens?: number
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') {
    return json({ error: 'peticion-invalida', mensaje: 'Método no soportado.' }, 400)
  }

  const supabase = clienteUsuario(req)
  const usuario = await usuarioDe(supabase)
  if (!usuario) return json({ error: 'sin-sesion', mensaje: 'Inicia sesión para usar la IA.' }, 401)

  let body: BodyIn
  try {
    body = await req.json()
  } catch {
    return json({ error: 'peticion-invalida', mensaje: 'JSON inválido.' }, 400)
  }
  const mensajes = Array.isArray(body.mensajes) ? body.mensajes : []
  if (!mensajes.length) return json({ error: 'peticion-invalida', mensaje: 'Sin mensajes.' }, 400)

  const { data: cuota, error: errCuota } = await supabase.rpc('consumir_cuota_ia', { p_tipo: 'chat' })
  if (errCuota) return json({ error: 'proveedor', mensaje: 'No se pudo verificar la cuota.' }, 502)
  if (!cuota?.permitido) {
    if (cuota?.motivo === 'sin-pro') {
      return json({ error: 'sin-pro', mensaje: 'La IA es parte del plan Pro.' }, 403)
    }
    return json({ error: 'cuota-agotada', mensaje: 'Agotaste tu cuota de IA de este mes.' }, 429)
  }

  const contenido = (m: MensajeIn) =>
    m.imagen
      ? [
          {
            type: 'image',
            source: { type: 'base64', media_type: m.imagen.mediaType, data: m.imagen.base64 },
          },
          { type: 'text', text: m.texto },
        ]
      : m.texto

  const payload = {
    model: MODELO,
    max_tokens: Math.max(1, Math.min(MAX_TOKENS_TOPE, body.maxTokens ?? 1500)),
    system: body.system || undefined,
    messages: mensajes.map((m) => ({
      role: m.rol === 'usuario' ? 'user' : 'assistant',
      content: contenido(m),
    })),
    tools: body.tools?.length
      ? body.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema }))
      : undefined,
  }

  let resp: Response
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    await supabase.rpc('devolver_cuota_ia', { p_tipo: 'chat' })
    return json({ error: 'proveedor', mensaje: 'El proveedor de IA no respondió.' }, 502)
  }

  if (!resp.ok) {
    await supabase.rpc('devolver_cuota_ia', { p_tipo: 'chat' })
    return json({ error: 'proveedor', mensaje: `Proveedor de IA: error ${resp.status}.` }, 502)
  }

  interface BloqueRespuesta {
    type: string
    text?: string
    name?: string
    input?: Record<string, unknown>
  }
  const data = (await resp.json()) as {
    content?: BloqueRespuesta[]
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  const bloques = Array.isArray(data.content) ? data.content : []
  const texto =
    bloques
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n') || null
  const llamadas = bloques
    .filter((b) => b.type === 'tool_use' && b.name)
    .map((b) => ({ name: b.name ?? '', input: b.input ?? {} }))
  const entrada = Number(data.usage?.input_tokens ?? 0)
  const salida = Number(data.usage?.output_tokens ?? 0)
  await supabase.rpc('registrar_uso_ia', { p_entrada: entrada, p_salida: salida })

  return json({
    texto,
    llamadas,
    uso: { entrada, salida, usadas: cuota.usadas, limite: cuota.limite },
  })
})

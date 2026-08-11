/**
 * Proxy de texto-a-voz (OpenAI TTS) con cuota por usuario. Alternativa al
 * `speechSynthesis` nativo cuando el asistente tiene `vozIA` activado en su
 * ficha. Mismos errores tipados que ia-chat/ia-imagen/ia-voz. Devuelve el
 * audio como base64 + mime.
 *
 * Un solo proveedor (igual que ia-voz: no hay cadena, sería sobre-diseño para
 * un único transporte). La cuota se cobra ANTES de llamar y se devuelve si falla.
 *
 * Secretos: `OPENAI_API_KEY` (la misma que usan ia-chat/ia-imagen/ia-voz).
 */
import { preflight, json, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, clienteAdmin, usuarioDe } from '../_shared/auth.ts'

/** Corta el intento para que el error sea claro en vez de colgarse esperando. */
const TIMEOUT_MS = 30_000

/**
 * Límite de ENTRADA: el precio de la op solo cubre ~1000 caracteres; sin este
 * tope una respuesta larga del asistente costaría más de lo cobrado.
 */
const MAX_TEXTO = 1000
const VOCES = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])

/** Recorta al final de la última oración completa antes del tope (nunca a media frase). */
function recortar(texto: string, tope: number): string {
  if (texto.length <= tope) return texto
  const cortado = texto.slice(0, tope)
  const ultimo = Math.max(cortado.lastIndexOf('. '), cortado.lastIndexOf('! '), cortado.lastIndexOf('? '))
  return (ultimo > tope * 0.5 ? cortado.slice(0, ultimo + 1) : cortado) + '…'
}

function bytesABase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

async function porOpenAI(texto: string, voz: string): Promise<Uint8Array> {
  const key = Deno.env.get('OPENAI_API_KEY') ?? ''
  if (!key) throw new Error('sin clave')
  const resp = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', voice: voz, input: texto }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!resp.ok) throw new Error(`http ${resp.status}`)
  return new Uint8Array(await resp.arrayBuffer())
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  const cors = corsDe(req)
  if (req.method !== 'POST') {
    return json({ error: 'peticion-invalida', mensaje: 'Método no soportado.' }, 400, cors)
  }

  const usuario = await usuarioDe(clienteUsuario(req))
  if (!usuario) {
    return json({ error: 'sin-sesion', mensaje: 'Inicia sesión para usar la IA.' }, 401, cors)
  }
  // Las RPCs de cuota son exclusivas de service_role (20260803000001).
  const admin = clienteAdmin()

  let texto: string
  let voz = 'alloy'
  try {
    const body = (await req.json()) as { texto?: unknown; voz?: unknown }
    texto = typeof body.texto === 'string' ? body.texto.trim() : ''
    if (typeof body.voz === 'string' && VOCES.has(body.voz)) voz = body.voz
  } catch {
    return json({ error: 'peticion-invalida', mensaje: 'JSON inválido.' }, 400, cors)
  }
  if (!texto) return json({ error: 'peticion-invalida', mensaje: 'Sin texto.' }, 400, cors)
  texto = recortar(texto, MAX_TEXTO)

  const { data: cuota, error: errCuota } = await admin.rpc('consumir_cuota_ia', {
    p_uid: usuario.id,
    p_tipo: 'tts',
  })
  if (errCuota) {
    return json({ error: 'proveedor', mensaje: 'No se pudo verificar la cuota.' }, 502, cors)
  }
  if (!cuota?.permitido) {
    return json({ error: 'cuota-agotada', mensaje: 'Te quedaste sin créditos de IA.' }, 429, cors)
  }

  let bytes: Uint8Array
  try {
    bytes = await porOpenAI(texto, voz)
  } catch (e) {
    // La reserva emitida al cobrar es lo que autoriza la devolución (un solo uso).
    await admin.rpc('devolver_cuota_ia', { p_uid: usuario.id, p_tipo: 'tts', p_reserva: cuota.reserva })
    console.error(`ia-tts: ${e instanceof Error ? e.message : 'error'}`)
    return json({ error: 'proveedor', mensaje: 'El proveedor de voz no respondió.' }, 502, cors)
  }

  await admin.rpc('registrar_uso_ia', {
    p_uid: usuario.id,
    p_entrada: 0,
    p_salida: 0,
    p_cache_crear: 0,
    p_cache_leer: 0,
    p_proveedor: 'openai',
    p_tipo: 'tts',
  })

  return json(
    {
      base64: bytesABase64(bytes),
      mime: 'audio/mpeg',
      proveedor: 'openai',
      uso: {
        usadas: cuota.usadas,
        limite: cuota.limite,
        extra: cuota.extra ?? 0,
        costo: cuota.costo,
      },
    },
    200,
    cors,
  )
})

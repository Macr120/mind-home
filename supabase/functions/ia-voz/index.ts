/**
 * Proxy de dictado por voz (Whisper) con cuota por usuario. Fallback para
 * cuando el cliente no tiene `SpeechRecognition` nativo (WebView de Android
 * vía Capacitor: ese API no existe ahí, a diferencia de `speechSynthesis`).
 * Mismos errores tipados que ia-chat/ia-imagen. Devuelve el texto transcrito.
 *
 * DOS proveedores, como en BYOK: Whisper (OpenAI) y la transcripción multimodal
 * de Gemini. El cliente pide cuál con `prov` —la fila «Voz» del panel de IA en
 * modo Créditos— y el otro queda de respaldo. La cuota se cobra ANTES de llamar
 * y se devuelve si falla toda la cadena.
 *
 * Secretos: `OPENAI_API_KEY`, `GEMINI_API_KEY` (las mismas que ia-chat/ia-imagen).
 */
import { preflight, json, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, clienteAdmin, usuarioDe } from '../_shared/auth.ts'
import { COSTO_FIJO } from '../_shared/costoUsd.ts'

/** Corta el intento para que entre el respaldo en vez de colgarse esperando. */
const TIMEOUT_MS = 30_000

/** Modelo multimodal de Gemini que transcribe (el mismo del chat). */
const MODELO_GEMINI = Deno.env.get('GEMINI_TEXT_MODEL') ?? 'gemini-3.1-flash-lite'

type ProvVoz = 'openai' | 'gemini'

/**
 * Límite de ENTRADA: el precio de la op solo cubre ~30s de audio (el cliente
 * topa la grabación ahí); sin este tope un audio gigante costaría más de lo cobrado.
 */
const MAX_AUDIO_B64 = 2_000_000 // ~1.5 MB reales, de sobra para 30s de audio/webm;opus
const MIMES_AUDIO: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
}

function base64ABytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function porOpenAI(bytes: Uint8Array, mime: string, idioma?: string): Promise<string> {
  const key = Deno.env.get('OPENAI_API_KEY') ?? ''
  if (!key) throw new Error('sin clave')
  const fd = new FormData()
  fd.append('model', 'whisper-1')
  fd.append('file', new File([bytes], `dictado.${MIMES_AUDIO[mime]}`, { type: mime }))
  if (idioma) fd.append('language', idioma)
  const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!resp.ok) throw new Error(`http ${resp.status}`)
  const data = (await resp.json()) as { text?: string }
  if (typeof data.text !== 'string') throw new Error('sin texto')
  return data.text
}

/**
 * Transcripción con Gemini: el audio va en `inlineData` a su modelo de chat (no
 * hay endpoint de audio aparte). El prompt exige SOLO el texto para que no
 * comente ni traduzca. Mismo enfoque que `sttGemini` en `core/audio/dictado.ts`.
 */
async function porGemini(audioBase64: string, mime: string, idioma?: string): Promise<string> {
  const key = Deno.env.get('GEMINI_API_KEY') ?? ''
  if (!key) throw new Error('sin clave')
  const prompt = `Transcribe literalmente este audio${idioma ? ` (idioma: ${idioma})` : ''}. Responde SOLO con el texto transcrito, sin comentarios.`
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mime, data: audioBase64 } }] }],
      }),
    },
  )
  if (!resp.ok) throw new Error(`http ${resp.status}`)
  const data = (await resp.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const texto = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim()
  if (!texto) throw new Error('sin texto')
  return texto
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

  let audioBase64: string
  let mime: string
  let idioma: string | undefined
  /** Proveedor preferido del usuario (fila «Voz» del panel de IA en Créditos). */
  let preferido: ProvVoz | null = null
  try {
    const body = (await req.json()) as {
      audioBase64?: unknown
      mime?: unknown
      idioma?: unknown
      prov?: unknown
    }
    audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : ''
    mime = typeof body.mime === 'string' ? body.mime : ''
    idioma = typeof body.idioma === 'string' && body.idioma ? body.idioma : undefined
    if (body.prov === 'openai' || body.prov === 'gemini') preferido = body.prov
  } catch {
    return json({ error: 'peticion-invalida', mensaje: 'JSON inválido.' }, 400, cors)
  }
  if (!audioBase64) return json({ error: 'peticion-invalida', mensaje: 'Sin audio.' }, 400, cors)
  if (audioBase64.length > MAX_AUDIO_B64) {
    return json({ error: 'peticion-invalida', mensaje: 'Audio demasiado largo.' }, 400, cors)
  }
  if (!MIMES_AUDIO[mime]) {
    return json({ error: 'peticion-invalida', mensaje: 'Formato de audio no soportado.' }, 400, cors)
  }

  const { data: cuota, error: errCuota } = await admin.rpc('consumir_cuota_ia', {
    p_uid: usuario.id,
    p_tipo: 'voz',
  })
  if (errCuota) {
    return json({ error: 'proveedor', mensaje: 'No se pudo verificar la cuota.' }, 502, cors)
  }
  if (!cuota?.permitido) {
    if (cuota?.motivo === 'techo') {
      return json({ error: 'techo', mensaje: 'Alcanzaste el límite de uso del mes.' }, 429, cors)
    }
    return json({ error: 'cuota-agotada', mensaje: 'Te quedaste sin créditos de IA.' }, 429, cors)
  }

  const cadena: ProvVoz[] = preferido === 'gemini' ? ['gemini', 'openai'] : ['openai', 'gemini']
  let texto: string | null = null
  let proveedor: ProvVoz = 'openai'
  const fallos: string[] = []
  for (const id of cadena) {
    try {
      texto =
        id === 'openai'
          ? await porOpenAI(base64ABytes(audioBase64), mime, idioma)
          : await porGemini(audioBase64, mime, idioma)
      proveedor = id
      break
    } catch (e) {
      fallos.push(`${id}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  if (texto === null) {
    // La reserva emitida al cobrar es lo que autoriza la devolución (un solo uso).
    await admin.rpc('devolver_cuota_ia', { p_uid: usuario.id, p_tipo: 'voz', p_reserva: cuota.reserva })
    console.error(`ia-voz: cadena agotada — ${fallos.join(' | ')}`)
    return json({ error: 'proveedor', mensaje: 'El proveedor de voz no respondió.' }, 502, cors)
  }
  if (fallos.length) console.warn(`ia-voz: respaldo ${proveedor} tras ${fallos.join(' | ')}`)

  // Se completa aunque el cliente corte tras responder el proveedor (M4); fallback a await.
  // El `.then()` dispara la petición (el builder de `rpc` es perezoso) y saca el
  // error al log; ver la nota larga en `ia-chat/index.ts`.
  const registro = admin
    .rpc('registrar_uso_ia', {
      p_uid: usuario.id,
      p_entrada: 0,
      p_salida: 0,
      p_cache_crear: 0,
      p_cache_leer: 0,
      p_proveedor: proveedor,
      p_tipo: 'voz',
      p_usd: proveedor === 'gemini' ? COSTO_FIJO.vozGemini : COSTO_FIJO.voz,
    })
    .then(({ error }) => {
      if (error) console.error('ia-voz: registrar_uso_ia falló —', error.message)
    })
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(registro)
  else await registro

  return json(
    {
      texto,
      proveedor,
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

/**
 * Proxy de texto-a-voz con cuota por usuario. Alternativa al `speechSynthesis`
 * nativo cuando el asistente tiene `vozIA` activado en su ficha. Mismos errores
 * tipados que ia-chat/ia-imagen/ia-voz. Devuelve el audio como base64 + mime.
 *
 * DOS proveedores, como en BYOK: OpenAI (`tts-1`, mp3) y Gemini
 * (`gemini-2.5-flash-preview-tts`, PCM crudo que aquí se envuelve en WAV). El
 * cliente pide cuál con `prov` —la fila «Voz» del panel de IA en modo
 * Créditos— y el otro queda de respaldo, así que una preferencia nunca deja al
 * asistente mudo. Cada uno tiene su propio juego de voces: una voz que no sea
 * del proveedor servido cae a la primera de ese proveedor.
 *
 * La cuota se cobra ANTES de llamar y se devuelve si falla toda la cadena.
 * Los créditos siguen al gasto REAL (migración 20260820000002), así que el
 * costo USD que se registra depende del proveedor que acabó sirviendo.
 *
 * Secretos: `OPENAI_API_KEY`, `GEMINI_API_KEY` (las mismas que ia-chat/ia-imagen).
 */
import { preflight, json, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, clienteAdmin, usuarioDe } from '../_shared/auth.ts'
import { COSTO_FIJO, costoTtsGeminiUsd } from '../_shared/costoUsd.ts'

/** Corta el intento para que entre el respaldo en vez de colgarse esperando. */
const TIMEOUT_MS = 30_000

/**
 * Límite de ENTRADA: el precio de la op solo cubre ~1000 caracteres; sin este
 * tope una respuesta larga del asistente costaría más de lo cobrado.
 */
const MAX_TEXTO = 1000

/** Voces prefabricadas por proveedor (espejo de `VOCES_IA` en `core/audio/vozIA.ts`). */
const VOCES: Record<ProvVoz, readonly string[]> = {
  openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
  gemini: ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede'],
}

type ProvVoz = 'openai' | 'gemini'

// Modelo TTS de Gemini, aún en preview (ago 2026): si Google lo retira, cambiar
// aquí y en `core/audio/vozIA.ts`.
const MODELO_GEMINI = Deno.env.get('GEMINI_TTS_MODEL') ?? 'gemini-2.5-flash-preview-tts'

/** Audio ya normalizado: bytes, su mime y lo que costó de verdad. */
interface Audio {
  bytes: Uint8Array
  mime: string
  usd: number
}

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

function base64ABytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** La voz pedida si es de este proveedor; si no, la primera suya. */
function vozDe(prov: ProvVoz, voz: string): string {
  return VOCES[prov].includes(voz) ? voz : VOCES[prov][0]
}

async function porOpenAI(texto: string, voz: string): Promise<Audio> {
  const key = Deno.env.get('OPENAI_API_KEY') ?? ''
  if (!key) throw new Error('sin clave')
  const resp = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', voice: vozDe('openai', voz), input: texto }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!resp.ok) throw new Error(`http ${resp.status}`)
  return {
    bytes: new Uint8Array(await resp.arrayBuffer()),
    mime: 'audio/mpeg',
    usd: COSTO_FIJO.tts,
  }
}

/** Envuelve PCM crudo (16-bit mono) en cabecera WAV: `<audio>` no reproduce PCM pelado. */
function pcmAWav(pcm: Uint8Array, rate: number): Uint8Array {
  const salida = new Uint8Array(44 + pcm.length)
  const v = new DataView(salida.buffer)
  const rotular = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i))
  }
  rotular(0, 'RIFF')
  v.setUint32(4, 36 + pcm.length, true)
  rotular(8, 'WAVE')
  rotular(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true) // PCM lineal
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true) // bytes/segundo (16 bits)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  rotular(36, 'data')
  v.setUint32(40, pcm.length, true)
  salida.set(pcm, 44)
  return salida
}

async function porGemini(texto: string, voz: string): Promise<Audio> {
  const key = Deno.env.get('GEMINI_API_KEY') ?? ''
  if (!key) throw new Error('sin clave')
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts: [{ text: texto }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: vozDe('gemini', voz) } } },
        },
      }),
    },
  )
  if (!resp.ok) throw new Error(`http ${resp.status}`)
  const data = (await resp.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[]
  }
  const audio = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData
  if (!audio?.data) throw new Error('sin audio')
  // Llega como PCM crudo 16-bit mono (mimeType tipo `audio/L16;...;rate=24000`).
  const pcm = base64ABytes(audio.data)
  const rate = Number(/rate=(\d+)/.exec(audio.mimeType ?? '')?.[1] ?? 24000)
  return {
    bytes: pcmAWav(pcm, rate),
    mime: 'audio/wav',
    // Duración exacta desde el PCM: bytes / (rate × 2 bytes por muestra).
    usd: costoTtsGeminiUsd(pcm.length / (rate * 2)),
  }
}

const ADAPTADORES: Record<ProvVoz, (texto: string, voz: string) => Promise<Audio>> = {
  openai: porOpenAI,
  gemini: porGemini,
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
  let voz = VOCES.openai[0]
  /** Proveedor preferido del usuario; el otro queda de respaldo. */
  let preferido: ProvVoz | null = null
  try {
    const body = (await req.json()) as { texto?: unknown; voz?: unknown; prov?: unknown }
    texto = typeof body.texto === 'string' ? body.texto.trim() : ''
    // La voz se valida contra el proveedor que acabe sirviendo, no aquí: un
    // respaldo cambia de juego de voces a mitad de la cadena.
    if (typeof body.voz === 'string' && body.voz) voz = body.voz
    if (body.prov === 'openai' || body.prov === 'gemini') preferido = body.prov
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
    if (cuota?.motivo === 'techo') {
      return json({ error: 'techo', mensaje: 'Alcanzaste el límite de uso del mes.' }, 429, cors)
    }
    return json({ error: 'cuota-agotada', mensaje: 'Te quedaste sin créditos de IA.' }, 429, cors)
  }

  const cadena: ProvVoz[] = preferido === 'gemini' ? ['gemini', 'openai'] : ['openai', 'gemini']
  let audio: Audio | null = null
  let proveedor: ProvVoz = 'openai'
  const fallos: string[] = []
  for (const id of cadena) {
    try {
      audio = await ADAPTADORES[id](texto, voz)
      proveedor = id
      break
    } catch (e) {
      fallos.push(`${id}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  if (!audio) {
    // La reserva emitida al cobrar es lo que autoriza la devolución (un solo uso).
    await admin.rpc('devolver_cuota_ia', { p_uid: usuario.id, p_tipo: 'tts', p_reserva: cuota.reserva })
    console.error(`ia-tts: cadena agotada — ${fallos.join(' | ')}`)
    return json({ error: 'proveedor', mensaje: 'El proveedor de voz no respondió.' }, 502, cors)
  }
  if (fallos.length) console.warn(`ia-tts: respaldo ${proveedor} tras ${fallos.join(' | ')}`)

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
      p_tipo: 'tts',
      p_usd: audio.usd,
    })
    .then(({ error }) => {
      if (error) console.error('ia-tts: registrar_uso_ia falló —', error.message)
    })
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(registro)
  else await registro

  return json(
    {
      base64: bytesABase64(audio.bytes),
      mime: audio.mime,
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

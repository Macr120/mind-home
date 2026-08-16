/**
 * Proxy de dictado por voz (Whisper) con cuota por usuario. Fallback para
 * cuando el cliente no tiene `SpeechRecognition` nativo (WebView de Android
 * vía Capacitor: ese API no existe ahí, a diferencia de `speechSynthesis`).
 * Mismos errores tipados que ia-chat/ia-imagen. Devuelve el texto transcrito.
 *
 * Un solo proveedor (no hay cadena de respaldo: sería sobre-diseño para un
 * único transporte). La cuota se cobra ANTES de llamar y se devuelve si falla.
 *
 * Secretos: `OPENAI_API_KEY` (la misma que usan ia-chat/ia-imagen).
 */
import { preflight, json, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, clienteAdmin, usuarioDe } from '../_shared/auth.ts'
import { COSTO_FIJO } from '../_shared/costoUsd.ts'

/** Corta el intento para que el error sea claro en vez de colgarse esperando. */
const TIMEOUT_MS = 30_000

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
  try {
    const body = (await req.json()) as { audioBase64?: unknown; mime?: unknown; idioma?: unknown }
    audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : ''
    mime = typeof body.mime === 'string' ? body.mime : ''
    idioma = typeof body.idioma === 'string' && body.idioma ? body.idioma : undefined
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

  let texto: string
  try {
    texto = await porOpenAI(base64ABytes(audioBase64), mime, idioma)
  } catch (e) {
    // La reserva emitida al cobrar es lo que autoriza la devolución (un solo uso).
    await admin.rpc('devolver_cuota_ia', { p_uid: usuario.id, p_tipo: 'voz', p_reserva: cuota.reserva })
    console.error(`ia-voz: ${e instanceof Error ? e.message : 'error'}`)
    return json({ error: 'proveedor', mensaje: 'El proveedor de voz no respondió.' }, 502, cors)
  }

  await admin.rpc('registrar_uso_ia', {
    p_uid: usuario.id,
    p_entrada: 0,
    p_salida: 0,
    p_cache_crear: 0,
    p_cache_leer: 0,
    p_proveedor: 'openai',
    p_tipo: 'voz',
    p_usd: COSTO_FIJO.voz,
  })

  return json(
    {
      texto,
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

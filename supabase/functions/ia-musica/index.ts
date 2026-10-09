/**
 * Proxy de música con voz (Studio de audio · «Versión cantada»). Recibe el
 * prompt ya armado por el cliente (estilo + estructura con tiempos + letra) y
 * lo manda a Google Lyria 3.5 por la API de Gemini (`/v1beta/interactions`).
 * Devuelve el MP3 en base64 TAL CUAL llega (no se decodifica: son megas) y la
 * letra/estructura que el modelo devuelve como texto.
 *
 * Precio fijo por canción ($0.08), así que la op `musica` cobra 16 créditos
 * ANTES de llamar y se devuelve si Google falla o rechaza el contenido.
 * Un solo proveedor: no hay otro modelo con voz en la misma clave.
 *
 * Secretos: `GEMINI_API_KEY` (la misma de ia-chat/ia-imagen/ia-tts) y, opcional,
 * `LYRIA_MODEL` para cambiar de modelo sin desplegar código.
 */
import { preflight, json, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, clienteAdmin, usuarioDe } from '../_shared/auth.ts'
import { dentroDeLimite } from '../_shared/limite.ts'
import { COSTO_FIJO } from '../_shared/costoUsd.ts'

const MODELO = Deno.env.get('LYRIA_MODEL') ?? 'lyria-3.5'

/** Una canción tarda en generarse; se corta antes del límite de la Edge Function. */
const TIMEOUT_MS = 140_000

/** Estilo + estructura + letra de una canción de ~3 min caben de sobra. */
const MAX_PROMPT = 6000

interface Paso {
  type?: string
  content?: { type?: string; data?: string; text?: string; mime_type?: string }[]
}

class Rechazo extends Error {}

async function generar(prompt: string): Promise<{ base64: string; mime: string; texto: string }> {
  const key = Deno.env.get('GEMINI_API_KEY') ?? ''
  if (!key) throw new Error('sin clave')
  const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODELO, input: prompt }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!resp.ok) {
    const cuerpo = (await resp.text()).slice(0, 400)
    // Los filtros de seguridad (voces de artistas, letras con copyright) llegan como 400.
    if (resp.status === 400 && /safety|block|policy|copyright/i.test(cuerpo)) throw new Rechazo(cuerpo)
    throw new Error(`http ${resp.status}: ${cuerpo}`)
  }
  const data = (await resp.json()) as { steps?: Paso[] }
  const bloques = (data.steps ?? []).filter((p) => p.type === 'model_output').flatMap((p) => p.content ?? [])
  const audio = bloques.find((b) => b.type === 'audio' && b.data)
  if (!audio?.data) throw new Rechazo('sin audio')
  const texto = bloques
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('\n')
  return { base64: audio.data, mime: audio.mime_type || 'audio/mpeg', texto }
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
  const admin = clienteAdmin()

  // Cada canción cuesta de verdad: pocas por ventana, además de la cuota.
  if (!(await dentroDeLimite(admin, usuario.id, 'musica', 5, 600))) {
    return json({ error: 'limite', mensaje: 'Vas muy rápido con la IA. Espera unos segundos y reintenta.' }, 429, cors)
  }

  let prompt: string
  try {
    const body = (await req.json()) as { prompt?: unknown }
    prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  } catch {
    return json({ error: 'peticion-invalida', mensaje: 'JSON inválido.' }, 400, cors)
  }
  if (!prompt) return json({ error: 'peticion-invalida', mensaje: 'Sin prompt.' }, 400, cors)
  prompt = prompt.slice(0, MAX_PROMPT)

  const { data: cuota, error: errCuota } = await admin.rpc('consumir_cuota_ia', {
    p_uid: usuario.id,
    p_tipo: 'musica',
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

  let cancion: Awaited<ReturnType<typeof generar>>
  try {
    cancion = await generar(prompt)
  } catch (e) {
    await admin.rpc('devolver_cuota_ia', { p_uid: usuario.id, p_tipo: 'musica', p_reserva: cuota.reserva })
    console.error(`ia-musica: ${e instanceof Error ? e.message : 'error'}`)
    if (e instanceof Rechazo) {
      return json({ error: 'rechazo', mensaje: 'La IA no quiso generar esta canción.' }, 422, cors)
    }
    return json({ error: 'proveedor', mensaje: 'El proveedor de música no respondió.' }, 502, cors)
  }

  // Ver la nota de `ia-tts`: el `.then()` dispara la RPC perezosa y saca el error al log.
  const registro = admin
    .rpc('registrar_uso_ia', {
      p_uid: usuario.id,
      p_entrada: 0,
      p_salida: 0,
      p_cache_crear: 0,
      p_cache_leer: 0,
      p_proveedor: 'gemini',
      p_tipo: 'musica',
      p_usd: COSTO_FIJO.musica,
    })
    .then(({ error }) => {
      if (error) console.error('ia-musica: registrar_uso_ia falló —', error.message)
    })
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(registro)
  else await registro

  return json(
    {
      base64: cancion.base64,
      mime: cancion.mime,
      texto: cancion.texto,
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

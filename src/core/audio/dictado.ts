import { usarViaCuenta, iaVozCuenta, ErrorIA } from '../cuenta/api'
import { esperarSesion } from '../cuenta/sesionStore'
import { getIaKey, proveedorVoz } from '../chat/ia'
import { blobABase64 } from '../imagenIA'
import { useGastoByok } from '../cuenta/gastoByok'
import { costoVoz, costoVozGemini } from '../cuenta/tarifasByok'
import { useCuotaAgotada } from '../state/avisosPlanStore'
import { tGlobal } from '../i18n/useT'

/**
 * Dictado con IA: fallback de `ChatBox` cuando `SpeechRecognition` no existe
 * (WebView de Android vía Capacitor). Mismo patrón cuenta-vs-BYOK que
 * `imagenIA.ts`: vía cuenta pasa por el proxy `ia-voz` (Whisper); en BYOK
 * despacha por `proveedorVoz()` — Whisper con clave de OpenAI, o transcripción
 * multimodal de Gemini (su modelo de chat entiende audio, no hay endpoint aparte).
 */

const EXT_POR_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
}

/** ¿El navegador puede grabar audio? (MediaRecorder + getUserMedia). */
export function hayDictadoFallback(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

const LS_FORZAR_DICTADO_IA = 'mh.forzarDictadoIA'

/**
 * ¿Se fuerza el fallback de Whisper aunque haya `SpeechRecognition` nativo?
 * En escritorio ese API siempre existe, así que sin esto el fallback nunca se
 * ejercita fuera del WebView de Android. Override de pruebas por consola.
 */
export function forzarDictadoIA(): boolean {
  return localStorage.getItem(LS_FORZAR_DICTADO_IA) === '1'
}

// window.mhDictadoIA(true) fuerza el fallback de Whisper en escritorio (pruebas);
// window.mhDictadoIA(false) vuelve al reconocimiento nativo del navegador.
if (typeof window !== 'undefined') {
  ;(window as unknown as { mhDictadoIA?: (on?: boolean) => boolean }).mhDictadoIA = (on = true) => {
    localStorage.setItem(LS_FORZAR_DICTADO_IA, on ? '1' : '0')
    return forzarDictadoIA()
  }
}

/**
 * Corta ANTES de grabar cuando no hay forma de pagar la transcripción: ni
 * cuenta con créditos ni proveedor de voz con clave propia.
 */
async function exigirTransporteVoz(): Promise<void> {
  // Igual que en `chat/ia.ts`: primero que la sesión hidrate, o en los primeros
  // segundos tras abrir la app esto acusaría de «sin créditos» a quien los tiene.
  await esperarSesion()
  if (usarViaCuenta()) return
  if (proveedorVoz()) return
  useCuotaAgotada.getState().abrir()
  throw new ErrorIA('cuota-agotada', tGlobal('cuenta.creditos.faltan', 'Te quedaste sin créditos de IA.'))
}

/**
 * Transcripción con Gemini: audio en `inlineData` al modelo de chat. El prompt
 * exige SOLO el texto para que no comente ni traduzca.
 */
async function sttGemini(blob: Blob, mime: string, key: string, idioma?: string): Promise<string> {
  const prompt = `Transcribe literalmente este audio${idioma ? ` (idioma: ${idioma})` : ''}. Responde SOLO con el texto transcrito, sin comentarios.`
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mime, data: await blobABase64(blob) } }] }],
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const texto = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim()
  if (!texto) throw new Error('Gemini no devolvió texto')
  return texto
}

/**
 * Transcribe un audio grabado con `MediaRecorder`. Lanza si falla o no hay
 * transporte. `duracionSeg` (medida real por el caller con `performance.now()`,
 * no hay forma más barata de saberla sin decodificar el audio) es lo que se
 * usa para estimar el gasto BYOK — sin ella, la llamada BYOK no se cuenta.
 */
export async function transcribir(blob: Blob, idioma?: string, duracionSeg?: number): Promise<string> {
  await exigirTransporteVoz()
  const mime = blob.type || 'audio/webm'
  if (usarViaCuenta()) {
    return iaVozCuenta(await blobABase64(blob), mime, idioma)
  }
  // BYOK: despacho por el proveedor de voz resuelto.
  const provId = proveedorVoz()
  if (provId === 'gemini') {
    const texto = await sttGemini(blob, mime, getIaKey('gemini'), idioma)
    if (duracionSeg) useGastoByok.getState().sumar('voz', costoVozGemini(duracionSeg))
    return texto
  }
  // Whisper con la clave de OpenAI del navegador.
  const key = getIaKey('chatgpt')
  const fd = new FormData()
  fd.append('model', 'whisper-1')
  fd.append('file', new File([blob], `dictado.${EXT_POR_MIME[mime] ?? 'webm'}`, { type: mime }))
  if (idioma) fd.append('language', idioma)
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as { text?: string }
  if (typeof data.text !== 'string') throw new Error('OpenAI no devolvió texto')
  if (duracionSeg) useGastoByok.getState().sumar('voz', costoVoz(duracionSeg))
  return data.text
}

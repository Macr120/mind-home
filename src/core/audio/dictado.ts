import { usarViaCuenta, iaVozCuenta, ErrorIA } from '../cuenta/api'
import { getIaKey } from '../chat/ia'
import { blobABase64 } from '../imagenIA'
import { useGastoByok } from '../cuenta/gastoByok'
import { costoVoz } from '../cuenta/tarifasByok'
import { useCuotaAgotada } from '../state/avisosPlanStore'
import { tGlobal } from '../i18n/useT'

/**
 * Dictado por Whisper: fallback de `ChatBox` cuando `SpeechRecognition` no
 * existe (WebView de Android vía Capacitor). Mismo patrón cuenta-vs-BYOK que
 * `imagenIA.ts`: vía cuenta pasa por el proxy `ia-voz`; en BYOK llama directo
 * a OpenAI con la clave del navegador (Whisper solo lo sirve OpenAI, por eso
 * aquí no hay selector de proveedor).
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
 * cuenta con créditos ni clave de OpenAI propia.
 */
function exigirTransporteVoz(): void {
  if (usarViaCuenta()) return
  if (getIaKey('chatgpt').length > 0) return
  useCuotaAgotada.getState().abrir()
  throw new ErrorIA('cuota-agotada', tGlobal('cuenta.creditos.faltan', 'Te quedaste sin créditos de IA.'))
}

/**
 * Transcribe un audio grabado con `MediaRecorder`. Lanza si falla o no hay
 * transporte. `duracionSeg` (medida real por el caller con `performance.now()`,
 * no hay forma más barata de saberla sin decodificar el audio) es lo que se
 * usa para estimar el gasto BYOK — sin ella, la llamada BYOK no se cuenta.
 */
export async function transcribir(blob: Blob, idioma?: string, duracionSeg?: number): Promise<string> {
  exigirTransporteVoz()
  const mime = blob.type || 'audio/webm'
  if (usarViaCuenta()) {
    return iaVozCuenta(await blobABase64(blob), mime, idioma)
  }
  // BYOK: llamada directa a Whisper con la clave del navegador.
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

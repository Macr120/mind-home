import { usarViaCuenta, iaTtsCuenta, ErrorIA } from '../cuenta/api'
import { getIaKey, proveedorVoz, type ProveedorMediaId } from '../chat/ia'
import { quitarEmojis } from '../chat/texto'
import { useAjustes } from '../state/ajustesStore'
import { useGastoByok } from '../cuenta/gastoByok'
import { costoTts, costoTtsGemini } from '../cuenta/tarifasByok'
import { contextoAudio, gainMaestro } from './motor'

/**
 * Voz con IA de los asistentes: alternativa a `speechSynthesis` nativo
 * (`voz.ts`) cuando el asistente tiene `vozIA` activado en su ficha. Quién la
 * sirve en BYOK lo decide `proveedorVoz()` (OpenAI tts-1 o Gemini TTS); la vía
 * cuenta sigue saliendo por el proxy `ia-tts`. El ducking de música se duplica
 * de `voz.ts` (7 líneas, mismo criterio que los proxies gemelos).
 */

/** Voces prefabricadas por proveedor (la de la ficha se valida contra esta lista). */
export const VOCES_IA: Record<ProveedorMediaId, readonly string[]> = {
  chatgpt: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
  gemini: ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede'],
}

/** Voces elegibles AHORA: vía cuenta = OpenAI (el proxy `ia-tts` usa tts-1). */
export function vocesIaDisponibles(): readonly string[] {
  if (usarViaCuenta()) return VOCES_IA.chatgpt
  return VOCES_IA[proveedorVoz() ?? 'chatgpt']
}

// Modelo TTS de Gemini, aún en preview (ago 2026): si Google lo retira, cambiar
// aquí y la tarifa en tarifasByok.ts.
const MODELO_TTS_GEMINI = 'gemini-2.5-flash-preview-tts'

let audioActual: HTMLAudioElement | null = null
let hablaActual = 0

function duck(bajar: boolean) {
  const ctx = contextoAudio()
  const g = gainMaestro()
  if (!ctx || !g) return
  const volumen = useAjustes.getState().musicaVolumen
  g.gain.setTargetAtTime(bajar ? volumen * 0.25 : volumen, ctx.currentTime, 0.2)
}

async function ttsOpenAI(texto: string, voz: string, key: string): Promise<Blob> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', voice: voz, input: texto }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
  useGastoByok.getState().sumar('tts', costoTts(texto.length))
  return res.blob()
}

/** Envuelve PCM crudo (16-bit mono) en cabecera WAV: `<audio>` no reproduce PCM pelado. */
function pcmAWav(pcm: Uint8Array<ArrayBuffer>, rate: number): Blob {
  const cab = new ArrayBuffer(44)
  const v = new DataView(cab)
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
  return new Blob([cab, pcm], { type: 'audio/wav' })
}

async function ttsGemini(texto: string, voz: string, key: string): Promise<Blob> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_TTS_GEMINI}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: texto }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } },
      },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[]
  }
  const audio = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData
  if (!audio?.data) throw new Error('Gemini no devolvió audio')
  // Llega como PCM crudo 16-bit mono (mimeType tipo `audio/L16;...;rate=24000`).
  const bin = atob(audio.data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const rate = Number(/rate=(\d+)/.exec(audio.mimeType ?? '')?.[1] ?? 24000)
  // Duración exacta desde el PCM: bytes / (rate × 2 bytes por muestra).
  useGastoByok.getState().sumar('tts', costoTtsGemini(bytes.length / (rate * 2)))
  return pcmAWav(bytes, rate)
}

function base64ABlob(b64: string, tipo: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: tipo })
}

export interface OpcionesHablaIA {
  voz?: string
  volumen?: number
  /** Se llama SIEMPRE una sola vez al terminar (fin, error o cancelación). */
  onFin?: () => void
}

/**
 * Pide el audio al proveedor de voz resuelto y lo reproduce. Async (hay red de
 * por medio): a diferencia de `hablarVoz()`, que es síncrona. Devuelve true si arrancó.
 */
export async function hablarVozIA(texto: string, opts: OpcionesHablaIA = {}): Promise<boolean> {
  const limpio = quitarEmojis(texto).trim()
  if (!limpio) return false
  const voces = vocesIaDisponibles()
  const voz = opts.voz && voces.includes(opts.voz) ? opts.voz : voces[0]
  const id = ++hablaActual
  try {
    let blob: Blob
    if (usarViaCuenta()) {
      blob = base64ABlob((await iaTtsCuenta(limpio, voz)).base64, 'audio/mpeg')
    } else {
      const provId = proveedorVoz()
      if (!provId) throw new Error('sin proveedor de voz')
      const key = getIaKey(provId)
      blob = provId === 'chatgpt' ? await ttsOpenAI(limpio, voz, key) : await ttsGemini(limpio, voz, key)
    }
    // Una lectura más nueva ya reemplazó a esta mientras esperábamos la red.
    if (id !== hablaActual) return false
    const url = URL.createObjectURL(blob)
    callarVozIA()
    const audio = new Audio(url)
    audio.volume = Math.min(1, Math.max(0, opts.volumen ?? 1))
    let terminado = false
    const fin = () => {
      if (terminado) return
      terminado = true
      URL.revokeObjectURL(url)
      if (id === hablaActual) duck(false)
      opts.onFin?.()
    }
    audio.onended = fin
    audio.onerror = fin
    audioActual = audio
    duck(true)
    await audio.play()
    return true
  } catch (e) {
    if (id === hablaActual) duck(false)
    if (!(e instanceof ErrorIA)) console.warn('[MPH] voz IA no disponible:', e)
    return false
  }
}

/** Corta cualquier lectura en curso. */
export function callarVozIA(): void {
  if (audioActual) {
    audioActual.pause()
    audioActual = null
  }
}

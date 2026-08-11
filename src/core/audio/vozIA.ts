import { usarViaCuenta, iaTtsCuenta, ErrorIA } from '../cuenta/api'
import { getIaKey } from '../chat/ia'
import { quitarEmojis } from '../chat/texto'
import { useAjustes } from '../state/ajustesStore'
import { useGastoByok } from '../cuenta/gastoByok'
import { costoTts } from '../cuenta/tarifasByok'
import { contextoAudio, gainMaestro } from './motor'

/**
 * Voz con IA de los asistentes (OpenAI TTS): alternativa a `speechSynthesis`
 * nativo (`voz.ts`) cuando el asistente tiene `vozIA` activado en su ficha.
 * Mismo patrón cuenta-vs-BYOK que `dictado.ts`; el ducking de música se
 * duplica de `voz.ts` (7 líneas, mismo criterio que los proxies gemelos).
 */

export const VOCES_IA = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const
export type VozIA = (typeof VOCES_IA)[number]

let audioActual: HTMLAudioElement | null = null
let hablaActual = 0

function duck(bajar: boolean) {
  const ctx = contextoAudio()
  const g = gainMaestro()
  if (!ctx || !g) return
  const volumen = useAjustes.getState().musicaVolumen
  g.gain.setTargetAtTime(bajar ? volumen * 0.25 : volumen, ctx.currentTime, 0.2)
}

async function ttsBYOK(texto: string, voz: string): Promise<Blob> {
  const key = getIaKey('chatgpt')
  if (!key) throw new Error('sin clave')
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', voice: voz, input: texto }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
  useGastoByok.getState().sumar('tts', costoTts(texto.length))
  return res.blob()
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
 * Pide el audio a OpenAI TTS y lo reproduce. Async (hay red de por medio):
 * a diferencia de `hablarVoz()`, que es síncrona. Devuelve true si arrancó.
 */
export async function hablarVozIA(texto: string, opts: OpcionesHablaIA = {}): Promise<boolean> {
  const limpio = quitarEmojis(texto).trim()
  if (!limpio) return false
  const voz = VOCES_IA.includes(opts.voz as VozIA) ? (opts.voz as VozIA) : 'alloy'
  const id = ++hablaActual
  try {
    const blob = usarViaCuenta()
      ? base64ABlob((await iaTtsCuenta(limpio, voz)).base64, 'audio/mpeg')
      : await ttsBYOK(limpio, voz)
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

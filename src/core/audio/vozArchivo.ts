import { Capacitor, registerPlugin } from '@capacitor/core'
import { esAppNativa, esEscritorio } from '../plataforma'

/**
 * La voz del dispositivo como ARCHIVO. `speechSynthesis` solo suena: no
 * entrega el audio. Donde hay algo nativo debajo sí se puede sintetizar a WAV:
 * el shell de escritorio (SAPI por PowerShell en Windows, `say` en macOS) y el
 * plugin local «VozArchivo» de la app de tienda (`TextToSpeech.synthesizeToFile`
 * en Android, `AVSpeechSynthesizer.write` en iOS). En el navegador a secas no
 * hay manera: ahí la voz del dispositivo se limita a sonar en vivo.
 */

interface VozArchivoNativo {
  /** `voz` = nombre exacto de la voz del sistema (vacío = la del idioma); WAV en base64 sin cabecera `data:`. */
  sintetizar(opciones: { texto: string; voz: string; lang: string }): Promise<{ base64: string }>
}

const VozArchivo = registerPlugin<VozArchivoNativo>('VozArchivo')

/** ¿Aquí la voz del dispositivo puede dejar un archivo (timeline y export)? */
export function puedeSintetizarArchivo(): boolean {
  if (esAppNativa()) return Capacitor.isPluginAvailable('VozArchivo')
  return esEscritorio() && typeof window.mph?.vozAArchivo === 'function'
}

/** WAV con la voz del dispositivo. Lanza si la plataforma no pudo. */
export async function sintetizarArchivo(texto: string, voz: string | undefined, lang: string): Promise<Blob> {
  const base64 = esAppNativa()
    ? (await VozArchivo.sintetizar({ texto, voz: voz ?? '', lang })).base64
    : await window.mph?.vozAArchivo?.(texto, voz ?? '', lang)
  if (!base64) throw new Error('sin voz del dispositivo')
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: 'audio/wav' })
}

import { contextoAudio } from '../../core/audio/motor'
import { ENVOLVENTE_HZ } from './constantes'

export interface AnalisisVoz {
  envolvente: number[]
  hz: number
  duracion: number
}

/**
 * Envolvente de amplitud de un audio (la boca del avatar): RMS por ventana
 * (50 ms; 100 ms si pasa del minuto), mezcla mono, normalizada por el percentil
 * 95 y con «release» para que la boca no tiemble. Se PRECALCULA porque el
 * preview no usa WebAudio y el export corre con otro reloj: así los dos abren
 * la boca en el mismo instante. 60 s ≈ 1200 números en el JSON del proyecto.
 */
export async function analizarVoz(blob: Blob): Promise<AnalisisVoz> {
  // decodeAudioData no exige que el contexto esté 'running'; sin contexto, uno offline de usar y tirar.
  const ctx: BaseAudioContext = contextoAudio() ?? new OfflineAudioContext(1, 1, 24000)
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
  const hz = buf.duration > 60 ? 10 : ENVOLVENTE_HZ
  const ventana = Math.max(1, Math.round(buf.sampleRate / hz))
  const n = Math.ceil(buf.length / ventana)
  const canales = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c))
  const rms = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const a = i * ventana
    const b = Math.min(buf.length, a + ventana)
    let suma = 0
    for (let j = a; j < b; j++) {
      let m = 0
      for (const ch of canales) m += ch[j]
      m /= canales.length
      suma += m * m
    }
    rms[i] = Math.sqrt(suma / Math.max(1, b - a))
  }
  const orden = Array.from(rms).sort((x, y) => x - y)
  const p95 = orden[Math.floor((orden.length - 1) * 0.95)] || 1e-6
  const envolvente: number[] = []
  let prev = 0
  for (const v of rms) {
    const x = Math.max(Math.min(1, v / p95), prev * 0.7)
    envolvente.push(Math.round(x * 100) / 100)
    prev = x
  }
  return { envolvente, hz, duracion: buf.duration }
}

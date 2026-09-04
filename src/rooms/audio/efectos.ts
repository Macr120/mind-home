import type { EfectosPista } from '../../core/data/db'
import { segPorPaso } from './constantes'

/**
 * Cadena de efectos del Studio de audio. Funciones puras sobre
 * `BaseAudioContext` (como `instrumentos.ts`): la MISMA topología sirve en vivo
 * y en el `OfflineAudioContext` del export, así el WAV suena igual que la app.
 *
 * Topología: reverb/delay/chorus son buses de RETORNO compartidos (un solo
 * convolver y un solo delay para todo el proyecto — clave en móvil) alimentados
 * por un send por pista; la distorsión es no lineal y va como rama wet POR
 * pista (en bus compartido intermodularía entre pistas).
 */

// ─── Bus maestro (volumen + limitador) ─────────────────────────────────────

export interface BusMaestro {
  entrada: GainNode
  fijarVolumen(v: number): void
  desconectar(): void
}

export function crearBusMaestro(ctx: BaseAudioContext, destino: AudioNode, volumen: number): BusMaestro {
  const entrada = ctx.createGain()
  entrada.gain.value = volumen
  const limitador = ctx.createDynamicsCompressor()
  limitador.threshold.value = -10
  limitador.knee.value = 6
  limitador.ratio.value = 15
  limitador.attack.value = 0.003
  limitador.release.value = 0.25
  entrada.connect(limitador)
  limitador.connect(destino)
  return {
    entrada,
    fijarVolumen(v) {
      entrada.gain.setTargetAtTime(v, ctx.currentTime, 0.03)
    },
    desconectar() {
      entrada.disconnect()
      limitador.disconnect()
    },
  }
}

// ─── Retornos compartidos ──────────────────────────────────────────────────

/** Impulso de reverb cacheado POR contexto (ruido con decaimiento, ~1.8 s). */
const impulsos = new WeakMap<BaseAudioContext, AudioBuffer>()
function impulsoReverb(ctx: BaseAudioContext): AudioBuffer {
  let b = impulsos.get(ctx)
  if (!b) {
    const dur = 1.8
    const n = Math.ceil(ctx.sampleRate * dur)
    b = ctx.createBuffer(2, n, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const datos = b.getChannelData(c)
      for (let i = 0; i < n; i++) datos[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2.8
    }
    impulsos.set(ctx, b)
  }
  return b
}

export interface Retornos {
  reverb: AudioNode
  delay: AudioNode
  chorus: AudioNode
  fijarBpm(bpm: number): void
  desconectar(): void
}

export function crearRetornos(ctx: BaseAudioContext, destino: AudioNode, bpm: number): Retornos {
  // Reverb: convolver → nivel de retorno.
  const convolver = ctx.createConvolver()
  convolver.buffer = impulsoReverb(ctx)
  const retReverb = ctx.createGain()
  retReverb.gain.value = 0.8
  convolver.connect(retReverb)
  retReverb.connect(destino)

  // Delay a corchea con puntillo, con feedback filtrado para que el eco se apague.
  const delay = ctx.createDelay(1.5)
  delay.delayTime.value = 3 * segPorPaso(bpm)
  const fb = ctx.createGain()
  fb.gain.value = 0.35
  const filtroFb = ctx.createBiquadFilter()
  filtroFb.type = 'lowpass'
  filtroFb.frequency.value = 3500
  delay.connect(fb)
  fb.connect(filtroFb)
  filtroFb.connect(delay)
  const retDelay = ctx.createGain()
  retDelay.gain.value = 0.9
  delay.connect(retDelay)
  retDelay.connect(destino)

  // Chorus: copia retrasada ~14 ms cuyo retraso ondula con un LFO lento.
  const chorus = ctx.createDelay(0.06)
  chorus.delayTime.value = 0.014
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.6
  const profundidad = ctx.createGain()
  profundidad.gain.value = 0.004
  lfo.connect(profundidad)
  profundidad.connect(chorus.delayTime)
  lfo.start()
  const retChorus = ctx.createGain()
  retChorus.gain.value = 0.9
  chorus.connect(retChorus)
  retChorus.connect(destino)

  return {
    reverb: convolver,
    delay,
    chorus,
    fijarBpm(v) {
      delay.delayTime.setTargetAtTime(3 * segPorPaso(v), ctx.currentTime, 0.05)
    },
    desconectar() {
      lfo.stop()
      for (const n of [convolver, retReverb, delay, fb, filtroFb, retDelay, chorus, lfo, profundidad, retChorus]) {
        n.disconnect()
      }
    },
  }
}

// ─── Cadena por pista (seco + wet de distorsión + sends) ───────────────────

/** Curva tanh compartida (los Float32Array no dependen del contexto). */
let curvaDist: Float32Array<ArrayBuffer> | null = null
function curvaDistorsion(): Float32Array<ArrayBuffer> {
  if (!curvaDist) {
    curvaDist = new Float32Array(1024)
    for (let i = 0; i < 1024; i++) curvaDist[i] = Math.tanh(4 * (i / 511.5 - 1))
  }
  return curvaDist
}

export interface CadenaPista {
  entrada: GainNode
  /** Mueve los niveles con `setTargetAtTime`; jamás reconstruye el grafo. */
  fijar(fx: EfectosPista): void
  desconectar(): void
}

export function crearCadenaPista(
  ctx: BaseAudioContext,
  destino: AudioNode,
  retornos: Retornos,
  fx: EfectosPista,
): CadenaPista {
  const entrada = ctx.createGain()
  const seco = ctx.createGain()
  entrada.connect(seco)
  seco.connect(destino)

  const pre = ctx.createGain()
  const shaper = ctx.createWaveShaper()
  shaper.curve = curvaDistorsion()
  shaper.oversample = '2x'
  const wetDist = ctx.createGain()
  entrada.connect(pre)
  pre.connect(shaper)
  shaper.connect(wetDist)
  wetDist.connect(destino)

  const sendReverb = ctx.createGain()
  const sendDelay = ctx.createGain()
  const sendChorus = ctx.createGain()
  entrada.connect(sendReverb)
  sendReverb.connect(retornos.reverb)
  entrada.connect(sendDelay)
  sendDelay.connect(retornos.delay)
  entrada.connect(sendChorus)
  sendChorus.connect(retornos.chorus)

  const aplicar = (f: EfectosPista, suave: boolean) => {
    const fijarGain = (g: GainNode, v: number) => {
      if (suave) g.gain.setTargetAtTime(v, ctx.currentTime, 0.03)
      else g.gain.value = v
    }
    fijarGain(seco, 1 - f.dist * 0.7)
    fijarGain(pre, 1 + f.dist * 12)
    fijarGain(wetDist, f.dist * 0.55)
    fijarGain(sendReverb, f.reverb)
    fijarGain(sendDelay, f.delay * 0.8)
    fijarGain(sendChorus, f.chorus)
  }
  aplicar(fx, false)

  return {
    entrada,
    fijar(f) {
      aplicar(f, true)
    },
    desconectar() {
      for (const n of [entrada, seco, pre, shaper, wetDist, sendReverb, sendDelay, sendChorus]) n.disconnect()
    },
  }
}

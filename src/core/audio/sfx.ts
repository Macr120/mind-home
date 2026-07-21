import { useAjustes } from '../state/ajustesStore'

/**
 * Biblioteca sencilla de sonidos de acciones (herramientas, juegos, vehículos):
 * efectos cortos sintetizados con Web Audio, sin assets. Vive en su PROPIO
 * AudioContext con su propio volumen (`mh.sfx.volumen`), separado del gain de
 * la música (core/audio/motor.ts) igual que las campanas/bips existentes: no
 * son música y no deben depender de ese volumen. Con el volumen en 0 no se
 * crea nada. Cada efecto tiene un mínimo entre repeticiones para que las
 * acciones por frame (ráfagas, burbujas) no se vuelvan una metralla.
 */

export type NombreSfx =
  | 'disparo'
  | 'impacto'
  | 'portal'
  | 'teletransporte'
  | 'cohete'
  | 'explosion'
  | 'burbuja'
  | 'salto'
  | 'mortal'
  | 'saludo'
  | 'montar'
  | 'campana'
  | 'silbato'
  | 'anotacion'
  | 'recoger'
  | 'turbo'
  | 'banana'
  | 'bomba'

let ctx: AudioContext | null = null
let bus: GainNode | null = null
let ruido: AudioBuffer | null = null

function asegurar(): AudioContext | null {
  if (useAjustes.getState().sfxVolumen <= 0) return null
  if (!ctx) {
    try {
      ctx = new AudioContext()
      bus = ctx.createGain()
      bus.gain.value = useAjustes.getState().sfxVolumen
      bus.connect(ctx.destination)
    } catch {
      // Sin Web Audio disponible: todo sigue funcionando en silencio.
      ctx = null
      bus = null
      return null
    }
  }
  // Los sonidos nacen de gestos/juego, así que reanudar aquí suele funcionar.
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// El volumen del ajuste se aplica al bus con una rampa corta (sin clicks).
useAjustes.subscribe((s, prev) => {
  if (s.sfxVolumen === prev.sfxVolumen || !ctx || !bus) return
  bus.gain.setTargetAtTime(s.sfxVolumen, ctx.currentTime, 0.05)
})

function bufferRuido(c: AudioContext): AudioBuffer {
  if (!ruido) {
    ruido = c.createBuffer(1, Math.ceil(c.sampleRate * 1), c.sampleRate)
    const datos = ruido.getChannelData(0)
    for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1
  }
  return ruido
}

/** Barrido de oscilador con envolvente (de → a en `dur` segundos). */
function tono(o: {
  de: number
  a?: number
  dur: number
  onda?: OscillatorType
  vol?: number
  retardo?: number
}) {
  if (!ctx || !bus) return
  const t = ctx.currentTime + (o.retardo ?? 0)
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = o.onda ?? 'sine'
  osc.frequency.setValueAtTime(o.de, t)
  if (o.a) osc.frequency.exponentialRampToValueAtTime(o.a, t + o.dur)
  const vol = o.vol ?? 0.15
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur)
  osc.connect(gain)
  gain.connect(bus)
  osc.start(t)
  osc.stop(t + o.dur + 0.05)
}

/** Golpe de ruido filtrado con envolvente. */
function soplo(o: {
  dur: number
  hz?: number
  tipo?: BiquadFilterType
  vol?: number
  retardo?: number
}) {
  if (!ctx || !bus) return
  const t = ctx.currentTime + (o.retardo ?? 0)
  const src = ctx.createBufferSource()
  src.buffer = bufferRuido(ctx)
  const filtro = ctx.createBiquadFilter()
  filtro.type = o.tipo ?? 'lowpass'
  filtro.frequency.value = o.hz ?? 1200
  const gain = ctx.createGain()
  const vol = o.vol ?? 0.15
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur)
  src.connect(filtro)
  filtro.connect(gain)
  gain.connect(bus)
  src.start(t)
  src.stop(t + o.dur + 0.05)
}

// Anti-metralla: mínimo entre repeticiones del mismo sonido (ms).
const MIN_MS: Partial<Record<NombreSfx, number>> = {
  disparo: 70,
  impacto: 70,
  burbuja: 110,
  cohete: 90,
  explosion: 110,
  anotacion: 300,
  campana: 300,
  silbato: 300,
  saludo: 250,
  montar: 250,
  mortal: 200,
  turbo: 200,
  banana: 200,
}
const ultimo = new Map<string, number>()

/** Toca un efecto de la biblioteca (respeta `mh.sfx.volumen`; 0 = apagado). */
export function sonar(nombre: NombreSfx): void {
  const c = asegurar()
  if (!c || !bus) return
  const ahora = performance.now()
  if ((ultimo.get(nombre) ?? -1e9) + (MIN_MS[nombre] ?? 80) > ahora) return
  ultimo.set(nombre, ahora)
  switch (nombre) {
    case 'disparo':
      tono({ de: 900, a: 160, dur: 0.13, onda: 'square', vol: 0.2 })
      soplo({ dur: 0.05, hz: 2600, tipo: 'highpass', vol: 0.07 })
      break
    case 'impacto':
      soplo({ dur: 0.07, hz: 1600, vol: 0.14 })
      tono({ de: 260, a: 70, dur: 0.09, vol: 0.1 })
      break
    case 'portal':
      tono({ de: 180, a: 760, dur: 0.28, vol: 0.15 })
      tono({ de: 240, a: 1000, dur: 0.32, onda: 'triangle', vol: 0.07 })
      break
    case 'teletransporte':
      tono({ de: 330, a: 660, dur: 0.18, vol: 0.13 })
      tono({ de: 415, a: 830, dur: 0.18, vol: 0.09, retardo: 0.05 })
      soplo({ dur: 0.15, hz: 3000, tipo: 'highpass', vol: 0.04 })
      break
    case 'cohete':
      tono({ de: 350, a: 1150, dur: 0.55, vol: 0.09 })
      break
    case 'explosion':
      soplo({ dur: 0.5, hz: 900, vol: 0.26 })
      tono({ de: 110, a: 40, dur: 0.45, vol: 0.24 })
      break
    case 'burbuja':
      tono({ de: 260, a: 540, dur: 0.07, vol: 0.09 })
      break
    case 'salto':
      tono({ de: 250, a: 520, dur: 0.14, onda: 'triangle', vol: 0.14 })
      break
    case 'mortal':
      tono({ de: 200, a: 950, dur: 0.3, onda: 'triangle', vol: 0.12 })
      break
    case 'saludo':
      tono({ de: 660, dur: 0.09, onda: 'triangle', vol: 0.11 })
      tono({ de: 880, dur: 0.12, onda: 'triangle', vol: 0.11, retardo: 0.1 })
      break
    case 'montar':
      tono({ de: 85, a: 170, dur: 0.3, onda: 'sawtooth', vol: 0.13 })
      soplo({ dur: 0.2, hz: 500, vol: 0.05 })
      break
    case 'campana':
      tono({ de: 660, dur: 0.7, vol: 0.15 })
      tono({ de: 1320, dur: 0.4, vol: 0.04 })
      tono({ de: 660, dur: 0.7, vol: 0.12, retardo: 0.35 })
      tono({ de: 1320, dur: 0.4, vol: 0.035, retardo: 0.35 })
      break
    case 'silbato':
      tono({ de: 1750, dur: 0.09, onda: 'square', vol: 0.08 })
      tono({ de: 1750, dur: 0.3, onda: 'square', vol: 0.08, retardo: 0.14 })
      break
    case 'anotacion':
      tono({ de: 523, dur: 0.1, onda: 'triangle', vol: 0.13 })
      tono({ de: 659, dur: 0.1, onda: 'triangle', vol: 0.13, retardo: 0.09 })
      tono({ de: 784, dur: 0.18, onda: 'triangle', vol: 0.13, retardo: 0.18 })
      break
    case 'recoger':
      tono({ de: 880, a: 1320, dur: 0.09, onda: 'triangle', vol: 0.11 })
      tono({ de: 1320, dur: 0.08, onda: 'triangle', vol: 0.09, retardo: 0.08 })
      break
    case 'turbo':
      tono({ de: 150, a: 620, dur: 0.4, onda: 'sawtooth', vol: 0.14 })
      soplo({ dur: 0.35, hz: 1200, tipo: 'highpass', vol: 0.07 })
      break
    case 'banana':
      tono({ de: 820, a: 180, dur: 0.4, vol: 0.15 })
      break
    case 'bomba':
      soplo({ dur: 0.6, hz: 700, vol: 0.28 })
      tono({ de: 95, a: 32, dur: 0.6, vol: 0.28 })
      break
  }
}

// Spray del grafiti: ruido en bucle mientras se mantiene el trazo.
let spray: { src: AudioBufferSourceNode; gain: GainNode } | null = null

export function iniciarSpray(): void {
  const c = asegurar()
  if (!c || !bus || spray) return
  const src = c.createBufferSource()
  src.buffer = bufferRuido(c)
  src.loop = true
  const filtro = c.createBiquadFilter()
  filtro.type = 'bandpass'
  filtro.frequency.value = 3600
  filtro.Q.value = 0.6
  const gain = c.createGain()
  gain.gain.setValueAtTime(0, c.currentTime)
  gain.gain.linearRampToValueAtTime(0.09, c.currentTime + 0.05)
  src.connect(filtro)
  filtro.connect(gain)
  gain.connect(bus)
  src.start()
  spray = { src, gain }
}

export function detenerSpray(): void {
  if (!spray || !ctx) return
  const { src, gain } = spray
  spray = null
  gain.gain.setTargetAtTime(0, ctx.currentTime, 0.04)
  window.setTimeout(() => {
    try {
      src.stop()
    } catch {
      /* ya detenido */
    }
    gain.disconnect()
  }, 200)
}

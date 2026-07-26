import { create } from 'zustand'
import { contextoAudio, desbloquearAudio, gainMaestro } from './motor'

/**
 * Paisajes sonoros generados con Web Audio (sin assets ni derechos): un fondo
 * continuo de ruido filtrado con vaivén lento (LFO) más eventos sueltos —gotas,
 * pájaros, rompientes, cuencos— agendados al azar con el mismo scheduler de
 * lookahead que la música. Cadena: fuentes → bus → gain maestro, así el volumen
 * de música del usuario también los gobierna.
 */

export type PaisajeId = 'bosque' | 'mar' | 'lluvia' | 'cuencos'

/** Mientras suena un paisaje, la música ambiental se calla (useMusicaAmbiental). */
export const usePaisaje = create<{ activo: PaisajeId | null }>(() => ({ activo: null }))

interface Capa {
  ruido: 'blanco' | 'marron'
  filtro: BiquadFilterType
  hz: number
  q?: number
  vol: number
  /** Vaivén lento del volumen: [frecuencia en Hz, profundidad 0..1]. */
  lfo?: [number, number]
}

interface Def {
  capas: Capa[]
  /** Zumbido sostenido (Hz) por debajo de todo. */
  drone?: number[]
  /** Evento suelto; se agenda cada `cada` [min, max] segundos. */
  evento?: (ctx: AudioContext, t: number) => void
  cada?: [number, number]
  /** Nivel del bus, para equilibrar los paisajes entre sí. */
  volumen: number
}

const SEG_RUIDO = 3
const TICK_MS = 200
const LOOKAHEAD_S = 0.6

let actual: PaisajeId | null = null
let bus: GainNode | null = null
let fuentes: AudioScheduledSourceNode[] = []
let intervalo: number | null = null
let proximo = 0
let blanco: AudioBuffer | null = null
let marron: AudioBuffer | null = null

function ruidoBlanco(ctx: AudioContext): AudioBuffer {
  if (!blanco) {
    blanco = ctx.createBuffer(1, ctx.sampleRate * SEG_RUIDO, ctx.sampleRate)
    const d = blanco.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return blanco
}

/**
 * Ruido marrón (el "rumor" grave): paseo aleatorio integrado. Se le resta la
 * deriva lineal para que el último valor empalme con el primero; si no, el
 * bucle daría un golpe seco cada vuelta.
 */
function ruidoMarron(ctx: AudioContext): AudioBuffer {
  if (!marron) {
    marron = ctx.createBuffer(1, ctx.sampleRate * SEG_RUIDO, ctx.sampleRate)
    const d = marron.getChannelData(0)
    let ultimo = 0
    for (let i = 0; i < d.length; i++) {
      ultimo = (ultimo + 0.02 * (Math.random() * 2 - 1)) / 1.02
      d[i] = ultimo
    }
    const deriva = (d[d.length - 1] - d[0]) / (d.length - 1)
    let pico = 0
    for (let i = 0; i < d.length; i++) {
      d[i] -= deriva * i
      pico = Math.max(pico, Math.abs(d[i]))
    }
    if (pico > 0) for (let i = 0; i < d.length; i++) d[i] = (d[i] / pico) * 0.8
  }
  return marron
}

const ruidoDe = (ctx: AudioContext, tipo: 'blanco' | 'marron') =>
  tipo === 'blanco' ? ruidoBlanco(ctx) : ruidoMarron(ctx)

/** Paneo estéreo opcional (si el navegador no lo soporta, va al centro). */
function conPan(ctx: AudioContext, destino: AudioNode, pan: number): AudioNode {
  if (!pan || typeof ctx.createStereoPanner !== 'function') return destino
  const p = ctx.createStereoPanner()
  p.pan.value = Math.max(-1, Math.min(1, pan))
  p.connect(destino)
  return p
}

/** Capa continua: ruido en bucle → filtro → gain (con LFO opcional) → bus. */
function crearCapa(ctx: AudioContext, c: Capa): AudioScheduledSourceNode[] {
  if (!bus) return []
  const src = ctx.createBufferSource()
  src.buffer = ruidoDe(ctx, c.ruido)
  src.loop = true
  const filtro = ctx.createBiquadFilter()
  filtro.type = c.filtro
  filtro.frequency.value = c.hz
  if (c.q) filtro.Q.value = c.q
  const gain = ctx.createGain()
  const [lfoHz, prof] = c.lfo ?? [0, 0]
  gain.gain.value = c.vol * (1 - prof / 2)
  src.connect(filtro)
  filtro.connect(gain)
  gain.connect(bus)
  // Arranque en un punto al azar del bucle: dos capas del mismo ruido no se calcan.
  src.start(0, Math.random() * SEG_RUIDO)
  const nodos: AudioScheduledSourceNode[] = [src]
  if (lfoHz) {
    const lfo = ctx.createOscillator()
    const amp = ctx.createGain()
    lfo.frequency.value = lfoHz
    amp.gain.value = (c.vol * prof) / 2
    lfo.connect(amp)
    amp.connect(gain.gain)
    lfo.start()
    nodos.push(lfo)
  }
  return nodos
}

/** Drone: pares de senos desafinados → batido lento (el zumbido del cuenco). */
function crearDrone(ctx: AudioContext, hzs: number[]): AudioScheduledSourceNode[] {
  if (!bus) return []
  const gain = ctx.createGain()
  gain.gain.value = 0.035
  gain.connect(bus)
  const oscs: AudioScheduledSourceNode[] = []
  for (const hz of hzs) {
    for (const cents of [-4, 4]) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = hz
      osc.detune.value = cents
      osc.connect(gain)
      osc.start()
      oscs.push(osc)
    }
  }
  return oscs
}

/** Gota de lluvia: chasquido de ruido por un pasabanda muy estrecho. */
function gota(ctx: AudioContext, t: number) {
  if (!bus) return
  const src = ctx.createBufferSource()
  const filtro = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  src.buffer = ruidoBlanco(ctx)
  filtro.type = 'bandpass'
  filtro.frequency.value = 1200 + Math.random() * 2600
  filtro.Q.value = 12
  gain.gain.setValueAtTime(0.05 + Math.random() * 0.05, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
  src.connect(filtro)
  filtro.connect(gain)
  gain.connect(conPan(ctx, bus, (Math.random() - 0.5) * 1.4))
  src.start(t, Math.random() * SEG_RUIDO)
  src.stop(t + 0.09)
}

/** Canto de pájaro: dos a cinco notas cortas con barrido de tono. */
function pajaro(ctx: AudioContext, t: number) {
  if (!bus) return
  const destino = conPan(ctx, bus, (Math.random() - 0.5) * 1.5)
  const notas = 2 + Math.floor(Math.random() * 4)
  const base = 2200 + Math.random() * 1600
  const sube = Math.random() < 0.5
  for (let i = 0; i < notas; i++) {
    const t0 = t + i * (0.07 + Math.random() * 0.07)
    const dur = 0.05 + Math.random() * 0.05
    const hz = base * (0.9 + Math.random() * 0.3)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(hz, t0)
    osc.frequency.exponentialRampToValueAtTime(hz * (sube ? 1.5 : 0.68), t0 + dur)
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(0.045, t0 + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(gain)
    gain.connect(destino)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }
}

/** Rompiente: ruido que crece y se retira mientras el filtro se abre y cierra. */
function ola(ctx: AudioContext, t: number) {
  if (!bus) return
  const dur = 3 + Math.random() * 1.6
  const src = ctx.createBufferSource()
  const filtro = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  src.buffer = ruidoBlanco(ctx)
  src.loop = true
  filtro.type = 'lowpass'
  filtro.frequency.setValueAtTime(450, t)
  filtro.frequency.linearRampToValueAtTime(2000, t + dur * 0.35)
  filtro.frequency.linearRampToValueAtTime(400, t + dur)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.1, t + dur * 0.35)
  gain.gain.linearRampToValueAtTime(0, t + dur)
  src.connect(filtro)
  filtro.connect(gain)
  gain.connect(conPan(ctx, bus, (Math.random() - 0.5) * 0.8))
  src.start(t, Math.random() * SEG_RUIDO)
  src.stop(t + dur + 0.05)
}

/** Pentatónica menor: cualquier golpe suena bien con el que sigue. */
const ESCALA = [0, 3, 5, 7, 10]
/** Parciales inarmónicos de un cuenco: [múltiplo, volumen, decaimiento en s]. */
const PARCIALES: [number, number, number][] = [
  [1, 0.13, 9],
  [2.74, 0.06, 7],
  [5.4, 0.025, 5],
  [8.9, 0.01, 3.5],
]

function cuenco(ctx: AudioContext, t: number) {
  if (!bus) return
  const midi = 45 + ESCALA[Math.floor(Math.random() * ESCALA.length)] + (Math.random() < 0.35 ? 12 : 0)
  const f0 = 440 * 2 ** ((midi - 69) / 12)
  const destino = conPan(ctx, bus, (Math.random() - 0.5) * 0.8)
  for (const [mult, vol, dur] of PARCIALES) {
    // Dos senos casi iguales por parcial: su batido es el "temblor" del metal.
    for (const cents of [-3, 3]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = f0 * mult
      osc.detune.value = cents
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(vol / 2, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(gain)
      gain.connect(destino)
      osc.start(t)
      osc.stop(t + dur + 0.05)
    }
  }
}

const PAISAJES: Record<PaisajeId, Def> = {
  bosque: {
    capas: [
      { ruido: 'marron', filtro: 'lowpass', hz: 420, vol: 0.34, lfo: [0.05, 0.7] }, // viento
      { ruido: 'blanco', filtro: 'bandpass', hz: 3200, q: 0.7, vol: 0.05, lfo: [0.08, 0.9] }, // hojas
    ],
    evento: pajaro,
    cada: [2, 7],
    volumen: 1.4,
  },
  mar: {
    capas: [
      { ruido: 'marron', filtro: 'lowpass', hz: 650, vol: 0.45, lfo: [0.06, 0.6] },
      { ruido: 'blanco', filtro: 'bandpass', hz: 1500, q: 0.5, vol: 0.045, lfo: [0.06, 1] }, // espuma
    ],
    evento: ola,
    cada: [7, 13],
    volumen: 1,
  },
  lluvia: {
    capas: [
      { ruido: 'blanco', filtro: 'highpass', hz: 1400, vol: 0.1 }, // siseo
      { ruido: 'marron', filtro: 'lowpass', hz: 600, vol: 0.4, lfo: [0.04, 0.35] }, // aguacero
    ],
    evento: gota,
    cada: [0.12, 0.45],
    volumen: 0.75,
  },
  cuencos: {
    capas: [{ ruido: 'marron', filtro: 'lowpass', hz: 180, vol: 0.22, lfo: [0.03, 0.5] }],
    drone: [110, 164.81], // La2 + su quinta
    evento: cuenco,
    cada: [8, 16],
    volumen: 1.15,
  },
}

function tick() {
  const ctx = contextoAudio()
  if (!ctx || !actual) return
  const P = PAISAJES[actual]
  if (!P.evento || !P.cada) return
  // Tras una pausa larga (pestaña oculta) re-sincroniza en vez de "alcanzar".
  if (proximo < ctx.currentTime - 0.5) proximo = ctx.currentTime + 0.05
  while (proximo < ctx.currentTime + LOOKAHEAD_S) {
    P.evento(ctx, proximo)
    proximo += P.cada[0] + Math.random() * (P.cada[1] - P.cada[0])
  }
}

/** Arranca (o cambia a) un paisaje; idempotente si ya suena ese mismo. */
export function iniciarPaisaje(id: PaisajeId): void {
  try {
    if (actual === id) return
    detenerPaisaje(200)
    desbloquearAudio()
    const ctx = contextoAudio()
    const maestro = gainMaestro()
    if (!ctx || !maestro) return
    const P = PAISAJES[id]
    actual = id
    bus = ctx.createGain()
    bus.gain.setValueAtTime(0, ctx.currentTime)
    bus.gain.setTargetAtTime(P.volumen, ctx.currentTime, 0.7) // entra sin sobresalto
    bus.connect(maestro)
    for (const c of P.capas) fuentes.push(...crearCapa(ctx, c))
    if (P.drone) fuentes.push(...crearDrone(ctx, P.drone))
    proximo = ctx.currentTime + 0.5
    intervalo = window.setInterval(tick, TICK_MS)
    usePaisaje.setState({ activo: id })
  } catch {
    // Sin audio disponible: la sesión sigue en silencio.
  }
}

export function detenerPaisaje(fadeMs = 800): void {
  if (intervalo != null) {
    window.clearInterval(intervalo)
    intervalo = null
  }
  actual = null
  usePaisaje.setState({ activo: null })
  const viejoBus = bus
  const viejasFuentes = fuentes
  bus = null
  fuentes = []
  if (!viejoBus) return
  const ctx = contextoAudio()
  if (ctx) viejoBus.gain.setTargetAtTime(0, ctx.currentTime, fadeMs / 1000 / 3)
  window.setTimeout(() => {
    for (const f of viejasFuentes) {
      try {
        f.stop()
      } catch {
        /* ya detenida */
      }
    }
    viejoBus.disconnect()
  }, fadeMs + 300)
}

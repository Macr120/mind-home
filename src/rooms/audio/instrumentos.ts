import type { InstrumentoAudio, SintePista } from '../../core/data/db'
import { esInstrumentoBateria } from './constantes'

/**
 * Síntesis de los presets del Studio de audio. Funciones puras sobre
 * `BaseAudioContext`: las MISMAS recetas sirven tocando en vivo (AudioContext)
 * y en el render del export (OfflineAudioContext). Las envolventes siguen el
 * estilo de `core/audio/musicaGenerada.ts` (de donde vienen kick/caja/hat).
 */

const midiAHz = (n: number) => 440 * 2 ** ((n - 69) / 12)

/** Ruido blanco cacheado POR contexto: el offline no puede reusar el del vivo. */
const ruidos = new WeakMap<BaseAudioContext, AudioBuffer>()
function bufferRuido(ctx: BaseAudioContext): AudioBuffer {
  let b = ruidos.get(ctx)
  if (!b) {
    b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.3), ctx.sampleRate)
    const datos = b.getChannelData(0)
    for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1
    ruidos.set(ctx, b)
  }
  return b
}

interface Receta {
  /** Osciladores: octava en saltos de 12 semitonos; nivel relativo; detune en cents. */
  ondas: { tipo: OscillatorType; octavas?: number; nivel: number; detune?: number }[]
  filtroHz: number
  q?: number
  /** ADSR en segundos (sustain como fracción del pico). */
  a: number
  d: number
  s: number
  r: number
  /** Nivel base del preset (equilibra los timbres entre sí). */
  nivel: number
  /** Cuerda pulsada: decaimiento exponencial corto, ignora la duración pedida. */
  pluck?: boolean
  /** Voz/coro: bandpasses EN PARALELO en estas frecuencias en vez del lowpass. */
  formantes?: number[]
  /** Vibrato de fábrica (0..1); el knob del panel lo puede subir o bajar. */
  vibratoBase?: number
}

const RECETAS: Record<Exclude<InstrumentoAudio, 'bateria' | 'bateria808'>, Receta> = {
  // ── Teclados ──
  // Piano eléctrico: el 2.º armónico da el «tine» de Rhodes.
  piano: {
    ondas: [
      { tipo: 'triangle', nivel: 1 },
      { tipo: 'sine', octavas: 1, nivel: 0.35 },
    ],
    filtroHz: 2500, a: 0.002, d: 0.25, s: 0.45, r: 0.15, nivel: 0.2,
  },
  // Órgano: senos apilados en octavas (registros) que sostienen al 100 %.
  organo: {
    ondas: [
      { tipo: 'sine', nivel: 1 },
      { tipo: 'sine', octavas: 1, nivel: 0.5 },
      { tipo: 'sine', octavas: 2, nivel: 0.25 },
    ],
    filtroHz: 4000, a: 0.015, d: 0.05, s: 1, r: 0.08, nivel: 0.14,
  },
  // Campanas/celesta: parcial agudo + decaimiento largo (pluck con d grande).
  campanas: {
    ondas: [
      { tipo: 'sine', nivel: 1 },
      { tipo: 'sine', octavas: 2, nivel: 0.3, detune: 12 },
    ],
    filtroHz: 6000, a: 0.001, d: 1.2, s: 0, r: 0.3, nivel: 0.18, pluck: true,
  },
  pad: {
    ondas: [
      { tipo: 'sawtooth', nivel: 0.6, detune: -8 },
      { tipo: 'sawtooth', nivel: 0.6, detune: 8 },
    ],
    filtroHz: 1200, a: 0.35, d: 0.3, s: 1, r: 0.5, nivel: 0.1,
  },
  lead: {
    ondas: [{ tipo: 'square', nivel: 1 }],
    filtroHz: 2200, a: 0.01, d: 0.08, s: 0.6, r: 0.08, nivel: 0.16,
  },
  // ── Cuerdas ──
  // Guitarra: pulso brillante con algo de sierra en el ataque.
  guitarra: {
    ondas: [
      { tipo: 'triangle', nivel: 1 },
      { tipo: 'sawtooth', nivel: 0.3 },
    ],
    filtroHz: 2200, a: 0.002, d: 0.35, s: 0, r: 0.08, nivel: 0.2, pluck: true,
  },
  bajo: {
    ondas: [
      { tipo: 'sawtooth', nivel: 1 },
      { tipo: 'sine', nivel: 0.5 },
    ],
    filtroHz: 500, q: 1, a: 0.005, d: 0.12, s: 0.7, r: 0.08, nivel: 0.22,
  },
  // Arpa: pulso suave y redondo con cola más larga que el pluck.
  arpa: {
    ondas: [
      { tipo: 'triangle', nivel: 1 },
      { tipo: 'sine', octavas: 1, nivel: 0.4 },
    ],
    filtroHz: 3500, a: 0.001, d: 0.5, s: 0, r: 0.15, nivel: 0.2, pluck: true,
  },
  // Sección de cuerdas: sierras desafinadas con ataque y liberación lentos.
  violines: {
    ondas: [
      { tipo: 'sawtooth', nivel: 0.55, detune: -6 },
      { tipo: 'sawtooth', nivel: 0.55, detune: 6 },
    ],
    filtroHz: 1600, a: 0.22, d: 0.2, s: 1, r: 0.6, nivel: 0.12,
  },
  pluck: {
    ondas: [{ tipo: 'triangle', nivel: 1 }],
    filtroHz: 3000, a: 0.001, d: 0.25, s: 0, r: 0.05, nivel: 0.22, pluck: true,
  },
  // ── Vientos ──
  flauta: {
    ondas: [
      { tipo: 'sine', nivel: 1 },
      { tipo: 'triangle', nivel: 0.3 },
    ],
    filtroHz: 3000, a: 0.05, d: 0.1, s: 0.9, r: 0.15, nivel: 0.17, vibratoBase: 0.2,
  },
  // Trompeta: sierra con resonancia metálica del filtro.
  trompeta: {
    ondas: [{ tipo: 'sawtooth', nivel: 1 }],
    filtroHz: 2800, q: 2, a: 0.03, d: 0.08, s: 0.8, r: 0.12, nivel: 0.15,
  },
  sax: {
    ondas: [
      { tipo: 'sawtooth', nivel: 0.8 },
      { tipo: 'square', nivel: 0.4 },
    ],
    filtroHz: 1800, q: 1.5, a: 0.04, d: 0.12, s: 0.85, r: 0.15, nivel: 0.15, vibratoBase: 0.15,
  },
  // ── Voz (síntesis de formantes) ──
  // Solista «ooh»: formantes cerrados y vibrato de fábrica.
  voz: {
    ondas: [
      { tipo: 'sawtooth', nivel: 0.6 },
      { tipo: 'triangle', nivel: 0.5 },
    ],
    filtroHz: 3000, formantes: [400, 800, 2600], a: 0.06, d: 0.2, s: 0.85, r: 0.25, nivel: 0.3, vibratoBase: 0.35,
  },
  // Coro «aah»: sierras ensanchadas con formantes abiertos, tipo pad.
  coro: {
    ondas: [
      { tipo: 'sawtooth', nivel: 0.5, detune: -7 },
      { tipo: 'sawtooth', nivel: 0.5, detune: 7 },
    ],
    filtroHz: 3000, formantes: [660, 1120, 2400], a: 0.4, d: 0.3, s: 1, r: 0.7, nivel: 0.24, vibratoBase: 0.25,
  },
}

function bombo(ctx: BaseAudioContext, destino: AudioNode, t: number, vol: number, electro: boolean) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  // 808: cae más grave y resuena más largo que el bombo acústico.
  osc.frequency.setValueAtTime(electro ? 120 : 150, t)
  osc.frequency.exponentialRampToValueAtTime(electro ? 45 : 50, t + (electro ? 0.25 : 0.12))
  gain.gain.setValueAtTime((electro ? 0.55 : 0.5) * vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + (electro ? 0.35 : 0.14))
  osc.connect(gain)
  gain.connect(destino)
  osc.start(t)
  osc.stop(t + (electro ? 0.4 : 0.16))
}

function caja(ctx: BaseAudioContext, destino: AudioNode, t: number, vol: number, electro: boolean) {
  const src = ctx.createBufferSource()
  const filtro = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  src.buffer = bufferRuido(ctx)
  filtro.type = 'bandpass'
  filtro.frequency.value = electro ? 1200 : 1900
  filtro.Q.value = electro ? 0.6 : 0.8
  gain.gain.setValueAtTime(0.22 * vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + (electro ? 0.12 : 0.09))
  src.connect(filtro)
  filtro.connect(gain)
  gain.connect(destino)
  src.start(t)
  src.stop(t + (electro ? 0.14 : 0.1))
  if (electro) return // la 808 es puro ruido tipo clap, sin cuerpo tonal
  const osc = ctx.createOscillator()
  const g2 = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(190, t)
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.06)
  g2.gain.setValueAtTime(0.12 * vol, t)
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
  osc.connect(g2)
  g2.connect(destino)
  osc.start(t)
  osc.stop(t + 0.08)
}

/** Hi-hat: ruido por pasa-altas (el de musicaGenerada lo soltaba pelado). */
function hat(ctx: BaseAudioContext, destino: AudioNode, t: number, vol: number, abierto: boolean, electro: boolean) {
  const src = ctx.createBufferSource()
  const filtro = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  src.buffer = bufferRuido(ctx)
  filtro.type = 'highpass'
  filtro.frequency.value = electro ? 8000 : 6000
  const dur = abierto ? (electro ? 0.18 : 0.25) : electro ? 0.025 : 0.03
  gain.gain.setValueAtTime((electro ? 0.12 : 0.14) * vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filtro)
  filtro.connect(gain)
  gain.connect(destino)
  src.start(t)
  src.stop(t + dur + 0.02)
}

function tom(ctx: BaseAudioContext, destino: AudioNode, t: number, vol: number, agudo: boolean, electro: boolean) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = electro ? 'sine' : 'triangle'
  const dur = electro ? 0.35 : 0.25
  osc.frequency.setValueAtTime(agudo ? 240 : 150, t)
  osc.frequency.exponentialRampToValueAtTime(agudo ? 160 : 90, t + dur * 0.8)
  gain.gain.setValueAtTime(0.35 * vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain)
  gain.connect(destino)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

/** Crash: ruido brillante con cola larga (el buffer de 0.3 s se repite en bucle). */
function platillo(ctx: BaseAudioContext, destino: AudioNode, t: number, vol: number, electro: boolean) {
  const src = ctx.createBufferSource()
  const filtro = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  src.buffer = bufferRuido(ctx)
  src.loop = true
  filtro.type = 'highpass'
  filtro.frequency.value = electro ? 6000 : 4500
  const dur = electro ? 0.45 : 0.7
  gain.gain.setValueAtTime(0.25 * vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filtro)
  filtro.connect(gain)
  gain.connect(destino)
  src.start(t)
  src.stop(t + dur + 0.05)
}

/** Palmada: tres ráfagas de ruido muy juntas; la última deja la cola. */
function palmada(ctx: BaseAudioContext, destino: AudioNode, t: number, vol: number, electro: boolean) {
  const rafagas: [number, number, number][] = [
    [0, 0.2, 0.05],
    [0.012, 0.17, 0.05],
    [0.026, 0.22, 0.16],
  ]
  for (const [dt, nivel, dec] of rafagas) {
    const src = ctx.createBufferSource()
    const filtro = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    src.buffer = bufferRuido(ctx)
    filtro.type = 'bandpass'
    filtro.frequency.value = electro ? 1500 : 1100
    filtro.Q.value = 1.2
    gain.gain.setValueAtTime(nivel * vol, t + dt)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dt + dec)
    src.connect(filtro)
    filtro.connect(gain)
    gain.connect(destino)
    src.start(t + dt)
    src.stop(t + dt + dec + 0.02)
  }
}

function golpeBateria(ctx: BaseAudioContext, destino: AudioNode, t: number, tono: number, vol: number, electro: boolean) {
  if (tono === 36) bombo(ctx, destino, t, vol, electro)
  else if (tono === 38) caja(ctx, destino, t, vol, electro)
  else if (tono === 42) hat(ctx, destino, t, vol, false, electro)
  else if (tono === 46) hat(ctx, destino, t, vol, true, electro)
  else if (tono === 39) palmada(ctx, destino, t, vol, electro)
  else if (tono === 41) tom(ctx, destino, t, vol, false, electro)
  else if (tono === 48) tom(ctx, destino, t, vol, true, electro)
  else if (tono === 49) platillo(ctx, destino, t, vol, electro)
}

/** Defaults efectivos de los knobs de sinte para un instrumento (pintar el panel). */
export function sinteBase(instr: InstrumentoAudio): Required<SintePista> {
  const receta = RECETAS[esInstrumentoBateria(instr) ? 'piano' : instr]
  return {
    ataque: receta.a,
    liberacion: receta.r,
    filtroHz: receta.filtroHz,
    resonancia: receta.q ?? 0,
    glide: 0,
    vibrato: receta.vibratoBase ?? 0,
  }
}

/** Ajustes de interpretación de una nota (overrides de la receta). */
export interface OpcionesVoz {
  sinte?: SintePista
  /** Tono de partida del glide (la nota anterior de la pista). */
  desdeTono?: number
}

/** La receta con los overrides de la pista aplicados (lo ausente cae al preset). */
function recetaEfectiva(receta: Receta, sinte?: SintePista): Receta {
  if (!sinte) return receta
  return {
    ...receta,
    a: sinte.ataque ?? receta.a,
    r: sinte.liberacion ?? receta.r,
    filtroHz: sinte.filtroHz ?? receta.filtroHz,
    q: sinte.resonancia ?? receta.q,
  }
}

/** Arma osciladores + filtro + envolvente; devuelve el gain de la envolvente y el pico. */
function armarVoz(
  ctx: BaseAudioContext,
  destino: AudioNode,
  receta: Receta,
  t: number,
  tono: number,
  vol: number,
  hasta: number | null,
  opts?: OpcionesVoz,
) {
  const env = ctx.createGain()
  env.connect(destino)
  let entradaFiltro: AudioNode
  if (receta.formantes) {
    // Voz/coro: los formantes son bandpasses EN PARALELO con ganancia compensada.
    const pre = ctx.createGain()
    for (const hz of receta.formantes) {
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = hz
      bp.Q.value = 6
      const g = ctx.createGain()
      // Los bandpass con Q alto atenúan mucho: se compensa fuerte al sumarlos.
      g.gain.value = 4.5 / receta.formantes.length
      pre.connect(bp)
      bp.connect(g)
      g.connect(env)
    }
    entradaFiltro = pre
  } else {
    const filtro = ctx.createBiquadFilter()
    filtro.type = 'lowpass'
    filtro.frequency.value = receta.filtroHz
    if (receta.q) filtro.Q.value = receta.q
    filtro.connect(env)
    entradaFiltro = filtro
  }
  const pico = receta.nivel * vol
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(pico, t + receta.a)
  const glide = opts?.sinte?.glide ?? 0
  const desde = glide > 0 && opts?.desdeTono != null && opts.desdeTono !== tono ? opts.desdeTono : null
  const oscs: OscillatorNode[] = []
  for (const o of receta.ondas) {
    const osc = ctx.createOscillator()
    osc.type = o.tipo
    const hz = midiAHz(tono + (o.octavas ?? 0) * 12)
    if (desde != null) {
      osc.frequency.setValueAtTime(midiAHz(desde + (o.octavas ?? 0) * 12), t)
      osc.frequency.exponentialRampToValueAtTime(hz, t + glide)
    } else {
      osc.frequency.value = hz
    }
    if (o.detune) osc.detune.value = o.detune
    const g = ctx.createGain()
    g.gain.value = o.nivel
    osc.connect(g)
    g.connect(entradaFiltro)
    osc.start(t)
    if (hasta != null) osc.stop(hasta)
    oscs.push(osc)
  }
  const vibrato = opts?.sinte?.vibrato ?? receta.vibratoBase ?? 0
  if (vibrato > 0) {
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 5.5
    const prof = ctx.createGain()
    prof.gain.value = vibrato * 40 // cents
    lfo.connect(prof)
    for (const osc of oscs) prof.connect(osc.detune)
    lfo.start(t)
    if (hasta != null) lfo.stop(hasta)
    oscs.push(lfo)
  }
  return { env, pico, oscs }
}

/**
 * Nota de duración conocida (secuenciador y export): agenda ataque, caída,
 * sustain y liberación de una vez.
 */
export function tocarNota(
  ctx: BaseAudioContext,
  destino: AudioNode,
  instr: InstrumentoAudio,
  t: number,
  tono: number,
  durSeg: number,
  vol: number,
  opts?: OpcionesVoz,
): void {
  if (esInstrumentoBateria(instr)) {
    golpeBateria(ctx, destino, t, tono, vol, instr === 'bateria808')
    return
  }
  const receta = recetaEfectiva(RECETAS[instr], opts?.sinte)
  if (receta.pluck) {
    const fin = t + receta.a + receta.d + 0.1
    const { env, pico } = armarVoz(ctx, destino, receta, t, tono, vol, fin, opts)
    env.gain.setTargetAtTime(0.0001, t + receta.a, receta.d / 3)
    return void pico
  }
  const fin = t + durSeg + receta.r + 0.15
  const { env, pico } = armarVoz(ctx, destino, receta, t, tono, vol, fin, opts)
  // Caída al sustain y, al acabar la nota, liberación (setTarget: sin ceros que revienten el ramp).
  env.gain.setTargetAtTime(pico * receta.s, t + receta.a, receta.d / 3)
  env.gain.setTargetAtTime(0.0001, t + durSeg, receta.r / 3)
}

export interface VozViva {
  soltar(): void
}

/** Nota sostenida (teclado en pantalla o MIDI): suena hasta `soltar()`. */
export function iniciarVoz(
  ctx: BaseAudioContext,
  destino: AudioNode,
  instr: InstrumentoAudio,
  tono: number,
  vol: number,
  opts?: OpcionesVoz,
): VozViva {
  const t = ctx.currentTime
  if (esInstrumentoBateria(instr)) {
    golpeBateria(ctx, destino, t, tono, vol, instr === 'bateria808')
    return { soltar() {} }
  }
  const receta = recetaEfectiva(RECETAS[instr], opts?.sinte)
  const { env, pico, oscs } = armarVoz(ctx, destino, receta, t, tono, vol, null, opts)
  if (receta.pluck) env.gain.setTargetAtTime(0.0001, t + receta.a, receta.d / 3)
  else env.gain.setTargetAtTime(pico * receta.s, t + receta.a, receta.d / 3)
  let suelta = false
  return {
    soltar() {
      if (suelta) return
      suelta = true
      const ahora = ctx.currentTime
      env.gain.cancelScheduledValues(ahora)
      env.gain.setTargetAtTime(0.0001, ahora, receta.r / 3)
      for (const o of oscs) o.stop(ahora + receta.r + 0.2)
    },
  }
}

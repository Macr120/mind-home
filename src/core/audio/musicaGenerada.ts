import type { MoodMusica } from '../state/ajustesStore'
import { contextoAudio, gainMaestro } from './motor'

/**
 * Música generada en vivo con Web Audio (sin assets ni derechos): un scheduler
 * de lookahead ("tale of two clocks": setInterval grueso que agenda con la
 * precisión de ctx.currentTime) toca por corcheas un arpegio (o un riff fijo)
 * sobre una progresión de acordes, con bajo por patrón, pad opcional, batería
 * sintética por posiciones, campanitas, swing y un eco corto por mood.
 * Cadena: fuentes → filtro lowpass → bus (fade) → gain maestro, con un send
 * paralelo filtro → delay (feedback) → bus para el eco.
 */

interface ParamsMood {
  tempo: number
  /** Nota MIDI raíz de la tonalidad. */
  base: number
  /** Progresión: cada acorde en semitonos sobre la raíz; cambia por compás. */
  acordes: number[][]
  /** Probabilidad de nota del arpegio por corchea (0..1); se ignora si hay riff. */
  densidad: number
  onda: OscillatorType
  pad: boolean
  filtroHz: number
  /** Nivel del bus, para equilibrar moods entre sí. */
  volumen: number
  /** Batería: posiciones de corchea (0..7) del bombo y de la caja. */
  bombos?: number[]
  cajas?: number[]
  /** Probabilidad de hi-hat a contratiempo por corchea (0..1). */
  hatProb?: number
  /** Retraso de las corcheas impares (0..0.4 de corchea): shuffle/swing. */
  swing?: number
  /** Nivel del send de eco (0 = sin eco). */
  eco?: number
  /** Probabilidad de campanita aguda por corchea (0..1). */
  brillo?: number
  /** Patrón del bajo; 'redonda' = una nota larga por compás (default). */
  bajo?: 'redonda' | 'pulso' | 'octavas' | 'nada'
  /** Riff fijo (semitonos sobre la raíz del acorde; null = silencio). Sustituye al arpegio. */
  riff?: (number | null)[]
  /** Multiplicador de la duración de las notas melódicas (cajita de música ≫ 1). */
  cola?: number
}

const MOODS: Record<MoodMusica, ParamsMood> = {
  calma: {
    tempo: 72,
    base: 57, // La3
    acordes: [
      [0, 4, 7],
      [9, 12, 16],
      [5, 9, 12],
      [0, 4, 7],
    ], // I · vi · IV · I
    densidad: 0.45,
    onda: 'triangle',
    pad: true,
    filtroHz: 1400,
    volumen: 0.5,
    eco: 0.22,
  },
  festivo: {
    tempo: 108,
    base: 60, // Do4
    acordes: [
      [0, 4, 7],
      [5, 9, 12],
      [7, 11, 14],
      [5, 9, 12],
    ], // I · IV · V · IV
    densidad: 0.7,
    onda: 'sawtooth',
    pad: true,
    filtroHz: 2200,
    volumen: 0.55,
    bombos: [0, 4],
    cajas: [2, 6],
    hatProb: 0.6,
    eco: 0.15,
  },
  nocturno: {
    tempo: 60,
    base: 57, // La menor
    acordes: [
      [0, 3, 7],
      [8, 12, 15],
      [3, 7, 10],
      [10, 14, 17],
    ], // i · VI · III · VII
    densidad: 0.3,
    onda: 'sine',
    pad: true,
    filtroHz: 900,
    volumen: 0.45,
    eco: 0.3,
    brillo: 0.08,
  },
  chiptune: {
    tempo: 132,
    base: 69, // La4
    acordes: [
      [0, 4, 7],
      [7, 11, 14],
      [9, 12, 16],
      [5, 9, 12],
    ], // I · V · vi · IV
    densidad: 0.9,
    onda: 'square',
    pad: false,
    filtroHz: 4000,
    volumen: 0.4,
    bombos: [0, 4],
    hatProb: 0.6,
    eco: 0.1,
    bajo: 'octavas',
  },
  // Cocina/hobbies: café con shuffle suave y séptimas cálidas.
  acogedor: {
    tempo: 92,
    base: 62, // Re4
    acordes: [
      [0, 4, 7, 11],
      [9, 12, 16, 19],
      [5, 9, 12, 16],
      [7, 11, 14, 17],
    ], // Imaj7 · vi7 · IVmaj7 · V7
    densidad: 0.55,
    onda: 'triangle',
    pad: true,
    filtroHz: 1700,
    volumen: 0.5,
    bombos: [0, 4],
    hatProb: 0.5,
    swing: 0.15,
    eco: 0.18,
    bajo: 'pulso',
  },
  // Ejercicio: cuatro-al-piso con bajo en octavas.
  energia: {
    tempo: 126,
    base: 57, // La menor
    acordes: [
      [0, 3, 7],
      [8, 12, 15],
      [10, 14, 17],
      [5, 8, 12],
    ], // i · VI · VII · iv
    densidad: 0.7,
    onda: 'sawtooth',
    pad: true,
    filtroHz: 2600,
    volumen: 0.46,
    bombos: [0, 2, 4, 6],
    cajas: [2, 6],
    hatProb: 0.85,
    eco: 0.12,
    bajo: 'octavas',
  },
  // Biblioteca/despacho: lo-fi a medio tiempo con swing marcado.
  estudio: {
    tempo: 76,
    base: 55, // Sol3
    acordes: [
      [0, 4, 7, 11],
      [9, 12, 16, 19],
      [2, 5, 9, 12],
      [5, 9, 12, 16],
    ], // Imaj7 · vi7 · ii7 · IVmaj7
    densidad: 0.4,
    onda: 'triangle',
    pad: true,
    filtroHz: 1100,
    volumen: 0.52,
    bombos: [0, 5],
    cajas: [4],
    hatProb: 0.45,
    swing: 0.18,
    eco: 0.3,
    brillo: 0.05,
    bajo: 'redonda',
  },
  // Entretenimiento/canchas: riff cuadrado brillante.
  arcade: {
    tempo: 138,
    base: 69, // La4
    acordes: [
      [0, 4, 7],
      [5, 9, 12],
      [7, 11, 14],
      [9, 12, 16],
    ], // I · IV · V · vi
    densidad: 0.85,
    onda: 'square',
    pad: false,
    filtroHz: 3800,
    volumen: 0.4,
    bombos: [0, 4],
    cajas: [2, 6],
    hatProb: 0.7,
    eco: 0.12,
    bajo: 'octavas',
    riff: [0, 4, 7, 12, 7, 4, 0, -5],
  },
  // Jardín/huerto/granja: aire abierto, acordes sus y campanitas.
  bosque: {
    tempo: 66,
    base: 57, // La3
    acordes: [
      [0, 2, 7],
      [5, 7, 12],
      [0, 4, 9],
      [7, 9, 14],
    ], // sus2 abiertos
    densidad: 0.35,
    onda: 'sine',
    pad: true,
    filtroHz: 1300,
    volumen: 0.52,
    eco: 0.35,
    brillo: 0.14,
    bajo: 'redonda',
    cola: 2,
  },
  // Sala de viajes/tren: groove constante que avanza.
  viaje: {
    tempo: 104,
    base: 60, // Do4
    acordes: [
      [0, 4, 7],
      [7, 11, 14],
      [9, 12, 16],
      [5, 9, 12],
    ], // I · V · vi · IV
    densidad: 0.6,
    onda: 'triangle',
    pad: true,
    filtroHz: 1900,
    volumen: 0.5,
    bombos: [0, 4],
    cajas: [2, 6],
    hatProb: 0.75,
    swing: 0.08,
    eco: 0.2,
    bajo: 'pulso',
  },
  // Pistas de carreras/garage: menor rápido con riff insistente.
  carrera: {
    tempo: 148,
    base: 52, // Mi3 menor
    acordes: [
      [0, 3, 7],
      [5, 8, 12],
      [7, 10, 14],
      [10, 13, 17],
    ], // i · iv · v · VII
    densidad: 0.8,
    onda: 'sawtooth',
    pad: false,
    filtroHz: 3200,
    volumen: 0.46,
    bombos: [0, 2, 4, 6],
    cajas: [2, 6],
    hatProb: 0.9,
    eco: 0.1,
    bajo: 'octavas',
    riff: [0, 0, 3, 5, 7, 7, 10, 12],
  },
  // Anecdotario/recuerdos: cajita de música (agudo, sin batería ni bajo).
  cajita: {
    tempo: 84,
    base: 76, // Mi5
    acordes: [
      [0, 4, 7],
      [9, 12, 16],
      [5, 9, 12],
      [7, 11, 14],
    ], // I · vi · IV · V
    densidad: 0.5,
    onda: 'sine',
    pad: false,
    filtroHz: 4200,
    volumen: 0.45,
    eco: 0.35,
    brillo: 0.22,
    bajo: 'nada',
    cola: 3,
  },
  // Biblioteca: más íntimo que `estudio` — sin batería, notas largas y eco amplio.
  lectura: {
    tempo: 64,
    base: 53, // Fa3
    acordes: [
      [0, 4, 7, 11],
      [5, 9, 12, 16],
      [2, 5, 9, 12],
      [7, 11, 14, 17],
    ], // Imaj7 · IVmaj7 · ii7 · V7
    densidad: 0.32,
    onda: 'triangle',
    pad: true,
    filtroHz: 950,
    volumen: 0.5,
    eco: 0.32,
    brillo: 0.04,
    bajo: 'redonda',
    cola: 1.6,
  },
  // Agenda: metódico. Pulso constante sin swing, como un reloj que no se detiene.
  oficina: {
    tempo: 100,
    base: 60, // Do4
    acordes: [
      [2, 5, 9],
      [7, 11, 14],
      [0, 4, 7, 11],
      [0, 4, 7, 11],
    ], // ii · V · Imaj7 · Imaj7
    densidad: 0.45,
    onda: 'triangle',
    pad: false,
    filtroHz: 1800,
    volumen: 0.44,
    bombos: [0, 4],
    hatProb: 0.55,
    eco: 0.12,
    bajo: 'pulso',
  },
  // Ideas: curioso y saltarín. Notas cortas y agudas, acordes sus que no cierran.
  taller: {
    tempo: 112,
    base: 67, // Sol4
    acordes: [
      [0, 2, 7],
      [4, 9, 11],
      [5, 7, 12],
      [2, 7, 9],
    ],
    densidad: 0.65,
    onda: 'triangle',
    pad: false,
    filtroHz: 3000,
    volumen: 0.42,
    hatProb: 0.5,
    swing: 0.12,
    eco: 0.2,
    brillo: 0.16,
    bajo: 'pulso',
    cola: 0.8,
  },
  // Sala de cómputo: electrónico limpio, arpegio denso y bajo en octavas.
  digital: {
    tempo: 118,
    base: 62, // Re4 menor
    acordes: [
      [0, 3, 7, 14],
      [10, 14, 17, 24],
      [5, 8, 12, 19],
      [7, 10, 14, 21],
    ], // i9 · VII · iv · v
    densidad: 0.75,
    onda: 'square',
    pad: true,
    filtroHz: 2400,
    volumen: 0.4,
    bombos: [0, 4],
    hatProb: 0.8,
    eco: 0.16,
    bajo: 'octavas',
  },
  // Noticias: marcha ligera de cabecera informativa, caja marcada y mayor decidido.
  noticias: {
    tempo: 108,
    base: 60, // Do4
    acordes: [
      [0, 4, 7],
      [5, 9, 12],
      [7, 11, 14],
      [0, 4, 7],
    ], // I · IV · V · I
    densidad: 0.5,
    onda: 'triangle',
    pad: false,
    filtroHz: 2100,
    volumen: 0.45,
    bombos: [0, 4],
    cajas: [2, 6],
    hatProb: 0.4,
    eco: 0.1,
    bajo: 'pulso',
  },
  // Huerto y granja: folk alegre con shuffle y notas cortas, tipo cuerda pulsada.
  campo: {
    tempo: 96,
    base: 62, // Re4
    acordes: [
      [0, 4, 7],
      [7, 11, 14],
      [5, 9, 12],
      [0, 4, 7],
    ], // I · V · IV · I
    densidad: 0.7,
    onda: 'triangle',
    pad: false,
    filtroHz: 2600,
    volumen: 0.46,
    bombos: [0, 4],
    cajas: [4],
    hatProb: 0.35,
    swing: 0.22,
    eco: 0.14,
    bajo: 'pulso',
    cola: 0.7,
  },
  // Canchas: percusión de gradería (bombo doble y palmas) con un riff que corea.
  deporte: {
    tempo: 128,
    base: 57, // La3
    acordes: [
      [0, 4, 7],
      [9, 12, 16],
      [5, 9, 12],
      [7, 11, 14],
    ], // I · vi · IV · V
    densidad: 0.55,
    onda: 'sawtooth',
    pad: true,
    filtroHz: 2800,
    volumen: 0.44,
    bombos: [0, 3, 4, 6],
    cajas: [2, 6],
    hatProb: 0.5,
    eco: 0.14,
    bajo: 'octavas',
    riff: [0, null, 7, null, 5, null, 4, null],
  },
  // Caminos: rodar sin prisa. Más ancho y con más eco que `viaje`.
  ruta: {
    tempo: 88,
    base: 55, // Sol3
    acordes: [
      [0, 4, 7],
      [9, 12, 16],
      [5, 9, 12],
      [7, 11, 14],
    ], // I · vi · IV · V
    densidad: 0.5,
    onda: 'triangle',
    pad: true,
    filtroHz: 1600,
    volumen: 0.5,
    bombos: [0, 4],
    cajas: [6],
    hatProb: 0.6,
    swing: 0.1,
    eco: 0.28,
    bajo: 'pulso',
  },
  // Paintball: tensión. Poca melodía, percusión seca y un riff grave que insiste.
  tactico: {
    tempo: 140,
    base: 50, // Re3 menor
    acordes: [
      [0, 3, 7],
      [1, 5, 8],
      [0, 3, 7],
      [10, 14, 17],
    ], // i · bII · i · VII
    densidad: 0.35,
    onda: 'sawtooth',
    pad: true,
    filtroHz: 1500,
    volumen: 0.44,
    bombos: [0, 3, 4, 6],
    cajas: [4],
    hatProb: 0.95,
    eco: 0.08,
    bajo: 'octavas',
    riff: [0, null, 0, 1, 0, null, -2, null],
  },
}

const CORCHEAS_COMPAS = 8
/** Cada cuánto revisa el scheduler y hasta dónde agenda por delante. */
const TICK_MS = 100
const LOOKAHEAD_S = 0.3

const midiAHz = (n: number) => 440 * 2 ** ((n - 69) / 12)

let mood: MoodMusica | null = null
let entrada: BiquadFilterNode | null = null // fuentes → entrada(filtro) → bus → maestro
let bus: GainNode | null = null
let ecoNodos: AudioNode[] = [] // delay + feedback + wet del eco (para desconectarlos)
let intervalo: number | null = null
let proxima = 0
let corchea = 0
let acordeIdx = 0
let padOscs: OscillatorNode[] = []
let padGain: GainNode | null = null
let ruido: AudioBuffer | null = null

/** Paneo estéreo opcional (si el navegador no lo soporta, la nota va al centro). */
function conPan(ctx: AudioContext, destino: AudioNode, pan: number): AudioNode {
  if (!pan || typeof ctx.createStereoPanner !== 'function') return destino
  const p = ctx.createStereoPanner()
  p.pan.value = Math.max(-1, Math.min(1, pan))
  p.connect(destino)
  return p
}

function nota(
  ctx: AudioContext,
  t: number,
  midi: number,
  dur: number,
  vol: number,
  onda: OscillatorType,
  pan = 0,
) {
  if (!entrada) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = onda
  osc.frequency.value = midiAHz(midi)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain)
  gain.connect(conPan(ctx, entrada, pan))
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

/** Campanita: seno + tercer armónico suave (timbre de campana, para el brillo). */
function campanita(ctx: AudioContext, t: number, midi: number, dur: number) {
  const pan = (Math.random() - 0.5) * 1.2
  nota(ctx, t, midi, dur, 0.05, 'sine', pan)
  nota(ctx, t, midi + 19, dur * 0.5, 0.015, 'sine', pan)
}

function kick(ctx: AudioContext, t: number) {
  if (!entrada) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.12)
  gain.gain.setValueAtTime(0.5, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
  osc.connect(gain)
  gain.connect(entrada)
  osc.start(t)
  osc.stop(t + 0.16)
}

function bufferRuido(ctx: AudioContext): AudioBuffer {
  if (!ruido) {
    ruido = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.1), ctx.sampleRate)
    const datos = ruido.getChannelData(0)
    for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1
  }
  return ruido
}

function hat(ctx: AudioContext, t: number) {
  if (!entrada) return
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  src.buffer = bufferRuido(ctx)
  gain.gain.setValueAtTime(0.1, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
  src.connect(gain)
  gain.connect(conPan(ctx, entrada, (Math.random() - 0.5) * 0.4))
  src.start(t)
  src.stop(t + 0.04)
}

/** Caja: golpe de ruido por pasabanda + cuerpo grave corto. */
function caja(ctx: AudioContext, t: number) {
  if (!entrada) return
  const src = ctx.createBufferSource()
  const filtro = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  src.buffer = bufferRuido(ctx)
  filtro.type = 'bandpass'
  filtro.frequency.value = 1900
  filtro.Q.value = 0.8
  gain.gain.setValueAtTime(0.22, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
  src.connect(filtro)
  filtro.connect(gain)
  gain.connect(entrada)
  src.start(t)
  src.stop(t + 0.1)
  const osc = ctx.createOscillator()
  const g2 = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(190, t)
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.06)
  g2.gain.setValueAtTime(0.12, t)
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
  osc.connect(g2)
  g2.connect(entrada)
  osc.start(t)
  osc.stop(t + 0.08)
}

/** Pad: dos osciladores desafinados sostenidos mientras dure el acorde. */
function cambiarPad(ctx: AudioContext, t: number, P: ParamsMood, acorde: number[]) {
  for (const o of padOscs) {
    try {
      o.stop(t + 0.4)
    } catch {
      /* ya detenido */
    }
  }
  padGain?.gain.setTargetAtTime(0, t, 0.15)
  padOscs = []
  if (!entrada) return
  padGain = ctx.createGain()
  padGain.gain.setValueAtTime(0, t)
  padGain.gain.linearRampToValueAtTime(0.08, t + 0.6)
  padGain.connect(entrada)
  for (const semitono of [acorde[0], acorde[2] ?? acorde[0]]) {
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator()
      osc.type = P.onda === 'square' ? 'triangle' : P.onda
      osc.frequency.value = midiAHz(P.base + semitono)
      osc.detune.value = detune
      osc.connect(padGain)
      osc.start(t)
      padOscs.push(osc)
    }
  }
}

function agendar(ctx: AudioContext, P: ParamsMood, t: number, i: number) {
  const corcheaDur = 60 / P.tempo / 2
  const pos = i % CORCHEAS_COMPAS
  // Swing: las corcheas impares se retrasan una fracción (shuffle).
  const tSwing = pos % 2 === 1 ? t + corcheaDur * (P.swing ?? 0) : t
  if (pos === 0) {
    acordeIdx = Math.floor(i / CORCHEAS_COMPAS) % P.acordes.length
    if (P.pad) cambiarPad(ctx, t, P, P.acordes[acordeIdx])
  }
  const acorde = P.acordes[acordeIdx]
  // Bajo según el patrón del mood.
  const bajoMidi = P.base - 12 + acorde[0]
  switch (P.bajo ?? 'redonda') {
    case 'redonda':
      if (pos === 0) nota(ctx, t, bajoMidi, corcheaDur * CORCHEAS_COMPAS * 0.9, 0.22, 'sine')
      break
    case 'pulso':
      if (pos % 2 === 0) nota(ctx, tSwing, bajoMidi, corcheaDur * 1.7, 0.2, 'sine')
      break
    case 'octavas':
      nota(ctx, tSwing, bajoMidi + (pos % 2 === 1 ? 12 : 0), corcheaDur * 0.85, 0.15, 'triangle')
      break
    case 'nada':
      break
  }
  const cola = P.cola ?? 1
  if (P.riff) {
    // Riff fijo transportado a la raíz del acorde en curso.
    const r = P.riff[i % P.riff.length]
    if (r != null)
      nota(ctx, tSwing, P.base + acorde[0] + r, corcheaDur * 0.9 * cola, 0.14, P.onda, (Math.random() - 0.5) * 0.5)
  } else if (Math.random() < P.densidad) {
    // Arpegio: tono del acorde al azar, a veces una octava arriba.
    const semitono = acorde[Math.floor(Math.random() * acorde.length)]
    const octava = Math.random() < 0.3 ? 12 : 0
    nota(ctx, tSwing, P.base + semitono + octava, corcheaDur * 0.9 * cola, 0.13, P.onda, (Math.random() - 0.5) * 0.6)
  }
  // Campanitas agudas ocasionales (brillo).
  if (P.brillo && Math.random() < P.brillo) {
    const semitono = acorde[Math.floor(Math.random() * acorde.length)]
    campanita(ctx, tSwing, P.base + 24 + semitono, corcheaDur * 4)
  }
  // Batería por posiciones.
  if (P.bombos?.includes(pos)) kick(ctx, t)
  if (P.cajas?.includes(pos)) caja(ctx, t)
  if (P.hatProb) {
    if (Math.random() < P.hatProb) hat(ctx, t + corcheaDur * (0.5 + (P.swing ?? 0)))
    if (Math.random() < P.hatProb * 0.35) hat(ctx, t)
  }
}

function tick() {
  const ctx = contextoAudio()
  if (!ctx || !mood) return
  const P = MOODS[mood]
  const corcheaDur = 60 / P.tempo / 2
  // Tras una pausa larga (pestaña oculta), re-sincroniza en vez de "alcanzar".
  if (proxima < ctx.currentTime - 0.5) proxima = ctx.currentTime + 0.05
  while (proxima < ctx.currentTime + LOOKAHEAD_S) {
    agendar(ctx, P, proxima, corchea)
    proxima += corcheaDur
    corchea++
  }
}

/** Arranca (o cambia a) un mood; idempotente si ya suena ese mismo. */
export function iniciarMusica(m: MoodMusica): void {
  try {
    if (mood === m && intervalo != null) return
    detenerMusica(200)
    const ctx = contextoAudio()
    const maestro = gainMaestro()
    if (!ctx || !maestro) return
    const P = MOODS[m]
    mood = m
    corchea = 0
    acordeIdx = 0
    bus = ctx.createGain()
    bus.gain.setValueAtTime(0, ctx.currentTime)
    bus.gain.setTargetAtTime(P.volumen, ctx.currentTime, 0.25)
    entrada = ctx.createBiquadFilter()
    entrada.type = 'lowpass'
    entrada.frequency.value = P.filtroHz
    entrada.connect(bus)
    bus.connect(maestro)
    // Eco: send paralelo filtro → delay (con feedback) → bus.
    if (P.eco) {
      const delay = ctx.createDelay(2)
      delay.delayTime.value = (60 / P.tempo / 2) * 1.5 // corchea con puntillo
      const fb = ctx.createGain()
      fb.gain.value = 0.32
      const wet = ctx.createGain()
      wet.gain.value = P.eco
      entrada.connect(delay)
      delay.connect(fb)
      fb.connect(delay)
      delay.connect(wet)
      wet.connect(bus)
      ecoNodos = [delay, fb, wet]
    }
    proxima = ctx.currentTime + 0.05
    intervalo = window.setInterval(tick, TICK_MS)
    tick()
  } catch {
    // Sin audio disponible: silencio.
  }
}

export function detenerMusica(fadeMs = 400): void {
  if (intervalo != null) {
    window.clearInterval(intervalo)
    intervalo = null
  }
  mood = null
  const viejoBus = bus
  const viejaEntrada = entrada
  const viejosPad = padOscs
  const viejosEco = ecoNodos
  bus = null
  entrada = null
  padOscs = []
  padGain = null
  ecoNodos = []
  if (!viejoBus) return
  const ctx = contextoAudio()
  if (ctx) viejoBus.gain.setTargetAtTime(0, ctx.currentTime, fadeMs / 1000 / 3)
  window.setTimeout(() => {
    for (const o of viejosPad) {
      try {
        o.stop()
      } catch {
        /* ya detenido */
      }
    }
    for (const n of viejosEco) n.disconnect()
    viejaEntrada?.disconnect()
    viejoBus.disconnect()
  }, fadeMs + 300)
}

// Con la pestaña oculta los timers se estrangulan y el audio suele suspenderse:
// se pausa el scheduler y al volver se re-sincroniza (tick ya re-ancla `proxima`).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (intervalo != null) {
      window.clearInterval(intervalo)
      intervalo = null
    }
  } else if (mood && intervalo == null) {
    intervalo = window.setInterval(tick, TICK_MS)
  }
})

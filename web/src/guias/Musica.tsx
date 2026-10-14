import { useEffect, useRef, useState } from 'react'
import type { T } from './datos'

/**
 * Lo propio de la guía de Música («¿Qué es la música?»): sus mini-herramientas,
 * que SUENAN, y sus gráficas. Todo el sonido se sintetiza aquí con Web Audio
 * (nada de grabaciones ajenas): las dos canciones de ejemplo son de dominio
 * público —el «Himno de la alegría» (Beethoven, 1824) y «Estrellita» (1761)— y
 * van con arreglos propios. Con `demo` (su línea suena en modo grabación) cada
 * herramienta se usa sola y suena bajo la voz.
 */
export const HERRAMIENTAS_MUSICA = new Set([
  'onda',
  'dosCanciones',
  'pulso',
  'cajaRitmos',
  'sincopa',
  'teclado',
  'acorde',
  'mayorMenor',
  'progresion',
  'mezclador',
  'mezcladorVolumen',
  'mezcladorEq',
  'mezcladorPaneo',
  'mezcladorBalance',
  'dj',
  'minutosAno',
])

export function HerramientaMusica({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  if (id === 'onda') return <Onda t={t} demo={demo} />
  if (id === 'dosCanciones') return <DosCanciones t={t} demo={demo} />
  if (id === 'pulso') return <Pulso t={t} demo={demo} />
  if (id === 'cajaRitmos') return <CajaRitmos t={t} demo={demo} />
  if (id === 'sincopa') return <Sincopa t={t} demo={demo} />
  if (id === 'teclado') return <Teclado t={t} demo={demo} />
  if (id === 'acorde') return <Acorde t={t} demo={demo} />
  if (id === 'mayorMenor') return <MayorMenor t={t} demo={demo} />
  if (id === 'progresion') return <Progresion t={t} demo={demo} />
  if (id === 'minutosAno') return <MinutosAno t={t} demo={demo} />
  if (id === 'dj') return <Dj t={t} demo={demo} />
  if (id.startsWith('mezclador')) return <Mezclador t={t} demo={demo} modo={MODOS_MEZCLA[id]} />
  return null
}

// ───────── Sonido ─────────

/** Volumen general: los ejemplos suenan por debajo de la voz. */
const VOLUMEN = 0.32

let ctx: AudioContext | null = null
let salida: GainNode | null = null

/** El contexto de audio compartido (se crea al primer sonido y se reanuda si el navegador lo pausó). */
function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 3
    salida = ctx.createGain()
    salida.gain.value = VOLUMEN
    salida.connect(comp).connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return { ac: ctx, out: salida! }
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

let ruidoBuf: AudioBuffer | null = null
function ruido(ac: BaseAudioContext) {
  if (!ruidoBuf) {
    ruidoBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const d = ruidoBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const s = ac.createBufferSource()
  s.buffer = ruidoBuf
  return s
}

/** Envolvente de un golpe: sube en `a` y cae hasta casi nada en `d`. */
function env(ac: BaseAudioContext, t: number, pico: number, a: number, d: number) {
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(pico, t + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
  return g
}

type Instrumento = (ac: BaseAudioContext, dest: AudioNode, t: number, midi: number, dur: number, vel?: number) => void

/** Un piano sencillo: triángulo con un armónico y caída larga. */
const piano: Instrumento = (ac, dest, t, midi, dur, vel = 1) => {
  const g = env(ac, t, 0.5 * vel, 0.006, Math.max(0.4, dur * 1.6))
  const f = ac.createBiquadFilter()
  f.frequency.value = 3200
  for (const [mult, tipo, gan] of [
    [1, 'triangle', 1],
    [2, 'sine', 0.35],
  ] as const) {
    const o = ac.createOscillator()
    o.type = tipo
    o.frequency.value = hz(midi) * mult
    const og = ac.createGain()
    og.gain.value = gan
    o.connect(og).connect(f)
    o.start(t)
    o.stop(t + dur * 1.6 + 0.5)
  }
  f.connect(g).connect(dest)
}

/** El bajo: sierra con filtro grave. */
const bajo: Instrumento = (ac, dest, t, midi, dur, vel = 1) => {
  const o = ac.createOscillator()
  o.type = 'sawtooth'
  o.frequency.value = hz(midi)
  const f = ac.createBiquadFilter()
  f.frequency.value = 520
  f.Q.value = 2
  const g = env(ac, t, 0.7 * vel, 0.01, dur * 0.95)
  o.connect(f).connect(g).connect(dest)
  o.start(t)
  o.stop(t + dur + 0.1)
}

/** Los acordes: un colchón suave (cada nota del acorde es una llamada). */
const colchon: Instrumento = (ac, dest, t, midi, dur, vel = 1) => {
  const o = ac.createOscillator()
  o.type = 'triangle'
  o.frequency.value = hz(midi)
  const o2 = ac.createOscillator()
  o2.type = 'sine'
  o2.frequency.value = hz(midi) * 1.003
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.16 * vel, t + 0.06)
  g.gain.setValueAtTime(0.16 * vel, t + Math.max(0.07, dur - 0.08))
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25)
  o.connect(g)
  o2.connect(g)
  g.connect(dest)
  for (const x of [o, o2]) {
    x.start(t)
    x.stop(t + dur + 0.3)
  }
}

type Tambor = 'bombo' | 'tarola' | 'platillo'
function tambor(ac: BaseAudioContext, dest: AudioNode, t: number, cual: Tambor, vel = 1, platillo?: AudioNode) {
  if (cual === 'bombo') {
    const o = ac.createOscillator()
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14)
    const g = env(ac, t, 1.1 * vel, 0.003, 0.32)
    o.connect(g).connect(dest)
    o.start(t)
    o.stop(t + 0.4)
  } else if (cual === 'tarola') {
    const n = ruido(ac)
    const f = ac.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 1900
    f.Q.value = 0.8
    const g = env(ac, t, 0.75 * vel, 0.002, 0.17)
    n.connect(f).connect(g).connect(dest)
    n.start(t)
    n.stop(t + 0.25)
    const o = ac.createOscillator()
    o.type = 'triangle'
    o.frequency.value = 190
    const g2 = env(ac, t, 0.4 * vel, 0.002, 0.08)
    o.connect(g2).connect(dest)
    o.start(t)
    o.stop(t + 0.12)
  } else {
    const n = ruido(ac)
    const f = ac.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 7200
    const g = env(ac, t, 0.32 * vel, 0.002, 0.05)
    n.connect(f).connect(g).connect(platillo ?? dest)
    n.start(t)
    n.stop(t + 0.08)
  }
}

// ───────── Las dos canciones ─────────

/** Una nota: altura MIDI, inicio y duración en pulsos. */
interface Nota {
  m: number
  t: number
  d: number
}
/** Un acorde: sus notas MIDI, inicio y duración en pulsos. */
interface Acorde {
  nombre: string
  notas: number[]
  t: number
  d: number
}

/** De [altura, duración] seguidas a notas con su inicio. */
function seguidas(lista: [number, number][]): Nota[] {
  let t = 0
  return lista.map(([m, d]) => {
    const n = { m, t, d }
    t += d
    return n
  })
}

const ACORDES: Record<string, number[]> = {
  C: [48, 52, 55],
  F: [53, 57, 60],
  G: [55, 59, 62],
  Am: [57, 60, 64],
  Cm: [48, 51, 55],
  Fm: [53, 56, 60],
}
const RAIZ: Record<string, number> = { C: 36, F: 41, G: 43, Am: 45, Cm: 36, Fm: 41 }

function acordes(lista: [string, number][]): Acorde[] {
  let t = 0
  return lista.map(([nombre, d]) => {
    const a = { nombre, notas: ACORDES[nombre], t, d }
    t += d
    return a
  })
}

const q = (m: number): [number, number] => [m, 1]
const FRASE_HIMNO_A: [number, number][] = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64].map(q)
/** El «Himno de la alegría» (Beethoven, 1824) en do mayor: 8 compases de 4/4. */
const HIMNO = {
  notas: seguidas([...FRASE_HIMNO_A, [64, 1.5], [62, 0.5], [62, 2], ...FRASE_HIMNO_A, [62, 1.5], [60, 0.5], [60, 2]]),
  acordes: acordes([
    ['C', 4],
    ['G', 4],
    ['C', 4],
    ['G', 4],
    ['C', 4],
    ['G', 4],
    ['C', 4],
    ['G', 2],
    ['C', 2],
  ]),
  pulsos: 32,
}

const A_ESTRELLITA: [number, number][] = [...[60, 60, 67, 67, 69, 69].map(q), [67, 2], ...[65, 65, 64, 64, 62, 62].map(q), [60, 2]]
const B_ESTRELLITA: [number, number][] = [...[67, 67, 65, 65, 64, 64].map(q), [62, 2]]
const ACORDES_A: [string, number][] = [
  ['C', 4],
  ['F', 2],
  ['C', 2],
  ['F', 2],
  ['C', 2],
  ['G', 2],
  ['C', 2],
]
const ACORDES_B: [string, number][] = [
  ['C', 2],
  ['F', 2],
  ['C', 2],
  ['G', 2],
]
/** «Estrellita» (Francia, 1761): A B B A, en do mayor. */
const ESTRELLITA = {
  notas: seguidas([...A_ESTRELLITA, ...B_ESTRELLITA, ...B_ESTRELLITA, ...A_ESTRELLITA]),
  acordes: acordes([...ACORDES_A, ...ACORDES_B, ...ACORDES_B, ...ACORDES_A]),
  pulsos: 48,
}
/** La primera frase de Estrellita (4 compases), en mayor y en menor (mi → mi♭, la → la♭). */
const ESTRELLITA_A = { notas: seguidas(A_ESTRELLITA), acordes: acordes(ACORDES_A), pulsos: 16 }
const EN_MENOR: Record<number, number> = { 64: 63, 69: 68 }
const MENOR_DE: Record<string, string> = { C: 'Cm', F: 'Fm' }
const ESTRELLITA_MENOR = {
  notas: ESTRELLITA_A.notas.map((n) => ({ ...n, m: EN_MENOR[n.m] ?? n.m })),
  acordes: ESTRELLITA_A.acordes.map((a) => ({ ...a, nombre: MENOR_DE[a.nombre] ?? a.nombre, notas: ACORDES[MENOR_DE[a.nombre] ?? a.nombre] })),
  pulsos: 16,
}

type Cancion = { notas: Nota[]; acordes: Acorde[]; pulsos: number }

// ───────── Reproductor ─────────

/** Un evento que suena en el pulso `t` (dentro del bucle) con la hora real de audio. */
type Evento = { t: number; sonar: (ac: BaseAudioContext, cuando: number) => void }

/**
 * Programa `eventos` en bucle (`pulsos` de largo) a `bpm`, un poco por delante
 * del reloj de audio, y avisa en qué pulso va (para iluminar la nota que suena).
 * Devuelve el pulso actual (−1 parado) y las funciones para tocar y parar.
 */
function useReproductor() {
  const [pulso, setPulso] = useState(-1)
  const [sonando, setSonando] = useState(false)
  const parar = useRef<() => void>(() => {})
  useEffect(() => () => parar.current(), [])
  const tocar = (eventos: Evento[], pulsos: number, bpm: () => number, opciones: { bucle?: boolean; alTerminar?: () => void; desde?: number } = {}) => {
    parar.current()
    const { ac } = audio()
    const orden = [...eventos].sort((a, b) => a.t - b.t)
    // Hora de audio del pulso 0 de la vuelta actual (se fija cuando el audio ya corre:
    // sin un toque del usuario el navegador lo deja en pausa); el bpm puede cambiar a media canción.
    let base = -1
    let vuelta = 0
    let i = 0
    let ultimoBpm = bpm()
    let vivo = true
    const seg = () => 60 / ultimoBpm
    const programar = () => {
      if (!vivo || ac.state !== 'running') return
      // `desde`: arranca a media vuelta (el plato del DJ entra al compás del otro).
      if (base < 0) base = ac.currentTime + 0.08 - (opciones.desde ?? 0) * (60 / bpm())
      const b = bpm()
      if (b !== ultimoBpm) {
        // Cambio de tempo: el pulso actual se mantiene y lo que falta se reescala.
        const p = (ac.currentTime - base) / seg()
        ultimoBpm = b
        base = ac.currentTime - p * seg()
      }
      const hasta = ac.currentTime + 0.25
      for (;;) {
        if (i >= orden.length) {
          if (!opciones.bucle) break
          i = 0
          vuelta++
          base += pulsos * seg()
        }
        const e = orden[i]
        const cuando = base + e.t * seg()
        if (cuando > hasta) break
        e.sonar(ac, Math.max(cuando, ac.currentTime))
        i++
      }
    }
    const reloj = setInterval(programar, 50)
    programar()
    let raf = 0
    const mirar = () => {
      const p = base < 0 ? -1 : (ac.currentTime - base) / seg()
      if (!opciones.bucle && p >= pulsos) {
        detener()
        opciones.alTerminar?.()
        return
      }
      setPulso(p < 0 ? -1 : p)
      raf = requestAnimationFrame(mirar)
    }
    raf = requestAnimationFrame(mirar)
    const detener = () => {
      vivo = false
      clearInterval(reloj)
      cancelAnimationFrame(raf)
      setPulso(-1)
      setSonando(false)
    }
    parar.current = detener
    setSonando(true)
    void vuelta
  }
  return { pulso, tocar, parar: () => parar.current(), sonando }
}

/** La melodía (piano) de una canción como eventos. */
const eventosMelodia = (c: Pick<Cancion, 'notas'>, dest: () => AudioNode, inst: Instrumento = piano, octava = 0): Evento[] =>
  c.notas.map((n) => ({ t: n.t, sonar: (ac, cuando) => inst(ac, dest(), cuando, n.m + octava, n.d * 0.5) }))
/** Los acordes (colchón) de una canción como eventos. */
const eventosAcordes = (c: Cancion, dest: () => AudioNode, seg: () => number): Evento[] =>
  c.acordes.flatMap((a) => a.notas.map((m) => ({ t: a.t, sonar: (ac: BaseAudioContext, cuando: number) => colchon(ac, dest(), cuando, m, a.d * seg()) })))

/** Va aplicando `pasos` cada `ms` mientras `demo` está activo (como en las otras guías). */
function useDemo<V>(demo: boolean, pasos: V[], ms: number, aplicar: (v: V) => void, primero = ms) {
  useEffect(() => {
    if (!demo) return
    let i = 0
    let id = 0
    const uno = () => {
      if (i < pasos.length) aplicar(pasos[i++])
      id = window.setTimeout(uno, ms)
    }
    id = window.setTimeout(uno, primero)
    return () => clearTimeout(id)
    // Los pasos son literales de quien llama: solo importa encender/apagar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo])
}

/** Al apagarse la demo (la línea dejó de sonar) se calla lo que esté sonando. */
function useCallarAlSalir(demo: boolean, parar: () => void) {
  const antes = useRef(demo)
  useEffect(() => {
    if (antes.current && !demo) parar()
    antes.current = demo
  }, [demo, parar])
}

const lang = () => document.documentElement.lang || 'es'
const num = (n: number) => new Intl.NumberFormat(lang(), { maximumFractionDigits: 0 }).format(Math.round(n))

/** Los botones de una opción entre varias. */
function Segmentos<V extends string | number>({ valores, valor, set, rotulo }: { valores: V[]; valor: V; set: (v: V) => void; rotulo?: (v: V) => string }) {
  return (
    <div className="g-segmentos g-segmentos-anchos">
      {valores.map((v) => (
        <button key={v} type="button" className={v === valor ? 'activo' : ''} onClick={() => set(v)}>
          {rotulo ? rotulo(v) : v}
        </button>
      ))}
    </div>
  )
}

/** Botón de tocar/parar. */
function BotonTocar({ sonando, tocar, parar, k }: { sonando: boolean; tocar: () => void; parar: () => void; k: (s: string) => string }) {
  return (
    <button type="button" className="g-boton-accion" onClick={sonando ? parar : tocar}>
      {sonando ? `■ ${k('parar')}` : `▶ ${k('tocar')}`}
    </button>
  )
}

const NOMBRES_DO = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si']
const BLANCAS = [0, 2, 4, 5, 7, 9, 11]
/** Nombre de una nota natural en el idioma de la guía (las alteraciones no se nombran). */
function nombreNota(m: number, k: (s: string) => string) {
  const i = BLANCAS.indexOf(((m % 12) + 12) % 12)
  return i < 0 ? '' : k(`nota.${NOMBRES_DO[i]}`)
}

// ───────── Herramientas ─────────

/** La onda: más vibraciones por segundo, más aguda. */
function Onda({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`musica.onda.${s}`)
  const kc = (s: string) => t(`musica.comun.${s}`)
  const [f, setF] = useState(440)
  const tono = (fr: number) => {
    setF(fr)
    const { ac, out } = audio()
    const o = ac.createOscillator()
    o.frequency.value = fr
    const g = env(ac, ac.currentTime, 0.5, 0.02, 1.1)
    o.connect(g).connect(out)
    o.start()
    o.stop(ac.currentTime + 1.3)
  }
  useDemo(demo, [220, 440, 880, 440], 2600, tono, 900)
  // Ciclos dibujados: 220 Hz = 2, 440 = 4, 880 = 8.
  const ciclos = f / 110
  const d = Array.from({ length: 241 }, (_, i) => `${i ? 'L' : 'M'}${20 + i * 1.5} ${80 - 50 * Math.sin((i / 240) * ciclos * 2 * Math.PI)}`).join(' ')
  return (
    <div className="g-herramienta g-mus">
      <h4>{k('titulo')}</h4>
      <figure className="g-grafica">
        <svg viewBox="0 0 400 160" role="img" aria-label={k('titulo')}>
          <line x1="20" y1="80" x2="380" y2="80" className="g-eje" strokeDasharray="3 5" />
          <path d={d} className="g-curva g-mus-onda" />
          <text x="380" y="152" textAnchor="end" className="g-rotulo g-fuerte">
            {num(f)} {k('hz')}
          </text>
        </svg>
      </figure>
      <div className="g-opciones">
        <label>
          <span>{k('frecuencia')}</span>
          <Segmentos valores={[220, 440, 880]} valor={f} set={tono} rotulo={(v) => `${v} ${k('hz')}`} />
        </label>
      </div>
      <p className="g-idi-veredicto">{f === 440 ? <b>{k('la440')}</b> : f > 440 ? k('masAguda') : k('masGrave')}</p>
      <p className="g-nota">{k('nota')} {kc('suena')}</p>
    </div>
  )
}

/** Las dos canciones de la guía, completas (melodía y acordes). */
function DosCanciones({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`musica.canciones.${s}`)
  const kc = (s: string) => t(`musica.comun.${s}`)
  const r = useReproductor()
  const [cual, setCual] = useState<'himno' | 'estrellita'>('himno')
  const tocar = (c: 'himno' | 'estrellita') => {
    setCual(c)
    const cancion = c === 'himno' ? HIMNO : ESTRELLITA
    const bpm = c === 'himno' ? 112 : 104
    const out = () => audio().out
    r.tocar([...eventosMelodia(cancion, out), ...eventosAcordes(cancion, out, () => 60 / bpm)], cancion.pulsos, () => bpm)
  }
  useDemo<() => void>(demo, [() => tocar('himno'), () => tocar('estrellita')], 9000, (fn) => fn(), 600)
  useCallarAlSalir(demo, r.parar)
  return (
    <div className="g-herramienta g-mus">
      <h4>{k('titulo')}</h4>
      <div className="g-mus-tarjetas">
        {(['himno', 'estrellita'] as const).map((c) => (
          <button key={c} type="button" className={`g-mus-tarjeta${r.sonando && cual === c ? ' activo' : ''}`} onClick={() => (r.sonando && cual === c ? r.parar() : tocar(c))}>
            <span className="g-mus-play">{r.sonando && cual === c ? '■' : '▶'}</span>
            <b>{k(c)}</b>
            <small>{k(`${c}Det`)}</small>
          </button>
        ))}
      </div>
      <p className="g-nota">{kc('dominioPublico')}</p>
    </div>
  )
}

/** El Himno a 60, 100 o 140 pulsos por minuto, con el pulso marcado. */
function Pulso({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`musica.pulso.${s}`)
  const kc = (s: string) => t(`musica.comun.${s}`)
  const r = useReproductor()
  const [bpm, setBpmEstado] = useState(100)
  const bpmRef = useRef(100)
  const setBpm = (b: number) => {
    bpmRef.current = b
    setBpmEstado(b)
  }
  const tocar = () => {
    const out = () => audio().out
    const golpes: Evento[] = Array.from({ length: HIMNO.pulsos }, (_, i) => ({ t: i, sonar: (ac, c) => tambor(ac, audio().out, c, i % 4 === 0 ? 'bombo' : 'platillo', i % 4 === 0 ? 0.9 : 1.6) }))
    r.tocar([...eventosMelodia(HIMNO, out), ...golpes], HIMNO.pulsos, () => bpmRef.current, { bucle: true })
  }
  useDemo<() => void>(
    demo,
    [
      () => {
        setBpm(60)
        tocar()
      },
      () => setBpm(100),
      () => setBpm(140),
    ],
    4200,
    (fn) => fn(),
    2500,
  )
  useCallarAlSalir(demo, r.parar)
  const golpe = r.sonando ? Math.floor(r.pulso) % 4 : -1
  return (
    <div className="g-herramienta g-mus">
      <h4>{k('titulo')}</h4>
      <div className="g-mus-pulsos" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={`${i === golpe ? 'activo' : ''}${i === 0 ? ' fuerte' : ''}`} />
        ))}
      </div>
      <div className="g-opciones">
        <label>
          <span>{k('velocidad')}</span>
          <Segmentos valores={[60, 100, 140]} valor={bpm} set={setBpm} rotulo={(v) => `${v} ${k('ppm')}`} />
        </label>
      </div>
      <div className="g-art-fila">
        <BotonTocar sonando={r.sonando} tocar={tocar} parar={r.parar} k={kc} />
        <p className="g-idi-veredicto">{k(bpm === 60 ? 'lento' : bpm === 100 ? 'medio' : 'rapido')}</p>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

const FILAS: Tambor[] = ['platillo', 'tarola', 'bombo']
type Patron = Record<Tambor, boolean[]>
const vacio = (): Patron => ({ platillo: Array(16).fill(false), tarola: Array(16).fill(false), bombo: Array(16).fill(false) })
const conGolpes = (p: Patron, cual: Tambor, pasos: number[]): Patron => ({ ...p, [cual]: p[cual].map((v, i) => v || pasos.includes(i)) })
const BASICO_BOMBO = [0, 8]
const BASICO_TAROLA = [4, 12]
const BASICO_PLATILLO = [0, 2, 4, 6, 8, 10, 12, 14]
/** «Pisotón, pisotón, palmada»: dos bombos y una tarola, con un silencio. */
const PISOTON = conGolpes(conGolpes(vacio(), 'bombo', [0, 2, 8, 10]), 'tarola', [4, 12])

/** Hook de la caja de ritmos: 16 pasos (semicorcheas) de un compás, en bucle. */
function useCaja(bpm: number) {
  const r = useReproductor()
  const patron = useRef<Patron>(vacio())
  const tocar = () => {
    // Cada paso consulta el patrón al sonar: se puede editar mientras suena.
    const eventos: Evento[] = Array.from({ length: 16 }, (_, i) => ({
      t: i / 4,
      sonar: (ac, c) => {
        for (const f of FILAS) if (patron.current[f][i]) tambor(ac, audio().out, c, f)
      },
    }))
    r.tocar(eventos, 4, () => bpm, { bucle: true })
  }
  return { r, patron, tocar }
}

function Rejilla({ patron, paso, alternar, k }: { patron: Patron; paso: number; alternar?: (f: Tambor, i: number) => void; k: (s: string) => string }) {
  return (
    <div className="g-mus-rejilla">
      {FILAS.map((f) => (
        <div key={f} className="g-mus-fila">
          <span>{k(f)}</span>
          {patron[f].map((v, i) => (
            <button
              key={i}
              type="button"
              className={`${v ? 'on' : ''}${i === paso ? ' ahora' : ''}${i % 4 === 0 ? ' pulso' : ''} g-mus-${f}`}
              onClick={() => alternar?.(f, i)}
              aria-pressed={v}
              aria-label={`${k(f)} ${i + 1}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Caja de ritmos de 16 pasos: se arma golpe a golpe. */
function CajaRitmos({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`musica.ritmos.${s}`)
  const kc = (s: string) => t(`musica.comun.${s}`)
  const { r, patron, tocar } = useCaja(100)
  const [p, setP] = useState<Patron>(() => conGolpes(conGolpes(conGolpes(vacio(), 'bombo', BASICO_BOMBO), 'tarola', BASICO_TAROLA), 'platillo', BASICO_PLATILLO))
  const poner = (np: Patron) => {
    patron.current = np
    setP(np)
  }
  patron.current = p
  const alternar = (f: Tambor, i: number) => poner({ ...p, [f]: p[f].map((v, j) => (j === i ? !v : v)) })
  useDemo<() => void>(
    demo,
    [
      () => {
        poner(conGolpes(vacio(), 'bombo', BASICO_BOMBO))
        tocar()
      },
      () => poner(conGolpes(conGolpes(vacio(), 'bombo', BASICO_BOMBO), 'tarola', BASICO_TAROLA)),
      () => poner(conGolpes(conGolpes(conGolpes(vacio(), 'bombo', BASICO_BOMBO), 'tarola', BASICO_TAROLA), 'platillo', BASICO_PLATILLO)),
      () => poner(PISOTON),
    ],
    3300,
    (fn) => fn(),
    800,
  )
  useCallarAlSalir(demo, r.parar)
  const paso = r.sonando ? Math.floor(r.pulso * 4) % 16 : -1
  return (
    <div className="g-herramienta g-mus">
      <h4>{k('titulo')}</h4>
      <Rejilla patron={p} paso={paso} alternar={alternar} k={k} />
      <div className="g-art-fila">
        <BotonTocar sonando={r.sonando} tocar={tocar} parar={r.parar} k={kc} />
        <button type="button" className="g-boton-suave" onClick={() => poner(PISOTON)}>
          {k('pisoton')}
        </button>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** El mismo ritmo, con un bombo a tiempo o adelantado (síncopa). */
function Sincopa({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`musica.sincopa.${s}`)
  const kr = (s: string) => t(`musica.ritmos.${s}`)
  const kc = (s: string) => t(`musica.comun.${s}`)
  const { r, patron, tocar } = useCaja(104)
  const [sincopado, setSincopado] = useState(false)
  const base = conGolpes(conGolpes(vacio(), 'tarola', BASICO_TAROLA), 'platillo', BASICO_PLATILLO)
  const p = conGolpes(base, 'bombo', sincopado ? [0, 6, 10] : [0, 8])
  patron.current = p
  useDemo<() => void>(
    demo,
    [
      () => {
        setSincopado(false)
        tocar()
      },
      () => setSincopado(true),
      () => setSincopado(false),
      () => setSincopado(true),
    ],
    3600,
    (fn) => fn(),
    500,
  )
  useCallarAlSalir(demo, r.parar)
  const paso = r.sonando ? Math.floor(r.pulso * 4) % 16 : -1
  return (
    <div className="g-herramienta g-mus">
      <h4>{k('titulo')}</h4>
      <Rejilla patron={p} paso={paso} k={kr} />
      <div className="g-opciones">
        <label>
          <span>{k('bombo')}</span>
          <Segmentos valores={['aTiempo', 'sincopado']} valor={sincopado ? 'sincopado' : 'aTiempo'} set={(v) => setSincopado(v === 'sincopado')} rotulo={(v) => k(v)} />
        </label>
      </div>
      <div className="g-art-fila">
        <BotonTocar sonando={r.sonando} tocar={tocar} parar={r.parar} k={kc} />
        <p className="g-idi-veredicto">{sincopado ? <b>{k('balanceo')}</b> : k('cuadrado')}</p>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Teclas de do4 (60) a re5 (74): blancas y negras. */
const TECLAS = Array.from({ length: 15 }, (_, i) => 60 + i)
const esNegra = (m: number) => [1, 3, 6, 8, 10].includes(m % 12)

/** Un teclado de una octava y algo, con las teclas que suenan encendidas. */
function TecladoVista({ encendidas, tocar, k }: { encendidas: number[]; tocar?: (m: number) => void; k: (s: string) => string }) {
  const blancas = TECLAS.filter((m) => !esNegra(m))
  const ancho = 100 / blancas.length
  return (
    <div className="g-mus-teclado">
      {blancas.map((m) => (
        <button key={m} type="button" className={`blanca${encendidas.includes(m) ? ' on' : ''}`} onClick={() => tocar?.(m)} aria-label={nombreNota(m, k)}>
          <small>{nombreNota(m, k)}</small>
        </button>
      ))}
      {TECLAS.filter(esNegra).map((m) => {
        const izq = blancas.indexOf(m - 1)
        return (
          <button
            key={m}
            type="button"
            className={`negra${encendidas.includes(m) ? ' on' : ''}`}
            style={{ insetInlineStart: `${(izq + 1) * ancho - ancho * 0.3}%`, width: `${ancho * 0.6}%` }}
            onClick={() => tocar?.(m)}
            aria-hidden="true"
            tabIndex={-1}
          />
        )
      })}
    </div>
  )
}

/** El dibujo de una melodía: cada nota es un punto, de izquierda a derecha y de grave a agudo. */
function Contorno({ notas, hasta }: { notas: Nota[]; hasta: number }) {
  const fin = notas[notas.length - 1].t + notas[notas.length - 1].d
  const x = (tt: number) => 16 + (tt / fin) * 368
  const y = (m: number) => 110 - (m - 58) * 8
  const vistas = notas.filter((n) => n.t <= hasta)
  return (
    <svg viewBox="0 0 400 120" className="g-mus-contorno" aria-hidden="true">
      <polyline points={notas.map((n) => `${x(n.t + n.d / 2)},${y(n.m)}`).join(' ')} className="g-mus-sombra" />
      {vistas.length > 1 && <polyline points={vistas.map((n) => `${x(n.t + n.d / 2)},${y(n.m)}`).join(' ')} className="g-curva" />}
      {vistas.map((n, i) => (
        <circle key={i} cx={x(n.t + n.d / 2)} cy={y(n.m)} r="5" className="g-mus-punto" />
      ))}
    </svg>
  )
}

/** Primera frase de cada canción en el teclado, con su dibujo. */
const FRASES = {
  himno: { notas: HIMNO.notas.slice(0, 15), pulsos: 16 },
  estrellita: { notas: ESTRELLITA_A.notas.slice(0, 7), pulsos: 8 },
}

function Teclado({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`musica.teclado.${s}`)
  const kc = (s: string) => t(`musica.comun.${s}`)
  const kn = (s: string) => t(`musica.${s}`)
  const r = useReproductor()
  const [cual, setCual] = useState<'himno' | 'estrellita'>('himno')
  const [manual, setManual] = useState<number[]>([])
  const frase = FRASES[cual]
  const tocar = (c: 'himno' | 'estrellita') => {
    setCual(c)
    r.tocar(eventosMelodia(FRASES[c], () => audio().out), FRASES[c].pulsos, () => 96)
  }
  const tecla = (m: number) => {
    const { ac, out } = audio()
    piano(ac, out, ac.currentTime, m, 0.5)
    setManual([m])
    setTimeout(() => setManual([]), 300)
  }
  useDemo<() => void>(demo, [() => tocar('himno'), () => tocar('estrellita'), () => tocar('himno')], 7600, (fn) => fn(), 900)
  useCallarAlSalir(demo, r.parar)
  const suena = r.sonando ? frase.notas.find((n) => r.pulso >= n.t && r.pulso < n.t + n.d) : undefined
  return (
    <div className="g-herramienta g-mus">
      <h4>{k('titulo')}</h4>
      <Contorno notas={frase.notas} hasta={r.sonando ? r.pulso : 999} />
      <TecladoVista encendidas={suena ? [suena.m] : manual} tocar={tecla} k={kn} />
      <div className="g-opciones">
        <label>
          <span>{k('cancion')}</span>
          <Segmentos valores={['himno', 'estrellita'] as ('himno' | 'estrellita')[]} valor={cual} set={tocar} rotulo={(v) => t(`musica.canciones.${v}`)} />
        </label>
      </div>
      <p className="g-idi-veredicto">{cual === 'himno' ? k('pasos') : k('saltos')}</p>
      <p className="g-nota">
        {k('nota')} {kc('suena')}
      </p>
    </div>
  )
}

/** Un acorde: tres notas saltando una sí y una no (do, mi, sol), una a una o juntas. */
function Acorde({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`musica.acorde.${s}`)
  const kn = (s: string) => t(`musica.${s}`)
  const NOTAS = [60, 64, 67]
  const [on, setOn] = useState<number[]>([])
  const [modo, setModo] = useState<'unaPorUna' | 'juntas'>('juntas')
  const sonar = (m: 'unaPorUna' | 'juntas') => {
    setModo(m)
    const { ac, out } = audio()
    NOTAS.forEach((n, i) => {
      const dt = m === 'juntas' ? 0 : i * 0.45
      piano(ac, out, ac.currentTime + dt, n, 1.4, 0.8)
      setTimeout(() => setOn((o) => [...o, n]), dt * 1000)
    })
    setOn([])
    setTimeout(() => setOn([]), 2400)
  }
  useDemo<'unaPorUna' | 'juntas'>(demo, ['unaPorUna', 'juntas', 'unaPorUna', 'juntas'], 2800, sonar, 700)
  return (
    <div className="g-herramienta g-mus">
      <h4>{k('titulo')}</h4>
      <TecladoVista encendidas={on} k={kn} />
      <div className="g-opciones">
        <label>
          <span>{k('como')}</span>
          <Segmentos valores={['unaPorUna', 'juntas'] as ('unaPorUna' | 'juntas')[]} valor={modo} set={sonar} rotulo={(v) => k(v)} />
        </label>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Estrellita en mayor y en menor: solo cambian dos notas. */
function MayorMenor({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`musica.mayorMenor.${s}`)
  const kn = (s: string) => t(`musica.${s}`)
  const r = useReproductor()
  const [menor, setMenor] = useState(false)
  const tocar = (m: boolean) => {
    setMenor(m)
    const c = m ? ESTRELLITA_MENOR : ESTRELLITA_A
    const out = () => audio().out
    r.tocar([...eventosMelodia(c, out), ...eventosAcordes(c, out, () => 60 / 100)], c.pulsos, () => 100)
  }
  useDemo<boolean>(demo, [false, true, false, true], 9800, tocar, 400)
  useCallarAlSalir(demo, r.parar)
  const c = menor ? ESTRELLITA_MENOR : ESTRELLITA_A
  const acorde = r.sonando ? c.acordes.find((a) => r.pulso >= a.t && r.pulso < a.t + a.d) : c.acordes[0]
  return (
    <div className="g-herramienta g-mus">
      <h4>{k('titulo')}</h4>
      <TecladoVista encendidas={(acorde?.notas ?? []).map((m) => m + 12)} k={kn} />
      <div className="g-art-fila">
        <Segmentos valores={['mayor', 'menor']} valor={menor ? 'menor' : 'mayor'} set={(v) => tocar(v === 'menor')} rotulo={(v) => k(v)} />
        <p className="g-idi-veredicto">
          <b className="g-mus-acorde">{acorde ? nombreAcorde(acorde.nombre, kn) : ''}</b> {menor ? k('triste') : k('alegre')}
        </p>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** «do mayor», «fa menor»… en el idioma de la guía. */
function nombreAcorde(n: string, k: (s: string) => string) {
  const raiz = { C: 'do', F: 'fa', G: 'sol', A: 'la' }[n[0]]!
  return `${k(`nota.${raiz}`)} ${n.endsWith('m') ? k('acorde.menor') : k('acorde.mayor')}`
}

/** Progresiones: I–IV–V–I y la de los cuatro acordes (I–V–vi–IV). */
const PROGRESIONES: Record<string, { grados: string[]; acordes: string[] }> = {
  tres: { grados: ['I', 'IV', 'V', 'I'], acordes: ['C', 'F', 'G', 'C'] },
  cuatro: { grados: ['I', 'V', 'vi', 'IV'], acordes: ['C', 'G', 'Am', 'F'] },
}

function Progresion({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`musica.progresion.${s}`)
  const kc = (s: string) => t(`musica.comun.${s}`)
  const kn = (s: string) => t(`musica.${s}`)
  const r = useReproductor()
  const [cual, setCual] = useState<'tres' | 'cuatro'>('tres')
  const BPM = 104
  const tocar = (c: 'tres' | 'cuatro') => {
    setCual(c)
    const p = PROGRESIONES[c]
    const ev: Evento[] = p.acordes.flatMap((a, i) => [
      ...ACORDES[a].map((m) => ({ t: i * 4, sonar: (ac: BaseAudioContext, cu: number) => colchon(ac, audio().out, cu, m + 12, (4 * 60) / BPM - 0.05) })),
      ...[0, 2].map((b) => ({ t: i * 4 + b, sonar: (ac: BaseAudioContext, cu: number) => bajo(ac, audio().out, cu, RAIZ[a], (2 * 60) / BPM - 0.05) })),
      // Un arpegio de piano encima, para que se oiga cada acorde.
      ...ACORDES[a].map((m, j) => ({ t: i * 4 + j, sonar: (ac: BaseAudioContext, cu: number) => piano(ac, audio().out, cu, m + 24, 0.5, 0.6) })),
    ])
    r.tocar(ev, 16, () => BPM, { bucle: true })
  }
  useDemo<() => void>(demo, [() => tocar('tres'), () => tocar('cuatro')], 9300, (fn) => fn(), 600)
  useCallarAlSalir(demo, r.parar)
  const p = PROGRESIONES[cual]
  const ahora = r.sonando ? Math.floor(r.pulso / 4) % 4 : -1
  return (
    <div className="g-herramienta g-mus">
      <h4>{k('titulo')}</h4>
      <ol className="g-mus-progresion">
        {p.grados.map((g, i) => (
          <li key={i} className={i === ahora ? 'activo' : ''}>
            <b>{g}</b>
            <small>{nombreAcorde(p.acordes[i], kn)}</small>
          </li>
        ))}
      </ol>
      <div className="g-opciones">
        <label>
          <span>{k('cual')}</span>
          <Segmentos valores={['tres', 'cuatro'] as ('tres' | 'cuatro')[]} valor={cual} set={tocar} rotulo={(v) => k(v)} />
        </label>
      </div>
      <div className="g-art-fila">
        <BotonTocar sonando={r.sonando} tocar={() => tocar(cual)} parar={r.parar} k={kc} />
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── El mezclador ─────────

type Pista = 'bateria' | 'bajo' | 'acordes' | 'melodia'
const PISTAS: Pista[] = ['bateria', 'bajo', 'acordes', 'melodia']
interface Canal {
  vol: number
  mudo: boolean
  pan: number
  rev: number
}
type Mezcla = Record<Pista, Canal> & { eq: boolean; abrir: boolean }
const canal = (vol: number, mudo = false): Canal => ({ vol, mudo, pan: 0, rev: 0.12 })
const BALANCE: Record<Pista, number> = { bateria: 0.7, bajo: 0.65, acordes: 0.5, melodia: 0.9 }
const mezclaBase = (mudas = false): Mezcla => ({
  bateria: canal(BALANCE.bateria, mudas),
  bajo: canal(BALANCE.bajo, mudas),
  acordes: canal(BALANCE.acordes, mudas),
  melodia: canal(BALANCE.melodia, mudas),
  eq: false,
  abrir: false,
})
/** Zona de frecuencias de cada pista (Hz), para el dibujo del ecualizador. */
const ZONA: Record<Pista, [number, number]> = { bateria: [45, 12000], bajo: [40, 400], acordes: [150, 3000], melodia: [260, 5000] }
/** Con el ecualizador, a cada pista se le quita lo que estorba: [corte de graves, corte de agudos]. */
const EQ: Record<Pista, [number, number]> = { bateria: [30, 18000], bajo: [30, 900], acordes: [220, 5000], melodia: [300, 9000] }

type Modo = { pasos: ((m: Mezcla) => Mezcla)[]; ms: number; inicial: () => Mezcla; vista?: ('eq' | 'paneo')[] }
const con = (m: Mezcla, p: Pista, c: Partial<Canal>): Mezcla => ({ ...m, [p]: { ...m[p], ...c } })
const MODOS_MEZCLA: Record<string, Modo> = {
  // Capa por capa: batería, bajo, acordes y melodía.
  mezclador: {
    inicial: () => mezclaBase(true),
    ms: 3400,
    pasos: PISTAS.map((p) => (m: Mezcla) => con(m, p, { mudo: false })),
  },
  // El bajo se come la melodía y vuelve el equilibrio.
  mezcladorVolumen: {
    inicial: () => mezclaBase(),
    ms: 3200,
    pasos: [(m) => con(con(m, 'bajo', { vol: 1 }), 'melodia', { vol: 0.25 }), (m) => m, (m) => con(con(m, 'bajo', { vol: BALANCE.bajo }), 'melodia', { vol: BALANCE.melodia })],
  },
  mezcladorEq: { inicial: () => mezclaBase(), ms: 3600, vista: ['eq'], pasos: [(m) => ({ ...m, eq: true }), (m) => ({ ...m, eq: false }), (m) => ({ ...m, eq: true })] },
  // Las tres decisiones seguidas: el bajo tapa la melodía y vuelve, el ecualizador y el paneo.
  mezcladorBalance: {
    inicial: () => mezclaBase(),
    ms: 2600,
    vista: ['eq', 'paneo'],
    pasos: [
      (m) => con(con(m, 'bajo', { vol: 1 }), 'melodia', { vol: 0.25 }),
      (m) => con(con(m, 'bajo', { vol: BALANCE.bajo }), 'melodia', { vol: BALANCE.melodia }),
      (m) => ({ ...m, eq: true }),
      (m) => ({ ...con(m, 'acordes', { pan: -0.6 }), abrir: true }),
      (m) => PISTAS.reduce((x, p) => con(x, p, { rev: 0.35 }), m),
    ],
  },
  mezcladorPaneo: {
    inicial: () => mezclaBase(),
    ms: 3400,
    vista: ['paneo'],
    pasos: [(m) => ({ ...con(m, 'acordes', { pan: -0.6 }), abrir: true }), (m) => PISTAS.reduce((x, p) => con(x, p, { rev: 0.45 }), m)],
  },
}

/** Respuesta al impulso de una sala sintética (ruido que se apaga en ~2 s) para la reverberación. */
function sala(ac: BaseAudioContext) {
  const largo = Math.floor(ac.sampleRate * 2.2)
  const b = ac.createBuffer(2, largo, ac.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c)
    for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / largo) ** 3
  }
  return b
}

interface Nodos {
  gan: GainNode
  bajos: BiquadFilterNode
  agudos: BiquadFilterNode
  pan: StereoPannerNode
  rev: GainNode
  medidor: AnalyserNode
}

/** Los nodos de las cuatro pistas (y el platillo, que se abre a un lado), creados una vez por mezclador. */
function crearNodos(ac: BaseAudioContext, out: AudioNode) {
  const conv = ac.createConvolver()
  conv.buffer = sala(ac)
  conv.connect(out)
  const nodos = {} as Record<Pista, Nodos>
  for (const p of PISTAS) {
    const bajos = ac.createBiquadFilter()
    bajos.type = 'highpass'
    bajos.frequency.value = 20
    const agudos = ac.createBiquadFilter()
    agudos.type = 'lowpass'
    agudos.frequency.value = 20000
    const gan = ac.createGain()
    const pan = ac.createStereoPanner()
    const rev = ac.createGain()
    const medidor = ac.createAnalyser()
    medidor.fftSize = 512
    bajos.connect(agudos).connect(gan).connect(pan)
    pan.connect(out)
    pan.connect(medidor)
    pan.connect(rev).connect(conv)
    nodos[p] = { gan, bajos, agudos, pan, rev, medidor }
  }
  const platillo = ac.createStereoPanner()
  platillo.connect(nodos.bateria.bajos)
  return { nodos, platillo }
}

function aplicar(ac: BaseAudioContext, n: Record<Pista, Nodos>, platillo: StereoPannerNode, m: Mezcla) {
  const t = ac.currentTime
  for (const p of PISTAS) {
    const c = m[p]
    n[p].gan.gain.setTargetAtTime(c.mudo ? 0 : c.vol, t, 0.08)
    n[p].pan.pan.setTargetAtTime(c.pan, t, 0.15)
    n[p].rev.gain.setTargetAtTime(c.rev, t, 0.2)
    const [b, a] = m.eq ? EQ[p] : [20, 20000]
    n[p].bajos.frequency.setTargetAtTime(b, t, 0.1)
    n[p].agudos.frequency.setTargetAtTime(a, t, 0.1)
  }
  platillo.pan.setTargetAtTime(m.abrir ? 0.55 : 0, t, 0.15)
}

/** El Himno de la alegría en cuatro pistas, sobre los nodos del mezclador. */
function eventosHimno(n: () => { nodos: Record<Pista, Nodos>; platillo: StereoPannerNode }, bpm: number): Evento[] {
  const p = pistasHimno(n, bpm)
  return PISTAS.flatMap((x) => p[x])
}

/** Los eventos del Himno, pista por pista. */
function pistasHimno(n: () => { nodos: Record<Pista, Nodos>; platillo: StereoPannerNode }, bpm: number): Record<Pista, Evento[]> {
  const seg = 60 / bpm
  const bateria: Evento[] = Array.from({ length: HIMNO.pulsos * 2 }, (_, i) => ({
    t: i / 2,
    sonar: (ac, c) => {
      const x = n()
      tambor(ac, x.nodos.bateria.bajos, c, 'platillo', i % 2 ? 0.7 : 1, x.platillo)
      if (i % 4 === 0) tambor(ac, x.nodos.bateria.bajos, c, 'bombo')
      if (i % 4 === 2) tambor(ac, x.nodos.bateria.bajos, c, 'tarola')
    },
  }))
  const bajoEv: Evento[] = HIMNO.acordes.flatMap((a) =>
    Array.from({ length: a.d / 2 }, (_, j) => ({ t: a.t + j * 2, sonar: (ac: BaseAudioContext, c: number) => bajo(ac, n().nodos.bajo.bajos, c, RAIZ[a.nombre] + (j % 2 ? 7 : 0), 2 * seg - 0.05) })),
  )
  return { bateria, bajo: bajoEv, acordes: eventosAcordes(HIMNO, () => n().nodos.acordes.bajos, () => seg), melodia: eventosMelodia(HIMNO, () => n().nodos.melodia.bajos, piano, 12) }
}

function Mezclador({ t, demo, modo }: { t: T; demo: boolean; modo: Modo }) {
  const k = (s: string) => t(`musica.mezcla.${s}`)
  const kc = (s: string) => t(`musica.comun.${s}`)
  const r = useReproductor()
  const [m, setM] = useState<Mezcla>(() => mezclaBase())
  const red = useRef<ReturnType<typeof crearNodos> | null>(null)
  const nodos = () => {
    const { ac, out } = audio()
    red.current ??= crearNodos(ac, out)
    return red.current
  }
  const BPM = 112
  const tocar = () => r.tocar(eventosHimno(nodos, BPM), HIMNO.pulsos, () => BPM, { bucle: true })
  useEffect(() => {
    if (!red.current) return
    aplicar(audio().ac, red.current.nodos, red.current.platillo, m)
  }, [m])
  // Al tocar por primera vez, los nodos nacen con la mezcla de ese momento.
  useEffect(() => {
    if (r.sonando && red.current) aplicar(audio().ac, red.current.nodos, red.current.platillo, m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.sonando])
  useDemo<(x: Mezcla) => Mezcla>(demo, modo.pasos, modo.ms, (f) => setM((x) => f(x)), modo.ms * 0.6)
  useEffect(() => {
    if (!demo) return
    setM(modo.inicial())
    tocar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo])
  useCallarAlSalir(demo, r.parar)
  const medidores = useMedidores(r.sonando ? red.current : null)
  const set = (p: Pista, c: Partial<Canal>) => setM((x) => con(x, p, c))
  return (
    <div className="g-herramienta g-mus">
      <h4>{k('titulo')}</h4>
      <div className="g-mus-mezcla">
        {PISTAS.map((p) => (
          <div key={p} className={`g-mus-canal g-mus-${p}${m[p].mudo ? ' mudo' : ''}`}>
            <b>{k(p)}</b>
            <div className="g-mus-medidor">
              <i style={{ height: `${Math.min(100, medidores[p] * 100)}%` }} />
            </div>
            <label>
              <span>{k('volumen')}</span>
              <input type="range" min="0" max="1" step="0.01" value={m[p].vol} onChange={(e) => set(p, { vol: Number(e.target.value) })} />
            </label>
            <label>
              <span>{k('paneo')}</span>
              <input type="range" min="-1" max="1" step="0.05" value={m[p].pan} onChange={(e) => set(p, { pan: Number(e.target.value) })} />
            </label>
            <button type="button" className={`g-mus-mute${m[p].mudo ? ' on' : ''}`} onClick={() => set(p, { mudo: !m[p].mudo })}>
              {m[p].mudo ? k('silenciada') : k('suena')}
            </button>
          </div>
        ))}
      </div>
      {modo.vista?.includes('eq') && <Espectro m={m} k={k} />}
      {modo.vista?.includes('paneo') && <Estereo m={m} k={k} />}
      <div className="g-art-fila">
        <BotonTocar sonando={r.sonando} tocar={tocar} parar={r.parar} k={kc} />
        <button type="button" className={`g-boton-suave${m.eq ? ' on' : ''}`} onClick={() => setM((x) => ({ ...x, eq: !x.eq }))}>
          {k('ecualizador')}: {m.eq ? k('si') : k('no')}
        </button>
        <button type="button" className="g-boton-suave" onClick={() => setM(mezclaBase())}>
          {k('equilibrar')}
        </button>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Nivel de cada pista (0-1), leído de sus analizadores mientras suena. */
function useMedidores(red: ReturnType<typeof crearNodos> | null) {
  const [niveles, setNiveles] = useState<Record<Pista, number>>({ bateria: 0, bajo: 0, acordes: 0, melodia: 0 })
  useEffect(() => {
    if (!red) {
      setNiveles({ bateria: 0, bajo: 0, acordes: 0, melodia: 0 })
      return
    }
    const buf = new Float32Array(512)
    let raf = 0
    const leer = () => {
      const n = {} as Record<Pista, number>
      for (const p of PISTAS) {
        red.nodos[p].medidor.getFloatTimeDomainData(buf)
        let pico = 0
        for (const v of buf) pico = Math.max(pico, Math.abs(v))
        n[p] = pico * 1.6
      }
      setNiveles(n)
      raf = requestAnimationFrame(leer)
    }
    raf = requestAnimationFrame(leer)
    return () => cancelAnimationFrame(raf)
  }, [red])
  return niveles
}

/** Dónde vive cada pista en las frecuencias (eje logarítmico de 20 Hz a 20 kHz). */
function Espectro({ m, k }: { m: Mezcla; k: (s: string) => string }) {
  const x = (f: number) => 20 + (Math.log10(f / 20) / 3) * 360
  return (
    <figure className="g-grafica">
      <svg viewBox="0 0 400 150" role="img" aria-label={k('espectro')}>
        {PISTAS.map((p, i) => {
          const [a, b] = m.eq ? [Math.max(ZONA[p][0], EQ[p][0]), Math.min(ZONA[p][1], EQ[p][1])] : ZONA[p]
          return (
            <g key={p} className={`g-mus-${p}`}>
              <rect x={x(a)} y={10 + i * 28} width={x(b) - x(a)} height="20" rx="6" className="g-mus-zona" style={{ transition: 'all 500ms ease' }} />
              <text x={x(a) + 6} y={24 + i * 28} className="g-rotulo g-mus-rotulo-zona">
                {k(p)}
              </text>
            </g>
          )
        })}
        {[20, 100, 1000, 10000, 20000].map((f) => (
          <text key={f} x={x(f)} y="144" textAnchor="middle" className="g-rotulo">
            {f >= 1000 ? `${f / 1000}k` : f}
          </text>
        ))}
        <text x="20" y="132" className="g-rotulo">{k('graves')}</text>
        <text x="380" y="132" textAnchor="end" className="g-rotulo">{k('agudos')}</text>
      </svg>
      <figcaption>{k('espectro')}</figcaption>
    </figure>
  )
}

/** De izquierda a derecha: dónde suena cada pista (y el platillo cuando se abre). */
function Estereo({ m, k }: { m: Mezcla; k: (s: string) => string }) {
  const x = (p: number) => 200 + p * 160
  const puntos: [string, number, string][] = [
    ...PISTAS.map((p) => [k(p), m[p].pan, `g-mus-${p}`] as [string, number, string]),
    [k('platillo'), m.abrir ? 0.55 : 0, 'g-mus-bateria'],
  ]
  return (
    <figure className="g-grafica">
      <svg viewBox="0 0 400 150" role="img" aria-label={k('estereo')}>
        <line x1="40" y1="120" x2="360" y2="120" className="g-eje" />
        <text x="40" y="140" className="g-rotulo">{k('izquierda')}</text>
        <text x="200" y="140" textAnchor="middle" className="g-rotulo">{k('centro')}</text>
        <text x="360" y="140" textAnchor="end" className="g-rotulo">{k('derecha')}</text>
        {puntos.map(([n, p, c], i) => (
          <g key={n} className={c} style={{ transform: `translateX(${x(p) - 200}px)`, transition: 'transform 600ms ease' }}>
            <circle cx="200" cy={18 + i * 21} r={8 + PISTAS.reduce((s, q) => s + m[q].rev, 0) * 3} className="g-mus-zona" opacity="0.35" />
            <circle cx="200" cy={18 + i * 21} r="7" className="g-mus-zona" />
            <text x="212" y={22 + i * 21} className="g-rotulo">
              {n}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>{k('estereo')}</figcaption>
    </figure>
  )
}

// ───────── El DJ ─────────

/** Una canción entera para un plato del DJ: melodía, acordes, bajo y una batería sencilla. */
function eventosPlato(c: Cancion, dest: () => AudioNode, bpm: () => number): Evento[] {
  const bateria: Evento[] = Array.from({ length: c.pulsos * 2 }, (_, i) => ({
    t: i / 2,
    sonar: (ac, cu) => {
      tambor(ac, dest(), cu, 'platillo', i % 2 ? 0.6 : 0.9)
      if (i % 4 === 0) tambor(ac, dest(), cu, 'bombo')
      if (i % 4 === 2) tambor(ac, dest(), cu, 'tarola', 0.8)
    },
  }))
  const bajos: Evento[] = c.acordes.flatMap((a) =>
    Array.from({ length: Math.max(1, a.d / 2) }, (_, j) => ({ t: a.t + j * 2, sonar: (ac: BaseAudioContext, cu: number) => bajo(ac, dest(), cu, RAIZ[a.nombre], (2 * 60) / bpm() - 0.05) })),
  )
  return [...bateria, ...bajos, ...eventosAcordes(c, dest, () => 60 / bpm()), ...eventosMelodia(c, dest, piano, 12)]
}

/** Velocidad del plato A (el Himno); el B (Estrellita) llega más rápido hasta que se sincroniza. */
const BPM_A = 100
const BPM_B = 120

/**
 * Dos platos de DJ: el Himno en el A y Estrellita en el B. SYNC iguala la
 * velocidad del B a la del A y lo hace entrar a su compás; el crossfader pasa
 * de uno al otro y «Sin graves» le quita al A los bajos mientras sale.
 */
function Dj({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`musica.dj.${s}`)
  const kc = (s: string) => t(`musica.comun.${s}`)
  const a = useReproductor()
  const b = useReproductor()
  const [bpmB, setBpmBEstado] = useState(BPM_B)
  const bpmB_ = useRef(BPM_B)
  const setBpmB = (v: number) => {
    bpmB_.current = v
    setBpmBEstado(v)
  }
  const [cruce, setCruce] = useState(0)
  const [sinGraves, setSinGraves] = useState(false)
  type Plato = { f: BiquadFilterNode; g: GainNode }
  const red = useRef<{ a: Plato; b: Plato } | null>(null)
  const estado = useRef({ cruce, sinGraves })
  estado.current = { cruce, sinGraves }
  const aplicarDj = () => {
    const n = red.current
    if (!n) return
    const tt = audio().ac.currentTime
    const x = estado.current.cruce
    n.a.g.gain.setTargetAtTime(Math.cos((x * Math.PI) / 2) * 0.8, tt, 0.4)
    n.b.g.gain.setTargetAtTime(Math.sin((x * Math.PI) / 2) * 0.8, tt, 0.4)
    n.a.f.frequency.setTargetAtTime(estado.current.sinGraves ? 380 : 20, tt, 0.25)
  }
  const nodos = () => {
    if (!red.current) {
      const { ac, out } = audio()
      const plato = (): Plato => {
        const f = ac.createBiquadFilter()
        f.type = 'highpass'
        f.frequency.value = 20
        const g = ac.createGain()
        f.connect(g).connect(out)
        return { f, g }
      }
      red.current = { a: plato(), b: plato() }
      aplicarDj()
    }
    return red.current
  }
  useEffect(aplicarDj, [cruce, sinGraves])
  const pulsoA = useRef(-1)
  pulsoA.current = a.pulso
  const tocarA = () => a.tocar(eventosPlato(HIMNO, () => nodos().a.f, () => BPM_A), HIMNO.pulsos, () => BPM_A, { bucle: true })
  // El B entra en el mismo punto del compás en que va el A (si suena): así los pulsos caen juntos.
  const tocarB = () =>
    b.tocar(eventosPlato(ESTRELLITA, () => nodos().b.f, () => bpmB_.current), ESTRELLITA.pulsos, () => bpmB_.current, {
      bucle: true,
      desde: pulsoA.current >= 0 ? pulsoA.current % 4 : 0,
    })
  const sync = () => {
    setBpmB(BPM_A)
    if (b.sonando) tocarB()
  }
  const parar = () => {
    a.parar()
    b.parar()
  }
  useDemo<() => void>(
    demo,
    [
      () => {
        setCruce(0)
        setSinGraves(false)
        setBpmB(BPM_B)
        tocarA()
      },
      () => {
        tocarB()
        setCruce(0.5)
      },
      sync,
      () => {
        setSinGraves(true)
        setCruce(0.75)
      },
      () => setCruce(1),
    ],
    3000,
    (fn) => fn(),
    500,
  )
  useCallarAlSalir(demo, parar)
  const iguales = bpmB === BPM_A
  const plato = (cual: 'a' | 'b') => {
    const r = cual === 'a' ? a : b
    return (
      <div className={`g-mus-plato${r.sonando ? ' activo' : ''}`}>
        <small>{k(cual === 'a' ? 'platoA' : 'platoB')}</small>
        <b>{t(`musica.canciones.${cual === 'a' ? 'himno' : 'estrellita'}`)}</b>
        <i className="g-mus-disco" style={{ transform: `rotate(${r.sonando ? r.pulso * 90 : 0}deg)` }} />
        <span className={!iguales && cual === 'b' ? 'g-mus-distinto' : ''}>
          {cual === 'a' ? BPM_A : bpmB} {t('musica.pulso.ppm')}
        </span>
        <button type="button" className="g-boton-suave" onClick={() => (r.sonando ? r.parar() : cual === 'a' ? tocarA() : tocarB())}>
          {r.sonando ? `■ ${kc('parar')}` : `▶ ${kc('tocar')}`}
        </button>
      </div>
    )
  }
  return (
    <div className="g-herramienta g-mus">
      <h4>{k('titulo')}</h4>
      <div className="g-mus-platos">
        {plato('a')}
        {plato('b')}
      </div>
      <label className="g-mus-cruce">
        <b>A</b>
        <input type="range" min="0" max="1" step="0.01" value={cruce} onChange={(e) => setCruce(Number(e.target.value))} aria-label={k('crossfader')} />
        <b>B</b>
      </label>
      <div className="g-art-fila">
        <button type="button" className={`g-boton-accion${iguales ? '' : ' g-mus-pide'}`} onClick={sync}>
          SYNC
        </button>
        <button type="button" className={`g-boton-suave${sinGraves ? ' on' : ''}`} onClick={() => setSinGraves((x) => !x)}>
          {k('sinGraves')}
        </button>
        <p className="g-idi-veredicto">{iguales ? <b>{k('juntos')}</b> : k('distintos')}</p>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Minutos al día → horas y canciones al año, según qué tan completa la sacas. */
const HORAS_CANCION: Record<string, number> = { deOido: 2, conAcordes: 6, completas: 15 }

function MinutosAno({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`musica.minutos.${s}`)
  const [minutos, setMinutos] = useState(15)
  const [tipo, setTipo] = useState('conAcordes')
  useDemo<() => void>(demo, [() => setMinutos(5), () => setMinutos(30), () => setTipo('deOido'), () => setTipo('completas'), () => setMinutos(15), () => setTipo('conAcordes')], 1400, (f) => f())
  const horas = (minutos * 365) / 60
  const canciones = Math.floor(horas / HORAS_CANCION[tipo])
  return (
    <div className="g-herramienta g-mus">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('minutos')}</span>
          <Segmentos valores={[5, 10, 15, 30, 60]} valor={minutos} set={setMinutos} />
        </label>
        <label>
          <span>{k('tipo')}</span>
          <Segmentos valores={Object.keys(HORAS_CANCION)} valor={tipo} set={setTipo} rotulo={(v) => k(v)} />
        </label>
      </div>
      <dl className="g-resultados">
        <div>
          <dt>{k('horas')}</dt>
          <dd>
            {num(horas)} <small>h</small>
          </dd>
        </div>
        <div className="g-resultado-fuerte">
          <dt>{k('alAnio')}</dt>
          <dd>{num(canciones)}</dd>
        </div>
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_MUSICA = new Set(['historiaMusica', 'octava', 'compas', 'forma', 'tension', 'rutina'])

export function GraficaMusica({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'historiaMusica') {
    const hace = (n: number) => k('grafica.hace').replace('{n}', num(n))
    const hitos: [string, string][] = [
      [hace(40000), k('grafica.flautaDet')],
      [k('grafica.grecia'), k('grafica.pitagorasDet')],
      ['1025', k('grafica.guidoDet')],
      ['1877', k('grafica.edisonDet')],
      ['1957', k('grafica.lesPaulDet')],
      ['1983', k('grafica.midiDet')],
    ]
    return (
      <figure className="g-grafica">
        <ol className="g-historia" style={{ gridTemplateColumns: `repeat(${hitos.length}, 1fr)` }}>
          {hitos.map(([cuando, que]) => (
            <li key={cuando}>
              <b>{cuando}</b>
              <span>{que}</span>
            </li>
          ))}
        </ol>
        <figcaption>{k('grafica.historia')}</figcaption>
      </figure>
    )
  }
  if (id === 'octava') {
    // Do4 y do5: la misma nota, la de arriba con el doble de vibraciones; entre ellas, doce teclas.
    return (
      <figure className="g-grafica">
        <TecladoVista encendidas={[60, 72]} k={k} />
        <p className="g-mus-octava">
          <b>{nombreNota(60, k)} · 262 Hz</b>
          <span>× 2</span>
          <b>{nombreNota(72, k)} · 523 Hz</b>
        </p>
        <figcaption>{k('grafica.octava')}</figcaption>
      </figure>
    )
  }
  if (id === 'compas') {
    // Dos compases: de cuatro (marcha) y de tres (vals), con el pulso fuerte más grande.
    const fila = (n: number, y: number, rotulo: string) => (
      <g>
        <text x="20" y={y + 5} className="g-rotulo g-fuerte">
          {rotulo}
        </text>
        {Array.from({ length: n * 2 }, (_, i) => (
          <g key={i}>
            {i % n === 0 && <line x1={128 + i * 34 - 17} y1={y - 22} x2={128 + i * 34 - 17} y2={y + 22} className="g-eje" />}
            <circle cx={128 + i * 34} cy={y} r={i % n === 0 ? 13 : 7} className={i % n === 0 ? 'g-mus-fuerte' : 'g-mus-debil'} />
            <text x={128 + i * 34} y={y + 36} textAnchor="middle" className="g-rotulo">
              {(i % n) + 1}
            </text>
          </g>
        ))}
      </g>
    )
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 190" role="img" aria-label={k('grafica.compas')}>
          {fila(4, 46, k('grafica.cuatro'))}
          {fila(3, 136, k('grafica.tres'))}
        </svg>
        <figcaption>{k('grafica.compas')}</figcaption>
      </figure>
    )
  }
  if (id === 'forma') {
    const bloques: [string, string][] = [
      ['A', 'g-z1'],
      ['B', 'g-z3'],
      ['B', 'g-z3'],
      ['A', 'g-z1'],
    ]
    return (
      <figure className="g-grafica">
        <ol className="g-mus-forma">
          {bloques.map(([l, z], i) => (
            <li key={i} className={z}>
              <b>{l}</b>
              <span>{k(l === 'A' ? 'grafica.formaA' : 'grafica.formaB')}</span>
            </li>
          ))}
        </ol>
        <figcaption>{k('grafica.forma')}</figcaption>
      </figure>
    )
  }
  if (id === 'tension') {
    // La tensión sube con el acorde de fa, más con el de sol, y se resuelve en do.
    const puntos: [string, number][] = [
      ['C', 20],
      ['F', 55],
      ['G', 92],
      ['C', 20],
    ]
    const x = (i: number) => 60 + i * 95
    const y = (v: number) => 140 - v
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 180" role="img" aria-label={k('grafica.tension')}>
          <path d={`M${x(0)} ${y(20)} C${x(0.6)} ${y(30)} ${x(0.6)} ${y(55)} ${x(1)} ${y(55)} S${x(1.6)} ${y(92)} ${x(2)} ${y(92)} S${x(2.5)} ${y(20)} ${x(3)} ${y(20)}`} className="g-curva" />
          {puntos.map(([a, v], i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(v)} r="8" className={v > 50 ? 'g-mus-fuerte' : 'g-mus-debil'} />
              <text x={x(i)} y="170" textAnchor="middle" className="g-rotulo g-fuerte">
                {nombreAcorde(a, k)}
              </text>
            </g>
          ))}
          <text x={x(2)} y={y(92) - 16} textAnchor="middle" className="g-rotulo">
            {k('grafica.tensa')}
          </text>
          <text x={x(3)} y={y(20) - 16} textAnchor="middle" className="g-rotulo">
            {k('grafica.casa')}
          </text>
        </svg>
        <figcaption>{k('grafica.tension')}</figcaption>
      </figure>
    )
  }
  if (id === 'rutina') {
    const dias: [string, string][] = [
      ['lunes', 'g-z1'],
      ['martes', 'g-z2'],
      ['miercoles', 'g-z3'],
      ['jueves', 'g-z4'],
      ['viernes', 'g-z5'],
      ['finde', 'g-z1'],
    ]
    return (
      <figure className="g-grafica">
        <ol className="g-fin-cadena">
          {dias.map(([c, z]) => (
            <li key={c} className={z}>
              <b>{k(`grafica.${c}`)}</b>
              <span>{k(`grafica.${c}Det`)}</span>
            </li>
          ))}
        </ol>
        <figcaption>{k('grafica.rutina')}</figcaption>
      </figure>
    )
  }
  return null
}

// ───────── Para el video ─────────

/** Un AudioBuffer a WAV de 16 bits, en base64 (para sacarlo del navegador por CDP). */
function wavBase64(b: AudioBuffer) {
  const n = b.length
  const canales = b.numberOfChannels
  const datos = new DataView(new ArrayBuffer(44 + n * canales * 2))
  const txt = (o: number, t: string) => [...t].forEach((c, i) => datos.setUint8(o + i, c.charCodeAt(0)))
  txt(0, 'RIFF')
  datos.setUint32(4, 36 + n * canales * 2, true)
  txt(8, 'WAVEfmt ')
  datos.setUint32(16, 16, true)
  datos.setUint16(20, 1, true)
  datos.setUint16(22, canales, true)
  datos.setUint32(24, b.sampleRate, true)
  datos.setUint32(28, b.sampleRate * canales * 2, true)
  datos.setUint16(32, canales * 2, true)
  datos.setUint16(34, 16, true)
  txt(36, 'data')
  datos.setUint32(40, n * canales * 2, true)
  const ch = Array.from({ length: canales }, (_, c) => b.getChannelData(c))
  for (let i = 0; i < n; i++) for (let c = 0; c < canales; c++) datos.setInt16(44 + (i * canales + c) * 2, Math.max(-1, Math.min(1, ch[c][i])) * 0x7fff, true)
  const bytes = new Uint8Array(datos.buffer)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/**
 * El Himno en WAV (base64) para las tomas de la casa del video: cada pista entra
 * en el pulso que diga `entradas` (sin entrada, no suena) y el Himno da `vueltas`.
 * Lo pide marketing/guias/musica/sonidos.mjs desde el Chrome del grabador.
 */
export async function renderizarHimno(entradas: Partial<Record<Pista, number>>, vueltas = 2, bpm = 112): Promise<string> {
  const seg = 60 / bpm
  const ac = new OfflineAudioContext(2, Math.ceil((HIMNO.pulsos * vueltas * seg + 2) * 44100), 44100)
  const out = ac.createGain()
  out.gain.value = 0.8
  out.connect(ac.destination)
  const red = crearNodos(ac, out)
  // La mezcla buena: acordes un poco a la izquierda, platillo a la derecha.
  aplicar(ac, red.nodos, red.platillo, { ...mezclaBase(), abrir: true, acordes: { ...canal(BALANCE.acordes), pan: -0.4 } })
  const pistas = pistasHimno(() => red, bpm)
  for (const p of PISTAS) {
    const desde = entradas[p]
    if (desde == null) continue
    for (let v = 0; v < vueltas; v++) for (const e of pistas[p]) {
      const t = v * HIMNO.pulsos + e.t
      if (t >= desde) e.sonar(ac, t * seg + 0.05)
    }
  }
  return wavBase64(await ac.startRendering())
}

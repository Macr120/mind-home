import { useEffect, useRef, useState } from 'react'
import type { T } from './datos'
import { Apoyo } from './Video'

/**
 * Lo propio de la guía de Mindfulness («¿Por qué ir más lento te hará llegar más
 * rápido?»): sus mini-herramientas y sus gráficas, dibujadas aquí (SVG y CSS). Con
 * `demo` (su línea suena en modo grabación) cada herramienta se usa sola al ritmo de
 * la voz. La de «like, suscríbete y comparte» (`gusta`) es la de la guía de Video, sin la
 * barra de «mitad del video» (pedido del usuario: solo «si te está gustando la guía…»).
 */
export const HERRAMIENTAS_MINDFULNESS = new Set(['mente', 'definicion', 'suspiro', 'caja', 'cambio', 'gratitud', 'volver', 'crecer', 'gusta'])

export function HerramientaMindfulness({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`mindfulness.${id}.${s}`)
  if (id === 'mente') return <Mente k={k} demo={demo} />
  if (id === 'definicion') return <Definicion k={k} demo={demo} />
  if (id === 'suspiro') return <Suspiro k={k} demo={demo} />
  if (id === 'caja') return <Caja k={k} demo={demo} />
  if (id === 'cambio') return <Cambio k={k} demo={demo} />
  if (id === 'gratitud') return <Gratitud k={k} demo={demo} />
  if (id === 'volver') return <Volver k={k} demo={demo} />
  if (id === 'crecer') return <Crecer k={k} demo={demo} />
  if (id === 'gusta') {
    // Título y nota propios; los botones, los de la guía de Video. Tiempos de la voz en español.
    const kb = (s: string) => (s === 'titulo' || s === 'nota' ? k(s) : t(`video.apoyo.${s}`))
    return <Apoyo k={kb} demo={demo} tiempos={TIEMPOS_GUSTA} mitad={false} />
  }
  return null
}

type K = (s: string) => string

/** Cuándo se encienden like, suscríbete y comparte (ms) en «Si te está gustando la guía, dale like, suscríbete y comparte». */
const TIEMPOS_GUSTA = [2000, 2600, 3360]

/** En modo demo, aplica los pasos uno tras otro: el primero a `primero` ms y luego cada `ms`. */
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

/** Un reloj en segundos desde que `activo` se enciende (null = apagado). */
function useReloj(activo: boolean) {
  const [s, setS] = useState<number | null>(null)
  useEffect(() => {
    if (!activo) {
      setS(null)
      return
    }
    const t0 = performance.now()
    let id = 0
    const paso = () => {
      setS((performance.now() - t0) / 1000)
      id = requestAnimationFrame(paso)
    }
    paso()
    return () => cancelAnimationFrame(id)
  }, [activo])
  return s
}

const lang = () => document.documentElement.lang || 'es'
const num = (n: number, d = 0) => new Intl.NumberFormat(lang(), { maximumFractionDigits: d }).format(n)
const con = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, c) => String(v[c] ?? ''))

/** Los botones de una opción entre varias. */
function Segmentos<V extends string>({ valores, valor, set, rotulo }: { valores: V[]; valor: V; set: (v: V) => void; rotulo: (v: V) => string }) {
  return (
    <div className="g-segmentos g-segmentos-anchos">
      {valores.map((v) => (
        <button key={v} type="button" className={v === valor ? 'activo' : ''} onClick={() => set(v)}>
          {rotulo(v)}
        </button>
      ))}
    </div>
  )
}

// ───────── Parte 1: la mente que divaga ─────────

/** Killingsworth y Gilbert (2010): la app preguntaba a horas al azar; casi la mitad, «en otra cosa». */
const RESPUESTAS_DEMO: ('aqui' | 'otra')[] = ['aqui', 'otra', 'aqui', 'otra', 'otra', 'aqui', 'aqui', 'otra', 'aqui', 'otra', 'aqui', 'otra', 'aqui', 'otra', 'aqui']

function Mente({ k, demo }: { k: K; demo: boolean }) {
  const [r, setR] = useState<('aqui' | 'otra')[]>(demo ? [] : RESPUESTAS_DEMO.slice(0, 8))
  useDemo(demo, RESPUESTAS_DEMO, 1050, (v) => setR((x) => [...x, v]), 1500)
  const otras = r.filter((x) => x === 'otra').length
  const pct = r.length ? (otras / r.length) * 100 : 0
  return (
    <div className="g-herramienta g-mind">
      <h4>{k('titulo')}</h4>
      <div className="g-mind-ping">
        <span>{k('pregunta')}</span>
        {!demo && (
          <div className="g-mind-botones">
            <button type="button" className="g-boton-suave" onClick={() => setR((x) => [...x, 'aqui'])}>
              {k('aqui')}
            </button>
            <button type="button" className="g-boton-suave" onClick={() => setR((x) => [...x, 'otra'])}>
              {k('otra')}
            </button>
          </div>
        )}
      </div>
      <div className="g-mind-puntos" aria-hidden="true">
        {r.map((x, i) => (
          <i key={i} className={x === 'otra' ? 'otra' : ''} />
        ))}
      </div>
      <div className="g-mind-medidor" aria-hidden="true">
        <b style={{ width: `${pct}%` }} />
      </div>
      <p className="g-sub">{con(k('llevas'), { n: num(r.length), m: num(otras) })}</p>
      {!demo && r.length > 0 && (
        <button type="button" className="g-boton-suave" onClick={() => setR([])}>
          {k('preguntar')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 2: la definición ─────────

function Definicion({ k, demo }: { k: K; demo: boolean }) {
  const [sel, setSel] = useState(demo ? -1 : 0)
  useDemo(demo, [0, 1, 2, 3], 2300, setSel, 10500)
  return (
    <div className="g-herramienta g-mind">
      <h4>{k('titulo')}</h4>
      <div className="g-mind-def">
        {[0, 1, 2, 3].map((i) => (
          <button key={i} type="button" className={i <= sel ? 'on' : ''} onClick={() => setSel(i)}>
            {k(`p${i + 1}`)}
          </button>
        ))}
      </div>
      <p className="g-mind-det">{sel >= 0 ? k(`p${sel + 1}Det`) : ' '}</p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 3: respirar lento ─────────

/** El suspiro cíclico: inhala (2 s), otra cortita (1 s) y exhala largo (5 s), durante un minuto. */
const FASES_SUSPIRO: [string, number, number, number][] = [
  ['inhala', 2, 0.5, 0.85],
  ['otra', 1, 0.85, 1],
  ['exhala', 5, 1, 0.5],
]
const CICLO_SUSPIRO = FASES_SUSPIRO.reduce((a, f) => a + f[1], 0)

function Suspiro({ k, demo }: { k: K; demo: boolean }) {
  const [activo, setActivo] = useState(false)
  useDemo(demo, [true], 0, setActivo, 9000)
  const s = useReloj(activo)
  const fin = s != null && s >= 60
  useEffect(() => {
    if (fin) setActivo(false)
  }, [fin])
  let fase = 'inhala'
  let escala = 0.5
  let ciclos = 0
  if (s != null) {
    ciclos = Math.floor(s / CICLO_SUSPIRO)
    let r = s % CICLO_SUSPIRO
    for (const [f, d, a, b] of FASES_SUSPIRO) {
      if (r <= d) {
        fase = f
        const q = r / d
        escala = a + (b - a) * (0.5 - Math.cos(Math.PI * q) / 2)
        break
      }
      r -= d
    }
  }
  return (
    <div className="g-herramienta g-mind">
      <h4>{k('titulo')}</h4>
      <div className="g-mind-respira">
        <div className={`g-mind-circulo ${fase}`} style={{ transform: `scale(${escala})` }} />
        <span>{s == null ? k(fin ? 'listo' : 'inhala') : k(fase)}</span>
      </div>
      <p className="g-sub">
        {con(k('ciclos'), { n: num(ciclos) })}
        {s != null && ` · ${con(k('quedan'), { n: num(Math.max(0, 60 - s)) })}`}
      </p>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setActivo((v) => !v)}>
          {k(activo ? 'detener' : 'empezar')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** La respiración en caja (4-4-4-4) y la 4-7-8: el círculo crece, se sostiene y se encoge. */
const PATRONES: Record<'caja' | 'c478', [string, number][]> = {
  caja: [
    ['inhala', 4],
    ['sosten', 4],
    ['exhala', 4],
    ['sosten', 4],
  ],
  c478: [
    ['inhala', 4],
    ['sosten', 7],
    ['exhala', 8],
  ],
}

function Caja({ k, demo }: { k: K; demo: boolean }) {
  const [modo, setModo] = useState<'caja' | 'c478'>('caja')
  const [activo, setActivo] = useState(!demo)
  useDemo<'caja' | 'c478'>(demo, ['caja', 'c478'], 9500, (m) => {
    setModo(m)
    setActivo(true)
  }, 1200)
  const s = useReloj(activo)
  const [inicio, setInicio] = useState(0)
  // Al cambiar de patrón, empieza desde la inhalación.
  const reloj = useRef(0)
  reloj.current = s ?? 0
  useEffect(() => setInicio(reloj.current), [modo])
  const fases = PATRONES[modo]
  const total = fases.reduce((a, f) => a + f[1], 0)
  let r = (((s ?? 0) - inicio) % total + total) % total
  let fase = fases[0]
  let escala = 0.5
  let previa = 0.5
  for (const f of fases) {
    if (r <= f[1]) {
      fase = f
      const q = r / f[1]
      escala = f[0] === 'inhala' ? 0.5 + 0.5 * q : f[0] === 'exhala' ? 1 - 0.5 * q : previa
      break
    }
    previa = f[0] === 'inhala' ? 1 : f[0] === 'exhala' ? 0.5 : previa
    r -= f[1]
  }
  return (
    <div className="g-herramienta g-mind">
      <h4>{k('titulo')}</h4>
      <Segmentos valores={['caja', 'c478'] as ('caja' | 'c478')[]} valor={modo} set={setModo} rotulo={(v) => k(v)} />
      <div className="g-mind-respira">
        <div className={`g-mind-circulo ${fase[0]}${modo === 'caja' ? ' cuadro' : ''}`} style={{ transform: `scale(${escala})` }} />
        <span>
          {k(fase[0])} · {con(k('seg'), { n: num(Math.ceil(fase[1] - r)) })}
        </span>
      </div>
      <ol className="g-mind-fases">
        {fases.map(([f, d], i) => (
          <li key={i} className={f === fase[0] && d === fase[1] ? 'on' : ''}>
            {k(f)} <b>{num(d)}</b>
          </li>
        ))}
      </ol>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 4: una a la vez ─────────

/** Tres tareas de 3 unidades: seguidas o saltando cada unidad (cada salto suma 0,4 de «volver a cargar»). */
const SALTO = 0.4
const SEGUIDAS = [0, 0, 0, 1, 1, 1, 2, 2, 2].map((t) => ({ t, d: 1 }))
const SALTANDO = [0, 1, 2, 0, 1, 2, 0, 1, 2].flatMap((t, i) => (i ? [{ t: -1, d: SALTO }, { t, d: 1 }] : [{ t, d: 1 }]))
const LARGO = SALTANDO.reduce((a, x) => a + x.d, 0)

function Fila({ rotulo, piezas, hasta, k }: { rotulo: string; piezas: { t: number; d: number }[]; hasta: number; k: K }) {
  let x = 0
  const total = piezas.reduce((a, p) => a + p.d, 0)
  return (
    <div className="g-mind-fila">
      <span>{rotulo}</span>
      <div>
        {piezas.map((p, i) => {
          const desde = x
          x += p.d
          const visto = Math.max(0, Math.min(1, (hasta - desde) / p.d))
          return <i key={i} className={p.t < 0 ? 'salto' : `t${p.t}`} style={{ left: `${(desde / LARGO) * 100}%`, width: `${((p.d * visto) / LARGO) * 100}%` }} />
        })}
      </div>
      <em>{hasta >= total ? k('termina') : ''}</em>
    </div>
  )
}

function Cambio({ k, demo }: { k: K; demo: boolean }) {
  const [activo, setActivo] = useState(false)
  useDemo(demo, [true], 0, setActivo, 1500)
  const s = useReloj(activo)
  // 9 s de animación; fuera de la demo, ya terminada (y se puede repetir).
  const hasta = s == null ? (demo ? 0 : LARGO) : Math.min(LARGO, (s / 9) * LARGO)
  return (
    <div className="g-herramienta g-mind">
      <h4>{k('titulo')}</h4>
      <Fila rotulo={k('unaVez')} piezas={SEGUIDAS} hasta={hasta} k={k} />
      <Fila rotulo={k('saltando')} piezas={SALTANDO} hasta={hasta} k={k} />
      <p className="g-sub">
        <i className="g-mind-salto" aria-hidden="true" /> {k('cambios')}
      </p>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setActivo((v) => !v)}>
          ↻
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 5: agradecer ─────────

function Gratitud({ k, demo }: { k: K; demo: boolean }) {
  const ejemplos = [k('ej1'), k('ej2'), k('ej3')]
  const [textos, setTextos] = useState<string[]>(demo ? ['', '', ''] : ejemplos)
  const [guardado, setGuardado] = useState(false)
  // La demo escribe los tres, letra por letra, y guarda.
  const letras = ejemplos.flatMap((e, i) => Array.from({ length: e.length }, (_, j) => [i, j + 1] as [number, number]))
  useDemo<[number, number] | 'fin'>(demo, [...letras, 'fin'], 45, (v) => {
    if (v === 'fin') return setGuardado(true)
    const [i, n] = v
    setTextos((x) => x.map((s, j) => (j === i ? ejemplos[i].slice(0, n) : s)))
  }, 9000)
  return (
    <div className="g-herramienta g-mind">
      <h4>{k('titulo')}</h4>
      <div className="g-mind-gratitud">
        {textos.map((s, i) => (
          <input
            key={i}
            value={s}
            placeholder={k('placeholder')}
            onChange={(e) => {
              setGuardado(false)
              setTextos((x) => x.map((v, j) => (j === i ? e.target.value : v)))
            }}
          />
        ))}
      </div>
      <button type="button" className={guardado ? 'g-boton-suave g-ok' : 'g-boton-suave'} onClick={() => setGuardado(true)}>
        {k(guardado ? 'guardado' : 'guardar')}
      </button>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 6: notar y volver ─────────

function Volver({ k, demo }: { k: K; demo: boolean }) {
  const [burbuja, setBurbuja] = useState<number | null>(null)
  const [reps, setReps] = useState(0)
  // La demo: aparece una distracción, a los 1,4 s se nota y se vuelve (una repetición más).
  useDemo<number>(demo, [0, -1, 1, -1, 2, -1, 3, -1, 0, -1], 1300, (v) => {
    if (v >= 0) setBurbuja(v)
    else {
      setBurbuja(null)
      setReps((r) => r + 1)
    }
  }, 2500)
  // Fuera de la demo, una distracción nueva cada tanto.
  useEffect(() => {
    if (demo) return
    const id = window.setInterval(() => setBurbuja((b) => (b == null ? Math.floor(Math.random() * 4) : b)), 3200)
    return () => clearInterval(id)
  }, [demo])
  return (
    <div className="g-herramienta g-mind">
      <h4>{k('titulo')}</h4>
      <div className="g-mind-ancla">
        <svg viewBox="0 0 300 60" aria-hidden="true">
          <path d="M0 30 C 25 5, 50 5, 75 30 S 125 55, 150 30 S 200 5, 225 30 S 275 55, 300 30" className="g-mind-ola" />
        </svg>
        <span>{k('ancla')}</span>
        {burbuja != null && <b className="g-mind-burbuja">{k(`d${burbuja + 1}`)}</b>}
      </div>
      <p className="g-sub">{con(k('reps'), { n: num(reps) })}</p>
      {!demo && (
        <button
          type="button"
          className="g-boton-suave"
          disabled={burbuja == null}
          onClick={() => {
            setBurbuja(null)
            setReps((r) => r + 1)
          }}
        >
          {k('volverBtn')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 7: los minutos se suman ─────────

/** Etapas de la calma por minutos al año (como la «calma acumulada» del Jardín: semilla → bosque). */
const ETAPAS: [string, number][] = [
  ['semilla', 0],
  ['brote', 900],
  ['arbol', 2500],
  ['bosque', 4000],
]

function Crecer({ k, demo }: { k: K; demo: boolean }) {
  const [m, setM] = useState(3)
  useDemo<number>(demo, [3, 5, 8, 10, 13], 2400, setM, 1500)
  const mes = m * 30
  const anio = m * 365
  const etapa = [...ETAPAS].reverse().find(([, d]) => anio >= d)![0]
  const n = ETAPAS.findIndex(([e]) => e === etapa)
  const tiempo = (min: number) => (min >= 60 ? con(k('horas'), { h: num(Math.floor(min / 60)), m: num(min % 60) }) : con(k('min'), { m: num(min) }))
  return (
    <div className="g-herramienta g-mind">
      <h4>{k('titulo')}</h4>
      <label className="g-mind-rango">
        <span>
          {k('minDia')}: <b>{num(m)}</b>
        </span>
        <input type="range" min={1} max={20} value={m} onChange={(e) => setM(Number(e.target.value))} />
      </label>
      <div className="g-mind-sumas">
        <div>
          <span>{k('mes')}</span>
          <b>{tiempo(mes)}</b>
        </div>
        <div>
          <span>{k('anio')}</span>
          <b>{tiempo(anio)}</b>
        </div>
      </div>
      <svg viewBox="0 0 300 90" className="g-mind-planta" aria-hidden="true">
        <line x1="10" y1="80" x2="290" y2="80" className="g-eje" />
        {ETAPAS.map(([e], i) => {
          const x = 45 + i * 70
          const alto = 10 + i * 16
          return (
            <g key={e} className={i <= n ? 'on' : ''}>
              <line x1={x} y1="80" x2={x} y2={80 - alto} />
              <circle cx={x} cy={80 - alto} r={4 + i * 4} />
            </g>
          )
        })}
      </svg>
      <ol className="g-mind-etapas">
        {ETAPAS.map(([e], i) => (
          <li key={e} className={i === n ? 'on' : ''}>
            {k(e)}
          </li>
        ))}
      </ol>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_MINDFULNESS = new Set(['pulso', 'practica', 'goyal', 'planContinuar'])

export function GraficaMindfulness({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'pulso') {
    // El vaivén del pulso con la respiración: pequeño con respiración rápida, grande con la lenta (ilustrativo).
    const x = (s: number) => 40 + (s / 20) * 350
    const onda = (y0: number, amp: number, periodo: number) =>
      Array.from({ length: 201 }, (_, i) => {
        const s = i / 10
        return `${i ? 'L' : 'M'}${x(s).toFixed(1)} ${(y0 - amp * Math.sin((2 * Math.PI * s) / periodo)).toFixed(1)}`
      }).join(' ')
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 200" role="img" aria-label={k('grafica.pulso')}>
          <text x="40" y="22" className="g-rotulo">
            {k('grafica.rapida')}
          </text>
          <path d={onda(50, 6, 3)} className="g-curva g-mind-tenue" />
          <text x="40" y="102" className="g-rotulo g-fuerte">
            {k('grafica.lenta')}
          </text>
          <path d={onda(145, 30, 10)} className="g-curva" />
          <text x={x(2.5)} y="108" textAnchor="middle" className="g-rotulo">
            ↑ {k('grafica.inhala')}
          </text>
          <text x={x(7.5)} y="192" textAnchor="middle" className="g-rotulo">
            ↓ {k('grafica.exhala')}
          </text>
          <text x="12" y="120" transform="rotate(-90 12 120)" textAnchor="middle" className="g-rotulo">
            {k('grafica.latidos')}
          </text>
        </svg>
        <figcaption>{k('grafica.pulso')}</figcaption>
      </figure>
    )
  }
  if (id === 'practica') {
    // Jha y colegas (2010): mucha práctica, la memoria se sostiene; poca, cae (ilustrativo, sin cifras).
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 190" role="img" aria-label={k('grafica.practica')}>
          <line x1="40" y1="150" x2="380" y2="150" className="g-eje" />
          <line x1="40" y1="20" x2="40" y2="150" className="g-eje" />
          <path d="M60 70 C 160 66, 260 62, 360 58" className="g-curva" />
          <path d="M60 70 C 160 82, 260 104, 360 118" className="g-curva g-mind-tenue" />
          <text x="356" y="50" textAnchor="end" className="g-rotulo g-fuerte">
            {k('grafica.mucha')}
          </text>
          <text x="356" y="136" textAnchor="end" className="g-rotulo">
            {k('grafica.poca')}
          </text>
          <text x="60" y="170" className="g-rotulo">
            {k('grafica.inicio')}
          </text>
          <text x="360" y="170" textAnchor="end" className="g-rotulo">
            {k('grafica.fin')}
          </text>
          <text x="22" y="85" transform="rotate(-90 22 85)" textAnchor="middle" className="g-rotulo">
            {k('grafica.memoria')}
          </text>
        </svg>
        <figcaption>{k('grafica.practica')}</figcaption>
      </figure>
    )
  }
  if (id === 'goyal') {
    // Goyal y colegas (2014), a las 8 semanas: ansiedad 0,38, depresión 0,30, dolor 0,33 (d de Cohen).
    const filas: [string, number][] = [
      ['ansiedad', 0.38],
      ['depresion', 0.3],
      ['dolor', 0.33],
    ]
    const x = (d: number) => 110 + (d / 0.9) * 270
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 170" role="img" aria-label={k('grafica.goyal')}>
          <rect x={x(0.2)} y="10" width={x(0.5) - x(0.2)} height="110" className="g-mind-banda" />
          {filas.map(([c, d], i) => (
            <g key={c}>
              <text x="100" y={36 + i * 36} textAnchor="end" className="g-rotulo">
                {k(`grafica.${c}`)}
              </text>
              <rect x="110" y={22 + i * 36} width={x(d) - 110} height="20" rx="4" className="g-mind-barra" />
              <text x={x(d) + 6} y={37 + i * 36} className="g-rotulo g-fuerte">
                {new Intl.NumberFormat(lang(), { minimumFractionDigits: 2 }).format(d)}
              </text>
            </g>
          ))}
          <line x1="110" y1="128" x2="380" y2="128" className="g-eje" />
          {(
            [
              ['pequeno', 0.2],
              ['moderadoEje', 0.5],
              ['grande', 0.8],
            ] as [string, number][]
          ).map(([c, d]) => (
            <text key={c} x={x(d)} y="148" textAnchor="middle" className="g-rotulo">
              {k(`grafica.${c}`)}
            </text>
          ))}
        </svg>
        <figcaption>{k('grafica.goyal')}</figcaption>
      </figure>
    )
  }
  if (id === 'planContinuar') {
    const etapas: [string, string][] = [
      ['semana1', 'g-z1'],
      ['mes1', 'g-z2'],
      ['fallas', 'g-z4'],
      ['medir', 'g-z3'],
    ]
    return (
      <figure className="g-grafica">
        <ol className="g-fin-cadena">
          {etapas.map(([c, z]) => (
            <li key={c} className={z}>
              <b>{k(`grafica.${c}`)}</b>
              <span>{k(`grafica.${c}Det`)}</span>
            </li>
          ))}
        </ol>
        <figcaption>{k('grafica.plan')}</figcaption>
      </figure>
    )
  }
  return null
}

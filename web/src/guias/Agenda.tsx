import { useEffect, useState } from 'react'
import type { T } from './datos'
import { Apoyo } from './Video'

/**
 * Lo propio de la guía de Agenda («¿Cómo organizar tu tiempo?»): sus mini-herramientas
 * y sus gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su línea suena en modo
 * grabación) cada herramienta se usa sola al ritmo de la voz. La de «like, suscríbete
 * y comparte» es la de la guía de Video, sin la barra de la mitad (`apoyoAgenda`).
 */
export const HERRAMIENTAS_AGENDA = new Set(['estimar', 'bandeja', 'matriz', 'saltos', 'kanban', 'plazos', 'bloques', 'pomodoro', 'colchon', 'apoyoAgenda'])

export function HerramientaAgenda({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`agenda.${id}.${s}`)
  if (id === 'estimar') return <Estimar k={k} demo={demo} />
  if (id === 'bandeja') return <Bandeja k={k} demo={demo} />
  if (id === 'matriz') return <Matriz k={k} demo={demo} />
  if (id === 'saltos') return <Saltos k={k} demo={demo} />
  if (id === 'kanban') return <Kanban k={k} demo={demo} />
  if (id === 'plazos') return <Plazos k={k} demo={demo} />
  if (id === 'bloques') return <Bloques k={k} demo={demo} />
  if (id === 'pomodoro') return <Pomodoro k={k} demo={demo} />
  if (id === 'colchon') return <Colchon k={k} demo={demo} />
  if (id === 'apoyoAgenda') {
    // Título y nota propios, sin la barra de «mitad del video» (pedido del usuario); los botones, los de la guía de Video.
    const kb = (s: string) => (s === 'titulo' || s === 'nota' ? k(s) : t(`video.apoyo.${s}`))
    return <Apoyo k={kb} demo={demo} tiempos={[1700, 2200, 4100]} mitad={false} />
  }
  return null
}

type K = (s: string) => string

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

const lang = () => document.documentElement.lang || 'es'
const num = (n: number, d = 0) => new Intl.NumberFormat(lang(), { maximumFractionDigits: d }).format(n)

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

// ───────── Parte 1: la falacia de la planeación ─────────

/** Buehler (1994): la tesis estimada en ~34 días (49 en el peor caso) tardó ~55. */
function Estimar({ k, demo }: { k: K; demo: boolean }) {
  const [visto, setVisto] = useState(!demo)
  useDemo<boolean>(demo, [true], 0, setVisto, 7000)
  const filas = [
    { id: 'estimado', dias: 34 },
    { id: 'peor', dias: 49 },
    { id: 'real', dias: 55, fuerte: true },
  ]
  return (
    <div className="g-herramienta g-age">
      <h4>{k('titulo')}</h4>
      <div className="g-met-barras">
        {filas.map((f) => {
          const oculta = f.id === 'real' && !visto
          return (
            <div key={f.id} className={f.fuerte ? 'fuerte' : ''}>
              <span>{k(f.id)}</span>
              <i>
                <b style={{ width: oculta ? '0%' : `${(f.dias / 60) * 100}%` }} />
              </i>
              <em>{oculta ? '…' : `${num(f.dias)} ${k('dias')}`}</em>
            </div>
          )
        })}
      </div>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setVisto((v) => !v)}>
          {k(visto ? 'ocultar' : 'ver')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 2: sacar todo de la cabeza ─────────

const IDEAS = ['idea1', 'idea2', 'idea3', 'idea4', 'idea5']

/** Los pendientes que dan vueltas en la cabeza pasan, uno a uno, a la bandeja. */
function Bandeja({ k, demo }: { k: K; demo: boolean }) {
  const [n, setN] = useState(0)
  useDemo<number>(demo, [1, 2, 3, 4, 5], 1500, setN, 5500)
  return (
    <div className="g-herramienta g-age">
      <h4>{k('titulo')}</h4>
      <div className="g-age-bandeja">
        <div className="g-age-cabeza">
          <b>{k('cabeza')}</b>
          {IDEAS.slice(n).map((i, j) => (
            <span key={i} className="g-age-burbuja" style={{ ['--j' as string]: j }}>
              {k(i)}
            </span>
          ))}
          {n === IDEAS.length && <em>{k('calma')}</em>}
        </div>
        <ul className="g-age-lista">
          <b>{k('lista')}</b>
          {IDEAS.slice(0, n).map((i) => (
            <li key={i}>{k(i)}</li>
          ))}
        </ul>
      </div>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setN((v) => (v >= IDEAS.length ? 0 : v + 1))}>
          {k(n >= IDEAS.length ? 'reiniciar' : 'apuntar')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 3: la matriz de Eisenhower ─────────

const CUADROS = ['hazlo', 'agendalo', 'pasalo', 'sueltalo'] as const
/** Cada tarea y su cuadro: 0 urgente e importante · 1 importante · 2 urgente · 3 ninguno. */
const TAREAS: [string, number][] = [
  ['t1', 0],
  ['t2', 1],
  ['t3', 2],
  ['t4', 3],
  ['t5', 1],
  ['t6', 2],
]

function Matriz({ k, demo }: { k: K; demo: boolean }) {
  const [n, setN] = useState(0)
  useDemo<number>(demo, [1, 2, 3, 4, 5, 6], 1900, setN, 2500)
  const sig = TAREAS[n]
  return (
    <div className="g-herramienta g-age">
      <h4>{k('titulo')}</h4>
      <p className="g-age-siguiente">{sig ? k(sig[0]) : k('listo')}</p>
      <div className="g-age-matriz">
        <span className="g-age-eje-x">{k('urgente')}</span>
        <span className="g-age-eje-x">{k('noUrgente')}</span>
        {[0, 1, 2, 3].map((c) => (
          <button
            key={c}
            type="button"
            className={`g-age-cuadro g-age-c${c}`}
            onClick={() => sig && sig[1] === c && setN(n + 1)}
          >
            <b>{k(CUADROS[c])}</b>
            {TAREAS.slice(0, n)
              .filter(([, q]) => q === c)
              .map(([id]) => (
                <span key={id}>{k(id)}</span>
              ))}
          </button>
        ))}
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 4: el costo de cambiar de tarea ─────────

/** Tres tareas de 20 minutos: en bloques o saltando entre ellas (cada salto cuesta minutos). */
function Saltos({ k, demo }: { k: K; demo: boolean }) {
  // Lo mínimo son dos cambios (de A a B y de B a C): las tres en bloques.
  const [saltos, setSaltos] = useState(2)
  useDemo<number>(demo, [6, 12, 18], 2600, setSaltos, 6500)
  const COSTO = 2
  const total = 60 + (saltos - 2) * COSTO
  const tramos = saltos + 1
  const colores = ['g-age-a', 'g-age-b', 'g-age-c']
  return (
    <div className="g-herramienta g-age">
      <h4>{k('titulo')}</h4>
      <div className="g-age-linea" aria-hidden="true">
        {Array.from({ length: tramos }, (_, i) => (
          <span key={i} style={{ flex: 60 / tramos }}>
            <i className={colores[i % 3]} />
            {i < tramos - 1 && <em style={{ flexBasis: `${(COSTO / total) * 100}%` }} />}
          </span>
        ))}
      </div>
      <div className="g-opciones">
        <label>
          <span>{k('saltos')}</span>
          <Segmentos valores={[2, 6, 12, 18]} valor={saltos} set={setSaltos} />
        </label>
      </div>
      <dl className="g-resultados">
        <div className="g-resultado-fuerte">
          <dt>{k('total')}</dt>
          <dd>
            {num(total)} <small>min</small>
          </dd>
        </div>
        <div>
          <dt>{k('perdidos')}</dt>
          <dd>
            {num((saltos - 2) * COSTO)} <small>min</small>
          </dd>
        </div>
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 4: el tablero kanban ─────────

const COLUMNAS = ['porHacer', 'enCurso', 'hecho'] as const
/** Las tarjetas y su columna en cada paso de la demo (nunca más de dos en curso). */
const PASOS_KANBAN: number[][] = [
  [0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 1, 0, 0, 0],
  [2, 1, 0, 0, 0],
  [2, 1, 1, 0, 0],
  [2, 2, 1, 0, 0],
  [2, 2, 2, 1, 0],
]

function Kanban({ k, demo }: { k: K; demo: boolean }) {
  const [p, setP] = useState(0)
  useDemo<number>(demo, [1, 2, 3, 4, 5, 6], 1700, setP, 3500)
  const cols = PASOS_KANBAN[p]
  const enCurso = cols.filter((c) => c === 1).length
  const mover = (i: number) => {
    const c = cols[i]
    if (c === 2 || (c === 0 && enCurso >= 2)) return
    // Fuera del demo, una tarjeta avanza al tocarla (respetando el límite de dos en curso).
    const sig = cols.map((v, j) => (j === i ? v + 1 : v))
    const idx = PASOS_KANBAN.findIndex((x) => x.join() === sig.join())
    if (idx >= 0) setP(idx)
  }
  return (
    <div className="g-herramienta g-age">
      <h4>{k('titulo')}</h4>
      <div className="g-age-kanban">
        {COLUMNAS.map((col, c) => (
          <div key={col} className={c === 1 && enCurso >= 2 ? 'lleno' : ''}>
            <b>
              {k(col)}
              {c === 1 && <small> {enCurso}/2</small>}
            </b>
            {cols.map((v, i) =>
              v === c ? (
                <button key={i} type="button" onClick={() => mover(i)}>
                  {k(`k${i + 1}`)}
                </button>
              ) : null,
            )}
          </div>
        ))}
      </div>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setP(0)}>
          {k('reiniciar')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 5: fechas repartidas ─────────

/**
 * Ariely y Wertenbroch (2002): tres trabajos con una sola fecha al final o con una fecha
 * para cada uno. Las barras son las horas de trabajo de cada semana (ilustrativas): con
 * todo al final, se amontona en las últimas.
 */
const CARGA: Record<'final' | 'repartidas', number[]> = {
  final: [0, 0, 0, 0.5, 0, 0.5, 1, 2, 4, 8],
  repartidas: [1, 1.5, 2, 1, 1.5, 2, 1, 1.5, 2, 1],
}
const ENTREGAS: Record<'final' | 'repartidas', number[]> = { final: [9], repartidas: [2, 5, 9] }

function Plazos({ k, demo }: { k: K; demo: boolean }) {
  const [modo, setModo] = useState<'final' | 'repartidas'>(demo ? 'final' : 'repartidas')
  useDemo<'final' | 'repartidas'>(demo, ['final', 'repartidas'], 9500, setModo, 200)
  return (
    <div className="g-herramienta g-age">
      <h4>{k('titulo')}</h4>
      <div className="g-segmentos">
        {(['final', 'repartidas'] as const).map((m) => (
          <button key={m} type="button" className={m === modo ? 'activo' : ''} onClick={() => setModo(m)}>
            {k(m)}
          </button>
        ))}
      </div>
      <div className="g-age-plazos">
        {CARGA[modo].map((h, i) => (
          <div key={i} className={ENTREGAS[modo].includes(i) ? 'entrega' : ''}>
            <b style={{ height: `${(h / 8) * 100}%` }} className={h >= 4 ? 'mucho' : ''} />
            <small>{i + 1}</small>
          </div>
        ))}
      </div>
      <p className="g-sub">{k('semanas')} · <span className="g-age-entrega-ej" /> {k('entrega')}</p>
      <p className={`g-nota${modo === 'final' ? ' g-mal' : ' g-ok'}`}>{k(modo === 'final' ? 'notaFinal' : 'notaRepartidas')}</p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 5: bloques de tiempo ─────────

const DIAS = ['l', 'm', 'x', 'j', 'v'] as const
/** Los bloques de la semana: día, hora de inicio (8–18), duración en horas y tipo. */
const BLOQUES: [number, number, number, string][] = [
  [0, 9, 2, 'foco'],
  [1, 9, 2, 'foco'],
  [2, 9, 2, 'foco'],
  [3, 9, 2, 'foco'],
  [4, 9, 2, 'foco'],
  [0, 12, 1, 'correo'],
  [2, 12, 1, 'correo'],
  [4, 12, 1, 'correo'],
  [1, 16, 1, 'ejercicio'],
  [3, 16, 1, 'ejercicio'],
  [4, 15, 1, 'revision'],
]

function Bloques({ k, demo }: { k: K; demo: boolean }) {
  const [n, setN] = useState(demo ? 0 : BLOQUES.length)
  useDemo<number>(demo, BLOQUES.map((_, i) => i + 1), 650, setN, 4500)
  const y = (h: number) => ((h - 8) / 10) * 100
  return (
    <div className="g-herramienta g-age">
      <h4>{k('titulo')}</h4>
      <div className="g-age-semana">
        {DIAS.map((d, i) => (
          <div key={d}>
            <b>{k(d)}</b>
            <div className="g-age-dia">
              {BLOQUES.slice(0, n)
                .filter(([dia]) => dia === i)
                .map(([, h, dur, tipo]) => (
                  <span key={h} className={`g-age-bloque g-age-${tipo}`} style={{ top: `${y(h)}%`, height: `${dur * 10}%` }}>
                    {k(tipo)}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setN((v) => (v >= BLOQUES.length ? 0 : BLOQUES.length))}>
          {k(n >= BLOQUES.length ? 'vaciar' : 'llenar')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 6: Pomodoro ─────────

/** Cuatro rondas de 25 + 5 y la pausa larga, recorridas (en la demo, a toda prisa). */
function Pomodoro({ k, demo }: { k: K; demo: boolean }) {
  const RONDAS = [25, 5, 25, 5, 25, 5, 25, 20]
  const [paso, setPaso] = useState(demo ? 0 : -1)
  useDemo<number>(demo, [1, 2, 3, 4, 5, 6, 7, 8], 1600, setPaso, 5000)
  const total = RONDAS.reduce((a, b) => a + b, 0)
  return (
    <div className="g-herramienta g-age">
      <h4>{k('titulo')}</h4>
      <div className="g-age-pomodoro">
        {RONDAS.map((m, i) => (
          <span
            key={i}
            className={`${i % 2 ? (i === 7 ? 'larga' : 'pausa') : 'foco'}${i < paso ? ' hecho' : i === paso ? ' ahora' : ''}`}
            style={{ flex: m / total }}
          >
            {m}
          </span>
        ))}
      </div>
      <p className="g-age-leyenda">
        <span className="foco">{k('foco')}</span>
        <span className="pausa">{k('pausa')}</span>
        <span className="larga">{k('larga')}</span>
      </p>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setPaso((v) => (v >= RONDAS.length ? -1 : v + 1))}>
          {k(paso >= RONDAS.length ? 'reiniciar' : 'avanzar')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 7: el colchón ─────────

/** Un día de 9 a 18 con cuatro tareas; llega un imprevisto de una hora: con colchón cabe, sin él se desborda. */
function Colchon({ k, demo }: { k: K; demo: boolean }) {
  const [con, setCon] = useState(false)
  const [imprevisto, setImprevisto] = useState(false)
  useDemo<[boolean, boolean]>(
    demo,
    [
      [false, true],
      [true, false],
      [true, true],
    ],
    3200,
    ([c, i]) => {
      setCon(c)
      setImprevisto(i)
    },
    5000,
  )
  // Sin colchón, el día (9 h) va lleno de tareas y el imprevisto se sale; con colchón, cada tarea lleva
  // media vez más de margen (×1,5) y el imprevisto se come parte de ese margen.
  const tareas = con ? [1.5, 2, 1, 1.5] : [2, 2.5, 2, 2.5]
  return (
    <div className="g-herramienta g-age">
      <h4>{k('titulo')}</h4>
      <div className="g-age-jornada">
        {tareas.map((h, i) => (
          <span key={i} style={{ display: 'contents' }}>
            <span className="tarea" style={{ flex: h }}>
              {k(`tarea${i + 1}`)}
            </span>
            {con && <span className={imprevisto && i === 1 ? 'imprevisto' : 'margen'} style={{ flex: h / 2 }} />}
          </span>
        ))}
        {imprevisto && !con && <span className="imprevisto fuera" style={{ flex: 1 }} />}
      </div>
      <div className="g-opciones">
        <label>
          <span>{k('colchon')}</span>
          <Segmentos valores={['no', 'si']} valor={con ? 'si' : 'no'} set={(v) => setCon(v === 'si')} rotulo={(v) => k(v)} />
        </label>
        <label>
          <span>{k('imprevisto')}</span>
          <Segmentos valores={['no', 'si']} valor={imprevisto ? 'si' : 'no'} set={(v) => setImprevisto(v === 'si')} rotulo={(v) => k(v)} />
        </label>
      </div>
      <p className={con || !imprevisto ? 'g-nota g-ok' : 'g-nota g-mal'}>{k(!imprevisto ? 'tranquilo' : con ? 'cabe' : 'desborda')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_AGENDA = new Set(['pausas', 'planContinuar'])

export function GraficaAgenda({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'pausas') {
    // Albulescu (2022): las micropausas suben la energía y bajan el cansancio (ilustrativo, sin cifras).
    const x = (h: number) => 30 + (h / 4) * 350
    const sin = Array.from({ length: 41 }, (_, i) => i / 10).map((h) => [x(h), 30 + h * 22] as const)
    const con = Array.from({ length: 41 }, (_, i) => i / 10).map((h) => [x(h), 30 + (h % 1) * 22 + h * 5] as const)
    const camino = (ps: readonly (readonly [number, number])[]) => ps.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)} ${b.toFixed(1)}`).join(' ')
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 170" role="img" aria-label={k('grafica.pausas')}>
          <line x1="30" y1="140" x2="385" y2="140" className="g-eje" />
          <path d={camino(sin)} className="g-curva g-age-sin" />
          <path d={camino(con)} className="g-curva" />
          <text x="385" y={30 + 4 * 22 - 6} textAnchor="end" className="g-rotulo">
            {k('grafica.sinPausas')}
          </text>
          <text x="385" y={30 + 4 * 5 - 8} textAnchor="end" className="g-rotulo g-fuerte">
            {k('grafica.conPausas')}
          </text>
          <text x="30" y="20" className="g-rotulo">
            {k('grafica.energia')}
          </text>
          <text x="30" y="160" className="g-rotulo">
            {k('grafica.horas')}
          </text>
        </svg>
        <figcaption>{k('grafica.pausas')}</figcaption>
      </figure>
    )
  }
  if (id === 'planContinuar') {
    const etapas: [string, string][] = [
      ['semana1', 'g-z1'],
      ['mes1', 'g-z2'],
      ['revision', 'g-z3'],
      ['siempre', 'g-z4'],
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

import { useEffect, useState } from 'react'
import type { T } from './datos'

/**
 * Lo propio de la guía de Metas («¿Cómo cumplir tus metas?»): sus mini-herramientas
 * y sus gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su línea suena en modo
 * grabación) cada herramienta se usa sola al ritmo de la voz. La de «like, suscríbete
 * y comparte» es la de la guía de Video (`apoyo`).
 */
export const HERRAMIENTAS_METAS = new Set(['proponerse', 'metaBuena', 'siEntonces', 'escalera', 'tarjeta', 'casaMental', 'racha', 'woop', 'subir'])

export function HerramientaMetas({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`metas.${id}.${s}`)
  if (id === 'proponerse') return <Proponerse k={k} demo={demo} />
  if (id === 'metaBuena') return <MetaBuena k={k} demo={demo} />
  if (id === 'siEntonces') return <SiEntonces k={k} demo={demo} />
  if (id === 'escalera') return <Escalera k={k} demo={demo} />
  if (id === 'tarjeta') return <Tarjeta k={k} demo={demo} />
  if (id === 'casaMental') return <CasaMental k={k} demo={demo} />
  if (id === 'racha') return <Racha k={k} demo={demo} />
  if (id === 'woop') return <Woop k={k} demo={demo} />
  if (id === 'subir') return <Subir k={k} demo={demo} />
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

/** Barras horizontales con su porcentaje (crecen al montarse o al cambiar). */
function Barras({ filas }: { filas: { rotulo: string; valor: number; fuerte?: boolean; oculta?: boolean }[] }) {
  return (
    <div className="g-met-barras">
      {filas.map((f) => (
        <div key={f.rotulo} className={f.fuerte ? 'fuerte' : ''}>
          <span>{f.rotulo}</span>
          <i>
            <b style={{ width: f.oculta ? '0%' : `${f.valor}%` }} />
          </i>
          <em>{f.oculta ? '…' : `${num(f.valor)} %`}</em>
        </div>
      ))}
    </div>
  )
}

// ───────── Parte 1: proponérselo sí sirve ─────────

/** Norcross (2002): a los seis meses, 46 % de quienes se lo propusieron contra 4 % de quienes no. */
function Proponerse({ k, demo }: { k: K; demo: boolean }) {
  const [visto, setVisto] = useState(!demo)
  useDemo<boolean>(demo, [true], 0, setVisto, 3800)
  return (
    <div className="g-herramienta g-met">
      <h4>{k('titulo')}</h4>
      <Barras
        filas={[
          { rotulo: k('con'), valor: 46, fuerte: true, oculta: !visto },
          { rotulo: k('sin'), valor: 4, oculta: !visto },
        ]}
      />
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setVisto((v) => !v)}>
          {k(visto ? 'ocultar' : 'ver')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 2: una meta concreta ─────────

const PIEZAS_META = ['que', 'cuanto', 'cuando', 'donde'] as const

/** De «hacer ejercicio» a una meta concreta: qué, cuánto, cuándo y dónde. */
function MetaBuena({ k, demo }: { k: K; demo: boolean }) {
  const [n, setN] = useState(0)
  useDemo<number>(demo, [1, 2, 3, 4], 1700, setN, 6200)
  const puestas = PIEZAS_META.slice(0, n)
  return (
    <div className="g-herramienta g-met">
      <h4>{k('titulo')}</h4>
      <p className="g-met-frase">
        {n === 0 ? (
          <s>{k('vaga')}</s>
        ) : (
          puestas.map((p) => (
            <span key={p} className="g-met-pieza">
              {k(`${p}Ej`)}{' '}
            </span>
          ))
        )}
      </p>
      <div className="g-met-chips">
        {PIEZAS_META.map((p, i) => (
          <button key={p} type="button" className={i < n ? 'on' : ''} onClick={() => setN(i < n ? i : i + 1)}>
            {k(p)}
          </button>
        ))}
      </div>
      <div className="g-met-medidor" aria-hidden="true">
        <i style={{ width: `${(n / 4) * 100}%` }} />
      </div>
      <p className={n === 4 ? 'g-nota g-ok' : 'g-nota'}>{k(n === 4 ? 'lista' : 'falta')}</p>
    </div>
  )
}

// ───────── Parte 3: la frase «si…, entonces…» ─────────

/** Milne, Orbell y Sheeran (2002): con la frase, el 91 % hizo ejercicio. */
function SiEntonces({ k, demo }: { k: K; demo: boolean }) {
  const [frase, setFrase] = useState(!demo)
  useDemo<boolean>(demo, [true], 0, setFrase, 12500)
  return (
    <div className="g-herramienta g-met">
      <h4>{k('titulo')}</h4>
      <div className={frase ? 'g-met-tarjetita on' : 'g-met-tarjetita'}>
        <b>{k('si')}</b> {k('siEj')} <b>{k('entonces')}</b> {k('entoncesEj')}
      </div>
      <Barras
        filas={[
          { rotulo: k('control'), valor: 38 },
          { rotulo: k('motivacion'), valor: 35 },
          { rotulo: k('conFrase'), valor: 91, fuerte: true, oculta: !frase },
        ]}
      />
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setFrase((v) => !v)}>
          {k(frase ? 'quitar' : 'poner')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Una meta grande partida en fases, y cada fase en pasos que caben en un día. */
function Escalera({ k, demo }: { k: K; demo: boolean }) {
  const [abierta, setAbierta] = useState(demo ? -1 : 0)
  useDemo<number>(demo, [0, 1, 2, 3], 1900, setAbierta, 3600)
  const fases = [0, 1, 2, 3]
  return (
    <div className="g-herramienta g-met">
      <h4>{k('titulo')}</h4>
      <p className="g-met-cumbre">{k('meta')}</p>
      <ol className="g-met-escalera">
        {fases.map((f) => (
          <li key={f} className={f <= abierta ? 'on' : ''} style={{ marginInlineStart: `${(3 - f) * 6}%` }}>
            <button type="button" onClick={() => setAbierta(f)}>
              <b>{k(`fase${f}`)}</b>
              <span>{k(`fase${f}Det`)}</span>
            </button>
            {f === abierta && <em>{k(`paso${f}`)}</em>}
          </li>
        ))}
      </ol>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 4: las ganas suben cerca de la meta ─────────

/** Kivetz y colegas (2006): la tarjeta de 12 sellos con 2 regalados se llena antes que la de 10. */
function Tarjeta({ k, demo }: { k: K; demo: boolean }) {
  const [compras, setCompras] = useState(demo ? 0 : 10)
  useDemo<number>(demo, Array.from({ length: 10 }, (_, i) => i + 1), 900, setCompras, 9000)
  const tarjeta = (total: number, regalo: number, dias: string, fuerte?: boolean) => (
    <figure className={fuerte ? 'g-met-tarjeta fuerte' : 'g-met-tarjeta'}>
      <div style={{ gridTemplateColumns: `repeat(${total / 2}, 1fr)` }}>
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={i < regalo ? 'regalo' : i < regalo + compras ? 'on' : ''} />
        ))}
      </div>
      <figcaption>
        <b>{k(regalo ? 'doce' : 'diez')}</b>
        <span>{compras >= 10 ? dias : k('llenando')}</span>
      </figcaption>
    </figure>
  )
  return (
    <div className="g-herramienta g-met">
      <h4>{k('titulo')}</h4>
      <div className="g-met-tarjetas">
        {tarjeta(10, 0, k('diasDiez'))}
        {tarjeta(12, 2, k('diasDoce'), true)}
      </div>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setCompras((c) => (c >= 10 ? 0 : 10))}>
          {k(compras >= 10 ? 'reiniciar' : 'llenar')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 5: la casa mental ─────────

const CUARTOS = ['cocina', 'ejercicio', 'descanso', 'finanzas', 'idiomas', 'metas'] as const
/** Las conexiones entre cuartos que se encienden: dormir ayuda a entrenar, comer bien también… */
const LAZOS: [number, number][] = [
  [2, 1],
  [0, 1],
  [3, 4],
]

/** Una casa con un cuarto por área de la vida: cada meta en su lugar, y cómo se conectan. */
function CasaMental({ k, demo }: { k: K; demo: boolean }) {
  const [paso, setPaso] = useState(demo ? 0 : 6 + LAZOS.length)
  useDemo<number>(demo, Array.from({ length: 6 + LAZOS.length }, (_, i) => i + 1), 1300, setPaso, 1200)
  const x = (i: number) => 60 + (i % 3) * 120
  const y = (i: number) => 52 + Math.floor(i / 3) * 96
  return (
    <div className="g-herramienta g-met">
      <h4>{k('titulo')}</h4>
      <svg viewBox="0 0 360 210" className="g-met-casa" role="img" aria-label={k('titulo')}>
        <path d="M10 22 L180 4 L350 22" className="g-met-techo" />
        {LAZOS.map(([a, b], i) => (
          <line key={i} x1={x(a)} y1={y(a)} x2={x(b)} y2={y(b)} className={paso > 6 + i ? 'g-met-lazo on' : 'g-met-lazo'} />
        ))}
        {CUARTOS.map((c, i) => (
          <g key={c} className={i < paso ? 'g-met-cuarto on' : 'g-met-cuarto'}>
            <rect x={x(i) - 54} y={y(i) - 40} width="108" height="80" rx="10" />
            <text x={x(i)} y={y(i) - 14} textAnchor="middle" className="g-rotulo g-fuerte">
              {k(c)}
            </text>
            <text x={x(i)} y={y(i) + 10} textAnchor="middle" className="g-rotulo">
              {k(`${c}Meta`)}
            </text>
          </g>
        ))}
      </svg>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setPaso((p) => (p >= 6 + LAZOS.length ? 0 : 6 + LAZOS.length))}>
          {k(paso >= 6 + LAZOS.length ? 'vaciar' : 'llenar')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 6: medir ─────────

/** Cuatro semanas: cada día cumplido se marca; un hueco no rompe la cadena si al día siguiente vuelves. */
function Racha({ k, demo }: { k: K; demo: boolean }) {
  const FALLA = 9
  const [dias, setDias] = useState(demo ? 0 : 28)
  useDemo<number>(demo, Array.from({ length: 28 }, (_, i) => i + 1), 260, setDias, 3000)
  const racha = dias > FALLA ? dias - FALLA - 1 : dias
  return (
    <div className="g-herramienta g-met">
      <h4>{k('titulo')}</h4>
      <div className="g-met-racha">
        {Array.from({ length: 28 }, (_, i) => (
          <i key={i} className={i >= dias ? '' : i === FALLA ? 'falla' : 'on'} />
        ))}
      </div>
      <dl className="g-resultados">
        <div className="g-resultado-fuerte">
          <dt>{k('cumplidos')}</dt>
          <dd>
            {Math.max(0, dias - (dias > FALLA ? 1 : 0))} <small>/ 28</small>
          </dd>
        </div>
        <div>
          <dt>{k('rachaActual')}</dt>
          <dd>{racha}</dd>
        </div>
      </dl>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setDias((d) => (d >= 28 ? 0 : 28))}>
          {k(dias >= 28 ? 'reiniciar' : 'llenar')}
        </button>
      )}
      <p className={dias > FALLA ? 'g-nota g-ok' : 'g-nota'}>{k(dias > FALLA ? 'volviste' : 'nota')}</p>
    </div>
  )
}

// ───────── Parte 7: cuando fallas ─────────

const WOOP = ['deseo', 'resultado', 'obstaculo', 'plan'] as const

/** El método WOOP de Oettingen: deseo, resultado, obstáculo y plan, uno por uno. */
function Woop({ k, demo }: { k: K; demo: boolean }) {
  const [n, setN] = useState(demo ? 0 : 4)
  useDemo<number>(demo, [1, 2, 3, 4], 2300, setN, 4200)
  return (
    <div className="g-herramienta g-met">
      <h4>{k('titulo')}</h4>
      <ol className="g-met-woop">
        {WOOP.map((w, i) => (
          <li key={w} className={i < n ? `on ${w}` : w}>
            <b>
              {w[0].toUpperCase()} · {k(w)}
            </b>
            <span>{k(`${w}Ej`)}</span>
          </li>
        ))}
      </ol>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setN((v) => (v >= 4 ? 0 : v + 1))}>
          {k(n >= 4 ? 'reiniciar' : 'siguiente')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 8: el plan para continuar ─────────

/** Dos minutos que suben un poco cada semana: cuánto llevas a las 16 semanas. */
function Subir({ k, demo }: { k: K; demo: boolean }) {
  const [pct, setPct] = useState(20)
  useDemo<number>(demo, [10, 30, 20], 2600, setPct, 4000)
  const semanas = Array.from({ length: 16 }, (_, i) => 2 * (1 + pct / 100) ** i)
  const max = Math.max(...semanas, 30)
  return (
    <div className="g-herramienta g-met">
      <h4>{k('titulo')}</h4>
      <svg viewBox="0 0 360 160" role="img" aria-label={k('titulo')}>
        <line x1="20" y1={140 - (30 / max) * 120} x2="350" y2={140 - (30 / max) * 120} className="g-met-meta" />
        <text x="350" y={134 - (30 / max) * 120} textAnchor="end" className="g-rotulo">
          30 min
        </text>
        {semanas.map((m, i) => (
          <rect key={i} x={22 + i * 20.5} y={140 - (m / max) * 120} width="15" height={(m / max) * 120} rx="3" className={m >= 30 ? 'g-met-barra llego' : 'g-met-barra'} />
        ))}
        <line x1="20" y1="140" x2="350" y2="140" className="g-eje" />
      </svg>
      <div className="g-opciones">
        <label>
          <span>{k('cadaSemana')}</span>
          <Segmentos valores={[10, 20, 30]} valor={pct} set={setPct} rotulo={(v) => `+${v} %`} />
        </label>
      </div>
      <dl className="g-resultados">
        <div className="g-resultado-fuerte">
          <dt>{k('semana16')}</dt>
          <dd>
            {num(semanas[15])} <small>min</small>
          </dd>
        </div>
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_METAS = new Set(['comienzos', 'habito', 'planContinuar'])

export function GraficaMetas({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'comienzos') {
    // Un mes de lunes a domingo: los lunes y el día 1 se alzan (ilustrativo, sin cifras).
    const dias = Array.from({ length: 28 }, (_, i) => (i === 0 ? 1 : i % 7 === 0 ? 0.78 : 0.32 + 0.08 * Math.sin(i * 1.7)))
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 170" role="img" aria-label={k('grafica.comienzos')}>
          {dias.map((v, i) => (
            <rect key={i} x={14 + i * 13.4} y={140 - v * 110} width="10" height={v * 110} rx="2" className={v > 0.7 ? 'g-met-barra llego' : 'g-met-barra'} />
          ))}
          <line x1="10" y1="140" x2="392" y2="140" className="g-eje" />
          <text x="19" y="160" className="g-rotulo g-fuerte">
            {k('grafica.dia1')}
          </text>
          {[7, 14, 21].map((d) => (
            <text key={d} x={19 + d * 13.4} y="160" textAnchor="middle" className="g-rotulo">
              {k('grafica.lunes')}
            </text>
          ))}
        </svg>
        <figcaption>{k('grafica.comienzos')}</figcaption>
      </figure>
    )
  }
  if (id === 'habito') {
    // La curva de Lally: sube rápido y se aplana; la mediana llega a la meseta hacia el día 66.
    const x = (d: number) => 30 + (d / 120) * 350
    const y = (v: number) => 140 - v * 110
    const curva = (d: number) => 1 - Math.exp(-d / 22)
    const puntos = Array.from({ length: 121 }, (_, d) => `${d ? 'L' : 'M'}${x(d).toFixed(1)} ${y(d === 30 ? curva(d) - 0.04 : curva(d)).toFixed(1)}`).join(' ')
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 180" role="img" aria-label={k('grafica.habito')}>
          <line x1="30" y1="140" x2="385" y2="140" className="g-eje" />
          <path d={puntos} className="g-curva" />
          <line x1={x(66)} y1="20" x2={x(66)} y2="140" className="g-met-meta" />
          <text x={x(66)} y="16" textAnchor="middle" className="g-rotulo g-fuerte">
            {k('grafica.dia66')}
          </text>
          <circle cx={x(30)} cy={y(curva(30) - 0.04)} r="6" className="g-met-falla" />
          <text x={x(30)} y={y(curva(30)) + 26} textAnchor="middle" className="g-rotulo">
            {k('grafica.unaFalla')}
          </text>
          <text x="30" y="160" className="g-rotulo">
            {k('grafica.dias')}
          </text>
          <text x="30" y="34" className="g-rotulo">
            {k('grafica.automatico')}
          </text>
        </svg>
        <figcaption>{k('grafica.habito')}</figcaption>
      </figure>
    )
  }
  if (id === 'planContinuar') {
    const etapas: [string, string][] = [
      ['semana1', 'g-z1'],
      ['mes1', 'g-z2'],
      ['fallas', 'g-z4'],
      ['domingo', 'g-z3'],
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

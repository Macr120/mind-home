import { useEffect, useState } from 'react'
import type { T } from './datos'

/**
 * Lo propio de la guía de Aprender («¿Cómo aprender más rápido?»): sus mini-herramientas
 * y sus gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su línea suena en modo
 * grabación) cada herramienta se usa sola al ritmo de la voz. La de «like, suscríbete y
 * comparte» es la de Mindfulness (`gusta`).
 */
export const HERRAMIENTAS_APRENDER = new Set(['tecnicas', 'releerProbar', 'recordar', 'repasos', 'mezclar', 'explicalo', 'planRepasos'])

export function HerramientaAprender({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`aprender.${id}.${s}`)
  if (id === 'tecnicas') return <Tecnicas k={k} demo={demo} />
  if (id === 'releerProbar') return <ReleerProbar k={k} demo={demo} />
  if (id === 'recordar') return <Recordar k={k} demo={demo} />
  if (id === 'repasos') return <Repasos k={k} demo={demo} />
  if (id === 'mezclar') return <Mezclar k={k} demo={demo} />
  if (id === 'explicalo') return <Explicalo k={k} demo={demo} />
  if (id === 'planRepasos') return <PlanRepasos k={k} demo={demo} />
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

/** Barras horizontales con su porcentaje (crecen al montarse o al cambiar). */
function Barras({ filas }: { filas: { rotulo: string; valor: number; fuerte?: boolean }[] }) {
  return (
    <div className="g-apr-barras">
      {filas.map((f) => (
        <div key={f.rotulo} className={f.fuerte ? 'fuerte' : ''}>
          <span>{f.rotulo}</span>
          <i>
            <b style={{ width: `${f.valor}%` }} />
          </i>
          <em>{num(f.valor)} %</em>
        </div>
      ))}
    </div>
  )
}

// ───────── Parte 2: las diez técnicas de Dunlosky ─────────

/** Dunlosky y colegas (2013): la utilidad de diez técnicas de estudio. */
const TECNICAS: [string, 'alta' | 'moderada' | 'baja'][] = [
  ['t1', 'alta'],
  ['t2', 'alta'],
  ['t3', 'moderada'],
  ['t4', 'moderada'],
  ['t5', 'moderada'],
  ['t6', 'baja'],
  ['t7', 'baja'],
  ['t8', 'baja'],
  ['t9', 'baja'],
  ['t10', 'baja'],
]

function Tecnicas({ k, demo }: { k: K; demo: boolean }) {
  const [vistas, setVistas] = useState(demo ? 0 : TECNICAS.length)
  // Se van calificando una a una mientras la voz cuenta la revisión.
  useDemo<number>(demo, TECNICAS.map((_, i) => i + 1), 900, setVistas, 6000)
  return (
    <div className="g-herramienta g-apr">
      <h4>{k('titulo')}</h4>
      <ul className="g-apr-tecnicas">
        {TECNICAS.map(([c, nota], i) => (
          <li key={c} className={i < vistas ? nota : ''}>
            <span>{k(c)}</span>
            <b>{i < vistas ? k(nota) : '…'}</b>
          </li>
        ))}
      </ul>
      {!demo && vistas < TECNICAS.length && (
        <button type="button" className="g-boton-suave" onClick={() => setVistas(TECNICAS.length)}>
          {k('ver')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 3: releer contra ponerte a prueba ─────────

/** Roediger y Karpicke (2006): a los 5 minutos gana releer (83 contra 71 %); a la semana, la prueba (61 contra 40 %). */
function ReleerProbar({ k, demo }: { k: K; demo: boolean }) {
  const [cuando, setCuando] = useState<'cinco' | 'semana'>(demo ? 'cinco' : 'semana')
  useDemo<'cinco' | 'semana'>(demo, ['semana'], 0, setCuando, 19000)
  const datos = cuando === 'cinco' ? [83, 71] : [40, 61]
  return (
    <div className="g-herramienta g-apr">
      <h4>{k('titulo')}</h4>
      <Segmentos valores={['cinco', 'semana'] as ('cinco' | 'semana')[]} valor={cuando} set={setCuando} rotulo={(v) => k(v)} />
      <Barras
        filas={[
          { rotulo: k('releer'), valor: datos[0], fuerte: cuando === 'cinco' },
          { rotulo: k('probar'), valor: datos[1], fuerte: cuando === 'semana' },
        ]}
      />
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Cierra el libro y escribe lo que recuerdas; luego compara: lo que faltó es lo que toca repasar. */
const IDEAS = ['i1', 'i2', 'i3', 'i4', 'i5']
const RECORDADAS_DEMO = ['i1', 'i3', 'i4']

function Recordar({ k, demo }: { k: K; demo: boolean }) {
  const [hechas, setHechas] = useState<string[]>(demo ? [] : RECORDADAS_DEMO)
  const [comparado, setComparado] = useState(!demo)
  useDemo<string | 'comparar'>(demo, [...RECORDADAS_DEMO, 'comparar'], 1300, (v) => (v === 'comparar' ? setComparado(true) : setHechas((x) => [...x, v])), 1200)
  return (
    <div className="g-herramienta g-apr">
      <h4>{k('titulo')}</h4>
      <p className="g-sub">{k('instruccion')}</p>
      <ul className="g-apr-ideas">
        {IDEAS.map((c) => {
          const si = hechas.includes(c)
          return (
            <li key={c} className={si ? 'si' : comparado ? 'falta' : ''}>
              <button type="button" onClick={() => setHechas((x) => (si ? x.filter((y) => y !== c) : [...x, c]))}>
                <i>{si ? '✓' : comparado ? '!' : ''}</i> {k(c)}
              </button>
            </li>
          )
        })}
      </ul>
      {!demo && !comparado && (
        <button type="button" className="g-boton-suave" onClick={() => setComparado(true)}>
          {k('comparar')}
        </button>
      )}
      <p className={comparado ? 'g-nota g-ok' : 'g-nota'}>{comparado ? k('faltan') : k('nota')}</p>
    </div>
  )
}

// ───────── Parte 4: repartir y mezclar ─────────

/**
 * El mismo tiempo de estudio, todo en un día o repartido en cuatro, y cuánto queda un mes
 * después (ilustrativo, con la forma de la curva del olvido: cada repaso la aplana).
 */
function Repasos({ k, demo }: { k: K; demo: boolean }) {
  const [modo, setModo] = useState<'junto' | 'repartido'>('junto')
  useDemo<'junto' | 'repartido'>(demo, ['repartido'], 0, setModo, 9000)
  const dias = modo === 'junto' ? [0] : [0, 1, 7, 21]
  const x = (d: number) => 20 + (d / 30) * 360
  const y = (v: number) => 130 - v * 110
  // Retención: cae desde 1 tras cada repaso, más despacio cuantos más repasos lleva.
  const ret = (d: number) => {
    const antes = dias.filter((r) => r <= d)
    const ultimo = antes[antes.length - 1]
    const fuerza = 2.5 * Math.pow(3, antes.length - 1)
    return 0.15 + 0.85 * Math.exp(-(d - ultimo) / fuerza)
  }
  const puntos = Array.from({ length: 301 }, (_, i) => i / 10)
  const camino = puntos.map((d, i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)} ${y(ret(d)).toFixed(1)}`).join(' ')
  return (
    <div className="g-herramienta g-apr">
      <h4>{k('titulo')}</h4>
      <Segmentos valores={['junto', 'repartido'] as ('junto' | 'repartido')[]} valor={modo} set={setModo} rotulo={(v) => k(v)} />
      <svg viewBox="0 0 400 160" className="g-apr-curva" role="img" aria-label={k('titulo')}>
        <line x1="20" y1="130" x2="385" y2="130" className="g-eje" />
        <path d={camino} className="g-curva" />
        {dias.map((d) => (
          <circle key={d} cx={x(d)} cy={y(1)} r="5" className="g-apr-repaso" />
        ))}
        <text x="20" y="150" className="g-rotulo">
          {k('dia0')}
        </text>
        <text x="380" y="150" textAnchor="end" className="g-rotulo">
          {k('dia30')}
        </text>
        <text x="380" y={y(ret(30)) - 8} textAnchor="end" className="g-rotulo g-fuerte">
          {num(ret(30) * 100)} %
        </text>
      </svg>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Rohrer y Taylor (2007): practicar por bloques (AAA BBB CCC) contra mezclado; a la semana, 20 contra 63 %. */
function Mezclar({ k, demo }: { k: K; demo: boolean }) {
  const [modo, setModo] = useState<'bloques' | 'mezclado'>('bloques')
  useDemo<'bloques' | 'mezclado'>(demo, ['mezclado'], 0, setModo, 7500)
  const orden = modo === 'bloques' ? 'AAABBBCCC' : 'ABCBCACAB'
  return (
    <div className="g-herramienta g-apr">
      <h4>{k('titulo')}</h4>
      <Segmentos valores={['bloques', 'mezclado'] as ('bloques' | 'mezclado')[]} valor={modo} set={setModo} rotulo={(v) => k(v)} />
      <div className="g-apr-fichas" aria-hidden="true">
        {orden.split('').map((c, i) => (
          <i key={i + c + modo} className={`f${c}`} style={{ animationDelay: `${i * 60}ms` }}>
            {k(`tipo${c}`)}
          </i>
        ))}
      </div>
      <Barras
        filas={[
          { rotulo: k('bloques'), valor: 20, fuerte: modo === 'bloques' },
          { rotulo: k('mezclado'), valor: 63, fuerte: modo === 'mezclado' },
        ]}
      />
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 5: aprende como si fueras a enseñarlo ─────────

/** Nestojko y colegas (2014): leer pensando en enseñar contra leer para un examen (ilustrativo). */
function Explicalo({ k, demo }: { k: K; demo: boolean }) {
  const [modo, setModo] = useState<'examen' | 'ensenar'>('examen')
  useDemo<'examen' | 'ensenar'>(demo, ['ensenar'], 0, setModo, 8000)
  const ensenar = modo === 'ensenar'
  return (
    <div className="g-herramienta g-apr">
      <h4>{k('titulo')}</h4>
      <Segmentos valores={['examen', 'ensenar'] as ('examen' | 'ensenar')[]} valor={modo} set={setModo} rotulo={(v) => k(v)} />
      <div className={ensenar ? 'g-apr-mapa ordenado' : 'g-apr-mapa'} aria-hidden="true">
        {['a', 'b', 'c', 'd', 'e', 'f'].map((c) => (
          <i key={c} className={c}>
            {k(`idea${c}`)}
          </i>
        ))}
      </div>
      <p className="g-sub">{k(ensenar ? 'conEnsenar' : 'conExamen')}</p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 7: tu calendario de repasos ─────────

/** Las fechas de repaso desde hoy: al día siguiente, a la semana y al mes. */
const SALTOS = [1, 7, 30]

function PlanRepasos({ k, demo }: { k: K; demo: boolean }) {
  const [hoy] = useState(() => new Date())
  const [marcadas, setMarcadas] = useState(demo ? 0 : SALTOS.length)
  useDemo<number>(demo, [1, 2, 3], 1600, setMarcadas, 2500)
  const fecha = (d: number) => new Intl.DateTimeFormat(lang(), { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(hoy.getTime() + d * 864e5))
  return (
    <div className="g-herramienta g-apr">
      <h4>{k('titulo')}</h4>
      <ol className="g-apr-plan">
        <li className="on">
          <b>{k('hoy')}</b>
          <span>{fecha(0)}</span>
          <em>{k('aprendes')}</em>
        </li>
        {SALTOS.map((d, i) => (
          <li key={d} className={i < marcadas ? 'on' : ''}>
            <b>{k(`salto${d}`)}</b>
            <span>{fecha(d)}</span>
            <em>{k('repasas')}</em>
          </li>
        ))}
      </ol>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_APRENDER = new Set(['ebbinghaus', 'sueno', 'planContinuar'])

export function GraficaAprender({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'ebbinghaus') {
    // Ebbinghaus (1885): lo que conservaba (método del ahorro) a los 20 min, 1 h, 9 h, 1, 2, 6 y 31 días.
    const datos: [number, number][] = [
      [0, 100],
      [0.014, 58],
      [0.042, 44],
      [0.375, 36],
      [1, 34],
      [2, 28],
      [6, 25],
      [31, 21],
    ]
    // Eje de tiempo comprimido (raíz) para que se vean las primeras horas.
    const x = (d: number) => 40 + Math.sqrt(d / 31) * 340
    const y = (v: number) => 140 - (v / 100) * 115
    const camino = datos.map(([d, v], i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 180" role="img" aria-label={k('grafica.ebbinghaus')}>
          <line x1="40" y1="140" x2="385" y2="140" className="g-eje" />
          <line x1="40" y1="20" x2="40" y2="140" className="g-eje" />
          <path d={camino} className="g-curva" />
          {datos.slice(1).map(([d, v]) => (
            <circle key={d} cx={x(d)} cy={y(v)} r="3.5" className="g-apr-repaso" />
          ))}
          <text x={x(0.042) + 6} y={y(44) - 8} className="g-rotulo g-fuerte">
            {k('grafica.unaHora')}
          </text>
          <text x={x(31)} y={y(21) - 10} textAnchor="end" className="g-rotulo">
            {k('grafica.unMes')}
          </text>
          <text x="40" y="160" className="g-rotulo">
            {k('grafica.ahora')}
          </text>
          <text x="380" y="160" textAnchor="end" className="g-rotulo">
            {k('grafica.dias31')}
          </text>
          <text x="46" y="30" className="g-rotulo">
            {k('grafica.recuerdas')}
          </text>
        </svg>
        <figcaption>{k('grafica.ebbinghaus')}</figcaption>
      </figure>
    )
  }
  if (id === 'sueno') {
    // Gais, Lucas y Born (2006): dormir poco después de aprender ayuda a recordar (ilustrativo, sin cifras).
    return (
      <figure className="g-grafica">
        <div className="g-apr-sueno">
          <div className="dormir">
            <i style={{ height: '82%' }} />
            <span>{k('grafica.durmieron')}</span>
          </div>
          <div className="despiertos">
            <i style={{ height: '58%' }} />
            <span>{k('grafica.despiertos')}</span>
          </div>
        </div>
        <figcaption>{k('grafica.sueno')}</figcaption>
      </figure>
    )
  }
  if (id === 'planContinuar') {
    const etapas: [string, string][] = [
      ['semana1', 'g-z1'],
      ['mes1', 'g-z2'],
      ['olvidas', 'g-z4'],
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

import { useEffect, useState } from 'react'
import type { T } from './datos'
import { Apoyo } from './Video'

/**
 * Lo propio de la guía de Hobbies («¿Cómo encontrar un pasatiempo y cómo mantenerlo?»): sus
 * mini-herramientas y sus gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su línea suena en
 * modo grabación) cada herramienta se usa sola al ritmo de la voz. La de «like, suscríbete y
 * comparte» es la de la guía de Video, sin la barra de la mitad (`apoyoHobbies`).
 */
export const HERRAMIENTAS_HOBBIES = new Set(['tiempoLibre', 'explorador', 'veinteMinutos', 'semanaFlexible', 'apoyoHobbies'])

export function HerramientaHobbies({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`hobbies.${id}.${s}`)
  if (id === 'tiempoLibre') return <TiempoLibre k={k} demo={demo} />
  if (id === 'explorador') return <Explorador k={k} demo={demo} />
  if (id === 'veinteMinutos') return <VeinteMinutos k={k} demo={demo} />
  if (id === 'semanaFlexible') return <SemanaFlexible k={k} demo={demo} />
  if (id === 'apoyoHobbies') {
    // Título y nota propios, sin la barra de «mitad del video»; los botones, los de la guía de Video.
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

// ───────── Parte 1: el tiempo libre de un día ─────────

/** ATUS 2023: ~5,2 h libres al día, ~2,7 de televisión. Cambiar unos minutos de tele por un pasatiempo. */
function TiempoLibre({ k, demo }: { k: K; demo: boolean }) {
  const [min, setMin] = useState(demo ? 0 : 20)
  useDemo<number>(demo, [10, 20, 30], 1800, setMin, 5500)
  const LIBRE = 312 // minutos (5,2 h)
  const TELE = 162 // minutos (2,7 h)
  const tramos: [string, number][] = [
    ['tele', TELE - min],
    ['hobby', min],
    ['otro', LIBRE - TELE],
  ]
  return (
    <div className="g-herramienta g-hob">
      <h4>{k('titulo')}</h4>
      <div className="g-hob-barra">
        {tramos.map(([c, m]) => (
          <span key={c} className={`g-hob-${c}`} style={{ flexGrow: Math.max(m, 0.01) }}>
            {m >= 20 ? `${k(c)} · ${num(m)}′` : ''}
          </span>
        ))}
      </div>
      <label className="g-campo">
        <span>{k('cambio')}</span>
        <input type="range" min={0} max={60} step={5} value={min} onChange={(e) => setMin(Number(e.target.value))} />
        <b>{num(min)}′</b>
      </label>
      <p className="g-hob-total">
        <b>{num((min * 365) / 60)}</b> {k('horasAno')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 2: el explorador de pasatiempos ─────────

const MODOS = ['manos', 'cabeza', 'cuerpo', 'otros', 'aireLibre'] as const

/** Cómo te gusta pasar el rato → tres ideas para probar. */
function Explorador({ k, demo }: { k: K; demo: boolean }) {
  const [modo, setModo] = useState<(typeof MODOS)[number]>('manos')
  useDemo<(typeof MODOS)[number]>(demo, ['cabeza', 'cuerpo', 'otros', 'aireLibre'], 2200, setModo, 4500)
  return (
    <div className="g-herramienta g-hob">
      <h4>{k('titulo')}</h4>
      <Segmentos valores={[...MODOS]} valor={modo} set={setModo} rotulo={(m) => k(m)} />
      <ul className="g-hob-ideas" key={modo}>
        {[1, 2, 3].map((i) => (
          <li key={i} style={{ ['--j' as string]: i }}>
            {k(`${modo}${i}`)}
          </li>
        ))}
      </ul>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 4: veinte minutos ─────────

/** Minutos por sesión × días por semana → horas al año. */
function VeinteMinutos({ k, demo }: { k: K; demo: boolean }) {
  const [min, setMin] = useState(20)
  const [dias, setDias] = useState(demo ? 1 : 4)
  useDemo<[number, number]>(demo, [[20, 2], [20, 4], [30, 4]], 2200, ([m, d]) => { setMin(m); setDias(d) }, 4000)
  const horas = (min * dias * 52) / 60
  return (
    <div className="g-herramienta g-hob">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('minutos')}</span>
          <Segmentos valores={[10, 20, 30, 45]} valor={min} set={setMin} />
        </label>
        <label>
          <span>{k('dias')}</span>
          <Segmentos valores={[1, 2, 3, 4, 5, 6, 7]} valor={dias} set={setDias} />
        </label>
      </div>
      <p className="g-hob-total">
        <b>{num(horas)}</b> {k('horasAno')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 6: racha diaria contra meta semanal ─────────

/** La misma semana (un día fallado) contada como racha diaria y como meta de 4 días de 7. */
const SEMANA = [true, true, false, true, true, false, false]

function SemanaFlexible({ k, demo }: { k: K; demo: boolean }) {
  const [n, setN] = useState(demo ? 0 : 7)
  useDemo<number>(demo, [1, 2, 3, 4, 5, 6, 7], 900, setN, 3500)
  const dias = SEMANA.slice(0, n)
  // Racha: días seguidos al final; meta: días hechos contra 4.
  let racha = 0
  for (const d of dias) racha = d ? racha + 1 : 0
  const hechos = dias.filter(Boolean).length
  return (
    <div className="g-herramienta g-hob">
      <h4>{k('titulo')}</h4>
      <div className="g-hob-semana">
        {SEMANA.map((d, i) => (
          <span key={i} className={i < n ? (d ? 'hecho' : 'falla') : ''}>
            <small>{k(`d${i}`)}</small>
          </span>
        ))}
      </div>
      <div className="g-hob-dos">
        <div className={dias.includes(false) ? 'g-hob-rota' : ''}>
          <b>{k('racha')}</b>
          <em>{num(racha)}</em>
          <small>{dias.includes(false) ? k('seRompio') : k('dias')}</small>
        </div>
        <div className={hechos >= 4 ? 'g-hob-cumplida' : ''}>
          <b>{k('meta')}</b>
          <em>
            {num(hechos)}/4
          </em>
          <small>{hechos >= 4 ? k('cumplida') : k('enCamino')}</small>
        </div>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_HOBBIES = new Set(['hobbiesSalud', 'ikea', 'cantoGrupo', 'planHobby'])

export function GraficaHobbies({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'hobbiesSalud') {
    // Mak y colegas (2023): con pasatiempo, en los cuatro indicadores (dirección, sin cifras).
    const filas: [string, '↓' | '↑'][] = [
      ['depresion', '↓'],
      ['salud', '↑'],
      ['felicidad', '↑'],
      ['satisfaccion', '↑'],
    ]
    return (
      <figure className="g-grafica">
        <ul className="g-hob-flechas">
          {filas.map(([f, d]) => (
            <li key={f} className={d === '↓' ? 'baja' : 'sube'}>
              <i>{d}</i>
              <span>{k(`grafica.${f}`)}</span>
            </li>
          ))}
        </ul>
        <figcaption>{k('grafica.hobbiesSalud')}</figcaption>
      </figure>
    )
  }
  if (id === 'ikea') {
    // Norton y colegas (2012): cuánto ofrecían por la misma caja (ilustrativo).
    return (
      <figure className="g-grafica g-hob">
        <div className="g-met-barras">
          <div>
            <span>{k('grafica.armada')}</span>
            <i>
              <b style={{ width: '58%' }} />
            </i>
            <em>$</em>
          </div>
          <div className="fuerte">
            <span>{k('grafica.propia')}</span>
            <i>
              <b style={{ width: '95%' }} />
            </i>
            <em>$$</em>
          </div>
        </div>
        <figcaption>{k('grafica.ikea')}</figcaption>
      </figure>
    )
  }
  if (id === 'cantoGrupo') {
    // Pearce y colegas (2015): cercanía al grupo en los meses 1, 3 y 7 (ilustrativo).
    const x = (m: number) => 40 + ((m - 1) / 6) * 330
    const y = (v: number) => 140 - v * 110
    const canto = [[1, 0.62], [3, 0.8], [7, 0.86]]
    const otras = [[1, 0.3], [3, 0.6], [7, 0.84]]
    const linea = (ps: number[][]) => ps.map(([m, v], i) => `${i ? 'L' : 'M'}${x(m)} ${y(v)}`).join(' ')
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 170" role="img" aria-label={k('grafica.cantoGrupo')}>
          <line x1="30" y1="140" x2="385" y2="140" className="g-eje" />
          <path d={linea(otras)} className="g-curva g-age-sin" />
          <path d={linea(canto)} className="g-curva" />
          {[1, 3, 7].map((m) => (
            <text key={m} x={x(m)} y="160" textAnchor="middle" className="g-rotulo">
              {k('grafica.mes')} {m}
            </text>
          ))}
          <text x={x(1) + 6} y={y(0.62) - 8} className="g-rotulo g-fuerte">
            {k('grafica.canto')}
          </text>
          <text x={x(1) + 6} y={y(0.3) + 16} className="g-rotulo">
            {k('grafica.otras')}
          </text>
        </svg>
        <figcaption>{k('grafica.cantoGrupo')}</figcaption>
      </figure>
    )
  }
  if (id === 'planHobby') {
    const etapas: [string, string][] = [
      ['semana1', 'g-z1'],
      ['mes1', 'g-z2'],
      ['compania', 'g-z3'],
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

import { useEffect, useState } from 'react'
import type { T } from './datos'
import { Apoyo } from './Video'

/**
 * Lo propio de la guía de Entretenimiento («¿Cómo entretenerte mejor?»): sus mini-herramientas
 * y sus gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su línea suena en modo grabación) cada
 * herramienta se usa sola al ritmo de la voz. La de «like, suscríbete y comparte» es la de la
 * guía de Video, sin la barra de la mitad (`apoyoEntre`).
 */
export const HERRAMIENTAS_ENTRE = new Set(['tiempoEligiendo', 'scrollAlAno', 'ritmoSerie', 'porQueJuegas', 'librosAlAno', 'apoyoEntre'])

export function HerramientaEntre({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`entretenimiento.${id}.${s}`)
  if (id === 'tiempoEligiendo') return <TiempoEligiendo k={k} demo={demo} />
  if (id === 'scrollAlAno') return <ScrollAlAno k={k} demo={demo} />
  if (id === 'ritmoSerie') return <RitmoSerie k={k} demo={demo} />
  if (id === 'porQueJuegas') return <PorQueJuegas k={k} demo={demo} />
  if (id === 'librosAlAno') return <LibrosAlAno k={k} demo={demo} />
  if (id === 'apoyoEntre') {
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

// ───────── Parte 1: el tiempo que se va eligiendo ─────────

/** Minutos eligiendo qué ver por noche × noches por semana → horas al año. */
function TiempoEligiendo({ k, demo }: { k: K; demo: boolean }) {
  const [min, setMin] = useState(10)
  const [noches, setNoches] = useState(demo ? 3 : 7)
  useDemo<[number, number]>(demo, [[10, 5], [10, 7], [15, 7]], 2000, ([m, n]) => { setMin(m); setNoches(n) }, 3500)
  const horas = (min * noches * 52) / 60
  return (
    <div className="g-herramienta g-ent">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('minutos')}</span>
          <Segmentos valores={[5, 10, 15, 20]} valor={min} set={setMin} />
        </label>
        <label>
          <span>{k('noches')}</span>
          <Segmentos valores={[1, 2, 3, 4, 5, 6, 7]} valor={noches} set={setNoches} />
        </label>
      </div>
      <p className="g-hob-total">
        <b>{num(horas)}</b> {k('horasAno')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 2: el scroll de un año ─────────

/** Minutos de redes al día → horas y días enteros al año; contra los 30 minutos del estudio de Hunt. */
function ScrollAlAno({ k, demo }: { k: K; demo: boolean }) {
  const [min, setMin] = useState(demo ? 30 : 120)
  useDemo<number>(demo, [60, 120, 180], 1700, setMin, 6000)
  const horas = (min * 365) / 60
  return (
    <div className="g-herramienta g-ent">
      <h4>{k('titulo')}</h4>
      <label className="g-campo">
        <span>{k('alDia')}</span>
        <input type="range" min={15} max={240} step={15} value={min} onChange={(e) => setMin(Number(e.target.value))} />
        <b>{num(min)}′</b>
      </label>
      <div className="g-ent-dias" aria-hidden>
        {Array.from({ length: 30 }, (_, i) => (
          <span key={i} className={i < Math.round(horas / 24) ? 'lleno' : ''} />
        ))}
      </div>
      <p className="g-hob-total">
        <b>{num(horas)}</b> {k('horasAno')} · <b>{num(horas / 24)}</b> {k('diasEnteros')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 3: el ritmo de una serie ─────────

/** Capítulos por noche → cuántas noches dura una serie de 30 y a qué hora te acuestas (empiezas a las 22:00, 50 min cada uno). */
function RitmoSerie({ k, demo }: { k: K; demo: boolean }) {
  const [porNoche, setPorNoche] = useState(demo ? 1 : 2)
  useDemo<number>(demo, [2, 3, 5], 1500, setPorNoche, 2500)
  const CAPS = 30
  const fin = 22 * 60 + porNoche * 50
  const hora = new Intl.DateTimeFormat(lang(), { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, Math.floor(fin / 60) % 24, fin % 60))
  return (
    <div className="g-herramienta g-ent">
      <h4>{k('titulo')}</h4>
      <label>
        <span>{k('porNoche')}</span>
        <Segmentos valores={[1, 2, 3, 4, 5]} valor={porNoche} set={setPorNoche} />
      </label>
      <div className="g-hob-dos">
        <div>
          <b>{k('dura')}</b>
          <em>{num(Math.ceil(CAPS / porNoche))}</em>
          <small>{k('noches')}</small>
        </div>
        <div className={fin >= 24 * 60 ? 'g-hob-rota' : ''}>
          <b>{k('teAcuestas')}</b>
          <em>{hora}</em>
          <small>{fin >= 24 * 60 ? k('tarde') : k('aTiempo')}</small>
        </div>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 5: ¿por qué juegas? ─────────

const GUSTO = ['gusto1', 'gusto2', 'gusto3'] as const
const DEBER = ['deber1', 'deber2', 'deber3'] as const

/** Marca lo que te pasa al jugar: más «por gusto» que «por obligación» = bien (Vuorre y colegas, 2022). */
function PorQueJuegas({ k, demo }: { k: K; demo: boolean }) {
  const [marcas, setMarcas] = useState<Set<string>>(new Set())
  const alternar = (c: string) =>
    setMarcas((m) => {
      const n = new Set(m)
      if (n.has(c)) n.delete(c)
      else n.add(c)
      return n
    })
  useDemo<string>(demo, ['gusto1', 'gusto3', 'deber2'], 1300, alternar, 3000)
  const g = GUSTO.filter((c) => marcas.has(c)).length
  const d = DEBER.filter((c) => marcas.has(c)).length
  const veredicto = g + d === 0 ? 'marca' : d > g ? 'pausa' : 'bien'
  return (
    <div className="g-herramienta g-ent">
      <h4>{k('titulo')}</h4>
      <div className="g-ent-columnas">
        {[GUSTO, DEBER].map((lista, i) => (
          <ul key={i} className={i ? 'deber' : 'gusto'}>
            <li className="g-ent-cab">{k(i ? 'porDeber' : 'porGusto')}</li>
            {lista.map((c) => (
              <li key={c}>
                <button type="button" className={marcas.has(c) ? 'activo' : ''} onClick={() => alternar(c)}>
                  {k(c)}
                </button>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <p className={`g-ent-veredicto ${veredicto}`}>{k(veredicto)}</p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 7: libros al año ─────────

/** Minutos de lectura al día → libros al año (250 palabras por minuto, 75 000 palabras por libro). */
function LibrosAlAno({ k, demo }: { k: K; demo: boolean }) {
  const [min, setMin] = useState(demo ? 10 : 30)
  useDemo<number>(demo, [20, 30], 1600, setMin, 3200)
  const libros = Math.floor((min * 250 * 365) / 75000)
  return (
    <div className="g-herramienta g-ent">
      <h4>{k('titulo')}</h4>
      <label>
        <span>{k('alDia')}</span>
        <Segmentos valores={[10, 20, 30, 45, 60]} valor={min} set={setMin} rotulo={(v) => `${num(v)}′`} />
      </label>
      <div className="g-ent-libros" aria-hidden key={libros}>
        {Array.from({ length: Math.min(libros, 80) }, (_, i) => (
          <span key={i} style={{ ['--j' as string]: i, ['--c' as string]: ['#60a5fa', '#f472b6', '#facc15', '#34d399', '#a78bfa'][i % 5] }} />
        ))}
      </div>
      <p className="g-hob-total">
        <b>{num(libros)}</b> {k('librosAno')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_ENTRE = new Set(['pasivoActivo', 'maratonRecuerdo', 'cortes', 'horasJuego', 'mesaMente', 'capsula', 'planEntre'])

/** Barras horizontales (anchos ilustrativos en %); la `fuerte` resaltada. */
function Barras({ filas, k, pie }: { filas: [string, number, boolean?][]; k: K; pie: string }) {
  return (
    <figure className="g-grafica g-ent">
      <div className="g-met-barras">
        {filas.map(([c, w, fuerte]) => (
          <div key={c} className={fuerte ? 'fuerte' : ''}>
            <span>{k(`grafica.${c}`)}</span>
            <i>
              <b style={{ width: `${w}%` }} />
            </i>
          </div>
        ))}
      </div>
      <figcaption>{k(`grafica.${pie}`)}</figcaption>
    </figure>
  )
}

export function GraficaEntre({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'pasivoActivo') {
    // Verduyn y colegas (2015): mirar sin participar empeora el ánimo; conversar, no (dirección, sin cifras).
    const filas: [string, string, string][] = [
      ['pasivo', '↓', 'baja'],
      ['activo', '→', 'igual'],
    ]
    return (
      <figure className="g-grafica">
        <ul className="g-hob-flechas">
          {filas.map(([f, d, c]) => (
            <li key={f} className={c}>
              <i>{d}</i>
              <span>{k(`grafica.${f}`)}</span>
            </li>
          ))}
        </ul>
        <figcaption>{k('grafica.pasivoActivo')}</figcaption>
      </figure>
    )
  }
  if (id === 'maratonRecuerdo') {
    // Horvath y colegas (2017): cuánto recordaban la serie meses después (ilustrativo).
    return <Barras k={k} pie="maratonRecuerdo" filas={[['maraton', 45], ['diario', 82, true], ['semanal', 88, true]]} />
  }
  if (id === 'cortes') {
    // Nelson, Meyvis y Galak (2009): cuánto disfrutaron el mismo programa (ilustrativo).
    return <Barras k={k} pie="cortes" filas={[['sinCortes', 60], ['conCortes', 80, true]]} />
  }
  if (id === 'horasJuego') {
    // Przybylski (2014): ajuste de chicos de 10 a 15 años según horas de juego al día (ilustrativo).
    const filas: [string, number][] = [['ninguna', 55], ['menosUna', 68], ['unaTres', 55], ['masTres', 40]]
    return (
      <figure className="g-grafica g-ent">
        <div className="g-ent-columnasBarras">
          {filas.map(([c, v]) => (
            <div key={c} className={c === 'menosUna' ? 'fuerte' : c === 'masTres' ? 'baja' : ''}>
              <i>
                <b style={{ height: `${v}%` }} />
              </i>
              <span>{k(`grafica.${c}`)}</span>
            </div>
          ))}
        </div>
        <figcaption>{k('grafica.horasJuego')}</figcaption>
      </figure>
    )
  }
  if (id === 'mesaMente') {
    // Altschul y Deary (2020): cuánta agilidad mental perdieron de los 70 a los 79 (ilustrativo).
    return <Barras k={k} pie="mesaMente" filas={[['jugabanMenos', 80], ['jugabanMas', 50, true]]} />
  }
  if (id === 'capsula') {
    // Zhang y colegas (2014): interés al releer la cápsula, lo que esperaban y lo que sintieron (ilustrativo).
    return <Barras k={k} pie="capsula" filas={[['esperaban', 45], ['sintieron', 75, true]]} />
  }
  if (id === 'planEntre') {
    const etapas: [string, string][] = [
      ['semana1', 'g-z1'],
      ['mes1', 'g-z2'],
      ['semanal', 'g-z3'],
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

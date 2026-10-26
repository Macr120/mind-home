import { useEffect, useState, type FormEvent } from 'react'
import type { T } from './datos'
import { Apoyo } from './Video'

/**
 * Lo propio de la guía del Archivo («¿Cómo organizar tu mente?»): sus mini-herramientas y sus
 * gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su línea suena en modo grabación) cada
 * herramienta se usa sola al ritmo de la voz. La de «like, suscríbete y comparte» es la de la
 * guía de Video, sin la barra de la mitad (`apoyoArchivos`).
 */
export const HERRAMIENTAS_ARCHIVOS = new Set(['vaciarMente', 'misCarpetas', 'nombreArchivo', 'apoyoArchivos'])

export function HerramientaArchivos({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`archivos.${id}.${s}`)
  if (id === 'vaciarMente') return <VaciarMente k={k} demo={demo} />
  if (id === 'misCarpetas') return <MisCarpetas k={k} demo={demo} />
  if (id === 'nombreArchivo') return <NombreArchivo k={k} demo={demo} />
  if (id === 'apoyoArchivos') {
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

/** Lo que cabe a la vez en la memoria de trabajo (Cowan, 2001). */
const CABEN = 4

// ───────── Parte 1: vacía tu mente ─────────

/**
 * Escribes lo que traes en la cabeza y se va listando: las primeras cuatro caben en las ranuras
 * de la memoria (Cowan, 2001); las demás «se caen» y piden un lugar fuera de la cabeza.
 */
function VaciarMente({ k, demo }: { k: K; demo: boolean }) {
  const [cosas, setCosas] = useState<string[]>([])
  const [texto, setTexto] = useState('')
  const ejemplos = [1, 2, 3, 4, 5, 6, 7].map((i) => k(`ejemplo${i}`))
  useDemo<string>(demo, ejemplos, 900, (c) => setCosas((l) => [...l, c]), 2500)
  const agregar = (e: FormEvent) => {
    e.preventDefault()
    const c = texto.trim()
    if (!c) return
    setCosas((l) => [...l, c])
    setTexto('')
  }
  const sobran = Math.max(0, cosas.length - CABEN)
  return (
    <div className="g-herramienta g-arc">
      <h4>{k('titulo')}</h4>
      <p className="g-sub">{k('sub')}</p>
      <form className="g-arc-entrada" onSubmit={agregar}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={k('placeholder')} maxLength={80} aria-label={k('placeholder')} />
        <button type="submit" disabled={!texto.trim()}>
          {k('agregar')}
        </button>
      </form>
      <div className="g-arc-cabeza">
        <span className="g-arc-rotulo">{k('caben')}</span>
        <ol className="g-arc-ranuras">
          {Array.from({ length: CABEN }, (_, i) => (
            <li key={i} className={cosas[i] ? 'llena' : ''}>
              {cosas[i] ?? ''}
            </li>
          ))}
        </ol>
      </div>
      {sobran > 0 && (
        <ul className="g-arc-caen" aria-label={k('seCaen')}>
          {cosas.slice(CABEN).map((c, i) => (
            <li key={`${c}-${i}`} style={{ ['--j' as string]: i % 5 }}>
              {c}
            </li>
          ))}
        </ul>
      )}
      <p className="g-hob-total">
        <b>{num(cosas.length)}</b> {k('cargabas')} · {num(CABEN)} {k('caben2')}
      </p>
      <p className={`g-nota${sobran ? ' g-mal' : cosas.length ? ' g-ok' : ''}`}>
        {sobran ? k('sobran').replace('{n}', num(sobran)) : cosas.length ? k('cabe') : k('nota')}
      </p>
      {cosas.length > 0 && (
        <button type="button" className="g-arc-vaciar" onClick={() => setCosas([])}>
          {k('vaciar')}
        </button>
      )}
    </div>
  )
}

// ───────── Parte 4: tus cinco carpetas ─────────

const CARPETAS = ['trabajo', 'casa', 'salud', 'proyectos', 'fotos']

/**
 * Cinco carpetas grandes con nombre editable: escribes una cosa, eliges dónde cae y aparece en
 * su carpeta (pocas, poco profundas y con nombres claros: Bergman y Whittaker, 2008).
 */
function MisCarpetas({ k, demo }: { k: K; demo: boolean }) {
  const [nombres, setNombres] = useState(() => CARPETAS.map((c) => k(`c.${c}`)))
  const [cosas, setCosas] = useState<[string, number][]>([])
  const [texto, setTexto] = useState('')
  const [elegida, setElegida] = useState(0)
  const ejemplos: [string, number][] = [
    [k('ejemplo1'), 2],
    [k('ejemplo2'), 1],
    [k('ejemplo3'), 4],
    [k('ejemplo4'), 0],
    [k('ejemplo5'), 3],
    [k('ejemplo6'), 1],
  ]
  useDemo<[string, number]>(demo, ejemplos, 1000, (c) => {
    setElegida(c[1])
    setCosas((l) => [...l, c])
  }, 2500)
  const agregar = (e: FormEvent) => {
    e.preventDefault()
    const c = texto.trim()
    if (!c) return
    setCosas((l) => [...l, [c, elegida]])
    setTexto('')
  }
  return (
    <div className="g-herramienta g-arc">
      <h4>{k('titulo')}</h4>
      <p className="g-sub">{k('sub')}</p>
      <form className="g-arc-entrada" onSubmit={agregar}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={k('placeholder')} maxLength={60} aria-label={k('placeholder')} />
        <button type="submit" disabled={!texto.trim()}>
          {k('guardar')}
        </button>
      </form>
      <div className="g-opciones">
        <label>
          <span>{k('enCarpeta')}</span>
          <div className="g-segmentos g-segmentos-anchos">
            {nombres.map((n, i) => (
              <button key={i} type="button" className={i === elegida ? 'activo' : ''} onClick={() => setElegida(i)}>
                {n || '…'}
              </button>
            ))}
          </div>
        </label>
      </div>
      <ul className="g-arc-carpetas">
        {nombres.map((n, i) => {
          const dentro = cosas.filter(([, c]) => c === i)
          return (
            <li key={i} className={i === elegida ? 'elegida' : ''} onClick={() => setElegida(i)}>
              <div className="g-arc-pestana" aria-hidden />
              <input
                value={n}
                maxLength={24}
                aria-label={k('nombre')}
                onChange={(e) => setNombres((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <small>{`${num(dentro.length)} ${k(dentro.length === 1 ? 'cosa' : 'cosas')}`}</small>
              <ul>
                {dentro.map(([c], j) => (
                  <li key={`${c}-${j}`}>{c}</li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 6: el buen nombre ─────────

/** La fecha de hoy (local, no UTC) como AAAA-MM-DD. */
function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Un trozo de nombre de archivo: minúsculas, sin acentos latinos, guiones en vez de espacios y sin caracteres prohibidos. */
function trozo(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .toLocaleLowerCase(lang())
    .replace(/[\\/:*?"<>|.,;]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
}

const EXTENSIONES = ['pdf', 'jpg', 'docx']

/**
 * Arma un nombre con la fecha al revés delante (AAAA-MM-DD), qué es y de quién: se previsualiza
 * y, al guardarlo, entra a una lista que se ordena sola por nombre… o sea, por fecha.
 */
function NombreArchivo({ k, demo }: { k: K; demo: boolean }) {
  const [fecha, setFecha] = useState(hoy)
  const [que, setQue] = useState(demo ? '' : k('queEjemplo'))
  const [quien, setQuien] = useState('')
  const [ext, setExt] = useState('pdf')
  const [mios, setMios] = useState<string[]>([])
  const [nuevo, setNuevo] = useState('')
  const partes = [fecha, trozo(que), trozo(quien)].filter(Boolean)
  const nombre = `${partes.join('_')}.${ext}`
  const valido = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && trozo(que) !== ''
  const guardar = (n: string) => {
    setMios((l) => (l.includes(n) ? l : [...l, n]))
    setNuevo(n)
  }
  // Demo: escribe «qué es» letra a letra, pone de quién y lo guarda.
  const escrito = k('queEjemplo')
  useDemo<() => void>(
    demo,
    [
      ...Array.from({ length: Math.ceil(escrito.length / 3) }, (_, i) => () => setQue(escrito.slice(0, (i + 1) * 3))),
      () => setQuien(k('quienEjemplo')),
      () => guardar(`${[hoy(), trozo(escrito), trozo(k('quienEjemplo'))].join('_')}.pdf`),
    ],
    260,
    (f) => f(),
    2500,
  )
  // Los de ejemplo: con fecha delante (se ordenan solos) y, aparte, los de nombre «al azar».
  const buenos = [1, 2, 3, 4].map((i) => k(`archivo${i}`))
  const lista = [...buenos, ...mios].sort()
  return (
    <div className="g-herramienta g-arc">
      <h4>{k('titulo')}</h4>
      <div className="g-arc-campos">
        <label>
          <span>{k('fecha')}</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label>
          <span>{k('que')}</span>
          <input value={que} onChange={(e) => setQue(e.target.value)} placeholder={k('quePlaceholder')} maxLength={40} />
        </label>
        <label>
          <span>{k('quien')}</span>
          <input value={quien} onChange={(e) => setQuien(e.target.value)} placeholder={k('quienPlaceholder')} maxLength={24} />
        </label>
      </div>
      <div className="g-opciones">
        <label>
          <span>{k('tipo')}</span>
          <div className="g-segmentos g-segmentos-anchos">
            {EXTENSIONES.map((e) => (
              <button key={e} type="button" className={e === ext ? 'activo' : ''} onClick={() => setExt(e)}>
                .{e}
              </button>
            ))}
          </div>
        </label>
      </div>
      <div className="g-arc-nombre">
        <code>
          <b>{fecha}</b>
          {partes.slice(1).map((p, i) => (
            <span key={i}>
              _<em className={i === 0 ? 'que' : 'quien'}>{p}</em>
            </span>
          ))}
          .{ext}
        </code>
        <button type="button" disabled={!valido} onClick={() => guardar(nombre)}>
          {k('guardar')}
        </button>
      </div>
      <div className="g-arc-dos">
        <div>
          <b>{k('asi')}</b>
          <ol className="g-arc-lista">
            {lista.map((n) => (
              <li key={n} className={n === nuevo ? 'nuevo' : ''}>
                {n}
              </li>
            ))}
          </ol>
        </div>
        <div className="g-arc-mal">
          <b>{k('asiNo')}</b>
          <ol className="g-arc-lista">
            {[1, 2, 3, 4].map((i) => (
              <li key={i}>{k(`malo${i}`)}</li>
            ))}
          </ol>
        </div>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_ARCHIVOS = new Set(['cuatro', 'donde', 'navegar', 'competencia', 'acumular', 'planArchivos'])

/** Una fila de ranuras de memoria: `llenas` de `total`, con su rótulo. */
function Ranuras({ k, rotulo, total, llenas, fuerte }: { k: K; rotulo: string; total: number; llenas: number; fuerte?: boolean }) {
  return (
    <div className={`g-arc-fila${fuerte ? ' fuerte' : ''}`}>
      <span>{k(`grafica.${rotulo}`)}</span>
      <ol className="g-arc-ranuras g-arc-mini">
        {Array.from({ length: total }, (_, i) => (
          <li key={i} className={i < llenas ? 'llena' : 'hueca'} style={{ ['--j' as string]: i }} />
        ))}
      </ol>
      <em>≈{num(llenas)}</em>
    </div>
  )
}

export function GraficaArchivos({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'cuatro') {
    // Miller (1956): «siete, más o menos dos»; Cowan (2001), con decenas de experimentos: unas cuatro.
    return (
      <figure className="g-grafica g-arc">
        <Ranuras k={k} rotulo="miller" total={7} llenas={7} />
        <Ranuras k={k} rotulo="cowan" total={7} llenas={4} fuerte />
        <figcaption>{k('grafica.cuatro')}</figcaption>
      </figure>
    )
  }
  if (id === 'donde') {
    // Sparrow y colegas (2011): quienes creían que se guardaba recordaron menos el dato, pero bien la carpeta (cualitativo, sin cifras).
    const filas: [string, number, boolean?][] = [
      ['queBorra', 75],
      ['queGuarda', 40],
      ['dondeGuarda', 80, true],
    ]
    return (
      <figure className="g-grafica g-arc">
        <div className="g-arc-sparrow">
          <div>
            <b>{k('grafica.que')}</b>
            <div className="g-met-barras">
              {filas.slice(0, 2).map(([c, w]) => (
                <div key={c} className={c === 'queBorra' ? 'fuerte' : ''}>
                  <span>{k(`grafica.${c}`)}</span>
                  <i>
                    <b style={{ width: `${w}%` }} />
                  </i>
                  <em>{k(c === 'queBorra' ? 'grafica.mas' : 'grafica.menos')}</em>
                </div>
              ))}
            </div>
          </div>
          <div>
            <b>{k('grafica.donde')}</b>
            <div className="g-met-barras">
              <div className="fuerte">
                <span>{k('grafica.dondeGuarda')}</span>
                <i>
                  <b style={{ width: '80%' }} />
                </i>
                <em>{k('grafica.bien')}</em>
              </div>
            </div>
          </div>
        </div>
        <figcaption>{k('grafica.dondePie')}</figcaption>
      </figure>
    )
  }
  if (id === 'navegar') {
    // Bergman y colegas (2008): se llega navegando por carpetas el 56-68 % de las veces; con el buscador, el 4-15 %.
    const filas: [string, number, number, boolean?][] = [
      ['navegando', 56, 68, true],
      ['buscador', 4, 15],
    ]
    return (
      <figure className="g-grafica g-arc">
        <div className="g-arc-rangos">
          {filas.map(([c, de, a, fuerte]) => (
            <div key={c} className={fuerte ? 'fuerte' : ''}>
              <span>{k(`grafica.${c}`)}</span>
              <i>
                <b style={{ insetInlineStart: `${de}%`, width: `${a - de}%` }} />
                <s style={{ width: `${de}%` }} />
              </i>
              <em>{`${num(de)}–${num(a)} %`}</em>
            </div>
          ))}
        </div>
        <figcaption>{k('grafica.navegar')}</figcaption>
      </figure>
    )
  }
  if (id === 'competencia') {
    // McMains y Kastner (2011): con muchos objetos a la vista, compiten por la atención (ilustrativo).
    const muchos: [number, number, number][] = [
      [40, 40, 0], [90, 30, 1], [150, 45, 2], [35, 100, 3], [160, 105, 4], [60, 150, 5], [140, 150, 6], [100, 160, 7], [20, 160, 0], [175, 70, 2],
    ]
    const COL = ['#f97316', '#a855f7', '#22c55e', '#ef4444', '#eab308', '#ec4899', '#14b8a6', '#6366f1']
    return (
      <figure className="g-grafica g-arc">
        <div className="g-arc-paneles">
          <div>
            <svg viewBox="0 0 200 190" role="img" aria-label={k('grafica.solo')}>
              <circle cx="100" cy="95" r="50" className="g-arc-halo" />
              <rect x="78" y="73" width="44" height="44" rx="10" className="g-arc-objeto" />
            </svg>
            <b>{k('grafica.solo')}</b>
            <div className="g-arc-atencion">
              <i>
                <b style={{ width: '92%' }} />
              </i>
              <small>{k('grafica.atencion')}</small>
            </div>
          </div>
          <div>
            <svg viewBox="0 0 200 190" role="img" aria-label={k('grafica.muchos')}>
              {muchos.map(([x, y], i) => (
                <line key={`l${i}`} x1="100" y1="95" x2={x} y2={y} className="g-arc-tiron" />
              ))}
              {muchos.map(([x, y, c], i) => (
                <circle key={i} cx={x} cy={y} r={i % 3 ? 11 : 14} fill={COL[c]} className="g-arc-distrae" style={{ ['--j' as string]: i }} />
              ))}
              <rect x="86" y="81" width="28" height="28" rx="7" className="g-arc-objeto" />
            </svg>
            <b>{k('grafica.muchos')}</b>
            <div className="g-arc-atencion">
              <i>
                <b style={{ width: '30%' }} />
              </i>
              <small>{k('grafica.atencion')}</small>
            </div>
          </div>
        </div>
        <figcaption>{k('grafica.competencia')}</figcaption>
      </figure>
    )
  }
  if (id === 'acumular') {
    // Sweeten y colegas (2018): el montón «por si acaso» da estrés en vez de calma (cualitativo).
    const columnas: [string, number, number, string][] = [
      ['porSiAcaso', 14, 85, 'estres'],
      ['loQueUsas', 4, 80, 'calma'],
    ]
    return (
      <figure className="g-grafica g-arc">
        <div className="g-arc-paneles">
          {columnas.map(([c, hojas, nivel, efecto]) => (
            <div key={c} className={c === 'porSiAcaso' ? 'g-arc-pesa' : 'g-arc-ligero'}>
              <div className="g-arc-monton" aria-hidden>
                {Array.from({ length: hojas }, (_, i) => (
                  <span key={i} style={{ ['--j' as string]: i, ['--g' as string]: `${((i * 37) % 9) - 4}deg` }} />
                ))}
              </div>
              <b>{k(`grafica.${c}`)}</b>
              <div className="g-arc-atencion">
                <i>
                  <b style={{ width: `${nivel}%` }} />
                </i>
                <small>{k(`grafica.${efecto}`)}</small>
              </div>
            </div>
          ))}
        </div>
        <figcaption>{k('grafica.acumular')}</figcaption>
      </figure>
    )
  }
  if (id === 'planArchivos') {
    const etapas: [string, string][] = [
      ['semana1', 'g-z1'],
      ['mes1', 'g-z2'],
      ['cadaMes', 'g-z3'],
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

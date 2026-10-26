import { useEffect, useState, type FormEvent } from 'react'
import { ANIMOS, colorDeAnimo } from '../../../src/rooms/anecdotario/animos'
import type { T } from './datos'
import { Apoyo } from './Video'

/**
 * Lo propio de la guía del Anecdotario («¿Cómo guardar tus mejores recuerdos?»): sus
 * mini-herramientas y sus gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su línea suena en
 * modo grabación) cada herramienta se usa sola al ritmo de la voz. La de «like, suscríbete y
 * comparte» es la de la guía de Video, sin la barra de la mitad (`apoyoAnecdotario`).
 */
export const HERRAMIENTAS_ANECDOTARIO = new Set(['recuerdoDelDia', 'primerasVeces', 'apoyoAnecdotario'])

export function HerramientaAnecdotario({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`anecdotario.${id}.${s}`)
  if (id === 'recuerdoDelDia') return <RecuerdoDelDia k={k} demo={demo} />
  if (id === 'primerasVeces') return <PrimerasVeces k={k} demo={demo} />
  if (id === 'apoyoAnecdotario') {
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

/** El nombre de cada carita, en el orden de `ANIMOS` de la app. */
const NOMBRES_ANIMO = ['feliz', 'bien', 'neutral', 'triste', 'estresado', 'emocionado', 'cansado']

// ───────── Parte 1: el recuerdo del día ─────────

interface Recuerdo { que: string; quien: string; donde: string; animo: number }

/**
 * Qué pasó, con quién y dónde (las mejores pistas del diario de Wagenaar, 1986) más una carita
 * de ánimo: arma la tarjeta del recuerdo con la fecha de hoy, pintada del color de ese ánimo
 * (como el calendario del Anecdotario de la app).
 */
function RecuerdoDelDia({ k, demo }: { k: K; demo: boolean }) {
  const [r, setR] = useState<Recuerdo>(() => (demo ? { que: '', quien: '', donde: '', animo: 0 } : { que: k('queEjemplo'), quien: k('quienEjemplo'), donde: k('dondeEjemplo'), animo: 0 }))
  const [guardados, setGuardados] = useState<Recuerdo[]>([])
  const pon = (c: Partial<Recuerdo>) => setR((v) => ({ ...v, ...c }))
  // El mismo recuerdo dos veces seguidas no se repite en la lista.
  const guardar = (x: Recuerdo) => setGuardados((l) => (l[0] && JSON.stringify(l[0]) === JSON.stringify(x) ? l : [x, ...l].slice(0, 4)))
  // Demo: escribe «qué pasó» de tres en tres letras, luego con quién, dónde, la carita y guarda.
  const escrito = k('queEjemplo')
  const ejemplo: Recuerdo = { que: escrito, quien: k('quienEjemplo'), donde: k('dondeEjemplo'), animo: 5 }
  useDemo<() => void>(
    demo,
    [
      ...Array.from({ length: Math.ceil(escrito.length / 3) }, (_, i) => () => pon({ que: escrito.slice(0, (i + 1) * 3) })),
      () => pon({ quien: ejemplo.quien }),
      () => pon({ donde: ejemplo.donde }),
      () => pon({ animo: 0 }),
      () => pon({ animo: 5 }),
      () => guardar(ejemplo),
    ],
    220,
    (f) => f(),
    2200,
  )
  const fecha = new Intl.DateTimeFormat(lang(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const listo = r.que.trim() !== ''
  const pistas = [r.que, r.quien, r.donde].filter((s) => s.trim()).length
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (listo) guardar({ ...r, que: r.que.trim(), quien: r.quien.trim(), donde: r.donde.trim() })
  }
  return (
    <div className="g-herramienta g-anc">
      <h4>{k('titulo')}</h4>
      <p className="g-sub">{k('sub')}</p>
      <form className="g-anc-form" onSubmit={enviar}>
        <label className="g-anc-que">
          <span>{k('que')}</span>
          <textarea value={r.que} onChange={(e) => pon({ que: e.target.value })} placeholder={k('quePlaceholder')} maxLength={160} rows={2} />
        </label>
        <label>
          <span>{k('quien')}</span>
          <input value={r.quien} onChange={(e) => pon({ quien: e.target.value })} placeholder={k('quienPlaceholder')} maxLength={40} />
        </label>
        <label>
          <span>{k('donde')}</span>
          <input value={r.donde} onChange={(e) => pon({ donde: e.target.value })} placeholder={k('dondePlaceholder')} maxLength={40} />
        </label>
        <div className="g-anc-animos" role="radiogroup" aria-label={k('animo')}>
          <span>{k('animo')}</span>
          <div>
            {ANIMOS.map((a, i) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={i === r.animo}
                title={k(`animos.${NOMBRES_ANIMO[i]}`)}
                className={i === r.animo ? 'activo' : ''}
                style={{ ['--c' as string]: colorDeAnimo(a) }}
                onClick={() => pon({ animo: i })}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="g-anc-guardar" disabled={!listo}>
          {k('guardar')}
        </button>
      </form>
      <article className="g-anc-tarjeta" style={{ ['--c' as string]: colorDeAnimo(ANIMOS[r.animo]) }}>
        <header>
          <time>{fecha}</time>
          <span className="g-anc-carita" title={k(`animos.${NOMBRES_ANIMO[r.animo]}`)}>
            {ANIMOS[r.animo]}
          </span>
        </header>
        <p className={r.que.trim() ? '' : 'vacio'}>{r.que.trim() || k('vacio')}</p>
        <footer>
          {r.quien.trim() && (
            <span>
              {k('con')} <b>{r.quien.trim()}</b>
            </span>
          )}
          {r.donde.trim() && (
            <span>
              {k('en')} <b>{r.donde.trim()}</b>
            </span>
          )}
          <small>{k(`animos.${NOMBRES_ANIMO[r.animo]}`)}</small>
        </footer>
      </article>
      <p className="g-hob-total">
        <b>{num(pistas)}/3</b> {k('pistas')}
      </p>
      {guardados.length > 0 && (
        <ul className="g-anc-guardados" aria-label={k('tusRecuerdos')}>
          {guardados.map((g, i) => (
            <li key={`${g.que}-${guardados.length - i}`} style={{ ['--c' as string]: colorDeAnimo(ANIMOS[g.animo]) }}>
              <span>{ANIMOS[g.animo]}</span>
              <b>{g.que}</b>
            </li>
          ))}
        </ul>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 4: tus primeras veces ─────────

const IDEAS = ['camino', 'receta', 'clase', 'lugar', 'persona', 'musica', 'deporte', 'amanecer']
/** Una por semana: la meta del mes. */
const META_MES = 4

/**
 * Ideas de primeras veces para marcar (y las tuyas, escritas): lo nuevo se graba y lo que se
 * repite se funde (la joroba de los recuerdos, Rubin y colegas, 1986). Cuenta cuántas llevas
 * para el mes, contra una por semana.
 */
function PrimerasVeces({ k, demo }: { k: K; demo: boolean }) {
  const [marcadas, setMarcadas] = useState<string[]>(demo ? [] : ['camino'])
  const [propias, setPropias] = useState<string[]>([])
  const [texto, setTexto] = useState('')
  const cambia = (c: string) => setMarcadas((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]))
  useDemo<() => void>(demo, [() => cambia('camino'), () => cambia('receta'), () => cambia('clase'), () => setPropias((l) => [...l, k('propiaEjemplo')])], 1300, (f) => f(), 3000)
  const agregar = (e: FormEvent) => {
    e.preventDefault()
    const c = texto.trim()
    if (!c) return
    setPropias((l) => [...l, c])
    setTexto('')
  }
  const total = marcadas.length + propias.length
  return (
    <div className="g-herramienta g-anc">
      <h4>{k('titulo')}</h4>
      <p className="g-sub">{k('sub')}</p>
      <ul className="g-anc-ideas">
        {IDEAS.map((c) => (
          <li key={c}>
            <button type="button" className={marcadas.includes(c) ? 'activo' : ''} aria-pressed={marcadas.includes(c)} onClick={() => cambia(c)}>
              <i aria-hidden>{marcadas.includes(c) ? '✓' : '+'}</i>
              {k(`ideas.${c}`)}
            </button>
          </li>
        ))}
        {propias.map((c, i) => (
          <li key={`${c}-${i}`} className="propia">
            <button type="button" className="activo" onClick={() => setPropias((l) => l.filter((_, j) => j !== i))} title={k('quitar')}>
              <i aria-hidden>✓</i>
              {c}
            </button>
          </li>
        ))}
      </ul>
      <form className="g-arc-entrada g-anc-entrada" onSubmit={agregar}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={k('placeholder')} maxLength={60} aria-label={k('placeholder')} />
        <button type="submit" disabled={!texto.trim()}>
          {k('agregar')}
        </button>
      </form>
      <ol className="g-anc-semanas" aria-label={k('mes')}>
        {Array.from({ length: META_MES }, (_, i) => (
          <li key={i} className={i < total ? 'llena' : ''}>
            <small>{`${k('semana')} ${num(i + 1)}`}</small>
            <span>{i < total ? '★' : ''}</span>
          </li>
        ))}
      </ol>
      <p className="g-hob-total">
        <b>{num(total)}</b> {k(total === 1 ? 'una' : 'cuantas')}
      </p>
      <p className={`g-nota${total >= META_MES ? ' g-ok' : ''}`}>{total >= META_MES ? k('listo') : k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_ANECDOTARIO = new Set(['palabra', 'joroba', 'sentidos', 'revivir', 'familia', 'planAnecdotario'])

/** Dos autos que se acercan: con «estrellaron», abollados y con vidrios por el piso (que en el video no había). */
function Choque({ fuerte }: { fuerte: boolean }) {
  const auto = (x: number, color: string, giro: number) => (
    <g transform={`translate(${x} 0) rotate(${giro} 40 70)`}>
      <rect x="4" y="52" width="72" height="22" rx="7" fill={color} />
      <path d="M18 52 L28 36 H54 L64 52 Z" fill={color} />
      <path d="M24 51 L31 40 H51 L58 51 Z" className="g-anc-vidrio" />
      <circle cx="20" cy="76" r="8" className="g-anc-llanta" />
      <circle cx="60" cy="76" r="8" className="g-anc-llanta" />
    </g>
  )
  return (
    <svg viewBox="0 0 200 100" aria-hidden className={fuerte ? 'g-anc-choque fuerte' : 'g-anc-choque'}>
      <line x1="0" y1="86" x2="200" y2="86" className="g-eje" />
      <g className="g-anc-izq">{auto(fuerte ? 22 : 16, '#a78bfa', fuerte ? -6 : 0)}</g>
      <g className="g-anc-der">{auto(fuerte ? 98 : 104, '#f59e0b', fuerte ? 7 : 0)}</g>
      {fuerte && (
        <g className="g-anc-rotos">
          {[[96, 82], [104, 84], [88, 84], [110, 81], [100, 79]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y} l4 -3 l2 4 Z`} />
          ))}
        </g>
      )}
    </svg>
  )
}

/** Un panel con su título, su valor y una barra (ancho en %). */
function Medida({ rotulo, valor, ancho, fuerte }: { rotulo: string; valor: string; ancho: number; fuerte?: boolean }) {
  return (
    <div className={`g-anc-medida${fuerte ? ' fuerte' : ''}`}>
      <span>{rotulo}</span>
      <i>
        <b style={{ width: `${ancho}%` }} />
      </i>
      <em>{valor}</em>
    </div>
  )
}

export function GraficaAnecdotario({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'palabra') {
    // Loftus y Palmer (1974): «smashed» ≈ 40,8 mph y «contacted» ≈ 31,8 mph; a la semana, «vidrios rotos» el 32 % con «smashed»
    // (la comparación del vidrio fue contra «hit», no contra «contacted»: por eso «tocaron» no lleva barra de vidrios).
    const filas: [string, number, number | null, boolean][] = [
      ['tocaron', 32, null, false],
      ['estrellaron', 41, 32, true],
    ]
    return (
      <figure className="g-grafica g-anc">
        <div className="g-arc-paneles">
          {filas.map(([c, mph, vidrios, fuerte]) => (
            <div key={c} className={fuerte ? 'g-anc-panel fuerte' : 'g-anc-panel'}>
              <p className="g-anc-pregunta">
                {k('grafica.pregunta').split('{verbo}')[0]}
                <mark>{k(`grafica.${c}`)}</mark>
                {k('grafica.pregunta').split('{verbo}')[1]}
              </p>
              <Choque fuerte={fuerte} />
              <Medida rotulo={k('grafica.velocidad')} valor={`≈${num(mph)} mph`} ancho={(mph / 50) * 100} fuerte={fuerte} />
              {vidrios !== null && <Medida rotulo={k('grafica.vidrios')} valor={`${num(vidrios)} %`} ancho={(vidrios / 40) * 100} fuerte={fuerte} />}
            </div>
          ))}
        </div>
        <figcaption>{k('grafica.palabra')}</figcaption>
      </figure>
    )
  }
  if (id === 'joroba') {
    // Rubin y colegas (1986): recuerdos por edad en que ocurrieron, en personas mayores; la joroba entre los 10 y los 30 (ilustrativo).
    const puntos = [2, 6, 26, 55, 72, 62, 40, 27, 21, 19, 20, 24, 34, 58]
    const x = (i: number) => 40 + (i / (puntos.length - 1)) * 340
    const y = (v: number) => 140 - v * 1.3
    const camino = puntos.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
    const area = `${camino} L${x(puntos.length - 1)} 140 L${x(0)} 140 Z`
    // Cada punto son 5 años: la franja va de los 10 (i = 2) a los 30 (i = 6).
    return (
      <figure className="g-grafica g-anc">
        <svg viewBox="0 0 400 180" role="img" aria-label={k('grafica.joroba')}>
          <rect x={x(2)} y="20" width={x(6) - x(2)} height="120" rx="8" className="g-anc-franja" />
          <line x1="30" y1="140" x2="390" y2="140" className="g-eje" />
          <path d={area} className="g-anc-area" />
          <path d={camino} className="g-curva g-anc-curva" />
          <text x={(x(2) + x(6)) / 2} y="132" textAnchor="middle" className="g-rotulo g-fuerte">
            {k('grafica.laJoroba')}
          </text>
          {[0, 2, 6, 10, 13].map((i) => (
            <text key={i} x={x(i)} y="160" textAnchor={i === 0 ? 'start' : i === 13 ? 'end' : 'middle'} className="g-rotulo">
              {num(i * 5)}
            </text>
          ))}
          <text x={x(13)} y={y(puntos[13]) - 10} textAnchor="end" className="g-rotulo">
            {k('grafica.recientes')}
          </text>
          <text x="30" y="14" className="g-rotulo">
            {k('grafica.recuerdos')}
          </text>
          <text x="390" y="176" textAnchor="end" className="g-rotulo">
            {k('grafica.edad')}
          </text>
        </svg>
        <figcaption>{k('grafica.joroba')}</figcaption>
      </figure>
    )
  }
  if (id === 'sentidos') {
    // Herz (2004): los recuerdos que despierta un olor son más emotivos y transportan más que los de la vista o el oído (cualitativo).
    const sentidos: [string, string, number, boolean?][] = [
      ['vista', '👁️', 55],
      ['oido', '👂', 58],
      ['olfato', '👃', 88, true],
    ]
    return (
      <figure className="g-grafica g-anc">
        <ul className="g-anc-sentidos">
          {sentidos.map(([c, icono, nivel, fuerte], i) => (
            <li key={c} className={fuerte ? 'fuerte' : ''} style={{ ['--j' as string]: i }}>
              <span className="g-anc-icono" aria-hidden>
                {icono}
              </span>
              <b>{k(`grafica.${c}`)}</b>
              <div className="g-anc-nivel">
                <i>
                  <b style={{ height: `${nivel}%` }} />
                </i>
              </div>
              <small>{k(fuerte ? 'grafica.masEmotivo' : 'grafica.emotivo')}</small>
            </li>
          ))}
        </ul>
        <figcaption>{k('grafica.sentidos')}</figcaption>
      </figure>
    )
  }
  if (id === 'revivir') {
    // Bryant y colegas (2005): una semana reviviendo buenos recuerdos 10 min dos veces al día → más felicidad que el grupo de control (cualitativo).
    const dias = 7
    const x = (i: number) => 50 + (i / (dias - 1)) * 320
    // Solo la franja de 40 a 75: la diferencia entre los grupos se ve sin inventar cifras.
    const y = (v: number) => 140 - (v - 40) * 3
    const revive = [50, 54, 58, 61, 64, 67, 70]
    const control = [50, 51, 49, 50, 51, 50, 51]
    const linea = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
    return (
      <figure className="g-grafica g-anc">
        <svg viewBox="0 0 400 190" role="img" aria-label={k('grafica.revivir')}>
          <line x1="40" y1="140" x2="390" y2="140" className="g-eje" />
          <path d={linea(control)} className="g-curva g-anc-control" />
          <path d={linea(revive)} className="g-curva g-anc-curva" />
          {revive.map((v, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(v)} r="5" className="g-anc-punto" />
              {/* Dos sesiones de 10 min cada día */}
              <rect x={x(i) - 9} y="146" width="7" height="7" rx="2" className="g-anc-sesion" />
              <rect x={x(i) + 2} y="146" width="7" height="7" rx="2" className="g-anc-sesion" />
              <text x={x(i)} y="168" textAnchor="middle" className="g-rotulo">
                {`${k('grafica.dia')} ${num(i + 1)}`}
              </text>
            </g>
          ))}
          <text x={x(dias - 1)} y={y(revive[dias - 1]) - 12} textAnchor="end" className="g-rotulo g-fuerte">
            {k('grafica.reviven')}
          </text>
          <text x={x(dias - 1)} y={y(control[dias - 1]) + 18} textAnchor="end" className="g-rotulo">
            {k('grafica.control')}
          </text>
          <text x="40" y="14" className="g-rotulo">
            {k('grafica.felicidad')}
          </text>
          <text x="390" y="186" textAnchor="end" className="g-rotulo">
            {k('grafica.sesiones')}
          </text>
        </svg>
        <figcaption>{k('grafica.revivir')}</figcaption>
      </figure>
    )
  }
  if (id === 'familia') return <Familia k={k} />
  if (id === 'planAnecdotario') {
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

/**
 * Duke y Fivush: la escala «¿Sabes…?» (20 preguntas sobre la familia). Cuatro de ejemplo para
 * tocar; quienes sabían más historias tenían más confianza en sí mismos (cualitativo).
 */
function Familia({ k }: { k: K }) {
  const preguntas = [1, 2, 3, 4]
  const [se, setSe] = useState<number[]>([])
  const cambia = (i: number) => setSe((l) => (l.includes(i) ? l.filter((x) => x !== i) : [...l, i]))
  return (
    <figure className="g-grafica g-anc">
      <p className="g-anc-escala">{k('grafica.escala')}</p>
      <ul className="g-anc-sabes">
        {preguntas.map((i) => (
          <li key={i}>
            <button type="button" className={se.includes(i) ? 'activo' : ''} aria-pressed={se.includes(i)} onClick={() => cambia(i)}>
              <i aria-hidden>{se.includes(i) ? '✓' : '?'}</i>
              {k(`grafica.sabes${i}`)}
            </button>
          </li>
        ))}
      </ul>
      <p className="g-hob-total">
        <b>
          {num(se.length)}/{num(preguntas.length)}
        </b>{' '}
        {k('grafica.sabesTotal')}
      </p>
      <div className="g-met-barras">
        <div>
          <span>{k('grafica.pocas')}</span>
          <i>
            <b style={{ width: '38%' }} />
          </i>
        </div>
        <div className="fuerte">
          <span>{k('grafica.muchas')}</span>
          <i>
            <b style={{ width: '82%' }} />
          </i>
        </div>
      </div>
      <figcaption>{k('grafica.familia')}</figcaption>
    </figure>
  )
}

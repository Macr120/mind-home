import { useEffect, useState } from 'react'
import type { T } from './datos'
import { Apoyo } from './Video'

/**
 * Lo propio de la guía de Noticias («En búsqueda de la verdad y la belleza: periodismo y
 * contenido»): sus mini-herramientas y sus gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su
 * línea suena en modo grabación) cada herramienta se usa sola al ritmo de la voz. La de «like,
 * suscríbete y comparte» es la de la guía de Video, sin la barra de la mitad (`apoyoNoticias`).
 */
export const HERRAMIENTAS_NOTICIAS = new Set(['titularNegativo', 'verificador', 'dietaNoticias', 'apoyoNoticias'])

export function HerramientaNoticias({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`noticias.${id}.${s}`)
  if (id === 'titularNegativo') return <TitularNegativo k={k} demo={demo} />
  if (id === 'verificador') return <Verificador k={k} demo={demo} />
  if (id === 'dietaNoticias') return <DietaNoticias k={k} demo={demo} />
  if (id === 'apoyoNoticias') {
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

/** Un texto con las palabras entre *asteriscos* resaltadas (las negativas del titular). */
function Resaltado({ texto }: { texto: string }) {
  return <>{texto.split('*').map((s, i) => (i % 2 ? <mark key={i}>{s}</mark> : s))}</>
}

// ───────── Parte 3: el titular negativo ─────────

/**
 * El mismo titular con 0 a 3 palabras negativas → cuántos clics de más: cada palabra negativa
 * de más subía los clics un 2,3 % (Robertson y colegas, 2023, con los titulares de Upworthy).
 */
function TitularNegativo({ k, demo }: { k: K; demo: boolean }) {
  const [n, setN] = useState(0)
  useDemo<number>(demo, [1, 2, 3], 1500, setN, 3500)
  return (
    <div className="g-herramienta g-not">
      <h4>{k('titulo')}</h4>
      <label>
        <span>{k('palabras')}</span>
        <Segmentos valores={[0, 1, 2, 3]} valor={n} set={setN} rotulo={(v) => num(v)} />
      </label>
      <p className="g-not-titular" key={n}>
        <Resaltado texto={k(`titular${n}`)} />
      </p>
      <p className="g-hob-total">
        <b>+{num(n * 2.3, 1)} %</b> {k('clics')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 5: el chequeo de cuatro preguntas ─────────

/** Las cuatro preguntas de la lectura lateral: se marcan una a una y la barra se llena. */
function Verificador({ k, demo }: { k: K; demo: boolean }) {
  const PREGUNTAS = ['quien', 'otros', 'evidencia', 'emocion']
  const [hechas, setHechas] = useState<string[]>([])
  useDemo<string>(demo, PREGUNTAS, 1300, (p) => setHechas((h) => [...h, p]), 3000)
  const alternar = (p: string) => setHechas((h) => (h.includes(p) ? h.filter((x) => x !== p) : [...h, p]))
  const listo = hechas.length === PREGUNTAS.length
  return (
    <div className="g-herramienta g-not">
      <h4>{k('titulo')}</h4>
      <ul className="g-not-checks">
        {PREGUNTAS.map((p) => (
          <li key={p}>
            <button type="button" className={hechas.includes(p) ? 'hecha' : ''} onClick={() => alternar(p)}>
              <i aria-hidden>{hechas.includes(p) ? '✓' : ''}</i>
              {k(p)}
            </button>
          </li>
        ))}
      </ul>
      <div className="g-not-medidor" aria-hidden>
        <b style={{ width: `${(hechas.length / PREGUNTAS.length) * 100}%` }} />
      </div>
      <p className="g-hob-total">{listo ? <b>{k('listo')}</b> : k('falta')}</p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 7: las horas de noticias ─────────

/** Horas al día de noticias → horas (y días enteros) al año; con 6 o más, las del grupo más estresado (Holman y colegas, 2014). */
function DietaNoticias({ k, demo }: { k: K; demo: boolean }) {
  const [horas, setHoras] = useState(demo ? 0.5 : 2)
  useDemo<number>(demo, [1, 2, 4, 6], 1300, setHoras, 3000)
  const ano = horas * 365
  return (
    <div className="g-herramienta g-not">
      <h4>{k('titulo')}</h4>
      <label>
        <span>{k('alDia')}</span>
        <Segmentos valores={[0.5, 1, 2, 4, 6]} valor={horas} set={setHoras} rotulo={(v) => `${num(v, 1)} h`} />
      </label>
      <div className="g-hob-dos">
        <div>
          <b>{k('horasAno')}</b>
          <em>{num(ano)}</em>
        </div>
        <div>
          <b>{k('diasAno')}</b>
          <em>{num(ano / 24)}</em>
        </div>
      </div>
      <p className={`g-not-aviso ${horas >= 6 ? 'alto' : ''}`}>{horas >= 6 ? k('mucho') : k('bien')}</p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_NOTICIAS = new Set(['evitan', 'negatividad', 'mentira', 'estres', 'planNoticias'])

/** Barras horizontales (anchos en %); la `fuerte` resaltada. */
function Barras({ filas, k, pie }: { filas: [string, number, boolean?, string?][]; k: K; pie: string }) {
  return (
    <figure className="g-grafica g-not">
      <div className="g-met-barras">
        {filas.map(([c, w, fuerte, valor]) => (
          <div key={c} className={fuerte ? 'fuerte' : ''}>
            <span>
              {k(`grafica.${c}`)}
              {valor ? ` · ${valor}` : ''}
            </span>
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

export function GraficaNoticias({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'evitan') {
    // Digital News Report del Instituto Reuters: quienes a veces o seguido evitan las noticias (29 % en 2017 → 39 % en 2024).
    const filas: [number, number][] = [[2017, 29], [2019, 32], [2022, 38], [2024, 39]]
    return (
      <figure className="g-grafica g-not">
        <div className="g-ent-columnasBarras">
          {filas.map(([a, v], i) => (
            <div key={a} className={i === filas.length - 1 ? 'fuerte' : ''}>
              <i>
                <b style={{ height: `${(v / 45) * 100}%` }} />
              </i>
              <span>
                {a} · {num(v)} %
              </span>
            </div>
          ))}
        </div>
        <figcaption>{k('grafica.evitan')}</figcaption>
      </figure>
    )
  }
  if (id === 'negatividad') {
    // Robertson y colegas (2023): cada palabra negativa de más, +2,3 % de clics; cada positiva, −1 %.
    return <Barras k={k} pie="negatividad" filas={[['negativa', 92, true, `+${num(2.3, 1)} %`], ['positiva', 40, false, `−${num(1)} %`]]} />
  }
  if (id === 'mentira') {
    // Vosoughi, Roy y Aral (2018): lo falso llegaba a 1500 personas unas seis veces más rápido que lo verdadero.
    return <Barras k={k} pie="mentira" filas={[['verdadera', 100, false, `×${num(6)}`], ['falsa', 17, true, `×${num(1)}`]]} />
  }
  if (id === 'estres') {
    // Holman, Garfin y Silver (2014): 6 h o más al día de cobertura, más estrés agudo que haber estado ahí (ilustrativo).
    return <Barras k={k} pie="estres" filas={[['ahi', 58], ['poca', 30], ['seisHoras', 78, true]]} />
  }
  if (id === 'planNoticias') {
    const etapas: [string, string][] = [
      ['semana1', 'g-z1'],
      ['mes1', 'g-z2'],
      ['cadaMes', 'g-z3'],
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

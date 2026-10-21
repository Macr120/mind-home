import { useEffect, useState } from 'react'
import type { T } from './datos'
import { Apoyo } from './Video'

/**
 * Lo propio de la guía de Ideas («¿Cómo tener mejores ideas?»): sus mini-herramientas y sus
 * gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su línea suena en modo grabación) cada
 * herramienta se usa sola al ritmo de la voz. La de «like, suscríbete y comparte» es la de la
 * guía de Video, sin la barra de la mitad (`apoyoIdeas`).
 */
export const HERRAMIENTAS_IDEAS = new Set(['muchasIdeas', 'lluviaSolo', 'balanzaFranklin', 'apoyoIdeas'])

export function HerramientaIdeas({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`ideas.${id}.${s}`)
  if (id === 'muchasIdeas') return <MuchasIdeas k={k} demo={demo} />
  if (id === 'lluviaSolo') return <LluviaSolo k={k} demo={demo} />
  if (id === 'balanzaFranklin') return <BalanzaFranklin k={k} demo={demo} />
  if (id === 'apoyoIdeas') {
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

// ───────── Parte 1: muchas ideas ─────────

/** Ideas a la semana × 52 → ideas al año; si una de cada diez es buena, las buenas (una bombilla por cada diez). */
function MuchasIdeas({ k, demo }: { k: K; demo: boolean }) {
  const [semana, setSemana] = useState(demo ? 3 : 7)
  useDemo<number>(demo, [7, 15, 30], 1400, setSemana, 3500)
  const ano = semana * 52
  const buenas = Math.round(ano / 10)
  return (
    <div className="g-herramienta g-ide">
      <h4>{k('titulo')}</h4>
      <label>
        <span>{k('alaSemana')}</span>
        <Segmentos valores={[3, 7, 15, 30]} valor={semana} set={setSemana} rotulo={(v) => num(v)} />
      </label>
      <div className="g-ide-focos" aria-hidden key={semana}>
        {Array.from({ length: Math.min(40, Math.round(buenas / 4)) }, (_, i) => (
          <span key={i} style={{ ['--j' as string]: i }} />
        ))}
      </div>
      <p className="g-hob-total">
        <b>{num(ano)}</b> {k('alAno')} · <b>{num(buenas)}</b> {k('buenas')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 5: lluvia de ideas en grupo o a solas ─────────

/**
 * Personas en la lluvia de ideas → las ideas de las mismas personas a solas (y luego juntas) contra
 * en grupo: casi el doble a solas (Diehl y Stroebe, 1987; cifras ilustrativas: 10 ideas por persona).
 */
function LluviaSolo({ k, demo }: { k: K; demo: boolean }) {
  const [personas, setPersonas] = useState(demo ? 3 : 5)
  useDemo<number>(demo, [5, 8], 1700, setPersonas, 3500)
  const solos = personas * 10
  const grupo = Math.round(solos * 0.5)
  return (
    <div className="g-herramienta g-ide">
      <h4>{k('titulo')}</h4>
      <label>
        <span>{k('personas')}</span>
        <Segmentos valores={[3, 5, 8]} valor={personas} set={setPersonas} rotulo={(v) => num(v)} />
      </label>
      <div className="g-hob-dos">
        <div>
          <b>{k('enGrupo')}</b>
          <em>{num(grupo)}</em>
          <small>{k('ideas')}</small>
        </div>
        <div>
          <b>{k('aSolas')}</b>
          <em>{num(solos)}</em>
          <small>{k('ideas')}</small>
        </div>
      </div>
      <p className="g-hob-total">
        <b>{num(solos - grupo)}</b> {k('perdidas')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 7: la balanza de Franklin ─────────

/**
 * El «álgebra moral» de Franklin: tres razones a favor y tres en contra, cada una con su peso
 * (1 a 5). La balanza se inclina hacia el lado que más pesa, no hacia el que tiene más razones.
 */
function BalanzaFranklin({ k, demo }: { k: K; demo: boolean }) {
  const [pesos, setPesos] = useState<number[]>([2, 2, 1, 2, 2, 3])
  useDemo<[number, number]>(demo, [[0, 4], [1, 3], [0, 5]], 1400, ([i, v]) => setPesos((p) => p.map((x, j) => (j === i ? v : x))), 3500)
  const cambiar = (i: number, d: number) => setPesos((p) => p.map((x, j) => (j === i ? Math.min(5, Math.max(1, x + d)) : x)))
  const favor = pesos[0] + pesos[1] + pesos[2]
  const contra = pesos[3] + pesos[4] + pesos[5]
  const giro = Math.max(-12, Math.min(12, (contra - favor) * 2.5))
  const columna = (desde: number, titulo: string, claves: string[]) => (
    <div className="g-ide-columna">
      <b>{titulo}</b>
      {claves.map((c, j) => (
        <div key={c} className="g-ide-razon">
          <span>{k(c)}</span>
          <button type="button" onClick={() => cambiar(desde + j, -1)} aria-label="−">
            −
          </button>
          <em>{pesos[desde + j]}</em>
          <button type="button" onClick={() => cambiar(desde + j, 1)} aria-label="+">
            +
          </button>
        </div>
      ))}
    </div>
  )
  return (
    <div className="g-herramienta g-ide">
      <h4>{k('titulo')}</h4>
      <p className="g-ide-pregunta">{k('decision')}</p>
      <div className="g-ide-balanza" aria-hidden>
        <i style={{ transform: `rotate(${giro}deg)` }}>
          <span>{num(favor)}</span>
          <span>{num(contra)}</span>
        </i>
      </div>
      <div className="g-ide-columnas">
        {columna(0, k('favor'), ['pro1', 'pro2', 'pro3'])}
        {columna(3, k('contra'), ['con1', 'con2', 'con3'])}
      </div>
      <p className="g-hob-total">
        <b>{favor > contra ? k('ganaFavor') : favor < contra ? k('ganaContra') : k('empate')}</b>
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_IDEAS = new Set(['incubacion', 'caminar', 'grupos', 'planIdeas'])

/** Barras horizontales (anchos en %); la `fuerte` resaltada. */
function Barras({ filas, k, pie }: { filas: [string, number, boolean?, string?][]; k: K; pie: string }) {
  return (
    <figure className="g-grafica g-ide">
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

export function GraficaIdeas({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'incubacion') {
    // Baird y colegas (2012): solo quienes hicieron una tarea fácil en el descanso mejoraron claramente (ilustrativo).
    return <Barras k={k} pie="incubacion" filas={[['facil', 88, true], ['dificil', 25], ['reposo', 25], ['sinDescanso', 18]]} />
  }
  if (id === 'caminar') {
    // Oppezzo y Schwartz (2014): caminando, en promedio un 60 % más de usos nuevos que sentados.
    return <Barras k={k} pie="caminar" filas={[['sentado', 60, false, num(100)], ['caminando', 96, true, num(160)]]} />
  }
  if (id === 'grupos') {
    // Diehl y Stroebe (1987): las mismas personas a solas y luego juntas, casi el doble de ideas que en grupo.
    return <Barras k={k} pie="grupos" filas={[['grupo', 48, false, '×1'], ['solos', 95, true, `≈ ×${num(2)}`]]} />
  }
  if (id === 'planIdeas') {
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

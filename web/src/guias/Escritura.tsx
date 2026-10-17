import { useEffect, useState } from 'react'
import type { T } from './datos'
import { Apoyo } from './Video'

/**
 * Lo propio de la guía de Escritura («¿Por qué debes escribir?»): sus mini-herramientas
 * y sus gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su línea suena en modo
 * grabación) cada herramienta se usa sola al ritmo de la voz. La de «like, suscríbete
 * y comparte» es la de la guía de Video, sin la barra de la mitad (`apoyoEscritura`).
 */
export const HERRAMIENTAS_ESCRITURA = new Set(['preocupaciones', 'escrituraLibre', 'nudo', 'cadena', 'tirada', 'apoyoEscritura'])

export function HerramientaEscritura({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`escritura.${id}.${s}`)
  if (id === 'preocupaciones') return <Preocupaciones k={k} demo={demo} />
  if (id === 'escrituraLibre') return <EscrituraLibre k={k} demo={demo} />
  if (id === 'nudo') return <Nudo k={k} demo={demo} />
  if (id === 'cadena') return <Cadena k={k} demo={demo} />
  if (id === 'tirada') return <Tirada k={k} demo={demo} />
  if (id === 'apoyoEscritura') {
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

// ───────── Parte 1: escribir lo que preocupa ─────────

const PREOCUPACIONES = ['p1', 'p2', 'p3', 'p4']

/** Ramírez y Beilock (2011): las preocupaciones pasan de la cabeza a la hoja y la memoria de trabajo se libera. */
function Preocupaciones({ k, demo }: { k: K; demo: boolean }) {
  const [n, setN] = useState(0)
  useDemo<number>(demo, [1, 2, 3, 4], 1600, setN, 5000)
  const libre = 30 + (n / PREOCUPACIONES.length) * 65
  return (
    <div className="g-herramienta g-esc">
      <h4>{k('titulo')}</h4>
      <div className="g-esc-dos">
        <div className="g-esc-cabeza">
          <b>{k('cabeza')}</b>
          {PREOCUPACIONES.slice(n).map((p, j) => (
            <span key={p} className="g-esc-burbuja" style={{ ['--j' as string]: j }}>
              {k(p)}
            </span>
          ))}
        </div>
        <div className="g-esc-hoja">
          <b>{k('hoja')}</b>
          {PREOCUPACIONES.slice(0, n).map((p) => (
            <p key={p}>{k(p)}</p>
          ))}
        </div>
      </div>
      <div className="g-esc-memoria">
        <span>{k('memoria')}</span>
        <i>
          <b style={{ width: `${libre}%` }} />
        </i>
        <em>{Math.round(libre)} %</em>
      </div>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setN((v) => (v >= PREOCUPACIONES.length ? 0 : v + 1))}>
          {k(n >= PREOCUPACIONES.length ? 'reiniciar' : 'escribir')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 2: la escritura libre ─────────

/** Elbow (1973): diez minutos sin parar, sin borrar y sin corregir (aquí no se puede borrar). */
function EscrituraLibre({ k, demo }: { k: K; demo: boolean }) {
  const ejemplo = k('ejemplo')
  const [texto, setTexto] = useState('')
  const [seg, setSeg] = useState(600)
  useEffect(() => {
    if (!demo) return
    let i = 0
    const id = window.setInterval(() => {
      i += 2
      setTexto(ejemplo.slice(0, i))
      setSeg((s) => Math.max(0, s - 7))
      if (i >= ejemplo.length) window.clearInterval(id)
    }, 90)
    return () => window.clearInterval(id)
  }, [demo, ejemplo])
  const mm = Math.floor(seg / 60)
  const ss = String(seg % 60).padStart(2, '0')
  return (
    <div className="g-herramienta g-esc">
      <h4>{k('titulo')}</h4>
      <div className="g-esc-reglas">
        <span>{k('sinParar')}</span>
        <span>{k('sinBorrar')}</span>
        <span>{k('sinCorregir')}</span>
        <b>
          {mm}:{ss}
        </b>
      </div>
      <textarea
        className="g-esc-libre"
        value={texto}
        placeholder={k('placeholder')}
        readOnly={demo}
        onChange={(e) => {
          // Solo se puede añadir: borrar está prohibido en la escritura libre.
          if (e.target.value.length >= texto.length) setTexto(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Backspace' || e.key === 'Delete') e.preventDefault()
        }}
      />
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 3: del nudo a la lista ─────────

const OPCIONES = ['a', 'b', 'c'] as const

/** Escribir para decidir: el problema en una frase y cada opción con lo que pasaría. */
function Nudo({ k, demo }: { k: K; demo: boolean }) {
  const [lista, setLista] = useState(!demo)
  useDemo<boolean>(demo, [true], 0, setLista, 6500)
  return (
    <div className="g-herramienta g-esc">
      <h4>{k('titulo')}</h4>
      {lista ? (
        <div className="g-esc-decision">
          <p className="g-esc-problema">{k('problema')}</p>
          {OPCIONES.map((o) => (
            <div key={o}>
              <b>{k(`op_${o}`)}</b>
              <span>{k(`pasa_${o}`)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="g-esc-enredo">
          {['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map((m, j) => (
            <span key={m} style={{ ['--j' as string]: j }}>
              {k(m)}
            </span>
          ))}
        </div>
      )}
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={() => setLista((v) => !v)}>
          {k(lista ? 'enLaCabeza' : 'enElPapel')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 5: palabras sueltas o una historia ─────────

const PALABRAS = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10']

/** Bower y Clark (1969): las mismas diez palabras, repasadas o unidas en una historia (≈7 veces más recordadas). */
function Cadena({ k, demo }: { k: K; demo: boolean }) {
  const [modo, setModo] = useState<'lista' | 'historia'>(demo ? 'lista' : 'historia')
  useDemo<'lista' | 'historia'>(demo, ['lista', 'historia'], 7500, setModo, 300)
  return (
    <div className="g-herramienta g-esc">
      <h4>{k('titulo')}</h4>
      <div className="g-segmentos g-segmentos-anchos">
        {(['lista', 'historia'] as const).map((m) => (
          <button key={m} type="button" className={m === modo ? 'activo' : ''} onClick={() => setModo(m)}>
            {k(m)}
          </button>
        ))}
      </div>
      {modo === 'lista' ? (
        <ol className="g-esc-palabras">
          {PALABRAS.map((p) => (
            <li key={p}>{k(p)}</li>
          ))}
        </ol>
      ) : (
        <p className="g-esc-cuento">{k('cuento')}</p>
      )}
      <div className="g-met-barras">
        <div>
          <span>{k('lista')}</span>
          <i>
            <b style={{ width: '12%' }} />
          </i>
          <em>×1</em>
        </div>
        <div className={modo === 'historia' ? 'fuerte' : ''}>
          <span>{k('historia')}</span>
          <i>
            <b style={{ width: modo === 'historia' ? '84%' : '0%' }} />
          </i>
          <em>{modo === 'historia' ? '×7' : '…'}</em>
        </div>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 6: personaje + lugar + problema ─────────

const COLUMNAS = ['personaje', 'lugar', 'problema'] as const
const TIRADAS: [number, number, number][] = [
  [0, 0, 0],
  [1, 1, 1],
  [2, 2, 2],
  [3, 3, 3],
]

/** Un personaje, un lugar y un problema al azar: ya hay una historia. */
function Tirada({ k, demo }: { k: K; demo: boolean }) {
  const [tirada, setTirada] = useState<[number, number, number]>([0, 0, 0])
  useDemo<[number, number, number]>(demo, TIRADAS.slice(1), 2600, setTirada, 6200)
  const tirar = () => setTirada([0, 1, 2].map(() => Math.floor(Math.random() * 6)) as [number, number, number])
  return (
    <div className="g-herramienta g-esc">
      <h4>{k('titulo')}</h4>
      <div className="g-esc-dados">
        {COLUMNAS.map((c, i) => (
          <div key={`${c}${tirada[i]}`}>
            <small>{k(c)}</small>
            <b>{k(`${c}${tirada[i]}`)}</b>
          </div>
        ))}
      </div>
      {!demo && (
        <button type="button" className="g-boton-suave" onClick={tirar}>
          {k('tirar')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_ESCRITURA = new Set(['historiaEscritura', 'arcos', 'boice', 'planEscribir'])

/** Las seis formas de Reagan y colegas (2016): la fortuna del protagonista a lo largo de la historia. */
const ARCOS: [string, number[]][] = [
  ['pobreRico', [0.15, 0.35, 0.55, 0.75, 0.9]],
  ['ricoPobre', [0.9, 0.7, 0.5, 0.3, 0.12]],
  ['hoyo', [0.75, 0.35, 0.15, 0.45, 0.85]],
  ['icaro', [0.2, 0.6, 0.88, 0.5, 0.12]],
  ['cenicienta', [0.2, 0.7, 0.25, 0.6, 0.9]],
  ['edipo', [0.8, 0.25, 0.7, 0.35, 0.1]],
]

export function GraficaEscritura({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'historiaEscritura') {
    const hitos = ['h1', 'h2', 'h3', 'h4', 'h5']
    return (
      <figure className="g-grafica">
        <ol className="g-historia">
          {hitos.map((h) => (
            <li key={h}>
              <b>{k(`grafica.${h}`)}</b>
              <span>{k(`grafica.${h}Det`)}</span>
            </li>
          ))}
        </ol>
        <figcaption>{k('grafica.historia')}</figcaption>
      </figure>
    )
  }
  if (id === 'arcos') {
    const camino = (ys: number[]) => {
      const ps = ys.map((y, i) => [8 + i * 26, 56 - y * 48] as const)
      return ps.map(([x, y], i) => (i ? `S${x - 13} ${y} ${x} ${y}` : `M${x} ${y}`)).join(' ')
    }
    return (
      <figure className="g-grafica">
        <div className="g-esc-arcos">
          {ARCOS.map(([id, ys]) => (
            <div key={id}>
              <svg viewBox="0 0 120 62" role="img" aria-label={k(`grafica.${id}`)}>
                <line x1="4" y1="58" x2="116" y2="58" className="g-eje" />
                <path d={camino(ys)} className="g-curva" />
              </svg>
              <span>{k(`grafica.${id}`)}</span>
            </div>
          ))}
        </div>
        <figcaption>{k('grafica.arcos')}</figcaption>
      </figure>
    )
  }
  if (id === 'boice') {
    // Boice (1990), páginas al día en diez semanas: solo con inspiración, con horario pero solo si había ganas, y con cita diaria obligatoria.
    const grupos: [string, number][] = [
      ['inspiracion', 0.2],
      ['ganas', 0.9],
      ['cita', 3.2],
    ]
    return (
      <figure className="g-grafica g-esc">
        <div className="g-met-barras">
          {grupos.map(([g, v], i) => (
            <div key={g} className={i === 2 ? 'fuerte' : ''}>
              <span>{k(`grafica.${g}`)}</span>
              <i>
                <b style={{ width: `${(v / 3.2) * 100}%` }} />
              </i>
              <em>{new Intl.NumberFormat(document.documentElement.lang || 'es', { maximumFractionDigits: 1 }).format(v)}</em>
            </div>
          ))}
        </div>
        <figcaption>{k('grafica.boice')}</figcaption>
      </figure>
    )
  }
  if (id === 'planEscribir') {
    const etapas: [string, string][] = [
      ['semana1', 'g-z1'],
      ['mes1', 'g-z2'],
      ['futuro', 'g-z3'],
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

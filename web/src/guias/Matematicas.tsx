import { useEffect, useState } from 'react'
import type { T } from './datos'

/**
 * Lo propio de la guía de Matemáticas («¿Cuál es el lenguaje del universo?»): sus
 * mini-herramientas y sus gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su línea
 * suena en modo grabación) cada herramienta se usa sola al ritmo de la voz. La de «like,
 * suscríbete y comparte» es la de Mindfulness (`gusta`).
 */
export const HERRAMIENTAS_MATEMATICAS = new Set(['unoMasUno', 'base60', 'polya', 'fermi', 'graficar', 'frecuencias', 'retoDiario'])

export function HerramientaMatematicas({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`matematicas.${id}.${s}`)
  if (id === 'unoMasUno') return <UnoMasUno k={k} demo={demo} />
  if (id === 'base60') return <Base60 k={k} demo={demo} />
  if (id === 'polya') return <Polya k={k} demo={demo} />
  if (id === 'fermi') return <Fermi k={k} demo={demo} />
  if (id === 'graficar') return <Graficar k={k} demo={demo} />
  if (id === 'frecuencias') return <Frecuencias k={k} demo={demo} />
  if (id === 'retoDiario') return <RetoDiario k={k} demo={demo} />
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

// ───────── Parte 2: uno más uno (Wynn, 1992) ─────────

type Fase = 'uno' | 'otro' | 'pantalla' | 'esperado' | 'imposible'

/**
 * El experimento de Karen Wynn con bebés de cinco meses: un muñeco, luego otro detrás de
 * una pantalla; al bajarla hay dos (lo esperado) o solo uno (lo imposible), y el bebé mira
 * más tiempo lo imposible. Las barras de mirada son ilustrativas.
 */
function UnoMasUno({ k, demo }: { k: K; demo: boolean }) {
  const [fase, setFase] = useState<Fase>(demo ? 'uno' : 'imposible')
  useDemo<Fase>(demo, ['otro', 'pantalla', 'esperado', 'imposible'], 3200, setFase, 2600)
  const munecos = fase === 'uno' ? 1 : fase === 'imposible' ? 1 : 2
  const tapado = fase === 'pantalla'
  const final = fase === 'esperado' || fase === 'imposible'
  return (
    <div className="g-herramienta g-mat">
      <h4>{k('titulo')}</h4>
      <div className="g-mat-escenario">
        <div className="g-mat-munecos">
          {Array.from({ length: munecos }, (_, i) => (
            <span key={i} className="g-mat-muneco" />
          ))}
        </div>
        <div className={`g-mat-pantalla ${tapado ? 'arriba' : ''}`} />
      </div>
      <p className="g-mat-fase">{k(fase)}</p>
      {final && (
        <div className="g-mat-mirada">
          <div className={fase === 'esperado' ? 'fuerte' : ''}>
            <span>{k('miradaEsperado')}</span>
            <i>
              <b style={{ width: '45%' }} />
            </i>
          </div>
          <div className={fase === 'imposible' ? 'fuerte' : ''}>
            <span>{k('miradaImposible')}</span>
            <i>
              <b style={{ width: '80%' }} />
            </i>
          </div>
        </div>
      )}
      {!demo && (
        <Segmentos valores={['esperado', 'imposible'] as Fase[]} valor={fase} set={setFase} rotulo={(v) => k(`ver_${v}`)} />
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 2: contar de sesenta en sesenta ─────────

/** Los divisores de 10 y de 60: por eso los babilonios (y nuestros relojes) se quedaron con el 60. */
function Base60({ k, demo }: { k: K; demo: boolean }) {
  const [base, setBase] = useState<'10' | '60'>(demo ? '10' : '60')
  useDemo<'10' | '60'>(demo, ['60'], 0, setBase, 5000)
  const n = Number(base)
  const divisores = Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0)
  return (
    <div className="g-herramienta g-mat">
      <h4>{k('titulo')}</h4>
      <Segmentos valores={['10', '60'] as ('10' | '60')[]} valor={base} set={setBase} rotulo={(v) => k(`base${v}`)} />
      <ul className="g-mat-divisores">
        {divisores.map((d) => (
          <li key={`${base}-${d}`}>{num(d)}</li>
        ))}
      </ul>
      <p className="g-mat-fase">{k(`cuenta${base}`).replace('{n}', num(divisores.length))}</p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 4: los cuatro pasos de Pólya ─────────

const PASOS_POLYA = ['entender', 'plan', 'ejecutar', 'revisar']

function Polya({ k, demo }: { k: K; demo: boolean }) {
  const [paso, setPaso] = useState(demo ? -1 : 3)
  useDemo<number>(demo, [0, 1, 2, 3], 3000, setPaso, 4500)
  return (
    <div className="g-herramienta g-mat">
      <h4>{k('titulo')}</h4>
      <p className="g-mat-problema">{k('problema')}</p>
      <ol className="g-mat-polya">
        {PASOS_POLYA.map((p, i) => (
          <li key={p} className={i <= paso ? 'hecho' : ''}>
            <button type="button" onClick={() => setPaso(i)}>
              <b>{k(p)}</b>
              {i <= paso && <span>{k(`${p}Det`)}</span>}
            </button>
          </li>
        ))}
      </ol>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 4: un problema de Fermi ─────────

/** Los afinadores de piano de Chicago, partidos en pedazos que se pueden adivinar (cifras redondas, ilustrativas). */
function Fermi({ k, demo }: { k: K; demo: boolean }) {
  const [gente, setGente] = useState(3_000_000)
  const [porHogar, setPorHogar] = useState(2.5)
  const [conPiano, setConPiano] = useState(20)
  const [vistos, setVistos] = useState(demo ? 0 : 5)
  useDemo<number>(demo, [1, 2, 3, 4, 5], 2600, setVistos, 3500)
  const hogares = gente / porHogar
  const pianos = hogares / conPiano
  // Cada piano se afina una vez al año; un afinador hace 4 al día, 250 días al año.
  const porAfinador = 4 * 250
  const afinadores = pianos / porAfinador
  const filas: [string, string][] = [
    ['gente', num(gente)],
    ['hogares', num(hogares)],
    ['pianos', num(pianos)],
    ['porAfinador', num(porAfinador)],
    ['afinadores', `≈ ${num(Math.round(afinadores / 5) * 5)}`],
  ]
  return (
    <div className="g-herramienta g-mat">
      <h4>{k('titulo')}</h4>
      <ol className="g-mat-fermi">
        {filas.map(([c, v], i) => (
          <li key={c} className={i < vistos ? 'visto' : ''}>
            <span>{k(c)}</span>
            <b>{i < vistos ? v : '?'}</b>
          </li>
        ))}
      </ol>
      {!demo && (
        <div className="g-mat-controles">
          <label>
            {k('ajusteGente')}
            <input type="range" min={1_000_000} max={9_000_000} step={500_000} value={gente} onChange={(e) => setGente(Number(e.target.value))} />
          </label>
          <label>
            {k('ajusteHogar')}
            <input type="range" min={1.5} max={4} step={0.5} value={porHogar} onChange={(e) => setPorHogar(Number(e.target.value))} />
          </label>
          <label>
            {k('ajustePiano')}
            <input type="range" min={5} max={50} step={5} value={conPiano} onChange={(e) => setConPiano(Number(e.target.value))} />
          </label>
        </div>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 5: una ecuación hecha dibujo ─────────

type Curva = 'recta' | 'parabola' | 'onda'
const CURVAS: Record<Curva, { f: (x: number) => number; formula: string }> = {
  recta: { f: (x) => 0.5 * x + 1, formula: 'y = 0.5x + 1' },
  parabola: { f: (x) => 0.25 * x * x - 2, formula: 'y = 0.25x² − 2' },
  onda: { f: (x) => 2 * Math.sin(x), formula: 'y = 2 sen(x)' },
}

/** El plano de Descartes: la misma pantalla dibuja una recta, una parábola o una onda. */
function Graficar({ k, demo }: { k: K; demo: boolean }) {
  const [curva, setCurva] = useState<Curva>(demo ? 'recta' : 'parabola')
  useDemo<Curva>(demo, ['parabola', 'onda'], 5500, setCurva, 7000)
  // x de −6 a 6 y y de −4 a 4 en un lienzo de 360 × 240.
  const X = (x: number) => 180 + x * 28
  const Y = (y: number) => 120 - y * 28
  const puntos: string[] = []
  for (let x = -6; x <= 6.001; x += 0.1) {
    const y = CURVAS[curva].f(x)
    if (Math.abs(y) <= 4.2) puntos.push(`${puntos.length ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`)
  }
  const formula = curva === 'onda' ? CURVAS.onda.formula.replace('sen', k('sen')) : CURVAS[curva].formula
  return (
    <div className="g-herramienta g-mat">
      <h4>{k('titulo')}</h4>
      <Segmentos valores={['recta', 'parabola', 'onda'] as Curva[]} valor={curva} set={setCurva} rotulo={(v) => k(v)} />
      <svg viewBox="0 0 360 240" className="g-mat-plano" role="img" aria-label={formula}>
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`v${i}`} x1={X(i - 6)} y1="8" x2={X(i - 6)} y2="232" className="g-mat-rejilla" />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`h${i}`} x1="12" y1={Y(i - 4)} x2="348" y2={Y(i - 4)} className="g-mat-rejilla" />
        ))}
        <line x1="12" y1={Y(0)} x2="348" y2={Y(0)} className="g-eje" />
        <line x1={X(0)} y1="8" x2={X(0)} y2="232" className="g-eje" />
        <path key={curva} d={puntos.join(' ')} className="g-curva g-mat-trazo" />
      </svg>
      <p className="g-mat-formula">{formula}</p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 6: porcentajes contra frecuencias (Gigerenzer) ─────────

/**
 * El problema de la mamografía en frecuencias naturales: de 1000 mujeres, 10 tienen cáncer
 * y 9 de ellas salen positivas; de las 990 sanas, 89 también salen positivas. De 98
 * positivas, solo 9 tienen cáncer: menos de una de cada diez.
 */
function Frecuencias({ k, demo }: { k: K; demo: boolean }) {
  const [modo, setModo] = useState<'porcentajes' | 'personas'>(demo ? 'porcentajes' : 'personas')
  useDemo<'porcentajes' | 'personas'>(demo, ['personas'], 0, setModo, 11000)
  return (
    <div className="g-herramienta g-mat">
      <h4>{k('titulo')}</h4>
      <Segmentos valores={['porcentajes', 'personas'] as ('porcentajes' | 'personas')[]} valor={modo} set={setModo} rotulo={(v) => k(v)} />
      {modo === 'porcentajes' ? (
        <ul className="g-mat-datos">
          <li>{k('p1')}</li>
          <li>{k('p2')}</li>
          <li>{k('p3')}</li>
          <li className="pregunta">{k('pregunta')}</li>
        </ul>
      ) : (
        <>
          <div className="g-mat-puntos" aria-hidden>
            {Array.from({ length: 1000 }, (_, i) => (
              <i key={i} className={i < 9 ? 'enferma positiva' : i < 10 ? 'enferma' : i < 99 ? 'positiva' : ''} />
            ))}
          </div>
          <ul className="g-mat-leyenda">
            <li className="enferma positiva">{k('l1')}</li>
            <li className="positiva">{k('l2')}</li>
            <li className="respuesta">{k('respuesta')}</li>
          </ul>
        </>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 7: estima, luego calcula ─────────

const MINUTOS_ANIO = 365 * 24 * 60

/** El reto del día: estimar antes de calcular (los minutos de un año) y comparar. */
function RetoDiario({ k, demo }: { k: K; demo: boolean }) {
  const [estimado, setEstimado] = useState(demo ? 100_000 : 400_000)
  const [calculado, setCalculado] = useState(false)
  useDemo<number>(demo, [200_000, 300_000, 400_000, 500_000], 900, setEstimado, 3000)
  useDemo<boolean>(demo, [true], 0, setCalculado, 8500)
  const error = Math.round((Math.abs(estimado - MINUTOS_ANIO) / MINUTOS_ANIO) * 100)
  return (
    <div className="g-herramienta g-mat">
      <h4>{k('titulo')}</h4>
      <p className="g-mat-problema">{k('pregunta')}</p>
      <label className="g-mat-estimacion">
        {k('tuEstimacion')} <b>{num(estimado)}</b>
        <input type="range" min={50_000} max={1_000_000} step={10_000} value={estimado} onChange={(e) => setEstimado(Number(e.target.value))} />
      </label>
      {calculado ? (
        <p className="g-mat-cuenta">
          365 × 24 × 60 = <b>{num(MINUTOS_ANIO)}</b> · {k('teDesviaste').replace('{p}', num(error))}
        </p>
      ) : (
        <button type="button" className="g-boton-suave" onClick={() => setCalculado(true)}>
          {k('calcular')}
        </button>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_MATEMATICAS = new Set(['neptuno', 'ansiedadMate', 'planContinuarMat'])

export function GraficaMatematicas({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'neptuno') {
    // Le Verrier (1846): Urano se adelantaba y se atrasaba en su órbita; algo más allá lo jalaba.
    // Galle lo encontró a ~1° de la posición calculada. Órbitas a escala aproximada (19 y 30 UA).
    const C = [200, 100]
    const r1 = 48
    const r2 = 76
    const ang = -0.6
    const calc = [C[0] + r2 * Math.cos(ang), C[1] + r2 * Math.sin(ang)]
    const real = [C[0] + r2 * Math.cos(ang + 0.05), C[1] + r2 * Math.sin(ang + 0.05)]
    const urano = [C[0] + r1 * Math.cos(ang - 0.15), C[1] + r1 * Math.sin(ang - 0.15)]
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 200" role="img" aria-label={k('grafica.neptuno')}>
          <circle cx={C[0]} cy={C[1]} r="9" className="g-mat-sol" />
          <circle cx={C[0]} cy={C[1]} r={r1} className="g-mat-orbita" />
          <circle cx={C[0]} cy={C[1]} r={r2} className="g-mat-orbita lejana" />
          <line x1={urano[0]} y1={urano[1]} x2={real[0]} y2={real[1]} className="g-mat-jalon" />
          <circle cx={urano[0]} cy={urano[1]} r="5" className="g-mat-urano" />
          <circle cx={calc[0]} cy={calc[1]} r="10" className="g-mat-calculado" />
          <circle cx={real[0]} cy={real[1]} r="5.5" className="g-mat-neptuno" />
          <text x={urano[0] - 10} y={urano[1] + 20} textAnchor="end" className="g-rotulo">
            {k('grafica.urano')}
          </text>
          <text x={calc[0] + 16} y={calc[1] - 6} className="g-rotulo g-fuerte">
            {k('grafica.calculado')}
          </text>
          <text x={real[0] + 16} y={real[1] + 14} className="g-rotulo">
            {k('grafica.encontrado')}
          </text>
          <text x={C[0]} y={C[1] + 26} textAnchor="middle" className="g-rotulo">
            {k('grafica.sol')}
          </text>
        </svg>
        <figcaption>{k('grafica.neptuno')}</figcaption>
      </figure>
    )
  }
  if (id === 'ansiedadMate') {
    // Lyons y Beilock (2012): al ANTICIPAR un problema de matemáticas, la red del dolor se activa más en quien tiene ansiedad alta (ilustrativo, sin cifras).
    return (
      <figure className="g-grafica">
        <div className="g-apr-sueno g-mat-ansiedad">
          <div className="dormir">
            <i style={{ height: '82%' }} />
            <span>{k('grafica.alta')}</span>
          </div>
          <div className="despiertos">
            <i style={{ height: '34%' }} />
            <span>{k('grafica.baja')}</span>
          </div>
        </div>
        <figcaption>{k('grafica.ansiedadMate')}</figcaption>
      </figure>
    )
  }
  if (id === 'planContinuarMat') {
    const etapas: [string, string][] = [
      ['semana1', 'g-z1'],
      ['mes1', 'g-z2'],
      ['atoras', 'g-z4'],
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

import { useEffect, useState } from 'react'
import type { T } from './datos'

/**
 * Lo propio de la guía de Finanzas: sus mini-herramientas y sus gráficas. Como
 * las de Cocina y Descanso, con `demo` (su línea suena en modo grabación) se
 * usan solas para que el video las enseñe funcionando.
 *
 * Los montos no llevan una moneda fija: el símbolo y el ingreso de ejemplo
 * salen del diccionario de cada idioma (`finanzas.moneda`, `finanzas.base`),
 * y todo lo demás se calcula en proporción a ese ingreso.
 */
export const HERRAMIENTAS_FINANZAS = new Set(['gastoHormiga', 'regla503020', 'fondoEmergencia', 'deudaTarjeta', 'interesCompuesto'])

export function HerramientaFinanzas({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  if (id === 'gastoHormiga') return <GastoHormiga t={t} demo={demo} />
  if (id === 'regla503020') return <Regla503020 t={t} demo={demo} />
  if (id === 'fondoEmergencia') return <FondoEmergencia t={t} demo={demo} />
  if (id === 'deudaTarjeta') return <DeudaTarjeta t={t} demo={demo} />
  if (id === 'interesCompuesto') return <InteresCompuesto t={t} demo={demo} />
  return null
}

/** Va aplicando `pasos` cada `ms` mientras `demo` está activo (como `useDemo` de Cocina). */
function useDemo<V>(demo: boolean, pasos: V[], ms: number, aplicar: (v: V) => void) {
  useEffect(() => {
    if (!demo) return
    let i = 0
    const id = setInterval(() => {
      if (i < pasos.length) aplicar(pasos[i++])
    }, ms)
    return () => clearInterval(id)
    // Los pasos son literales de quien llama: solo importa encender/apagar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo])
}

/** El idioma de la página; el español con los números de México (coma de miles), como la app. */
const lang = () => { const l = document.documentElement.lang || 'es'; return l === 'es' ? 'es-MX' : l }
/** Un monto redondeado con el símbolo del idioma («$ 12,500», «12 500 €»: lo decide `finanzas.formato`). */
function useDinero(t: T) {
  const simbolo = t('finanzas.moneda')
  const despues = t('finanzas.formato') === 'despues'
  return (n: number) => {
    const v = new Intl.NumberFormat(lang(), { maximumFractionDigits: 0 }).format(Math.round(n))
    return despues ? `${v} ${simbolo}` : `${simbolo}${v}`
  }
}
/** El ingreso mensual de ejemplo del idioma (redondo y creíble en su moneda). */
const base = (t: T) => Number(t('finanzas.base')) || 10000
/** Un número redondo cercano (para los valores de ejemplo, en cualquier moneda). */
const redondo = (n: number) => {
  const p = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1)
  return Math.round(n / p) * p
}

function Numero({ valor, set, etiqueta, unidad, min = 0, max = 1e12, paso }: { valor: number; set: (n: number) => void; etiqueta: string; unidad?: string; min?: number; max?: number; paso?: number }) {
  return (
    <label className="g-campo">
      <span>{etiqueta}</span>
      <input type="number" min={min} max={max} step={paso} value={valor} onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value) || 0)))} />
      {unidad && <span>{unidad}</span>}
    </label>
  )
}

function GastoHormiga({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`finanzas.hormiga.${s}`)
  const dinero = useDinero(t)
  const uno = redondo(base(t) / 200)
  const [gasto, setGasto] = useState(uno)
  const [dias, setDias] = useState(5)
  useDemo<() => void>(demo, [() => setDias(7), () => setGasto(redondo(uno * 2)), () => setDias(3), () => setGasto(redondo(uno * 3)), () => setDias(5)], 1500, (f) => f())
  const anio = gasto * dias * 52
  // Lo mismo apartado cada mes al 6 % anual durante 10 años.
  const r = 0.06 / 12
  const invertido = (anio / 12) * ((1 + r) ** 120 - 1) / r
  return (
    <div className="g-herramienta g-fin">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <div className="g-campos">
          <Numero valor={gasto} set={setGasto} etiqueta={k('gasto')} unidad={t('finanzas.moneda')} />
        </div>
        <label>
          <span>{k('dias')}</span>
          <div className="g-segmentos">
            {[3, 5, 7].map((d) => (
              <button key={d} type="button" className={d === dias ? 'activo' : ''} onClick={() => setDias(d)}>
                {d}
              </button>
            ))}
          </div>
        </label>
      </div>
      <dl className="g-resultados g-resultados-3">
        <div>
          <dt>{k('alAnio')}</dt>
          <dd>{dinero(anio)}</dd>
        </div>
        <div>
          <dt>{k('diezAnios')}</dt>
          <dd>{dinero(anio * 10)}</dd>
        </div>
        <div className="g-resultado-fuerte">
          <dt>{k('invertido')}</dt>
          <dd>{dinero(invertido)}</dd>
        </div>
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

function Regla503020({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`finanzas.reparto.${s}`)
  const dinero = useDinero(t)
  const [ingreso, setIngreso] = useState(base(t))
  useDemo(demo, [1.5, 0.8, 2, 1].map((f) => redondo(base(t) * f)), 1700, setIngreso)
  const partes = [
    { id: 'necesario', pct: 50, z: 'g-z1' },
    { id: 'gustos', pct: 30, z: 'g-z3' },
    { id: 'ahorro', pct: 20, z: 'g-z2' },
  ]
  return (
    <div className="g-herramienta g-fin">
      <h4>{k('titulo')}</h4>
      <div className="g-campos">
        <Numero valor={ingreso} set={setIngreso} etiqueta={k('ingreso')} unidad={t('finanzas.moneda')} />
      </div>
      <div className="g-barra-apilada g-fin-reparto">
        {partes.map((p) => (
          <span key={p.id} className={p.z} style={{ width: `${p.pct}%` }}>
            {p.pct} %
          </span>
        ))}
      </div>
      <dl className="g-resultados g-resultados-3">
        {partes.map((p) => (
          <div key={p.id} className={p.id === 'ahorro' ? 'g-resultado-fuerte' : ''}>
            <dt>
              <i className={`g-fin-punto ${p.z}`} />
              {k(p.id)}
            </dt>
            <dd>{dinero((ingreso * p.pct) / 100)}</dd>
          </div>
        ))}
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

function FondoEmergencia({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`finanzas.fondo.${s}`)
  const dinero = useDinero(t)
  const [gasto, setGasto] = useState(redondo(base(t) * 0.6))
  const [meses, setMeses] = useState(3)
  const [aparta, setAparta] = useState(redondo(base(t) * 0.1))
  useDemo<() => void>(demo, [() => setMeses(6), () => setAparta(redondo(base(t) * 0.2)), () => setMeses(4), () => setGasto(redondo(base(t) * 0.5))], 1600, (f) => f())
  const meta = gasto * meses
  const tarda = aparta > 0 ? Math.ceil(meta / aparta) : 0
  return (
    <div className="g-herramienta g-fin">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <div className="g-campos">
          <Numero valor={gasto} set={setGasto} etiqueta={k('gasto')} unidad={t('finanzas.moneda')} />
          <Numero valor={aparta} set={setAparta} etiqueta={k('aparta')} unidad={t('finanzas.moneda')} />
        </div>
        <label>
          <span>{k('meses')}</span>
          <div className="g-segmentos">
            {[3, 4, 6].map((m) => (
              <button key={m} type="button" className={m === meses ? 'activo' : ''} onClick={() => setMeses(m)}>
                {m}
              </button>
            ))}
          </div>
        </label>
      </div>
      <dl className="g-resultados">
        <div className="g-resultado-fuerte">
          <dt>{k('meta')}</dt>
          <dd>{dinero(meta)}</dd>
        </div>
        <div>
          <dt>{k('tardas')}</dt>
          <dd>
            {tarda ? `${tarda} ${k('mesesCorto')}` : '—'}
          </dd>
        </div>
      </dl>
      <div className="g-medidor">
        <span style={{ width: `${Math.min(100, (aparta / Math.max(1, gasto)) * 100)}%` }} />
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Meses hasta liquidar una deuda con interés mensual compuesto y el interés pagado; null si el pago no alcanza ni para el interés. */
function liquidar(saldo: number, tasaAnual: number, pago: number) {
  const r = tasaAnual / 100 / 12
  if (pago <= saldo * r) return null
  let s = saldo
  let interes = 0
  let meses = 0
  while (s > 0.5 && meses < 1200) {
    const i = s * r
    interes += i
    s = s + i - pago
    meses++
  }
  return { meses, interes }
}

function DeudaTarjeta({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`finanzas.deuda.${s}`)
  const dinero = useDinero(t)
  const [saldo, setSaldo] = useState(redondo(base(t) * 2))
  const [tasa, setTasa] = useState(36)
  // Un pago bajo, cerca del mínimo: un 4 % del saldo (con un 3 % al 36 % anual apenas cubre los intereses).
  const minimo = redondo(saldo * 0.04)
  const [pago, setPago] = useState(minimo)
  useDemo<() => void>(demo, [() => setPago(redondo(saldo * 0.06)), () => setPago(redondo(saldo * 0.1)), () => setTasa(24), () => setPago(redondo(saldo * 0.04))], 1700, (f) => f())
  const r = liquidar(saldo, tasa, pago)
  return (
    <div className="g-herramienta g-fin">
      <h4>{k('titulo')}</h4>
      <div className="g-campos">
        <Numero valor={saldo} set={setSaldo} etiqueta={k('saldo')} unidad={t('finanzas.moneda')} />
        <Numero valor={tasa} set={setTasa} etiqueta={k('tasa')} unidad="%" max={200} />
        <Numero valor={pago} set={setPago} etiqueta={k('pago')} unidad={t('finanzas.moneda')} />
      </div>
      {r ? (
        <dl className="g-resultados g-resultados-3">
          <div className={r.meses > 36 ? 'g-resultado-corto' : 'g-resultado-fuerte'}>
            <dt>{k('tardas')}</dt>
            <dd>
              {r.meses} {k('meses')}
            </dd>
          </div>
          <div>
            <dt>{k('intereses')}</dt>
            <dd>{dinero(r.interes)}</dd>
          </div>
          <div>
            <dt>{k('total')}</dt>
            <dd>{dinero(saldo + r.interes)}</dd>
          </div>
        </dl>
      ) : (
        <p className="g-aviso">{k('nunca')}</p>
      )}
      {r && (
        <div className="g-barra-apilada g-fin-reparto">
          <span className="g-z1" style={{ width: `${(saldo / (saldo + r.interes)) * 100}%` }}>
            {k('loQueDebias')}
          </span>
          <span className="g-z5" style={{ width: `${(r.interes / (saldo + r.interes)) * 100}%` }} />
        </div>
      )}
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Saldo al final de cada año aportando `aporte` cada mes a una tasa anual (interés mensual compuesto). */
function crecimiento(aporte: number, tasaAnual: number, anios: number) {
  const r = tasaAnual / 100 / 12
  const filas: { anio: number; aportado: number; saldo: number }[] = []
  let saldo = 0
  for (let m = 1; m <= anios * 12; m++) {
    saldo = saldo * (1 + r) + aporte
    if (m % 12 === 0) filas.push({ anio: m / 12, aportado: aporte * m, saldo })
  }
  return filas
}

function InteresCompuesto({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`finanzas.compuesto.${s}`)
  const dinero = useDinero(t)
  const [aporte, setAporte] = useState(redondo(base(t) * 0.1))
  const [tasa, setTasa] = useState(6)
  const [anios, setAnios] = useState(20)
  useDemo<() => void>(demo, [() => setAnios(30), () => setTasa(8), () => setAnios(40), () => setTasa(4), () => setAnios(30)], 1500, (f) => f())
  const filas = crecimiento(aporte, tasa, anios)
  const fin = filas[filas.length - 1] ?? { aportado: 0, saldo: 0 }
  const max = Math.max(1, fin.saldo)
  // Hasta 10 barras: una cada tantos años.
  const cada = Math.max(1, Math.ceil(anios / 10))
  const barras = filas.filter((f) => f.anio % cada === 0)
  const ancho = 360 / barras.length
  return (
    <div className="g-herramienta g-fin">
      <h4>{k('titulo')}</h4>
      <div className="g-campos">
        <Numero valor={aporte} set={setAporte} etiqueta={k('aporte')} unidad={t('finanzas.moneda')} />
        <Numero valor={tasa} set={setTasa} etiqueta={k('tasa')} unidad="%" max={30} paso={0.5} />
        <Numero valor={anios} set={setAnios} etiqueta={k('anios')} unidad={k('aniosCorto')} min={1} max={60} />
      </div>
      <figure className="g-grafica">
        <svg viewBox="0 0 400 170" role="img" aria-label={k('titulo')}>
          <line x1="20" y1="140" x2="390" y2="140" className="g-eje" />
          {barras.map((f, i) => {
            const x = 24 + i * ancho
            const hT = (f.saldo / max) * 120
            const hA = (f.aportado / max) * 120
            return (
              <g key={f.anio}>
                <rect x={x} y={140 - hT} width={ancho - 6} height={hT - hA} rx="3" className="g-fin-interes" />
                <rect x={x} y={140 - hA} width={ancho - 6} height={hA} rx="3" className="g-fin-aportado" />
                <text x={x + (ancho - 6) / 2} y="156" textAnchor="middle" className="g-rotulo">
                  {f.anio}
                </text>
              </g>
            )
          })}
        </svg>
        <ul className="g-leyenda">
          <li>
            <i className="g-z1" />
            {k('tuyo')}
          </li>
          <li>
            <i className="g-z2" />
            {k('interes')}
          </li>
        </ul>
      </figure>
      <dl className="g-resultados g-resultados-3">
        <div>
          <dt>{k('tuyo')}</dt>
          <dd>{dinero(fin.aportado)}</dd>
        </div>
        <div>
          <dt>{k('interes')}</dt>
          <dd>{dinero(fin.saldo - fin.aportado)}</dd>
        </div>
        <div className="g-resultado-fuerte">
          <dt>{k('total')}</dt>
          <dd>{dinero(fin.saldo)}</dd>
        </div>
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

export const GRAFICAS_FINANZAS = new Set(['funciones', 'inflacion', 'flujo', 'historiaDinero', 'ahorraMas', 'avalanchaBola', 'empezarAntes', 'comisiones', 'automatiza'])

/** Una línea como polilínea de un SVG de 400×160: `f(x)` de 0 a `xMax`, escalada a `yMax`. */
const curva = (f: (x: number) => number, xMax: number, yMax: number, n = 60) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const x = (i / n) * xMax
    return `${40 + (x / xMax) * 340},${130 - (f(x) / yMax) * 110}`
  }).join(' ')

/** Cajas unidas por flechas (los diagramas de flujo de la guía). */
function Cadena({ pasos, k, clave }: { pasos: { titulo: string; det: string; z: string }[]; k: (s: string) => string; clave: string }) {
  return (
    <figure className="g-grafica">
      <ol className="g-fin-cadena">
        {pasos.map((p, i) => (
          <li key={i} className={p.z}>
            <b>{p.titulo}</b>
            <span>{p.det}</span>
          </li>
        ))}
      </ol>
      <figcaption>{k(`grafica.${clave}`)}</figcaption>
    </figure>
  )
}

export function GraficaFinanzas({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'funciones' || id === 'flujo' || id === 'automatiza') {
    const PASOS: Record<string, [string, string][]> = {
      funciones: [['intercambio', 'g-z1'], ['medida', 'g-z3'], ['reserva', 'g-z2']],
      flujo: [['entra', 'g-z2'], ['sale', 'g-z5'], ['queda', 'g-z1']],
      automatiza: [['cobras', 'g-z3'], ['ahorroAuto', 'g-z2'], ['fijos', 'g-z1'], ['libre', 'g-z4']],
    }
    return <Cadena clave={id} k={k} pasos={PASOS[id].map(([c, z]) => ({ titulo: k(`grafica.${c}`), det: k(`grafica.${c}Det`), z }))} />
  }
  if (id === 'historiaDinero') {
    const hitos: [string, string][] = [
      ['≈ 1754 a. C.', k('grafica.hammurabiDet')],
      ['≈ 600 a. C.', k('grafica.lidiaDet')],
      ['1024', k('grafica.jiaoziDet')],
      ['1920', k('grafica.ponziDet')],
      ['1971', k('grafica.nixonDet')],
    ]
    return (
      <figure className="g-grafica">
        <ol className="g-historia" style={{ gridTemplateColumns: `repeat(${hitos.length}, 1fr)` }}>
          {hitos.map(([cuando, que]) => (
            <li key={cuando}>
              <b>{cuando.replace('a. C.', k('grafica.aC'))}</b>
              <span>{que}</span>
            </li>
          ))}
        </ol>
        <figcaption>{k('grafica.historia')}</figcaption>
      </figure>
    )
  }
  if (id === 'inflacion') {
    // Lo que compra hoy 100, año tras año, con una inflación del 3 %: a los 24 años, la mitad.
    const poder = (a: number) => 100 / 1.03 ** a
    const x24 = 40 + (24 / 30) * 340
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 160" role="img" aria-label={k('grafica.inflacion')}>
          <line x1="40" y1="130" x2="390" y2="130" className="g-eje" />
          <line x1="40" y1="20" x2="390" y2="20" className="g-eje" strokeDasharray="2 6" />
          <polyline points={curva(poder, 30, 100)} className="g-curva" />
          <line x1={x24} y1="20" x2={x24} y2="130" className="g-eje" strokeDasharray="4 5" />
          <circle cx={x24} cy={130 - (poder(24) / 100) * 110} r="7" className="g-punto-luna" />
          <text x={x24 - 8} y={130 - (poder(24) / 100) * 110 - 12} textAnchor="end" className="g-rotulo g-fuerte">
            {k('grafica.mitad')}
          </text>
          <text x="34" y="24" textAnchor="end" className="g-rotulo">100</text>
          <text x="34" y="74" textAnchor="end" className="g-rotulo">50</text>
          {[0, 10, 20, 30].map((a) => (
            <text key={a} x={40 + (a / 30) * 340} y="148" textAnchor="middle" className="g-rotulo">
              {a}
            </text>
          ))}
          <text x={x24} y="148" textAnchor="middle" className="g-rotulo g-fuerte">24</text>
        </svg>
        <figcaption>{k('grafica.inflacion')}</figcaption>
      </figure>
    )
  }
  if (id === 'ahorraMas') {
    // Save More Tomorrow (Thaler y Benartzi, 2004): la tasa de ahorro antes y tras cada aumento de sueldo.
    const tasas = [3.5, 6.5, 9.4, 11.6, 13.6]
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 160" role="img" aria-label={k('grafica.ahorraMas')}>
          <line x1="20" y1="130" x2="390" y2="130" className="g-eje" />
          {tasas.map((v, i) => {
            const h = (v / 14) * 100
            const x = 36 + i * 72
            return (
              <g key={i}>
                <rect x={x} y={130 - h} width="48" height={h} rx="6" className={i ? 'g-fin-aportado' : 'g-fin-gris'} />
                <text x={x + 24} y={124 - h} textAnchor="middle" className="g-rotulo g-fuerte">
                  {v.toLocaleString(lang())} %
                </text>
                <text x={x + 24} y="148" textAnchor="middle" className="g-rotulo">
                  {i ? `${k('grafica.aumento')} ${i}` : k('grafica.antes')}
                </text>
              </g>
            )
          })}
        </svg>
        <figcaption>{k('grafica.ahorraMas')}</figcaption>
      </figure>
    )
  }
  if (id === 'avalanchaBola') {
    // Tres deudas de ejemplo: [nombre, saldo relativo, tasa].
    const deudas: [string, number, number][] = [
      ['tarjeta', 5, 36],
      ['prestamo', 15, 18],
      ['tienda', 1.5, 24],
    ]
    const orden = (m: 'avalancha' | 'bolaNieve') => [...deudas].sort((a, b) => (m === 'avalancha' ? b[2] - a[2] : a[1] - b[1]))
    return (
      <figure className="g-grafica">
        <div className="g-fin-metodos">
          {(['avalancha', 'bolaNieve'] as const).map((m) => (
            <div key={m}>
              <b>{k(`grafica.${m}`)}</b>
              <span>{k(`grafica.${m}Det`)}</span>
              <ol>
                {orden(m).map(([d, saldo, tasa]) => (
                  <li key={d}>
                    <i style={{ width: `${20 + (saldo / 15) * 80}%` }} className={m === 'avalancha' ? 'g-z5' : 'g-z1'} />
                    <em>{k(`grafica.${d}`)}</em>
                    <small>{m === 'avalancha' ? `${tasa} %` : `${saldo * 1000}`}</small>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <figcaption>{k('grafica.metodos')}</figcaption>
      </figure>
    )
  }
  if (id === 'empezarAntes' || id === 'comisiones') {
    // empezarAntes: 1 al mes al 6 % desde los 25 y desde los 35, hasta los 65.
    // comisiones: 100 de hoy al 7 % y al 6 % (un punto de comisión), durante 30 años.
    const ant = id === 'empezarAntes'
    const xMax = ant ? 40 : 30
    const r = 0.06 / 12
    const fv = (meses: number) => (meses <= 0 ? 0 : ((1 + r) ** meses - 1) / r)
    const a = ant ? (x: number) => fv(x * 12) : (x: number) => 100 * 1.07 ** x
    const b = ant ? (x: number) => fv((x - 10) * 12) : (x: number) => 100 * 1.06 ** x
    const yMax = a(xMax)
    const ya = 130 - 110
    const yb = 130 - (b(xMax) / yMax) * 110
    const ejes = ant ? [[0, 25], [10, 35], [20, 45], [30, 55], [40, 65]] : [[0, 0], [10, 10], [20, 20], [30, 30]]
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 160" role="img" aria-label={k(`grafica.${id}`)}>
          <line x1="40" y1="130" x2="390" y2="130" className="g-eje" />
          <polyline points={curva(a, xMax, yMax)} className="g-curva" />
          <polyline points={curva(b, xMax, yMax)} className="g-curva g-fin-curva-b" />
          <text x="376" y={ya - 4} textAnchor="end" className="g-rotulo g-fuerte">
            {k(`grafica.${id}A`)}
          </text>
          <text x="376" y={yb - 6} textAnchor="end" className="g-rotulo">
            {k(`grafica.${id}B`)} · {Math.round((b(xMax) / a(xMax)) * 100)} %
          </text>
          {ejes.map(([x, rot]) => (
            <text key={x} x={40 + (x / xMax) * 340} y="148" textAnchor="middle" className="g-rotulo">
              {rot}
            </text>
          ))}
        </svg>
        <figcaption>{k(`grafica.${id}`)}</figcaption>
      </figure>
    )
  }
  return null
}

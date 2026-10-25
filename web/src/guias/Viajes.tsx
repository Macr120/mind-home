import { useEffect, useState } from 'react'
import type { T } from './datos'
import { Apoyo } from './Video'

/**
 * Lo propio de la guía de Viajes («¿Cómo viajar mejor?»): sus mini-herramientas y sus
 * gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su línea suena en modo grabación) cada
 * herramienta se usa sola al ritmo de la voz. La de «like, suscríbete y comparte» es la de la
 * guía de Video, sin la barra de la mitad (`apoyoViajes`).
 */
export const HERRAMIENTAS_VIAJES = new Set(['cuentaRegresiva', 'finalViaje', 'presupuestoViaje', 'apoyoViajes'])

export function HerramientaViajes({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`viajes.${id}.${s}`)
  if (id === 'cuentaRegresiva') return <CuentaRegresiva k={k} demo={demo} />
  if (id === 'finalViaje') return <FinalViaje k={k} demo={demo} />
  if (id === 'presupuestoViaje') return <PresupuestoViaje k={k} t={t} demo={demo} />
  if (id === 'apoyoViajes') {
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

// ───────── Parte 3: la cuenta regresiva ─────────

/**
 * Días hasta la salida (7 a 180) contra los días del viaje: cada día de espera es un día de
 * ilusión (Mitchell y colegas, 1997: antes del viaje lo valoramos mejor que durante).
 */
function CuentaRegresiva({ k, demo }: { k: K; demo: boolean }) {
  const [faltan, setFaltan] = useState(demo ? 7 : 60)
  const [viaje, setViaje] = useState(7)
  useDemo<number>(demo, [30, 90, 180], 1500, setFaltan, 3500)
  return (
    <div className="g-herramienta g-via">
      <h4>{k('titulo')}</h4>
      <label className="g-campo">
        <span>{k('faltan')}</span>
        <input type="range" min={7} max={180} step={1} value={faltan} onChange={(e) => setFaltan(Number(e.target.value))} />
        <b>{num(faltan)}</b>
      </label>
      <div className="g-opciones">
        <label>
          <span>{k('dura')}</span>
          <Segmentos valores={[3, 7, 14]} valor={viaje} set={setViaje} rotulo={(v) => num(v)} />
        </label>
      </div>
      <div className="g-via-espera" aria-hidden>
        <span className="g-via-ilusion" style={{ flexGrow: faltan }} />
        <span className="g-via-viaje" style={{ flexGrow: viaje }} />
      </div>
      <div className="g-hob-dos">
        <div>
          <b>{k('ilusion')}</b>
          <em>{num(faltan)}</em>
          <small>{k('dias')}</small>
        </div>
        <div>
          <b>{k('viaje')}</b>
          <em>{num(viaje)}</em>
          <small>{k('dias')}</small>
        </div>
      </div>
      <p className="g-hob-total">
        <b>×{num(faltan / viaje, 1)}</b> {k('porDia')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 4: el final del viaje ─────────

/**
 * El último día: «correr al aeropuerto» o «algo especial». El recuerdo se parece al promedio del
 * mejor momento y el final, no a la suma de los días (regla del pico y el final, Kahneman y
 * colegas, 1993; cifras ilustrativas sobre 10).
 */
function FinalViaje({ k, demo }: { k: K; demo: boolean }) {
  const [final, setFinal] = useState<'corre' | 'especial'>('corre')
  useDemo<'corre' | 'especial'>(demo, ['especial', 'corre', 'especial'], 1800, setFinal, 4000)
  const dias: [string, number][] = [
    ['dia1', 6],
    ['dia2', 7],
    ['dia3', 9],
    ['dia4', 6],
    [final === 'corre' ? 'ultimoCorre' : 'ultimoEspecial', final === 'corre' ? 3 : 9],
  ]
  const pico = Math.max(...dias.map(([, v]) => v))
  const recuerdo = (pico + dias[dias.length - 1][1]) / 2
  return (
    <div className="g-herramienta g-via">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('ultimoDia')}</span>
          <Segmentos<'corre' | 'especial'> valores={['corre', 'especial']} valor={final} set={setFinal} rotulo={(v) => k(v)} />
        </label>
      </div>
      <ol className="g-via-dias">
        {dias.map(([c, v], i) => (
          <li key={c} className={v === pico ? 'pico' : v <= 3 ? 'malo' : ''}>
            <small>{`${k('dia')} ${num(i + 1)}`}</small>
            <span>{k(c)}</span>
            <i>
              <b style={{ width: `${v * 10}%` }} />
            </i>
          </li>
        ))}
      </ol>
      <p className="g-hob-total">
        <b>{num(recuerdo, 1)}/10</b> {k(final === 'corre' ? 'recuerdoCorre' : 'recuerdoEspecial')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 6: el presupuesto ─────────

/** El idioma de la página; el español con los números de México (coma de miles), como Finanzas. */
const langDinero = () => { const l = lang(); return l === 'es' ? 'es-MX' : l }
/** Un número redondo cercano (para los valores de ejemplo, en cualquier moneda). */
const redondo = (n: number) => {
  const p = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1)
  return Math.round(n / p) * p
}

/**
 * Lo grande pagado antes (vuelos, hospedaje, entradas) + un monto diario × días = el total, y
 * lo que hay que apartar cada quincena hasta salir. La moneda y el ingreso de ejemplo son los
 * de la guía de Finanzas de cada idioma (`finanzas.moneda`, `finanzas.formato`, `finanzas.base`).
 */
function PresupuestoViaje({ k, t, demo }: { k: K; t: T; demo: boolean }) {
  const base = Number(t('finanzas.base')) || 10000
  const simbolo = t('finanzas.moneda')
  const dinero = (n: number) => {
    const v = new Intl.NumberFormat(langDinero(), { maximumFractionDigits: 0 }).format(Math.round(n))
    return t('finanzas.formato') === 'despues' ? `${v} ${simbolo}` : `${simbolo}${v}`
  }
  const [vuelos, setVuelos] = useState(redondo(base * 0.5))
  const [hospedaje, setHospedaje] = useState(redondo(base * 0.4))
  const [entradas, setEntradas] = useState(redondo(base * 0.1))
  const [diario, setDiario] = useState(redondo(base * 0.06))
  const [dias, setDias] = useState(7)
  const [quincenas, setQuincenas] = useState(6)
  useDemo<() => void>(demo, [() => setDias(10), () => setQuincenas(12), () => setDiario(redondo(base * 0.08))], 1600, (f) => f(), 4000)
  const antes = vuelos + hospedaje + entradas
  const durante = diario * dias
  const total = antes + durante
  const campo = (etiqueta: string, valor: number, set: (n: number) => void, unidad?: string, max = 1e12) => (
    <label className="g-campo">
      <span>{etiqueta}</span>
      <input type="number" min={0} max={max} value={valor} onChange={(e) => set(Math.max(0, Math.min(max, Number(e.target.value) || 0)))} />
      {unidad && <span>{unidad}</span>}
    </label>
  )
  return (
    <div className="g-herramienta g-via">
      <h4>{k('titulo')}</h4>
      <div className="g-campos">
        {campo(k('vuelos'), vuelos, setVuelos, simbolo)}
        {campo(k('hospedaje'), hospedaje, setHospedaje, simbolo)}
        {campo(k('entradas'), entradas, setEntradas, simbolo)}
        {campo(k('diario'), diario, setDiario, simbolo)}
      </div>
      <div className="g-opciones">
        <label>
          <span>{k('dias')}</span>
          <Segmentos valores={[3, 5, 7, 10, 14]} valor={dias} set={setDias} rotulo={(v) => num(v)} />
        </label>
        <label>
          <span>{k('quincenas')}</span>
          <Segmentos valores={[2, 4, 6, 12, 24]} valor={quincenas} set={setQuincenas} rotulo={(v) => num(v)} />
        </label>
      </div>
      <div className="g-via-espera" aria-hidden>
        <span className="g-via-ilusion" style={{ flexGrow: Math.max(antes, 1) }} />
        <span className="g-via-viaje" style={{ flexGrow: Math.max(durante, 1) }} />
      </div>
      <dl className="g-resultados">
        <div>
          <dt>{k('antes')}</dt>
          <dd>{dinero(antes)}</dd>
        </div>
        <div>
          <dt>{k('durante')}</dt>
          <dd>{dinero(durante)}</dd>
        </div>
        <div>
          <dt>{k('total')}</dt>
          <dd>{dinero(total)}</dd>
        </div>
        <div className="g-resultado-fuerte">
          <dt>{k('porQuincena')}</dt>
          <dd>{dinero(total / quincenas)}</dd>
        </div>
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_VIAJES = new Set(['anticipacion', 'rosa', 'picoFinal', 'dia8', 'fotos', 'personalidad', 'planViajes'])

/** Barras horizontales (anchos en %); la `fuerte` resaltada. */
function Barras({ filas, k, pie }: { filas: [string, number, boolean?, string?][]; k: K; pie: string }) {
  return (
    <figure className="g-grafica g-via">
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

/** Una línea con sus puntos (valores 0-100) y los rótulos del eje X que tengan clave. */
function Linea({ puntos, k, pie, eje, base }: { puntos: [number, string?][]; k: K; pie: string; eje: string; base?: number }) {
  const x = (i: number) => 40 + (i / (puntos.length - 1)) * 340
  const y = (v: number) => 140 - v * 1.1
  const camino = puntos.map(([v], i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return (
    <figure className="g-grafica g-via">
      <svg viewBox="0 0 400 180" role="img" aria-label={k(`grafica.${pie}`)}>
        <line x1="30" y1="140" x2="390" y2="140" className="g-eje" />
        {base !== undefined && <line x1="30" y1={y(base)} x2="390" y2={y(base)} className="g-curva g-age-sin g-via-base" />}
        <path d={camino} className="g-curva" />
        {puntos.map(([v, c], i) =>
          c ? (
            <g key={i}>
              <circle cx={x(i)} cy={y(v)} r="5" className="g-via-punto" />
              <text x={x(i)} y="160" textAnchor={i === 0 ? 'start' : i === puntos.length - 1 ? 'end' : 'middle'} className="g-rotulo">
                {k(`grafica.${c}`)}
              </text>
            </g>
          ) : null,
        )}
        <text x="30" y="16" className="g-rotulo">
          {k(`grafica.${eje}`)}
        </text>
      </svg>
      <figcaption>{k(`grafica.${pie}`)}</figcaption>
    </figure>
  )
}

export function GraficaViajes({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'anticipacion') {
    // Nawijn y colegas (2010), 1530 holandeses: más felices antes del viaje; después, igual que quienes no viajaron (ilustrativo).
    return <Barras k={k} pie="anticipacion" filas={[['antesViajan', 82, true], ['antesNo', 70], ['despuesViajaron', 71], ['despuesNo', 70]]} />
  }
  if (id === 'rosa') {
    // Mitchell y colegas (1997): antes y después se valora mejor que durante (ilustrativo).
    return <Linea k={k} pie="rosa" eje="valoracion" puntos={[[80, 'antes'], [55, 'durante'], [82, 'despues']]} />
  }
  if (id === 'picoFinal') {
    // Kahneman y colegas (1993): cerca del 69 % eligió repetir la prueba larga, la que terminaba menos fría.
    return <Barras k={k} pie="picoFinal" filas={[['corta', 31, false, `${num(31)} %`], ['larga', 69, true, `${num(69)} %`]]} />
  }
  if (id === 'dia8') {
    // de Bloom y colegas (2013): sube rápido, pico hacia el día 8 y en la 1.ª semana de trabajo vuelve al nivel de antes (ilustrativo).
    return (
      <Linea
        k={k}
        pie="dia8"
        eje="animo"
        base={45}
        puntos={[[45, 'antes'], [58], [66], [72], [76], [79], [80], [82, 'dia8Punto'], [81], [80, 'regreso'], [62], [52], [45, 'trabajo']]}
      />
    )
  }
  if (id === 'fotos') {
    // Henkel (2014): lo fotografiado se recuerda peor que lo solo mirado; con zoom a un detalle, el recuerdo se salva (ilustrativo).
    return <Barras k={k} pie="fotos" filas={[['mirado', 80, true], ['fotografiado', 64], ['zoom', 80, true]]} />
  }
  if (id === 'personalidad') {
    // Zimmermann y Neyer (2013): quienes estudiaron fuera ganaron apertura y amabilidad y bajaron su ansiedad más que quienes se quedaron (ilustrativo).
    return (
      <Barras
        k={k}
        pie="personalidad"
        filas={[['aperturaFuera', 75, true], ['aperturaQuedan', 35], ['amabilidadFuera', 60, true], ['amabilidadQuedan', 30], ['calmaFuera', 55, true], ['calmaQuedan', 25]]}
      />
    )
  }
  if (id === 'planViajes') {
    const etapas: [string, string][] = [
      ['semana1', 'g-z1'],
      ['mes1', 'g-z2'],
      ['cadaViaje', 'g-z3'],
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

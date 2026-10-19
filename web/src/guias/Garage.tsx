import { useEffect, useState } from 'react'
import type { T } from './datos'
import { Apoyo } from './Video'

/**
 * Lo propio de la guía de Garage («¿Cómo mantener tus vehículos?»): sus mini-herramientas
 * y sus gráficas, dibujadas aquí (SVG y CSS). Con `demo` (su línea suena en modo grabación) cada
 * herramienta se usa sola al ritmo de la voz. La de «like, suscríbete y comparte» es la de la
 * guía de Video, sin la barra de la mitad (`apoyoGarage`).
 */
export const HERRAMIENTAS_GARAGE = new Set(['presionConsumo', 'cambiosAceite', 'manejoSuave', 'apoyoGarage'])

export function HerramientaGarage({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  const k = (s: string) => t(`garage.${id}.${s}`)
  if (id === 'presionConsumo') return <PresionConsumo k={k} demo={demo} />
  if (id === 'cambiosAceite') return <CambiosAceite k={k} demo={demo} />
  if (id === 'manejoSuave') return <ManejoSuave k={k} demo={demo} />
  if (id === 'apoyoGarage') {
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

// ───────── Parte 3: llantas bajas ─────────

/**
 * Cuánta presión le falta a tus llantas × los litros de gasolina al año → litros de más:
 * cerca de un 0,2 % por cada psi que baja el promedio de las cuatro (Departamento de Energía de EE. UU.).
 */
function PresionConsumo({ k, demo }: { k: K; demo: boolean }) {
  const [psi, setPsi] = useState(demo ? 2 : 6)
  const [litros, setLitros] = useState(1000)
  useDemo<number>(demo, [4, 6, 8], 1500, setPsi, 4500)
  const extra = litros * 0.002 * psi
  return (
    <div className="g-herramienta g-gar">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('faltan')}</span>
          <Segmentos valores={[2, 4, 6, 8, 10]} valor={psi} set={setPsi} rotulo={(v) => `${num(v)} psi`} />
        </label>
        <label>
          <span>{k('litros')}</span>
          <Segmentos valores={[500, 1000, 1500, 2000]} valor={litros} set={setLitros} rotulo={(v) => `${num(v)} L`} />
        </label>
      </div>
      <div className="g-gar-llanta" aria-hidden>
        <i style={{ ['--aplasta' as string]: psi / 10 }} />
      </div>
      <p className="g-hob-total">
        <b>+{num(extra)} L</b> {k('deMas')} · <b>{num(psi * 0.2, 1)} %</b> {k('mas')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 4: cambios de aceite ─────────

/** Kilómetros al año ÷ el intervalo de siempre (5000) contra el del manual → cambios al año que te ahorras. */
function CambiosAceite({ k, demo }: { k: K; demo: boolean }) {
  const [km, setKm] = useState(15000)
  const [manual, setManual] = useState(demo ? 5000 : 10000)
  useDemo<number>(demo, [8000, 10000, 15000], 1700, setManual, 6500)
  const mito = km / 5000
  const bueno = km / manual
  return (
    <div className="g-herramienta g-gar">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('kmAno')}</span>
          <Segmentos valores={[10000, 15000, 20000, 25000]} valor={km} set={setKm} rotulo={(v) => num(v)} />
        </label>
        <label>
          <span>{k('manual')}</span>
          <Segmentos valores={[5000, 8000, 10000, 15000]} valor={manual} set={setManual} rotulo={(v) => num(v)} />
        </label>
      </div>
      <div className="g-hob-dos">
        <div>
          <b>{k('cada5000')}</b>
          <em>{num(mito, 1)}</em>
          <small>{k('alAno')}</small>
        </div>
        <div>
          <b>{k('segunManual')}</b>
          <em>{num(bueno, 1)}</em>
          <small>{k('alAno')}</small>
        </div>
      </div>
      <p className="g-hob-total">
        <b>{num(Math.max(0, mito - bueno), 1)}</b> {k('ahorras')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Parte 5: manejar suave ─────────

/** Litros de gasolina al mes → lo que te ahorras al año sin acelerones ni frenazos (15 a 30 % en carretera, según el Departamento de Energía). */
function ManejoSuave({ k, demo }: { k: K; demo: boolean }) {
  const [mes, setMes] = useState(demo ? 40 : 80)
  useDemo<number>(demo, [80, 120], 1800, setMes, 4000)
  const ano = mes * 12
  // El gasto con acelerones es el de hoy: manejar suave lo baja entre un 13 y un 23 % (1 − 1/1,15 y 1 − 1/1,3).
  const [min, max] = [ano * (1 - 1 / 1.15), ano * (1 - 1 / 1.3)]
  return (
    <div className="g-herramienta g-gar">
      <h4>{k('titulo')}</h4>
      <label>
        <span>{k('alMes')}</span>
        <Segmentos valores={[40, 80, 120, 160]} valor={mes} set={setMes} rotulo={(v) => `${num(v)} L`} />
      </label>
      <div className="g-gar-tanques" aria-hidden key={Math.round(max / 50)}>
        {Array.from({ length: Math.min(12, Math.round(max / 50)) }, (_, i) => (
          <span key={i} style={{ ['--j' as string]: i }} />
        ))}
      </div>
      <p className="g-hob-total">
        <b>
          {num(min)}–{num(max)} L
        </b>{' '}
        {k('ahorras')}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

// ───────── Gráficas ─────────

export const GRAFICAS_GARAGE = new Set(['edadAutos', 'causasFalla', 'filtroAire', 'manejoAgresivo', 'recordatorio', 'planGarage'])

/** Barras horizontales (anchos en %); la `fuerte` resaltada. */
function Barras({ filas, k, pie }: { filas: [string, number, boolean?, string?][]; k: K; pie: string }) {
  return (
    <figure className="g-grafica g-gar">
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

export function GraficaGarage({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'edadAutos') {
    // Edad promedio de los coches y camionetas en EE. UU. (IHS / S&P Global Mobility): 11,4 en 2014, 11,8 en 2019, 12,6 en 2024.
    const filas: [number, number][] = [[2014, 11.4], [2019, 11.8], [2024, 12.6]]
    return (
      <figure className="g-grafica g-gar">
        <div className="g-ent-columnasBarras">
          {filas.map(([a, v], i) => (
            <div key={a} className={i === filas.length - 1 ? 'fuerte' : ''}>
              <i>
                <b style={{ height: `${(v / 13) * 100}%` }} />
              </i>
              <span>
                {a} · {num(v, 1)}
              </span>
            </div>
          ))}
        </div>
        <figcaption>{k('grafica.edadAutos')}</figcaption>
      </figure>
    )
  }
  if (id === 'causasFalla') {
    // NHTSA (2015): de los choques en que la causa fue el vehículo, llantas 35 % y frenos 22 %.
    return <Barras k={k} pie="causasFalla" filas={[['llantas', 35, true, `${num(35)} %`], ['frenos', 22, true, `${num(22)} %`], ['otras', 43, false, `${num(43)} %`]]} />
  }
  if (id === 'filtroAire') {
    // Oak Ridge (2009): con el filtro tapado, el consumo casi igual y la aceleración peor (6 a 11 % más lenta).
    const filas: [string, string, string][] = [
      ['consumo', '→', 'igual'],
      ['aceleracion', '↓', 'baja'],
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
        <figcaption>{k('grafica.filtroAire')}</figcaption>
      </figure>
    )
  }
  if (id === 'manejoAgresivo') {
    // Departamento de Energía de EE. UU.: acelerones y frenazos suben el gasto 15–30 % en carretera y 10–40 % en la ciudad.
    const filas: [string, number, number][] = [['carretera', 15, 30], ['ciudad', 10, 40]]
    return (
      <figure className="g-grafica g-gar">
        <div className="g-gar-rangos">
          {filas.map(([c, a, b]) => (
            <div key={c}>
              <span>
                {k(`grafica.${c}`)} · {num(a)}–{num(b)} %
              </span>
              <i>
                <b style={{ insetInlineStart: `${(a / 45) * 100}%`, width: `${((b - a) / 45) * 100}%` }} />
              </i>
            </div>
          ))}
        </div>
        <figcaption>{k('grafica.manejoAgresivo')}</figcaption>
      </figure>
    )
  }
  if (id === 'recordatorio') {
    // Altmann y Traxler (2014): con la postal, más del doble hizo su cita en el primer mes (ilustrativo).
    return <Barras k={k} pie="recordatorio" filas={[['sinPostal', 30], ['conPostal', 68, true]]} />
  }
  if (id === 'planGarage') {
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

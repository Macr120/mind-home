import { useEffect, useState } from 'react'
import type { T } from './datos'

/**
 * Lo propio de la guía de Descanso: sus mini-herramientas y sus gráficas. Como
 * las de Cocina, con `demo` (su línea suena en modo grabación) se usan solas
 * para que el video las enseñe funcionando.
 */
export const HERRAMIENTAS_DESCANSO = new Set(['calculadoraSueno', 'cafeinaRestante'])

export function HerramientaDescanso({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  if (id === 'calculadoraSueno') return <CalculadoraSueno t={t} demo={demo} />
  if (id === 'cafeinaRestante') return <CafeinaRestante t={t} demo={demo} />
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

const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const aHora = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Ciclos de ~90 min y unos 15 min para quedarse dormido. */
const CICLO = 90
const DORMIRSE = 15

function CalculadoraSueno({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`descanso.calc.${s}`)
  const [despertar, setDespertar] = useState('07:00')
  useDemo(demo, ['06:30', '07:30', '06:00', '07:00'], 1900, setDespertar)
  const opciones = [6, 5, 4].map((ciclos) => ({ ciclos, horas: (ciclos * CICLO) / 60, hora: aHora(aMin(despertar) - ciclos * CICLO - DORMIRSE) }))
  return (
    <div className="g-herramienta">
      <h4>{k('titulo')}</h4>
      <label className="g-campo">
        <span>{k('despierto')}</span>
        <input type="time" value={despertar} onChange={(e) => e.target.value && setDespertar(e.target.value)} />
      </label>
      <p className="g-sub">{k('acuestate')}</p>
      <dl className="g-resultados g-resultados-3">
        {opciones.map((o) => (
          <div key={o.ciclos} className={o.ciclos === 5 ? 'g-resultado-fuerte' : o.ciclos === 4 ? 'g-resultado-corto' : ''}>
            <dt>
              {o.ciclos} {k('ciclos')} · {o.horas.toLocaleString(document.documentElement.lang || 'es')} h
            </dt>
            <dd>{o.hora}</dd>
          </div>
        ))}
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Miligramos de cafeína aproximados por porción (referencias de la EFSA y etiquetas comunes). */
const BEBIDAS = [
  { id: 'cafe', mg: 95 },
  { id: 'espresso', mg: 63 },
  { id: 'te', mg: 47 },
  { id: 'cola', mg: 34 },
  { id: 'energetica', mg: 80 },
]
const HORAS_TOMA = ['08:00', '12:00', '15:00', '18:00', '21:00']
/** Vida media de la cafeína en un adulto sano (varía de 2 a 10 h según la persona). */
const VIDA_MEDIA = 5

function CafeinaRestante({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`descanso.cafeina.${s}`)
  const [bebida, setBebida] = useState('cafe')
  const [toma, setToma] = useState('15:00')
  const [dormir, setDormir] = useState('23:00')
  useDemo<() => void>(demo, [() => setToma('08:00'), () => setToma('12:00'), () => setToma('18:00'), () => setBebida('energetica'), () => setToma('21:00')], 1500, (f) => f())
  const mg = BEBIDAS.find((b) => b.id === bebida)!.mg
  const horas = ((aMin(dormir) - aMin(toma) + 1440) % 1440) / 60
  const queda = mg * 0.5 ** (horas / VIDA_MEDIA)
  // La curva de la toma a la hora de dormir (y un poco después), sobre 0..100 % de la dosis.
  const tramo = Math.max(horas + 2, 6)
  const puntos = Array.from({ length: 41 }, (_, i) => {
    const h = (i / 40) * tramo
    return `${20 + (h / tramo) * 360},${130 - 110 * 0.5 ** (h / VIDA_MEDIA)}`
  }).join(' ')
  const xDormir = 20 + (horas / tramo) * 360
  const yDormir = 130 - 110 * (queda / mg)
  return (
    <div className="g-herramienta">
      <h4>{k('titulo')}</h4>
      <div className="g-chips">
        {BEBIDAS.map((b) => (
          <button key={b.id} type="button" className={b.id === bebida ? 'activo' : ''} onClick={() => setBebida(b.id)}>
            {k(b.id)}
          </button>
        ))}
      </div>
      <div className="g-opciones">
        <label>
          <span>{k('aLas')}</span>
          <div className="g-segmentos g-segmentos-anchos">
            {HORAS_TOMA.map((h) => (
              <button key={h} type="button" className={h === toma ? 'activo' : ''} onClick={() => setToma(h)}>
                {h}
              </button>
            ))}
          </div>
        </label>
        <label className="g-campo">
          <span>{k('duermes')}</span>
          <input type="time" value={dormir} onChange={(e) => e.target.value && setDormir(e.target.value)} />
        </label>
      </div>
      <figure className="g-grafica g-cafeina">
        <svg viewBox="0 0 400 150" role="img" aria-label={k('titulo')}>
          <line x1="20" y1="130" x2="390" y2="130" className="g-eje" />
          <polyline points={puntos} className="g-curva" />
          <line x1={xDormir} y1="14" x2={xDormir} y2="130" className="g-eje" strokeDasharray="4 5" />
          <circle cx={xDormir} cy={yDormir} r="7" className="g-punto-luna" />
          <text x={Math.min(xDormir, 330)} y="12" textAnchor="middle" className="g-rotulo g-fuerte">
            {dormir}
          </text>
          <text x="24" y="146" className="g-rotulo">{toma}</text>
        </svg>
      </figure>
      <div className="g-azucar">
        <p>
          <b>{Math.round(queda)} mg</b> {k('quedan')} · {Math.round((queda / mg) * 100)} % {k('deLaDosis')}
        </p>
        <div className="g-medidor">
          <span style={{ width: `${Math.min(100, (queda / mg) * 100)}%` }} className={queda > 25 ? 'g-pasado' : ''} />
        </div>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

export const GRAFICAS_DESCANSO = new Set(['hipnograma', 'historiaSueno', 'edades', 'circadiano'])

/**
 * Una noche típica de un adulto (8 h): [hora de inicio, fase]. 0 = despierto,
 * 1 = REM, 2 = ligero, 3 = profundo. El profundo abunda al principio y el REM,
 * hacia la mañana (como en los hipnogramas de los manuales de sueño).
 */
const NOCHE: [number, number][] = [
  [0, 0], [0.15, 2], [0.45, 3], [1.15, 2], [1.35, 1], [1.5, 2], [1.9, 3], [2.45, 2], [2.8, 1], [3.1, 2],
  [3.5, 3], [3.75, 2], [4.3, 1], [4.75, 2], [5.4, 1], [5.95, 0], [6.0, 2], [6.6, 1], [7.4, 2], [7.75, 0], [8, 0],
]

export function GraficaDescanso({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'hipnograma') {
    const x = (h: number) => 70 + (h / 8) * 315
    const y = (f: number) => 22 + f * 36
    const camino = NOCHE.map(([h, f], i) => `${i ? 'H' : 'M'}${x(h)} ${i ? `V${y(f)}` : y(f)}`).join(' ')
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 170" role="img" aria-label={k('grafica.hipnograma')}>
          {['despierto', 'rem', 'ligero', 'profundo'].map((f, i) => (
            <text key={f} x="62" y={y(i) + 4} textAnchor="end" className={`g-rotulo${i === 1 ? ' g-fuerte' : ''}`}>
              {k(`grafica.${f}`)}
            </text>
          ))}
          {[0, 2, 4, 6, 8].map((h) => (
            <text key={h} x={x(h)} y="164" textAnchor="middle" className="g-rotulo">
              {h} h
            </text>
          ))}
          {NOCHE.filter(([, f]) => f === 3).map(([h], i) => (
            <rect key={i} x={x(h)} y={y(3) - 10} width={x(NOCHE[NOCHE.findIndex(([hh]) => hh === h) + 1][0]) - x(h)} height="20" rx="4" className="g-franja-profundo" />
          ))}
          <path d={camino} className="g-curva" strokeLinejoin="round" />
        </svg>
        <figcaption>{k('grafica.hipnograma')}</figcaption>
      </figure>
    )
  }
  if (id === 'historiaSueno') {
    const hitos: [string, string][] = [
      [k('grafica.siglos'), k('grafica.siglosDet')],
      ['1879', k('grafica.edisonDet')],
      ['1938', k('grafica.cuevaDet')],
      ['1953', k('grafica.remDet')],
      ['2017', k('grafica.nobelDet')],
    ]
    return (
      <figure className="g-grafica">
        <ol className="g-historia" style={{ gridTemplateColumns: `repeat(${hitos.length}, 1fr)` }}>
          {hitos.map(([cuando, que]) => (
            <li key={cuando}>
              <b>{cuando}</b>
              <span>{que}</span>
            </li>
          ))}
        </ol>
        <figcaption>{k('grafica.historia')}</figcaption>
      </figure>
    )
  }
  if (id === 'edades') {
    // Horas recomendadas (AASM): de / a; los adultos, 7 o más (se dibuja hasta 9).
    const grupos: [string, number, number][] = [
      ['ninos', 9, 12],
      ['adolescentes', 8, 10],
      ['adultos', 7, 9],
    ]
    const x = (h: number) => 110 + ((h - 4) / 10) * 275
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 150" role="img" aria-label={k('grafica.edades')}>
          {[4, 6, 8, 10, 12, 14].map((h) => (
            <g key={h}>
              <line x1={x(h)} y1="10" x2={x(h)} y2="122" className="g-eje" strokeDasharray="2 6" />
              <text x={x(h)} y="140" textAnchor="middle" className="g-rotulo">
                {h} h
              </text>
            </g>
          ))}
          {grupos.map(([g, de, a], i) => (
            <g key={g}>
              <text x="100" y={34 + i * 38} textAnchor="end" className="g-rotulo g-fuerte">
                {k(`grafica.${g}`)}
              </text>
              <rect x={x(de)} y={18 + i * 38} width={x(a) - x(de)} height="24" rx="12" className="g-barra" />
              <text x={(x(de) + x(a)) / 2} y={34 + i * 38} textAnchor="middle" className="g-rotulo g-en-barra">
                {g === 'adultos' ? '≥ 7' : `${de}–${a}`}
              </text>
            </g>
          ))}
        </svg>
        <figcaption>{k('grafica.edades')}</figcaption>
      </figure>
    )
  }
  // Reloj de 24 h (de 6:00 a 6:00): la luz del día y la melatonina, que sube al oscurecer y baja al amanecer.
  const x = (h: number) => 20 + (((h - 6 + 24) % 24) / 24) * 360
  const mel = Array.from({ length: 97 }, (_, i) => {
    // Campana centrada a las 3:00, de ~21:00 a ~8:00.
    const d = ((6 + i / 4 - 3 + 36) % 24) - 12
    return `${20 + (i / 96) * 360},${120 - 85 * Math.exp(-(d * d) / 9)}`
  }).join(' ')
  return (
    <figure className="g-grafica">
      <svg viewBox="0 0 400 160" role="img" aria-label={k('grafica.circadiano')}>
        <rect x={x(7)} y="10" width={x(20) - x(7)} height="112" rx="8" className="g-franja-dia" />
        <rect x={x(21)} y="10" width={x(5.99) - x(21)} height="112" rx="8" className="g-franja-noche" />
        <polyline points={mel} className="g-curva" />
        <line x1="20" y1="122" x2="380" y2="122" className="g-eje" />
        {[6, 12, 18, 0].map((h) => (
          <text key={h} x={x(h)} y="140" textAnchor="middle" className="g-rotulo">
            {`${h}:00`}
          </text>
        ))}
        <text x={x(9.5)} y="30" className="g-rotulo g-fuerte">{k('grafica.luz')}</text>
        <text x={x(1)} y="30" textAnchor="middle" className="g-rotulo g-fuerte">{k('grafica.melatonina')}</text>
      </svg>
      <figcaption>{k('grafica.circadiano')}</figcaption>
    </figure>
  )
}

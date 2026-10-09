import { useEffect, useState } from 'react'
import type { T } from './datos'

/**
 * Mini-herramientas de la guía de ejercicio. `demo`: su línea está sonando en
 * modo grabación, y la herramienta se usa sola (como si alguien la tocara)
 * para que el video la enseñe funcionando.
 */
export function Herramienta({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  if (id === 'escalaRpe') return <EscalaRpe t={t} demo={demo} />
  if (id === 'zonasCardiacas') return <ZonasCardiacas t={t} demo={demo} />
  if (id === 'armaTuPlan') return <ArmaTuPlan t={t} demo={demo} />
  return null
}

/** Recorre una lista de valores mientras `demo` está activo. */
function useDemo<V>(demo: boolean, pasos: V[], ms: number, aplicar: (v: V) => void) {
  useEffect(() => {
    if (!demo) return
    let i = 0
    const id = setInterval(() => {
      aplicar(pasos[i])
      i = Math.min(i + 1, pasos.length - 1)
    }, ms)
    return () => clearInterval(id)
    // Los pasos son literales de quien llama: solo importa encender/apagar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo])
}

function EscalaRpe({ t, demo }: { t: T; demo: boolean }) {
  const [n, setN] = useState(5)
  useDemo(demo, [1, 3, 5, 6, 7, 8, 6, 5], 1100, setN)
  const zona = n <= 4 ? 'ligero' : n <= 6 ? 'moderado' : n <= 8 ? 'vigoroso' : 'maximo'
  return (
    <div className="g-herramienta">
      <h4>{t('ejercicio.rpe.titulo')}</h4>
      <p className="g-sub">{t('ejercicio.rpe.pregunta')}</p>
      <div className="g-rpe">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
          <button
            key={v}
            type="button"
            className={v === n ? 'activo' : ''}
            style={{ ['--h' as string]: `${130 - v * 13}` }}
            onClick={() => setN(v)}
            aria-pressed={v === n}
          >
            {v}
          </button>
        ))}
      </div>
      <p className="g-rpe-desc">
        <b>{n}</b> · {t(`ejercicio.rpe.n${n}`)}
        <span className={`g-etiqueta g-${zona}`}>{t(`ejercicio.rpe.${zona}`)}</span>
      </p>
    </div>
  )
}

const ZONAS = [
  { id: 'z1', de: 0.5, a: 0.6 },
  { id: 'z2', de: 0.6, a: 0.7 },
  { id: 'z3', de: 0.7, a: 0.8 },
  { id: 'z4', de: 0.8, a: 0.9 },
  { id: 'z5', de: 0.9, a: 1 },
]

function ZonasCardiacas({ t, demo }: { t: T; demo: boolean }) {
  const [edad, setEdad] = useState(30)
  useDemo(demo, [30, 32, 34, 35], 700, setEdad)
  const max = Math.round(208 - 0.7 * edad)
  return (
    <div className="g-herramienta">
      <h4>{t('ejercicio.zonas.titulo')}</h4>
      <label className="g-campo">
        <span>{t('ejercicio.zonas.edad')}</span>
        <input
          type="number"
          min={12}
          max={95}
          value={edad}
          onChange={(e) => setEdad(Math.max(12, Math.min(95, Number(e.target.value) || 0)))}
        />
        <span>{t('ejercicio.zonas.anios')}</span>
      </label>
      <p className="g-fcmax">
        {t('ejercicio.zonas.fcmax')}: <b>{max}</b> {t('ejercicio.zonas.lpm')}
      </p>
      <ul className="g-zonas">
        {ZONAS.map((z) => (
          <li key={z.id} className={`g-${z.id}`}>
            <span className="g-zona-barra" style={{ width: `${z.a * 100}%` }} />
            <b>{t(`ejercicio.zonas.${z.id}`)}</b>
            <span className="g-lpm">
              {Math.round(max * z.de)}–{Math.round(max * z.a)} {t('ejercicio.zonas.lpm')}
            </span>
            <small>{t(`ejercicio.zonas.${z.id}Det`)}</small>
          </li>
        ))}
      </ul>
      <p className="g-nota">{t('ejercicio.zonas.formula')}</p>
    </div>
  )
}

type Sesion = 'fuerza' | 'cardioSuave' | 'cardioIntenso' | 'movilidad' | 'descanso'
const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']
/** Qué días se entrena según cuántos hay (repartidos para que la fuerza no caiga seguida). */
const REPARTO: Record<number, number[]> = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] }
const ORDEN: Record<number, Sesion[]> = {
  2: ['fuerza', 'fuerza'],
  3: ['fuerza', 'cardioSuave', 'fuerza'],
  4: ['fuerza', 'cardioSuave', 'fuerza', 'cardioSuave'],
  5: ['fuerza', 'cardioSuave', 'fuerza', 'cardioSuave', 'movilidad'],
  6: ['fuerza', 'cardioSuave', 'fuerza', 'cardioSuave', 'fuerza', 'cardioSuave'],
}
/** Volumen relativo de cada semana: +10 % dos veces y descarga. */
const FACTOR = [1, 1.1, 1.2, 0.7]

function ArmaTuPlan({ t, demo }: { t: T; demo: boolean }) {
  const [dias, setDias] = useState(3)
  const [nivel, setNivel] = useState<'principiante' | 'intermedio'>('principiante')
  const [min, setMin] = useState(30)
  useDemo(demo, [3, 4, 4, 5], 1400, setDias)
  const orden = ORDEN[dias].map((s, i) =>
    // Quien ya entrena cambia el último cardio suave por intervalos (distribución polarizada).
    nivel === 'intermedio' && s === 'cardioSuave' && i === ORDEN[dias].lastIndexOf('cardioSuave') ? 'cardioIntenso' : s,
  ) as Sesion[]
  const semana: Sesion[] = DIAS.map(() => 'descanso')
  REPARTO[dias].forEach((d, i) => (semana[d] = orden[i]))
  const seriesBase = nivel === 'principiante' ? 2 : 3
  const semanas = FACTOR.map((f, s) => {
    const series = s === 3 ? 2 : s === 0 ? seriesBase : seriesBase + 1
    let moderados = 0
    for (const d of semana) {
      // En los días de fuerza se suman 10 min de caminata al terminar.
      if (d === 'cardioSuave') moderados += min * f
      else if (d === 'cardioIntenso') moderados += min * f * 2
      else if (d === 'fuerza') moderados += 10
    }
    return { f, series, moderados: Math.round(moderados) }
  })
  return (
    <div className="g-herramienta">
      <h4>{t('ejercicio.plan.titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{t('ejercicio.plan.dias')}</span>
          <div className="g-segmentos">
            {[2, 3, 4, 5, 6].map((d) => (
              <button key={d} type="button" className={d === dias ? 'activo' : ''} onClick={() => setDias(d)}>
                {d}
              </button>
            ))}
          </div>
        </label>
        <label>
          <span>{t('ejercicio.plan.nivel')}</span>
          <div className="g-segmentos">
            {(['principiante', 'intermedio'] as const).map((n) => (
              <button key={n} type="button" className={n === nivel ? 'activo' : ''} onClick={() => setNivel(n)}>
                {t(`ejercicio.plan.${n}`)}
              </button>
            ))}
          </div>
        </label>
        <label>
          <span>{t('ejercicio.plan.minutos')}</span>
          <div className="g-segmentos">
            {[20, 30, 45, 60].map((m) => (
              <button key={m} type="button" className={m === min ? 'activo' : ''} onClick={() => setMin(m)}>
                {m}
              </button>
            ))}
          </div>
        </label>
      </div>
      <div className="g-plan">
        {semanas.map((s, i) => (
          <div key={i} className={`g-plan-semana${i === 3 ? ' descarga' : ''}`}>
            <div className="g-plan-cabeza">
              <b>
                {t('ejercicio.plan.semana')} {i + 1}
              </b>
              {i === 3 && <span className="g-etiqueta">{t('ejercicio.plan.descarga')}</span>}
              <span className="g-plan-total">
                {s.moderados} {t('ejercicio.plan.minModerados')}
              </span>
            </div>
            <div className="g-plan-dias">
              {semana.map((d, j) => (
                <div key={j} className={`g-dia g-${d}`} title={t(`ejercicio.plan.${d}`)}>
                  <small>{t(`ejercicio.plan.${DIAS[j]}`)}</small>
                  <span>{t(`ejercicio.plan.${d}`)}</span>
                  {d === 'fuerza' && (
                    <em>
                      {s.series} {t('ejercicio.plan.series')}
                    </em>
                  )}
                  {(d === 'cardioSuave' || d === 'cardioIntenso') && <em>{Math.round(min * s.f)}′</em>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className={`g-nota ${semanas[1].moderados >= 150 ? 'g-ok' : ''}`}>
        {semanas[1].moderados >= 150 ? t('ejercicio.plan.cumpleOms') : t('ejercicio.plan.noCumpleOms')}
      </p>
    </div>
  )
}

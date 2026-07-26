import { useMemo, useState } from 'react'
import type { PerfilNutricion, RegistroPeso } from '../../core/data/db'
import { sumarDias } from './fecha'
import { progresoMeta, registrarPeso } from './peso'
import type { ProgresoMeta } from './peso'
import { COLOR, OBJETIVOS } from './constantes'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

const VERDE = '#34d399'

const RANGOS = [
  { dias: 30, labelEs: '30 d' },
  { dias: 90, labelEs: '90 d' },
  { dias: 365, labelEs: '1 año' },
]

/**
 * El peso, al frente: número grande, tendencia y qué falta para la meta.
 * El ritmo y la ETA siempre se miden a 30 días aunque la gráfica muestre más:
 * cambiar el zoom no debe cambiar el diagnóstico.
 */
export function PesoPanel({
  fecha,
  pesos,
  perfil,
  onAjustar,
}: {
  fecha: string
  pesos: RegistroPeso[]
  perfil: PerfilNutricion
  onAjustar: () => void
}) {
  const t = useT()
  const [kg, setKg] = useState('')
  const [dias, setDias] = useState(30)

  const meta = useMemo(() => progresoMeta(pesos, perfil, fecha), [pesos, perfil, fecha])

  // Último pesaje de cada día dentro del rango elegido.
  const serie = useMemo(() => {
    const desde = sumarDias(fecha, -(dias - 1))
    const porDia = new Map<string, number>()
    for (const p of [...pesos].sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || (a.id ?? 0) - (b.id ?? 0),
    )) {
      if (p.fecha >= desde && p.fecha <= fecha) porDia.set(p.fecha, p.kg)
    }
    return [...porDia.entries()].map(([f, k]) => ({ fecha: f, kg: k }))
  }, [pesos, fecha, dias])

  const actual = serie.length > 0 ? serie[serie.length - 1].kg : null
  const delta = serie.length > 1 ? serie[serie.length - 1].kg - serie[0].kg : null

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseFloat(kg)
    if (!Number.isFinite(n) || n <= 0) return
    await registrarPeso(fecha, Math.round(n * 10) / 10)
    setKg('')
  }

  const objetivo = OBJETIVOS.find((o) => o.id === (perfil.objetivo ?? 'mantener'))!
  const un = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

  return (
    <div className="rounded-2xl border border-white/10 p-4" style={{ background: `${VERDE}12` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-white/50">
            <Icono nombre="balanza" /> {t('cocina.peso.titulo', 'Peso corporal')}
          </p>
          <p className="text-4xl font-black" style={{ color: VERDE }}>
            {actual !== null ? un(actual) : '—'}
            <span className="text-lg font-semibold text-white/40"> kg</span>
          </p>
          {delta !== null && delta !== 0 && (
            <p className={`text-xs font-semibold ${delta < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {delta > 0 ? '+' : ''}
              {un(delta)} {t('cocina.peso.enRango', 'kg en este periodo')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onAjustar}
          className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/15"
        >
          <Icono emoji={objetivo.icon} /> {t(`cocina.tdee.${objetivo.id}`, objetivo.label)}
        </button>
      </div>

      <form onSubmit={guardar} className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={0}
          step="0.1"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          placeholder={t('cocina.peso.ph', 'Pésate hoy… (kg)')}
          className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-amber-400/50"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold texto-cta hover:brightness-110"
        >
          {t('cocina.peso.registrar', 'Registrar')}
        </button>
      </form>

      {serie.length < 2 ? (
        <p className="mt-3 text-xs text-white/40">
          {t('cocina.peso.sinDatos', 'Registra tu peso para ver la tendencia.')}
        </p>
      ) : (
        <>
          <div className="mt-3 flex gap-1.5">
            {RANGOS.map((r) => (
              <button
                key={r.dias}
                type="button"
                onClick={() => setDias(r.dias)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                  dias === r.dias ? 'bg-white/15' : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                {t(`cocina.peso.rango${r.dias}`, r.labelEs)}
              </button>
            ))}
          </div>
          <GraficaPeso serie={serie} objetivoKg={perfil.pesoObjetivoKg} />
        </>
      )}

      {meta ? (
        <MetaPeso meta={meta} />
      ) : (
        <button
          type="button"
          onClick={onAjustar}
          className="mt-3 w-full rounded-lg bg-amber-500/15 px-3 py-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
        >
          {t('cocina.peso.ponMeta', 'Pon tu peso objetivo para seguir tu progreso')}
        </button>
      )}
    </div>
  )
}

/**
 * Línea de peso con su área y la meta punteada. Si la meta queda muy lejos del
 * rango de datos, la línea se dibujaría fuera del lienzo y aplastaría la
 * tendencia: en ese caso solo se rotula, sin línea.
 */
function GraficaPeso({
  serie,
  objetivoKg,
}: {
  serie: { fecha: string; kg: number }[]
  objetivoKg?: number
}) {
  const t = useT()
  const { linea, area, yMeta, minK, maxK } = useMemo(() => {
    const kgs = serie.map((p) => p.kg)
    let min = Math.min(...kgs)
    let max = Math.max(...kgs)
    // Con la meta cerca, entra en el encuadre; si está a más de un rango de
    // distancia, se queda fuera para no aplastar la línea de peso.
    const holgura = Math.max(max - min, 1)
    if (objetivoKg && objetivoKg >= min - holgura && objetivoKg <= max + holgura) {
      min = Math.min(min, objetivoKg)
      max = Math.max(max, objetivoKg)
    }
    const rango = Math.max(max - min, 0.5)
    const y = (k: number) => 116 - ((k - min) / rango) * 108
    const pts = serie.map((p, i) => `${((i / (serie.length - 1)) * 300).toFixed(1)},${y(p.kg).toFixed(1)}`)
    const dentro = objetivoKg !== undefined && objetivoKg >= min && objetivoKg <= max
    return {
      linea: pts.join(' '),
      area: `0,120 ${pts.join(' ')} 300,120`,
      yMeta: dentro ? y(objetivoKg) : null,
      minK: min,
      maxK: max,
    }
  }, [serie, objetivoKg])

  const un = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

  return (
    <div className="mt-2">
      <svg viewBox="0 0 300 120" preserveAspectRatio="none" className="h-32 w-full">
        <polygon points={area} fill={VERDE} opacity={0.12} />
        {yMeta !== null && (
          <line
            x1="0"
            x2="300"
            y1={yMeta}
            y2={yMeta}
            stroke={COLOR}
            strokeWidth="1.5"
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <polyline
          points={linea}
          fill="none"
          stroke={VERDE}
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-white/35">
        <span>{un(minK)} kg</span>
        {objetivoKg !== undefined && (
          <span style={{ color: COLOR }}>
            {t('cocina.peso.lineaMeta', `Meta ${un(objetivoKg)} kg`, { n: un(objetivoKg) })}
          </span>
        )}
        <span>{un(maxK)} kg</span>
      </div>
    </div>
  )
}

/** Progreso hacia el peso objetivo: lo que falta, el ritmo real y la llegada estimada. */
function MetaPeso({ meta }: { meta: ProgresoMeta }) {
  const t = useT()
  const un = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

  if (meta.logrado) {
    return (
      <p className="mt-3 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-400">
        {t('cocina.meta.logrado', `¡Meta alcanzada! Estás en tu peso objetivo de ${meta.objetivo} kg 🎉`, {
          n: String(meta.objetivo),
        })}
      </p>
    )
  }

  const eta = meta.fechaEstimada
    ? new Date(`${meta.fechaEstimada}T12:00:00`).toLocaleDateString(localeActual(), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <div className={`mt-3 rounded-lg px-3 py-2 ${meta.enRumbo ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
      <p className="text-xs font-semibold text-white/80">
        {t('cocina.meta.restante', `Meta ${meta.objetivo} kg · te faltan ${un(meta.restanteKg)} kg`, {
          o: String(meta.objetivo),
          n: un(meta.restanteKg),
        })}
      </p>
      <p className="mt-0.5 text-[10px] text-white/50">
        {meta.ritmoRealSemana === null
          ? t('cocina.meta.sinRitmo', 'Registra tu peso unos días más para estimar tu ritmo.')
          : t('cocina.meta.ritmo', `Vas a ${un(meta.ritmoRealSemana)} kg/sem · meta ${un(meta.ritmoMetaSemana)} kg/sem`, {
              r: un(meta.ritmoRealSemana),
              m: un(meta.ritmoMetaSemana),
            })}
      </p>
      {eta ? (
        <p className="mt-0.5 text-[10px] text-emerald-400">
          {t('cocina.meta.eta', `A este ritmo llegas el ${eta}`, { f: eta })}
        </p>
      ) : (
        meta.ritmoRealSemana !== null && (
          <p className="mt-0.5 text-[10px] text-amber-400">
            {t('cocina.meta.sinRumbo', 'Tu peso no se está acercando al objetivo; ajusta tus calorías abajo.')}
          </p>
        )
      )}
    </div>
  )
}

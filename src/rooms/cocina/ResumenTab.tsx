import { useMemo, useState } from 'react'
import type { PerfilNutricion, RegistroAgua, RegistroComida, RegistroPeso } from '../../core/data/db'
import { hoyISO, sumarDias } from './fecha'
import { progresoMeta, registrarPeso } from './peso'
import type { ProgresoMeta } from './peso'
import { MacroAnillo } from './MacroAnillo'
import { adherenciaCalorias, pctObjetivo, sumarMacros } from './macros'
import { COLOR } from './constantes'
import { localeActual, useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'

export function ResumenTab({
  fecha,
  comidas,
  agua,
  perfil,
  pesos,
}: {
  fecha: string
  comidas: RegistroComida[]
  agua: RegistroAgua[]
  perfil: PerfilNutricion
  pesos: RegistroPeso[]
}) {
  const delDia = comidas.filter((c) => c.fecha === fecha)
  const tot = sumarMacros(delDia)
  const aguaDia = agua.filter((a) => a.fecha === fecha).reduce((s, a) => s + a.ml, 0)
  const calRestantes = Math.max(0, perfil.calorias - tot.calorias)

  const tendencia7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const f = sumarDias(fecha, -(6 - i))
      const items = comidas.filter((c) => c.fecha === f)
      const t = sumarMacros(items)
      return { fecha: f, calorias: t.calorias }
    })
  }, [fecha, comidas])

  const maxCal = Math.max(perfil.calorias, ...tendencia7.map((t) => t.calorias), 1)

  const adherencia = useMemo(() => {
    const dias = Array.from({ length: 7 }, (_, i) => {
      const f = sumarDias(hoyISO(), -i)
      const t = sumarMacros(comidas.filter((c) => c.fecha === f))
      return { consumido: t.calorias, objetivo: perfil.calorias }
    })
    return adherenciaCalorias(dias)
  }, [comidas, perfil.calorias])

  const pctCal = pctObjetivo(tot.calorias, perfil.calorias)
  const pctAgua = pctObjetivo(aguaDia, perfil.aguaMl)
  const t = useT()

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl border border-white/10 p-4 col-span-2"
          style={{ background: `${COLOR}18` }}
        >
          <p className="text-xs text-white/50">{t('cocina.calHoy', 'Calorías hoy')}</p>
          <p className="text-3xl font-black texto-vivo" style={vivo(COLOR)}>
            {tot.calorias}
            <span className="text-lg font-semibold text-white/50">
              {' '}
              / {perfil.calorias} kcal
            </span>
          </p>
          <div className="mt-2 h-2.5 w-full rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pctCal}%`,
                background: tot.calorias > perfil.calorias ? '#ef4444' : COLOR,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-white/50">
            {calRestantes > 0
              ? t('cocina.calRestantes', `Te quedan ${calRestantes} kcal para tu objetivo`, { n: String(calRestantes) })
              : <><Icono nombre="alerta" /> {t('cocina.calSuperado', 'Superaste el objetivo calórico de hoy')}</>}
          </p>
        </div>
        <TarjetaMini titulo={t('cocina.adherencia7d', 'Adherencia 7d')} valor={`${adherencia}%`} sub={t('cocina.adherenciaSub', '±10% del objetivo')} />
        <TarjetaMini titulo={t('cocina.aguaMeta', 'Agua')} valor={`${(aguaDia / 1000).toFixed(1)} L`} sub={t('cocina.aguaMetaPct', `${pctAgua}% meta`, { n: String(pctAgua) })} />
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-4">{t('cocina.macrosDia', 'Macros del día')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 justify-items-center">
          <MacroAnillo
            label={t('cocina.proteina', 'Proteína')}
            consumido={tot.proteinas}
            objetivo={perfil.proteinas}
            unidad="g"
            color="#f472b6"
          />
          <MacroAnillo
            label={t('cocina.carbos', 'Carbos')}
            consumido={tot.carbohidratos}
            objetivo={perfil.carbohidratos}
            unidad="g"
            color="#60a5fa"
          />
          <MacroAnillo
            label={t('cocina.grasas', 'Grasas')}
            consumido={tot.grasas}
            objetivo={perfil.grasas}
            unidad="g"
            color="#a78bfa"
          />
          <MacroAnillo
            label={t('cocina.aguaMeta', 'Agua')}
            consumido={aguaDia}
            objetivo={perfil.aguaMl}
            unidad="ml"
            color="#34d399"
          />
        </div>
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-3">{t('cocina.cal7dias', 'Calorías · últimos 7 días')}</p>
        <div className="flex items-stretch justify-between gap-1.5 h-28">
          {tendencia7.map((punto) => {
            const h = (punto.calorias / maxCal) * 100
            const esHoy = punto.fecha === fecha
            return (
              <div key={punto.fecha} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex-1 w-full flex items-end justify-center">
                  <div
                    className="w-full max-w-8 rounded-t transition-all"
                    style={{
                      height: `${Math.max(6, h)}%`,
                      background: esHoy ? COLOR : 'rgba(245,158,11,0.45)',
                    }}
                    title={`${punto.calorias} kcal`}
                  />
                </div>
                <span className="text-[9px] text-white/40">{punto.fecha.slice(8)}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-white/35 text-center mt-2">
          {t('cocina.objetivoDiario', `Objetivo diario: ${perfil.calorias} kcal`, { n: String(perfil.calorias) })}
        </p>
      </div>

      <PesoCard fecha={fecha} pesos={pesos} perfil={perfil} />
    </div>
  )
}

function PesoCard({
  fecha,
  pesos,
  perfil,
}: {
  fecha: string
  pesos: RegistroPeso[]
  perfil: PerfilNutricion
}) {
  const t = useT()
  const [kg, setKg] = useState('')
  const meta = useMemo(() => progresoMeta(pesos, perfil, fecha), [pesos, perfil, fecha])

  // Último pesaje de cada día en los 30 días que terminan en `fecha`.
  const serie = useMemo(() => {
    const desde = sumarDias(fecha, -29)
    const porDia = new Map<string, number>()
    // Desempata por id para que el último pesaje del día sea el que cuente.
    for (const p of [...pesos].sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || (a.id ?? 0) - (b.id ?? 0),
    )) {
      if (p.fecha >= desde && p.fecha <= fecha) porDia.set(p.fecha, p.kg)
    }
    return [...porDia.entries()].map(([f, k]) => ({ fecha: f, kg: k }))
  }, [pesos, fecha])

  const actual = serie.length > 0 ? serie[serie.length - 1].kg : null
  const delta = serie.length > 1 ? serie[serie.length - 1].kg - serie[0].kg : null

  const puntos = useMemo(() => {
    if (serie.length < 2) return ''
    const min = Math.min(...serie.map((p) => p.kg))
    const max = Math.max(...serie.map((p) => p.kg))
    const rango = Math.max(max - min, 0.5)
    return serie
      .map((p, i) => {
        const x = (i / (serie.length - 1)) * 100
        const y = 36 - ((p.kg - min) / rango) * 32
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [serie])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseFloat(kg)
    if (!Number.isFinite(n) || n <= 0) return
    await registrarPeso(fecha, Math.round(n * 10) / 10)
    setKg('')
  }

  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <form onSubmit={guardar} className="flex items-center gap-2">
        <p className="flex-1 text-sm font-semibold"><Icono nombre="balanza" /> {t('cocina.peso.titulo', 'Peso corporal')}</p>
        <input
          type="number"
          min={0}
          step="0.1"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          placeholder="kg"
          className="w-20 rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10 outline-none focus:border-amber-400/50"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold texto-cta hover:brightness-110"
        >
          {t('cocina.peso.registrar', 'Registrar')}
        </button>
      </form>

      {serie.length < 2 ? (
        <p className="mt-3 text-xs text-white/40">
          {actual !== null
            ? t('cocina.peso.actual', `Actual: ${actual} kg`, { n: String(actual) })
            : t('cocina.peso.sinDatos', 'Registra tu peso para ver la tendencia.')}
        </p>
      ) : (
        <>
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-3 h-20 w-full">
            <polyline
              points={puntos}
              fill="none"
              stroke="#34d399"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <p className="mt-1 text-xs text-white/50">
            {t('cocina.peso.actual', `Actual: ${actual} kg`, { n: String(actual) })}
            {delta !== null && delta !== 0 && (
              <span className={delta < 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {' '}
                · {delta > 0 ? '+' : ''}
                {(Math.round(delta * 10) / 10).toFixed(1)}{' '}
                {t('cocina.peso.delta', 'kg en 30 días')}
              </span>
            )}
          </p>
        </>
      )}

      {meta && <MetaPeso meta={meta} />}
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
            {t('cocina.meta.sinRumbo', 'Tu peso no se está acercando al objetivo; ajusta tus calorías en Metas.')}
          </p>
        )
      )}
    </div>
  )
}

function TarjetaMini({
  titulo,
  valor,
  sub,
}: {
  titulo: string
  valor: string
  sub: string
}) {
  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-xs text-white/50">{titulo}</p>
      <p className="text-xl font-bold text-white/90">{valor}</p>
      <p className="text-[10px] text-white/40">{sub}</p>
    </div>
  )
}

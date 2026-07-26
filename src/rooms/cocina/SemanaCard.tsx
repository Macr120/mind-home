import { useMemo } from 'react'
import type { PerfilNutricion, RegistroComida } from '../../core/data/db'
import { sumarDias } from './fecha'
import { adherenciaCalorias, sumarMacros } from './macros'
import { balanceSemanal, DIAS_MINIMOS } from './balance'
import { COLOR } from './constantes'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/**
 * La semana en una sola tarjeta: cuánto comiste cada día, qué tan pegado fuiste
 * al objetivo y qué peso implica ese ritmo. Antes eran tres tarjetas separadas
 * leyendo el mismo dato.
 */
export function SemanaCard({
  fecha,
  comidas,
  perfil,
}: {
  fecha: string
  comidas: RegistroComida[]
  perfil: PerfilNutricion
}) {
  const t = useT()

  const dias = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const f = sumarDias(fecha, -(6 - i))
        return { fecha: f, calorias: sumarMacros(comidas.filter((c) => c.fecha === f)).calorias }
      }),
    [fecha, comidas],
  )

  const adherencia = useMemo(
    () => adherenciaCalorias(dias.map((d) => ({ consumido: d.calorias, objetivo: perfil.calorias }))),
    [dias, perfil.calorias],
  )
  const balance = useMemo(() => balanceSemanal(comidas, perfil, fecha), [comidas, perfil, fecha])

  const maxCal = Math.max(perfil.calorias, ...dias.map((d) => d.calorias), 1)
  const kg = balance.kgSemanaEstimados
  const un = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <p className="text-sm font-semibold mb-3">
        <Icono nombre="tendencia" /> {t('cocina.semana.titulo', 'Tu semana')}
      </p>

      <div className="relative flex items-end justify-between gap-1.5 h-28">
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/25"
          style={{ bottom: `${(perfil.calorias / maxCal) * 100}%` }}
        />
        {dias.map((d) => (
          <div
            key={d.fecha}
            className="flex-1 max-w-8 rounded-t transition-all"
            style={{
              height: `${Math.max(4, (d.calorias / maxCal) * 100)}%`,
              background: d.fecha === fecha ? COLOR : 'rgba(245,158,11,0.45)',
            }}
            title={`${d.calorias} kcal`}
          />
        ))}
      </div>
      <div className="flex justify-between gap-1.5 mt-1">
        {dias.map((d) => (
          <span key={d.fecha} className="flex-1 text-center text-[9px] text-white/40">
            {d.fecha.slice(8)}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Dato
          titulo={t('cocina.adherencia7d', 'Adherencia')}
          valor={`${adherencia}%`}
          sub={t('cocina.adherenciaSub', '±10% del objetivo')}
        />
        <Dato
          titulo={t('cocina.semana.balance', 'Balance')}
          valor={`${balance.netoKcal > 0 ? '+' : ''}${Math.round(balance.netoKcal)}`}
          sub={t('cocina.semana.balanceSub', 'kcal vs objetivo')}
        />
        <Dato
          titulo={t('cocina.semana.ritmoComida', 'Según lo que comes')}
          valor={`${kg > 0 ? '+' : ''}${un(kg)}`}
          sub={t('cocina.semana.kgSemana', 'kg/semana estimados')}
        />
      </div>

      {!balance.fiable && (
        <p className="mt-2 text-[10px] text-white/35">
          {t('cocina.semana.pocosDatos', `Estimación aproximada: registra al menos ${DIAS_MINIMOS} días para que cuadre.`, {
            n: String(DIAS_MINIMOS),
          })}
        </p>
      )}
    </div>
  )
}

function Dato({ titulo, valor, sub }: { titulo: string; valor: string; sub: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-2">
      <p className="text-[10px] text-white/45 truncate">{titulo}</p>
      <p className="text-lg font-bold text-white/90">{valor}</p>
      <p className="text-[9px] text-white/35">{sub}</p>
    </div>
  )
}

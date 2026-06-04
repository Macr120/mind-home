import { useMemo } from 'react'
import type { PerfilNutricion, RegistroAgua, RegistroComida } from '../../core/data/db'
import { hoyISO, sumarDias } from './fecha'
import { MacroAnillo } from './MacroAnillo'
import { adherenciaCalorias, pctObjetivo, sumarMacros } from './macros'
import { COLOR } from './constantes'

export function ResumenTab({
  fecha,
  comidas,
  agua,
  perfil,
}: {
  fecha: string
  comidas: RegistroComida[]
  agua: RegistroAgua[]
  perfil: PerfilNutricion
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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl border border-white/10 p-4 col-span-2"
          style={{ background: `${COLOR}18` }}
        >
          <p className="text-xs text-white/50">Calorías hoy</p>
          <p className="text-3xl font-black" style={{ color: COLOR }}>
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
              ? `Te quedan ${calRestantes} kcal para tu objetivo`
              : '⚠️ Superaste el objetivo calórico de hoy'}
          </p>
        </div>
        <TarjetaMini titulo="Adherencia 7d" valor={`${adherencia}%`} sub="±10% del objetivo" />
        <TarjetaMini titulo="Agua" valor={`${(aguaDia / 1000).toFixed(1)} L`} sub={`${pctAgua}% meta`} />
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-4">Macros del día</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 justify-items-center">
          <MacroAnillo
            label="Proteína"
            consumido={tot.proteinas}
            objetivo={perfil.proteinas}
            unidad="g"
            color="#f472b6"
          />
          <MacroAnillo
            label="Carbos"
            consumido={tot.carbohidratos}
            objetivo={perfil.carbohidratos}
            unidad="g"
            color="#60a5fa"
          />
          <MacroAnillo
            label="Grasas"
            consumido={tot.grasas}
            objetivo={perfil.grasas}
            unidad="g"
            color="#a78bfa"
          />
          <MacroAnillo
            label="Agua"
            consumido={aguaDia}
            objetivo={perfil.aguaMl}
            unidad="ml"
            color="#34d399"
          />
        </div>
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-3">Calorías · últimos 7 días</p>
        <div className="flex items-stretch justify-between gap-1.5 h-28">
          {tendencia7.map((t) => {
            const h = (t.calorias / maxCal) * 100
            const esHoy = t.fecha === fecha
            return (
              <div key={t.fecha} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex-1 w-full flex items-end justify-center">
                  <div
                    className="w-full max-w-8 rounded-t transition-all"
                    style={{
                      height: `${Math.max(6, h)}%`,
                      background: esHoy ? COLOR : 'rgba(245,158,11,0.45)',
                    }}
                    title={`${t.calorias} kcal`}
                  />
                </div>
                <span className="text-[9px] text-white/40">{t.fecha.slice(8)}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-white/35 text-center mt-2">
          Objetivo diario: {perfil.calorias} kcal
        </p>
      </div>
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

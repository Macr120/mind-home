import { useMemo } from 'react'
import type { Transaccion } from '../../core/data/db'
import { presupuestosRepo } from '../../core/data/repository'
import { getCategoria } from './categorias'
import { money, money2, mesCorto, sumarMeses } from './mes'

const PRESUPUESTO_KEY = '__mensual__'

export function ResumenTab({
  mes,
  movimientos,
}: {
  mes: string
  movimientos: Transaccion[]
}) {
  const presupuestos = presupuestosRepo.useAll() ?? []
  const presu = presupuestos.find((p) => p.categoria === PRESUPUESTO_KEY)

  const delMes = movimientos.filter((m) => m.fecha.startsWith(mes))
  const ingresos = delMes.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0)
  const gastos = delMes.filter((m) => m.tipo === 'gasto').reduce((a, m) => a + m.monto, 0)
  const balance = ingresos - gastos

  // Gastos por categoría (del mes)
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const m of delMes) {
      if (m.tipo !== 'gasto') continue
      mapa.set(m.categoria, (mapa.get(m.categoria) ?? 0) + m.monto)
    }
    return [...mapa.entries()]
      .map(([id, monto]) => ({ cat: getCategoria(id), monto }))
      .sort((a, b) => b.monto - a.monto)
  }, [delMes])

  // Tendencia de los últimos 6 meses (balance)
  const tendencia = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = sumarMeses(mes, -(5 - i))
      const items = movimientos.filter((t) => t.fecha.startsWith(m))
      const ing = items.filter((t) => t.tipo === 'ingreso').reduce((a, t) => a + t.monto, 0)
      const gas = items.filter((t) => t.tipo === 'gasto').reduce((a, t) => a + t.monto, 0)
      return { mes: m, balance: ing - gas }
    })
  }, [mes, movimientos])
  const maxAbs = Math.max(1, ...tendencia.map((t) => Math.abs(t.balance)))

  const presupuesto = presu?.monto ?? 0
  const pct = presupuesto > 0 ? Math.min(100, (gastos / presupuesto) * 100) : 0
  const excedido = presupuesto > 0 && gastos > presupuesto

  const guardarPresupuesto = async (valor: number) => {
    if (presu?.id) await presupuestosRepo.update(presu.id, { monto: valor })
    else await presupuestosRepo.add({ categoria: PRESUPUESTO_KEY, monto: valor })
  }

  return (
    <div className="space-y-5">
      {/* Tarjetas del mes */}
      <div className="grid grid-cols-3 gap-3">
        <Tarjeta titulo="Ingresos" valor={money(ingresos)} color="#34d399" />
        <Tarjeta titulo="Gastos" valor={money(gastos)} color="#f87171" />
        <Tarjeta titulo="Balance" valor={money(balance)} color={balance >= 0 ? '#60a5fa' : '#f87171'} />
      </div>

      {/* Presupuesto mensual */}
      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Presupuesto mensual</span>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-white/40">$</span>
            <input
              type="number"
              defaultValue={presupuesto || ''}
              placeholder="0"
              onBlur={(e) => guardarPresupuesto(parseFloat(e.target.value) || 0)}
              className="w-24 rounded-lg bg-black/30 px-2 py-1 text-right outline-none border border-white/10 focus:border-white/30"
            />
          </div>
        </div>
        {presupuesto > 0 && (
          <>
            <div className="mt-3 h-3 w-full rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: excedido ? '#ef4444' : '#34d399' }}
              />
            </div>
            <p className={`mt-2 text-xs ${excedido ? 'text-red-400 font-semibold' : 'text-white/50'}`}>
              {excedido
                ? `⚠️ Excediste el presupuesto por ${money2(gastos - presupuesto)}`
                : `Llevas ${money2(gastos)} de ${money2(presupuesto)} (${Math.round(pct)}%)`}
            </p>
          </>
        )}
      </div>

      {/* Gastos por categoría */}
      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-3">Gastos por categoría</p>
        {porCategoria.length === 0 && (
          <p className="text-white/40 text-sm">Sin gastos este mes.</p>
        )}
        <div className="space-y-2.5">
          {porCategoria.map(({ cat, monto }) => (
            <div key={cat.id}>
              <div className="flex items-center gap-2 text-sm">
                <span>{cat.icon}</span>
                <span className="text-white/80">{cat.nombre}</span>
                <span className="ml-auto text-white/60">{money2(monto)}</span>
                <span className="w-10 text-right text-white/40 text-xs">
                  {Math.round((monto / gastos) * 100)}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-black/40 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(monto / gastos) * 100}%`, background: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tendencia 6 meses */}
      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-3">Balance · últimos 6 meses</p>
        <div className="flex items-stretch justify-between gap-2 h-28">
          {tendencia.map((t) => {
            const h = (Math.abs(t.balance) / maxAbs) * 100
            const pos = t.balance >= 0
            return (
              <div key={t.mes} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex-1 w-full flex items-end justify-center">
                  <div
                    className="w-5 rounded-t"
                    style={{
                      height: `${Math.max(4, h)}%`,
                      background: pos ? '#60a5fa' : '#f87171',
                    }}
                    title={money2(t.balance)}
                  />
                </div>
                <span className="text-[10px] text-white/40">{mesCorto(t.mes)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Tarjeta({ titulo, valor, color }: { titulo: string; valor: string; color: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-xs text-white/50">{titulo}</p>
      <p className="text-lg font-bold" style={{ color }}>
        {valor}
      </p>
    </div>
  )
}

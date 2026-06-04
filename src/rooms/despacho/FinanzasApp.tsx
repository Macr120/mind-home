import { useState } from 'react'
import { finanzasRepo } from '../../core/data/repository'
import { ResumenTab } from './ResumenTab'
import { MovimientosTab } from './MovimientosTab'
import { MetasTab } from './MetasTab'
import { mesActual, nombreMes, sumarMeses } from './mes'

type Tab = 'resumen' | 'movimientos' | 'metas'

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: '📊 Resumen' },
  { id: 'movimientos', label: '💸 Movimientos' },
  { id: 'metas', label: '🎯 Metas' },
]

export function FinanzasApp() {
  const [tab, setTab] = useState<Tab>('resumen')
  const [mes, setMes] = useState(mesActual())
  const movimientos = finanzasRepo.useAll() ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Pestañas */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === t.id ? 'bg-blue-400 text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Navegador de mes (no aplica a Metas) */}
      {tab !== 'metas' && (
        <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 border border-white/10">
          <button
            onClick={() => setMes((m) => sumarMeses(m, -1))}
            className="rounded-lg px-3 py-1 text-lg hover:bg-white/10"
          >
            ‹
          </button>
          <span className="font-semibold">{nombreMes(mes)}</span>
          <button
            onClick={() => setMes((m) => sumarMeses(m, 1))}
            className="rounded-lg px-3 py-1 text-lg hover:bg-white/10"
          >
            ›
          </button>
        </div>
      )}

      {tab === 'resumen' && <ResumenTab mes={mes} movimientos={movimientos} />}
      {tab === 'movimientos' && (
        <MovimientosTab mes={mes} movimientos={movimientos} />
      )}
      {tab === 'metas' && <MetasTab />}
    </div>
  )
}

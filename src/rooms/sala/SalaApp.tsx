import { useMemo, useState } from 'react'
import { gastosViajeRepo, viajesRepo } from '../../core/data/repository'
import { DetalleViaje } from './DetalleViaje'
import { ListaViajesTab } from './ListaViajesTab'
import { ResumenTab } from './ResumenTab'

type Tab = 'resumen' | 'viajes'

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: '📊 Resumen' },
  { id: 'viajes', label: '✈️ Viajes' },
]

export function SalaApp() {
  const [tab, setTab] = useState<Tab>('resumen')
  const [viajeId, setViajeId] = useState<number | null>(null)

  const viajes = viajesRepo.useAll() ?? []
  const todosGastos = gastosViajeRepo.useAll() ?? []

  const gastosPorViaje = useMemo(() => {
    const mapa = new Map<number, number>()
    for (const g of todosGastos) {
      mapa.set(g.viajeId, (mapa.get(g.viajeId) ?? 0) + g.monto)
    }
    return mapa
  }, [todosGastos])

  const viajeSel = viajeId ? viajes.find((v) => v.id === viajeId) : null

  if (viajeSel) {
    return (
      <div className="mx-auto max-w-2xl">
        <DetalleViaje viaje={viajeSel} onVolver={() => setViajeId(null)} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs text-white/45 leading-relaxed">
        Planifica viajes futuros, guarda tu lista de deseos y archiva viajes pasados con
        reseña, itinerario día a día, gastos y checklist de preparación.
      </p>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === t.id ? 'bg-teal-400 text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <ResumenTab
          viajes={viajes}
          gastosPorViaje={gastosPorViaje}
          onAbrir={(id) => {
            setViajeId(id)
            setTab('viajes')
          }}
        />
      )}
      {tab === 'viajes' && (
        <ListaViajesTab
          viajes={viajes}
          gastosPorViaje={gastosPorViaje}
          onAbrir={setViajeId}
        />
      )}
    </div>
  )
}

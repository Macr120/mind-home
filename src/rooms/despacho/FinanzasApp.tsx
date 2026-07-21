import { useState } from 'react'
import { finanzasRepo } from '../../core/data/repository'
import { ResumenTab } from './ResumenTab'
import { MovimientosTab } from './MovimientosTab'
import { MetasTab } from './MetasTab'
import { SimuladoresTab } from './SimuladoresTab'
import { MercadosTab } from './MercadosTab'
import { mesActual, nombreMes, sumarMeses } from './mes'
import { useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

type Tab = 'resumen' | 'movimientos' | 'metas' | 'simuladores' | 'mercados'

const TABS: { id: Tab; icono: NombreIcono; labelEs: string }[] = [
  { id: 'resumen', icono: 'progreso', labelEs: 'Resumen' },
  { id: 'movimientos', icono: 'movimientos', labelEs: 'Movimientos' },
  { id: 'metas', icono: 'objetivo', labelEs: 'Metas' },
  { id: 'simuladores', icono: 'calculadora', labelEs: 'Simular' },
  { id: 'mercados', icono: 'tendencia', labelEs: 'Mercados' },
]

export function FinanzasApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(() => tabInicial('despacho', TABS.map((x) => x.id), 'resumen'))
  const [mes, setMes] = useState(mesActual())
  const movimientos = finanzasRepo.useAll() ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            data-tut={`despacho.tab.${tabItem.id}`}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id ? 'bg-blue-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <Icono nombre={tabItem.icono} /> {t(`despacho.tab.${tabItem.id}`, tabItem.labelEs)}
          </button>
        ))}
      </div>

      {(tab === 'resumen' || tab === 'movimientos') && (
        <div data-tut="despacho.mes" className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 border border-white/10">
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
      {tab === 'simuladores' && <SimuladoresTab />}
      {tab === 'mercados' && <MercadosTab />}
    </div>
  )
}

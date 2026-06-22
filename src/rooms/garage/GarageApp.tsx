import { useEffect, useState } from 'react'
import { registrosMantenimientoRepo, vehiculosRepo } from '../../core/data/repository'
import { DetalleVehiculo } from './DetalleVehiculo'
import { ResumenTab } from './ResumenTab'
import { VehiculosTab } from './VehiculosTab'
import { COLOR } from './constantes'
import { sembrarGarage } from './seed'
import { useT } from '../../core/i18n/useT'

type Tab = 'resumen' | 'vehiculos'

const TABS: { id: Tab; labelEs: string }[] = [
  { id: 'resumen', labelEs: '📊 Resumen' },
  { id: 'vehiculos', labelEs: '🔧 Vehículos' },
]

export function GarageApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('resumen')
  const [vehiculoId, setVehiculoId] = useState<number | null>(null)

  const vehiculos = vehiculosRepo.useAll() ?? []
  const registros = registrosMantenimientoRepo.useAll() ?? []

  const vehiculoSel = vehiculoId ? vehiculos.find((v) => v.id === vehiculoId) : null

  useEffect(() => {
    void sembrarGarage()
  }, [])

  if (vehiculoSel) {
    return (
      <div className="mx-auto max-w-2xl">
        <DetalleVehiculo vehiculo={vehiculoSel} onVolver={() => setVehiculoId(null)} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs text-white/45 leading-relaxed">
        {t('garage.desc', 'Control de mantenimiento para bicicletas, autos, motos y más: historial de servicios, odómetro, costos y recordatorios por fecha o kilometraje.')}
      </p>

      <div className="flex gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tab === tabItem.id ? { background: COLOR } : undefined}
          >
            {t(`garage.tab.${tabItem.id}`, tabItem.labelEs)}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <ResumenTab
          vehiculos={vehiculos}
          registros={registros}
          onAbrirVehiculo={(id) => {
            setVehiculoId(id)
            setTab('vehiculos')
          }}
        />
      )}
      {tab === 'vehiculos' && (
        <VehiculosTab
          vehiculos={vehiculos}
          registros={registros}
          onAbrir={setVehiculoId}
        />
      )}
    </div>
  )
}

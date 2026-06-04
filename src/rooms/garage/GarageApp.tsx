import { useEffect, useState } from 'react'
import { registrosMantenimientoRepo, vehiculosRepo } from '../../core/data/repository'
import { DetalleVehiculo } from './DetalleVehiculo'
import { ResumenTab } from './ResumenTab'
import { VehiculosTab } from './VehiculosTab'
import { COLOR } from './constantes'
import { sembrarGarage } from './seed'

type Tab = 'resumen' | 'vehiculos'

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: '📊 Resumen' },
  { id: 'vehiculos', label: '🔧 Vehículos' },
]

export function GarageApp() {
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
        Control de mantenimiento para bicicletas, autos, motos y más: historial de servicios,
        odómetro, costos y recordatorios por fecha o kilometraje.
      </p>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === t.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tab === t.id ? { background: COLOR } : undefined}
          >
            {t.label}
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

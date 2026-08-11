import { useEffect, useState } from 'react'
import { VACIO,
  registrosMantenimientoRepo,
  talleresVehiculoRepo,
  tramitesVehiculoRepo,
  vehiculosRepo,
} from '../../core/data/repository'
import { DetalleVehiculo } from './DetalleVehiculo'
import { ResumenTab } from './ResumenTab'
import { VehiculosTab } from './VehiculosTab'
import { reconciliarGarage } from './calendario'
import { COLOR } from './constantes'
import { sembrarGarage } from './seed'
import { TINTA_CTA } from './ui'
import { useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

type Tab = 'resumen' | 'vehiculos'

const TABS: { id: Tab; icono: NombreIcono; labelEs: string }[] = [
  { id: 'resumen', icono: 'progreso', labelEs: 'Resumen' },
  { id: 'vehiculos', icono: 'herramienta', labelEs: 'Vehículos' },
]

export function GarageApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(() => tabInicial('garage', TABS.map((x) => x.id), 'resumen'))
  const [vehiculoId, setVehiculoId] = useState<number | null>(null)

  const vehiculos = vehiculosRepo.useAll() ?? VACIO
  const registros = registrosMantenimientoRepo.useAll() ?? VACIO
  const tramites = tramitesVehiculoRepo.useAll() ?? VACIO
  const talleres = talleresVehiculoRepo.useAll() ?? VACIO

  const vehiculoSel = vehiculoId ? vehiculos.find((v) => v.id === vehiculoId) : null

  useEffect(() => {
    void sembrarGarage().then(reconciliarGarage)
  }, [])

  if (vehiculoSel) {
    return (
      <div className="mx-auto max-w-2xl">
        <DetalleVehiculo
          vehiculo={vehiculoSel}
          vehiculos={vehiculos}
          tramites={tramites}
          talleres={talleres}
          onVolver={() => setVehiculoId(null)}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs leading-relaxed text-white/45">
        {t('garage.desc', 'Tus vehículos: servicios y costos, trámites agendados en el calendario y la libreta de contactos.')}
      </p>

      {/* Riel de pestañas: la píldora activa se desliza dentro de un solo carril
          en vez de botones sueltos. Los talleres se movieron a la ficha de cada
          vehículo, junto a sus trámites y sus documentos. */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
        {TABS.map((tabItem) => {
          const activa = tab === tabItem.id
          return (
            <button
              key={tabItem.id}
              type="button"
              data-tut={`garage.tab.${tabItem.id}`}
              onClick={() => setTab(tabItem.id)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                activa ? 'shadow-sm' : 'text-white/60 hover:bg-white/8 hover:text-white/90'
              }`}
              style={activa ? { background: COLOR, color: TINTA_CTA } : undefined}
            >
              <Icono nombre={tabItem.icono} />{' '}
              <span className="align-middle">
                {t(`garage.tab.${tabItem.id}`, tabItem.labelEs)}
              </span>
            </button>
          )
        })}
      </div>

      {tab === 'resumen' && (
        <ResumenTab
          vehiculos={vehiculos}
          registros={registros}
          tramites={tramites}
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
          tramites={tramites}
          onAbrir={setVehiculoId}
        />
      )}
    </div>
  )
}

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
import { retraducirGarage, sembrarGarage } from './seed'
import { useAjustes } from '../../core/state/ajustesStore'
import { useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { COLOR } from './constantes'

type Tab = 'resumen' | 'vehiculos'

const TABS: ItemPestana<Tab>[] = [
  { id: 'resumen', icono: 'progreso', labelEs: 'Resumen' },
  { id: 'vehiculos', icono: 'herramienta', labelEs: 'Vehículos' },
]

export function GarageApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(() => tabInicial('garage', TABS.map((x) => x.id), 'resumen'))
  const [plegado, setPlegado] = useState(false)
  const [vehiculoId, setVehiculoId] = useState<number | null>(null)

  const vehiculos = vehiculosRepo.useAll() ?? VACIO
  const registros = registrosMantenimientoRepo.useAll() ?? VACIO
  const tramites = tramitesVehiculoRepo.useAll() ?? VACIO
  const talleres = talleresVehiculoRepo.useAll() ?? VACIO

  const vehiculoSel = vehiculoId ? vehiculos.find((v) => v.id === vehiculoId) : null

  // La semilla sale en el idioma activo; al cambiarlo, las filas sin tocar se
  // reescriben en el nuevo (retraducirGarage).
  const idioma = useAjustes((s) => s.idioma)
  useEffect(() => {
    void sembrarGarage().then(reconciliarGarage).then(retraducirGarage)
  }, [idioma])

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

      {/* Los talleres se movieron a la ficha de cada vehículo, junto a sus
          trámites y sus documentos. */}
      <PestanasCarpeta
        items={TABS}
        activo={tab}
        onCambio={setTab}
        prefijoClave="garage.tab"
        color={COLOR}
        variante="raiz"
        plegado={plegado}
        onAlternarPliegue={() => setPlegado((v) => !v)}
      />

      {!plegado && (
        <>
          {tab === 'resumen' && (
            <ResumenTab
              vehiculos={vehiculos}
              registros={registros}
              tramites={tramites}
              onAbrirVehiculo={(id) => {
                setPlegado(false)
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
        </>
      )}
    </div>
  )
}

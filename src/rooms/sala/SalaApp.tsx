import { lazy, Suspense, useState } from 'react'
import { VACIO, lugaresViajeRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { COLOR } from './constantes'
import { BitacoraTab } from './BitacoraTab'
import { ejemploSala } from './ejemplos'
import { MapaTab } from './MapaTab'
import { PorConocerTab } from './PorConocerTab'
import { RutasTab } from './RutasTab'

// El mapa de calles (Leaflet) solo se descarga al abrir «Cómo llegar».
const NavegarTab = lazy(() => import('./navegacion/NavegarTab'))

// Las metas de viajes ya no son una pestaña: viven en el botón Metas del header.
type Tab = 'mapa' | 'porConocer' | 'rutas' | 'navegar' | 'bitacora'

const TABS: ItemPestana<Tab>[] = [
  { id: 'mapa', icono: 'mundo', labelEs: 'Mapa' },
  { id: 'porConocer', icono: 'boleto', labelEs: 'Itinerario' },
  { id: 'rutas', icono: 'despegue', labelEs: 'Rutas' },
  { id: 'navegar', icono: 'navegar', labelEs: 'Cómo llegar' },
  { id: 'bitacora', icono: 'foto', labelEs: 'Bitácora' },
]

export function SalaApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(() => tabInicial('sala', TABS.map((x) => x.id), 'mapa'))
  const [plegado, setPlegado] = useState(false)
  const [lugarBitacora, setLugarBitacora] = useState<number | null>(null)

  const lugares = lugaresViajeRepo.useAll() ?? VACIO

  const irABitacora = (lugarId: number) => {
    setPlegado(false)
    setLugarBitacora(lugarId)
    setTab('bitacora')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-xs leading-relaxed text-white/45">
        {t('sala.desc', 'Tu mundo viajero: pines de lugares visitados en el mapamundi, itinerarios de lugares por conocer con calendario, rutas de viaje, cómo llegar a cualquier sitio combinando a pie, transporte público, bici, moto y auto, y bitácora con fotos y anécdotas.')}
      </p>

      <PestanasCarpeta
        items={TABS}
        activo={tab}
        onCambio={setTab}
        prefijoClave="sala.tab"
        color={COLOR}
        variante="raiz"
        plegado={plegado}
        onAlternarPliegue={() => setPlegado((v) => !v)}
      />

      {!plegado && (
        <>
          {tab === 'mapa' && <MapaTab lugares={lugares} onIrABitacora={irABitacora} />}
          {tab === 'porConocer' && <PorConocerTab lugares={lugares} />}
          {tab === 'rutas' && <RutasTab lugares={lugares} />}
          {tab === 'navegar' && (
            <Suspense
              fallback={
                <div className="flex h-64 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-sm text-white/40">
                  {t('sala.nav.cargando', 'Cargando el mapa…')}
                </div>
              }
            >
              <NavegarTab lugares={lugares} />
            </Suspense>
          )}
          {tab === 'bitacora' && <BitacoraTab lugares={lugares} lugarInicial={lugarBitacora} />}

          {/* El ejemplo llena mapa, plan, rutas y bitácora a la vez. */}
          <BarraEjemplo paquete={ejemploSala} />
        </>
      )}
    </div>
  )
}

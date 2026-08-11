import { useState } from 'react'
import { VACIO, lugaresViajeRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { BitacoraTab } from './BitacoraTab'
import { ejemploSala } from './ejemplos'
import { MapaTab } from './MapaTab'
import { PorConocerTab } from './PorConocerTab'
import { RutasTab } from './RutasTab'

type Tab = 'mapa' | 'porConocer' | 'rutas' | 'bitacora' | 'cronograma'

const TABS: { id: Tab; icono: NombreIcono; labelEs: string }[] = [
  { id: 'mapa', icono: 'mundo', labelEs: 'Mapa' },
  { id: 'porConocer', icono: 'boleto', labelEs: 'Itinerario' },
  { id: 'rutas', icono: 'despegue', labelEs: 'Rutas' },
  { id: 'bitacora', icono: 'foto', labelEs: 'Bitácora' },
  // El id sigue siendo 'cronograma': lo usan `tabInicial` y los deep-links del chat.
  { id: 'cronograma', icono: 'calendario', labelEs: 'Metas' },
]

export function SalaApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(() => tabInicial('sala', TABS.map((x) => x.id), 'mapa'))
  const [lugarBitacora, setLugarBitacora] = useState<number | null>(null)

  const lugares = lugaresViajeRepo.useAll() ?? VACIO

  const irABitacora = (lugarId: number) => {
    setLugarBitacora(lugarId)
    setTab('bitacora')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-xs leading-relaxed text-white/45">
        {t('sala.desc', 'Tu mundo viajero: pines de lugares visitados en el mapamundi, itinerarios de lugares por conocer con calendario, rutas de viaje y bitácora con fotos y anécdotas.')}
      </p>

      {/* Barra desplazable: «Metas y cronograma» no cabe repartida en cinco. */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            data-tut={`sala.tab.${tabItem.id}`}
            onClick={() => setTab(tabItem.id)}
            className={`shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id ? 'bg-teal-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <Icono nombre={tabItem.icono} /> {t(`sala.tab.${tabItem.id}`, tabItem.labelEs)}
          </button>
        ))}
      </div>

      {tab === 'mapa' && <MapaTab lugares={lugares} onIrABitacora={irABitacora} />}
      {tab === 'porConocer' && <PorConocerTab lugares={lugares} />}
      {tab === 'rutas' && <RutasTab lugares={lugares} />}
      {tab === 'bitacora' && <BitacoraTab lugares={lugares} lugarInicial={lugarBitacora} />}
      {tab === 'cronograma' && (
        <div data-tut="sala.cronograma">
          <CronogramaApp plantillaId="sala" />
        </div>
      )}

      {/* El ejemplo llena mapa, plan, rutas y bitácora a la vez. */}
      <BarraEjemplo paquete={ejemploSala} />
    </div>
  )
}

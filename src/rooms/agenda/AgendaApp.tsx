import { useEffect, useState } from 'react'
import type { AreaAgenda } from '../../core/data/db'
import { VACIO,
  contactosAgendaRepo,
  cuidadosMascotaRepo,
  eventosAgendaRepo,
  mascotasRepo,
  medicamentosRepo,
} from '../../core/data/repository'
import { tabInicial } from '../../core/state/intencionApp'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { reconciliarAgenda } from './calendario'
import { COLOR_AREA } from './constantes'
import { PersonasTab } from './PersonasTab'
import { SaludTab } from './SaludTab'
import { TrabajoTab } from './TrabajoTab'

// El color de cada pestaña es el mismo con el que su área se pinta en el calendario.
const TABS: ItemPestana<AreaAgenda>[] = [
  { id: 'trabajo', icono: 'maletin', labelEs: 'Trabajo', color: COLOR_AREA.trabajo },
  { id: 'salud', icono: 'estetoscopio', labelEs: 'Salud', color: COLOR_AREA.salud },
  { id: 'personas', icono: 'companeros', labelEs: 'Personas', color: COLOR_AREA.personas },
]

export function AgendaApp() {
  const [tab, setTab] = useState<AreaAgenda>(() =>
    tabInicial('agenda', TABS.map((x) => x.id), 'trabajo'),
  )
  const [plegado, setPlegado] = useState(false)
  const eventos = eventosAgendaRepo.useAll() ?? VACIO
  const contactos = contactosAgendaRepo.useAll() ?? VACIO
  const medicinas = medicamentosRepo.useAll() ?? VACIO
  const mascotas = mascotasRepo.useAll() ?? VACIO
  const cuidados = cuidadosMascotaRepo.useAll() ?? VACIO

  // El calendario puede mover, borrar o palomear los bloques sin saber que detrás
  // hay una agenda: al entrar se repara lo que se haya editado por fuera.
  useEffect(() => {
    void reconciliarAgenda()
  }, [])

  const deArea = (area: AreaAgenda) => eventos.filter((e) => e.area === area)

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PestanasCarpeta
        items={TABS}
        activo={tab}
        onCambio={setTab}
        prefijoClave="agenda.tab"
        variante="raiz"
        plegado={plegado}
        onAlternarPliegue={() => setPlegado((v) => !v)}
      />

      {!plegado && (
        <>
          {tab === 'trabajo' && <TrabajoTab eventos={deArea('trabajo')} contactos={contactos} />}
          {tab === 'salud' && (
            <SaludTab
              eventos={deArea('salud')}
              medicinas={medicinas}
              contactos={contactos}
              mascotas={mascotas}
              cuidados={cuidados}
            />
          )}
          {tab === 'personas' && <PersonasTab eventos={eventos} contactos={contactos} />}
        </>
      )}
    </div>
  )
}

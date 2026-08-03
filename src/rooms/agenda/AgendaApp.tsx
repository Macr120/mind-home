import { useEffect, useState } from 'react'
import type { AreaAgenda } from '../../core/data/db'
import { VACIO,
  contactosAgendaRepo,
  cuidadosMascotaRepo,
  eventosAgendaRepo,
  mascotasRepo,
  medicamentosRepo,
  proyectosAgendaRepo,
} from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { reconciliarAgenda } from './calendario'
import { COLOR_AREA } from './constantes'
import { PersonasTab } from './PersonasTab'
import { SaludTab } from './SaludTab'
import { TrabajoTab } from './TrabajoTab'

const TABS: { id: AreaAgenda; icono: NombreIcono; labelEs: string }[] = [
  { id: 'trabajo', icono: 'maletin', labelEs: 'Trabajo' },
  { id: 'salud', icono: 'estetoscopio', labelEs: 'Salud' },
  { id: 'personas', icono: 'companeros', labelEs: 'Personas' },
]

export function AgendaApp() {
  const t = useT()
  const [tab, setTab] = useState<AreaAgenda>(() =>
    tabInicial('agenda', TABS.map((x) => x.id), 'trabajo'),
  )
  const eventos = eventosAgendaRepo.useAll() ?? VACIO
  const contactos = contactosAgendaRepo.useAll() ?? VACIO
  const proyectos = proyectosAgendaRepo.useAll() ?? VACIO
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
      <div className="flex gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            data-tut={`agenda.tab.${tabItem.id}`}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id ? 'texto-cta' : 'bg-white/5 hover:bg-white/10'
            }`}
            // El color de la pestaña es el mismo con el que se pinta en el calendario.
            style={tab === tabItem.id ? { background: COLOR_AREA[tabItem.id] } : undefined}
          >
            <Icono nombre={tabItem.icono} /> {t(`agenda.tab.${tabItem.id}`, tabItem.labelEs)}
          </button>
        ))}
      </div>

      {tab === 'trabajo' && (
        <TrabajoTab eventos={deArea('trabajo')} contactos={contactos} proyectos={proyectos} />
      )}
      {tab === 'salud' && (
        <SaludTab
          eventos={deArea('salud')}
          medicinas={medicinas}
          contactos={contactos}
          proyectos={proyectos}
          mascotas={mascotas}
          cuidados={cuidados}
        />
      )}
      {tab === 'personas' && (
        <PersonasTab eventos={eventos} contactos={contactos} proyectos={proyectos} />
      )}
    </div>
  )
}

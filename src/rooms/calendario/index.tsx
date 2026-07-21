import type { RoomModule } from '../../core/registry'
import { CalendarioApp } from './CalendarioApp'
import { tutorialCalendarioApp } from './tutorial'

const calendario: RoomModule = {
  id: 'calendario',
  nombre: 'Calendario',
  icon: '📅',
  categoria: 'complemento',
  color: '#dc2626',
  App: CalendarioApp,
  tutorial: tutorialCalendarioApp,
  // El calendario ENSEÑA las metas de las demás apps; no tiene datos ni una propia.
  sinMetaDiaria: true,
  comandos: [
    { seccion: 'dia', etiqueta: 'Agenda de hoy', nombres: ['agenda de hoy', 'agenda del dia', 'mi dia'] },
    { seccion: 'semana', etiqueta: 'Semana', nombres: ['agenda de la semana', 'mi semana'] },
    { seccion: 'mes', etiqueta: 'Mes', nombres: ['calendario del mes', 'mi mes'] },
    { seccion: 'cronograma', etiqueta: 'Cronograma', nombres: ['cronograma', 'mis metas', 'linea de tiempo'] },
  ],
}

export default calendario

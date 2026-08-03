import { lazy } from 'react'
import type { Plantilla } from '../../core/registry'
import { flujosCalendario } from './tutorial'

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const CalendarioApp = lazy(() => import('./CalendarioApp').then((m) => ({ default: m.CalendarioApp })))

const calendario: Plantilla = {
  id: 'calendario',
  nombre: 'Calendario',
  icon: '📅',
  categoria: 'complemento',
  color: '#dc2626',
  App: CalendarioApp,
  flujos: flujosCalendario,
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

import type { RoomModule } from '../../core/registry'
import { lazy } from 'react'
import { COLOR } from './constantes'
import { flujosIdeas } from './tutorial'
import { OPERACIONES_IA } from './costosIA'

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo sí es eager: lo usa
// el núcleo sin abrir el cuarto.
const IdeasApp = lazy(() => import('./IdeasApp').then((m) => ({ default: m.IdeasApp })))

const ideas: RoomModule = {
  id: 'ideas',
  nombre: 'Ideas · Diario, mapas y diagramas',
  icon: '💡',
  categoria: 'mente',
  color: COLOR,
  App: IdeasApp,
  operacionesIA: OPERACIONES_IA,
  flujos: flujosIdeas,
  comandos: [
    {
      seccion: 'diario',
      etiqueta: 'Diario de ideas',
      nombres: ['diario de ideas', 'lluvia de ideas', 'lluvias de ideas', 'ideas'],
    },
    {
      seccion: 'mapas',
      etiqueta: 'Mapas',
      nombres: ['mapa mental', 'mapas mentales', 'mapa conceptual', 'mapas conceptuales'],
    },
    {
      seccion: 'diagramas',
      etiqueta: 'Diagramas',
      nombres: ['diagramas', 'foda', 'ishikawa', 'ventajas y desventajas', 'pros y contras'],
    },
  ],
}

export default ideas

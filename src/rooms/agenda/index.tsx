import type { Plantilla } from '../../core/registry'
import { lazy } from 'react'
import { esquemas } from './captura'
import { COLOR } from './constantes'
import { metaAgenda } from './meta'
import { flujosAgenda } from './tutorial'

/**
 * Agenda: la libreta que hay detrás del calendario. Sus registros con fecha se
 * proyectan como rutinas (ver `calendario.ts`), así que NO declara `eventos()`:
 * ese canal solo pinta filas de día completo y duplicaría lo que ya se ve.
 *
 * Tampoco lleva `sinMetaDiaria`: sin ella la app desaparecería del selector
 * «App a la que pertenece» del editor de eventos del calendario.
 */

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo sí es eager: lo usa
// el núcleo sin abrir el cuarto.
const AgendaApp = lazy(() => import('./AgendaApp').then((m) => ({ default: m.AgendaApp })))

const agenda: Plantilla = {
  id: 'agenda',
  nombre: 'Agenda · Trabajo, salud y personas',
  icon: '🗓️',
  categoria: 'complemento',
  color: COLOR,
  App: AgendaApp,
  flujos: flujosAgenda,
  esquemas,
  metaDiaria: metaAgenda,
  // 'agenda de hoy', 'agenda del dia' y 'mi dia' son del calendario: no los repitas.
  comandos: [
    {
      seccion: 'trabajo',
      etiqueta: 'Trabajo',
      nombres: ['mis pendientes', 'pendientes del trabajo', 'agenda de trabajo'],
    },
    {
      seccion: 'salud',
      etiqueta: 'Salud',
      nombres: [
        'mis citas medicas',
        'mis medicamentos',
        'mis medicinas',
        'agenda de salud',
        'mis mascotas',
      ],
    },
    {
      seccion: 'personas',
      etiqueta: 'Personas',
      nombres: ['mis contactos', 'mi libreta', 'directorio', 'cumpleanos'],
    },
  ],
}

export default agenda

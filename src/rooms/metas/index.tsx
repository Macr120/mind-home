import { lazy } from 'react'
import type { Plantilla } from '../../core/appContrato'
import { COLOR_FABRICA } from './constantes'

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense).
const MetasApp = lazy(() => import('./MetasApp').then((m) => ({ default: m.MetasApp })))

/**
 * El cuarto donde vive lo que te propusiste: la lista de metas de toda la casa,
 * los planes que la IA propone para cada una y el cronograma donde caen.
 *
 * No declara `objetivosDia` ni `esquemas` porque no registra nada suyo: sus datos
 * son las metas (filas de `rutinas` con `esMeta`) y los planes (`planesMeta`) que
 * crean las demás apps. Por lo mismo lleva **`sinMetaDiaria`**: sin ella el núcleo
 * le sintetizaría la meta genérica «registra algo hoy», que aquí no se puede
 * cumplir nunca — no hay `FUENTES` de actividad para este cuarto.
 */
const metas: Plantilla = {
  id: 'metas',
  nombre: 'Metas · Planes y cronograma',
  icon: '🎯',
  categoria: 'mente',
  color: COLOR_FABRICA,
  App: MetasApp,
  sinMetaDiaria: true,
}

export default metas

import { lazy } from 'react'
import type { Plantilla } from '../../core/registry'
import { useCaminos } from '../../core/state/caminosStore'
import { flujosCaminos, tutorialCaminos } from './tutorial'

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const Resumen = lazy(() => import('./Resumen').then((m) => ({ default: m.Resumen })))

/** Plantilla de infraestructura: se construye en el mapa 3D, no se asigna a cuartos. */
const caminos: Plantilla = {
  id: 'caminos',
  nombre: 'Circuitos',
  icon: '🛤️',
  categoria: 'complemento',
  color: '#f59e0b',
  App: Resumen,
  tipo: 'infraestructura',
  sinMetaDiaria: true,
  construir: () => useCaminos.getState().iniciar(),
  tutorial: tutorialCaminos,
  flujos: flujosCaminos,
}

export default caminos

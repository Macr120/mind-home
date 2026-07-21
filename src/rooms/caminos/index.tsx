import type { RoomModule } from '../../core/registry'
import { Resumen } from './Resumen'
import { useCaminos } from '../../core/state/caminosStore'
import { tutorialCaminos } from './tutorial'

/** Plantilla de infraestructura: se construye en el mapa 3D, no se asigna a cuartos. */
const caminos: RoomModule = {
  id: 'caminos',
  nombre: 'Caminos',
  icon: '🛤️',
  categoria: 'complemento',
  color: '#f59e0b',
  App: Resumen,
  tipo: 'infraestructura',
  sinMetaDiaria: true,
  construir: () => useCaminos.getState().iniciar(),
  tutorial: tutorialCaminos,
}

export default caminos

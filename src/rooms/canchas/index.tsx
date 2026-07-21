import type { RoomModule } from '../../core/registry'
import { Resumen } from './Resumen'
import { useCanchas } from '../../core/state/canchasStore'
import { tutorialCanchas } from './tutorial'

/** Plantilla de infraestructura: se construye en el mapa 3D, no se asigna a cuartos. */
const canchas: RoomModule = {
  id: 'canchas',
  nombre: 'Canchas',
  icon: '🏀',
  categoria: 'complemento',
  color: '#f97316',
  App: Resumen,
  tipo: 'infraestructura',
  sinMetaDiaria: true,
  construir: () => useCanchas.getState().iniciar(),
  tutorial: tutorialCanchas,
}

export default canchas

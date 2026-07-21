import type { RoomModule } from '../../core/registry'
import { Resumen } from './Resumen'
import { useHuerto } from '../../core/state/huertoStore'
import { tutorialHuerto } from './tutorial'

/** Plantilla de infraestructura: se construye en el mapa 3D, no se asigna a cuartos. */
const huerto: RoomModule = {
  id: 'huerto',
  nombre: 'Huerto',
  icon: '🥕',
  categoria: 'complemento',
  color: '#65a30d',
  App: Resumen,
  tipo: 'infraestructura',
  sinMetaDiaria: true,
  construir: () => useHuerto.getState().iniciar(),
  tutorial: tutorialHuerto,
}

export default huerto

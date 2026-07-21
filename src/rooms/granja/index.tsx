import type { RoomModule } from '../../core/registry'
import { Resumen } from './Resumen'
import { useGranja } from '../../core/state/granjaStore'
import { tutorialGranja } from './tutorial'

/** Plantilla de infraestructura: se construye en el mapa 3D, no se asigna a cuartos. */
const granja: RoomModule = {
  id: 'granja',
  nombre: 'Granja',
  icon: '🐄',
  categoria: 'complemento',
  color: '#ca8a04',
  App: Resumen,
  tipo: 'infraestructura',
  sinMetaDiaria: true,
  construir: () => useGranja.getState().iniciar(),
  tutorial: tutorialGranja,
}

export default granja

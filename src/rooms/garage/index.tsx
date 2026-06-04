import type { RoomModule } from '../../core/registry'
import { GarageApp } from './GarageApp'

const garage: RoomModule = {
  id: 'garage',
  nombre: 'Garage · Mantenimiento',
  icon: '🔧',
  categoria: 'complemento',
  posicion: [-9, 0, 6],
  color: '#fbbf24',
  App: GarageApp,
}

export default garage

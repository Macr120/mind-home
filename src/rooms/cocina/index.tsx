import type { RoomModule } from '../../core/registry'
import { CocinaApp } from './CocinaApp'

const cocina: RoomModule = {
  id: 'cocina',
  nombre: 'Cocina · Nutrición',
  icon: '🍳',
  categoria: 'cuerpo',
  posicion: [-9, 0, -6],
  color: '#f59e0b',
  App: CocinaApp,
}

export default cocina

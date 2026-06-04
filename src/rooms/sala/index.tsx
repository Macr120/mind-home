import type { RoomModule } from '../../core/registry'
import { SalaApp } from './SalaApp'

const sala: RoomModule = {
  id: 'sala',
  nombre: 'Sala · Viajes',
  icon: '✈️',
  categoria: 'complemento',
  posicion: [3, 0, 0],
  color: '#2dd4bf',
  App: SalaApp,
}

export default sala

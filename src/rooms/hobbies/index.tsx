import type { RoomModule } from '../../core/registry'
import { HobbiesApp } from './HobbiesApp'

const hobbies: RoomModule = {
  id: 'hobbies',
  nombre: 'Hobbies',
  icon: '🎯',
  categoria: 'complemento',
  posicion: [9, 0, 6],
  color: '#8b5cf6',
  App: HobbiesApp,
}

export default hobbies

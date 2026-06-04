import type { RoomModule } from '../../core/registry'
import { JardinApp } from './JardinApp'

const jardin: RoomModule = {
  id: 'jardin',
  nombre: 'Jardín · Mindfulness',
  icon: '🧘',
  categoria: 'complemento',
  posicion: [9, 0, 0],
  color: '#4ade80',
  App: JardinApp,
}

export default jardin

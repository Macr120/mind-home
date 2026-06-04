import type { RoomModule } from '../../core/registry'
import { EntretenimientoApp } from './EntretenimientoApp'

const entretenimiento: RoomModule = {
  id: 'entretenimiento',
  nombre: 'Sala de entretenimiento',
  icon: '🎮',
  categoria: 'complemento',
  posicion: [-3, 0, 0],
  color: '#34d399',
  App: EntretenimientoApp,
}

export default entretenimiento

import type { RoomModule } from '../../core/registry'
import { RecamaraApp } from './RecamaraApp'

const recamara: RoomModule = {
  id: 'recamara',
  nombre: 'Recámara · Sueño',
  icon: '🛏️',
  categoria: 'cuerpo',
  posicion: [3, 0, -6],
  color: '#a78bfa',
  App: RecamaraApp,
}

export default recamara

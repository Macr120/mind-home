import type { RoomModule } from '../../core/registry'
import { ConfiguracionesApp } from './ConfiguracionesApp'

const configuraciones: RoomModule = {
  id: 'configuraciones',
  nombre: 'Configuraciones',
  icon: '⚙️',
  categoria: 'config',
  posicion: [3, 0, 6],
  color: '#94a3b8',
  App: ConfiguracionesApp,
}

export default configuraciones

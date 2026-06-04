import type { RoomModule } from '../../core/registry'
import { DisenoApp } from './DisenoApp'

const diseno: RoomModule = {
  id: 'diseno',
  nombre: 'Diseño de casa',
  icon: '🎨',
  categoria: 'config',
  posicion: [9, 0, 6],
  color: '#cbd5e1',
  App: DisenoApp,
}

export default diseno

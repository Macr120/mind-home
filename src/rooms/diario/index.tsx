import type { RoomModule } from '../../core/registry'
import { DiarioApp } from './DiarioApp'

const diario: RoomModule = {
  id: 'diario',
  nombre: 'Diario · Noticias',
  icon: '📰',
  categoria: 'complemento',
  posicion: [-3, 0, 6],
  color: '#f472b6',
  App: DiarioApp,
}

export default diario

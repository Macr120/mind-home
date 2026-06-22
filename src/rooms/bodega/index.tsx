import type { RoomModule } from '../../core/registry'
import { BodegaApp } from './BodegaApp'

const bodega: RoomModule = {
  id: 'bodega',
  nombre: 'Bodega',
  icon: '📦',
  categoria: 'complemento',
  posicion: [3, 0, 6],
  color: '#d97706',
  App: BodegaApp,
}

export default bodega

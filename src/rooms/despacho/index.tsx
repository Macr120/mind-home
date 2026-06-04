import type { RoomModule } from '../../core/registry'
import { FinanzasApp } from './FinanzasApp'

const despacho: RoomModule = {
  id: 'despacho',
  nombre: 'Despacho · Finanzas',
  icon: '💰',
  categoria: 'mente',
  posicion: [9, 0, -6],
  color: '#60a5fa',
  App: FinanzasApp,
}

export default despacho

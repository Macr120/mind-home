import type { RoomModule } from '../../core/registry'
import { BibliotecaApp } from './BibliotecaApp'

const biblioteca: RoomModule = {
  id: 'biblioteca',
  nombre: 'Biblioteca · Enciclopedia',
  icon: '📚',
  categoria: 'mente',
  posicion: [-9, 0, 0],
  color: '#818cf8',
  App: BibliotecaApp,
}

export default biblioteca

import type { RoomModule } from '../../core/registry'
import { EjercicioApp } from './EjercicioApp'

const ejercicio: RoomModule = {
  id: 'ejercicio',
  nombre: 'Ejercicio · Rutinas',
  icon: '💪',
  categoria: 'cuerpo',
  posicion: [-3, 0, -6],
  color: '#fb7185',
  App: EjercicioApp,
}

export default ejercicio

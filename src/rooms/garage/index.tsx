import type { RoomModule } from '../../core/registry'
import { GarageApp } from './GarageApp'
import { tutorialGarage } from './tutorial'

const garage: RoomModule = {
  id: 'garage',
  nombre: 'Garage · Mantenimiento',
  icon: '🔧',
  categoria: 'complemento',
  posicion: [-9, 0, 6],
  color: '#fbbf24',
  App: GarageApp,
  tutorial: tutorialGarage,
  // Un servicio del coche toca cada varios miles de km, no cada día: el garage
  // queda fuera de la meta diaria por decisión del usuario.
  sinMetaDiaria: true,
  comandos: [
    { seccion: 'resumen', etiqueta: 'Resumen', nombres: ['resumen del garage'] },
    { seccion: 'vehiculos', etiqueta: 'Vehículos', nombres: ['vehiculos', 'mis vehiculos'] },
  ],
}

export default garage

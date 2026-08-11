import type { Plantilla } from '../../core/appContrato'
import { Resumen } from './Resumen'
import { useHuerto } from '../../core/state/huertoStore'
import { flujosHuerto } from './tutorial'

/** Plantilla de infraestructura: se construye en el mapa 3D, no se asigna a cuartos. */
const huerto: Plantilla = {
  id: 'huerto',
  nombre: 'Comida',
  icon: '🥕',
  categoria: 'complemento',
  color: '#65a30d',
  App: Resumen,
  tipo: 'infraestructura',
  sinMetaDiaria: true,
  construir: () => useHuerto.getState().iniciar(),
  flujos: flujosHuerto,
}

export default huerto

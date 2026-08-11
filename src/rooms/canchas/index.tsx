import type { Plantilla } from '../../core/appContrato'
import { Resumen } from './Resumen'
import { useCanchas } from '../../core/state/canchasStore'
import { flujosCanchas } from './tutorial'

/** Plantilla de infraestructura: se construye en el mapa 3D, no se asigna a cuartos. */
const canchas: Plantilla = {
  id: 'canchas',
  nombre: 'Canchas',
  icon: '🏀',
  categoria: 'complemento',
  color: '#f97316',
  App: Resumen,
  tipo: 'infraestructura',
  sinMetaDiaria: true,
  construir: () => useCanchas.getState().iniciar(),
  flujos: flujosCanchas,
}

export default canchas

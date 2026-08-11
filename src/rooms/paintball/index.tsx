import type { Plantilla } from '../../core/appContrato'
import { Resumen } from './Resumen'
import { usePaintball } from '../../core/state/paintballStore'
import { flujosPaintball } from './tutorial'

/** Plantilla de infraestructura: modo de juego sobre el mapa (no se asigna a cuartos). */
const paintball: Plantilla = {
  id: 'paintball',
  nombre: 'Paintball',
  icon: '🥎',
  categoria: 'complemento',
  color: '#84cc16',
  App: Resumen,
  tipo: 'infraestructura',
  sinMetaDiaria: true,
  construir: () => usePaintball.getState().iniciar(),
  flujos: flujosPaintball,
}

export default paintball

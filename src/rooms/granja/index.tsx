import type { Plantilla } from '../../core/appContrato'
import { Resumen } from './Resumen'
import { useGranja } from '../../core/state/granjaStore'
import { flujosGranja } from './tutorial.meta'

/** Plantilla de infraestructura: se construye en el mapa 3D, no se asigna a cuartos. */
const granja: Plantilla = {
  id: 'granja',
  // El id sigue diciendo «granja» (como `despacho` para Finanzas): renombrarlo
  // obligaría a migrar los datos ya guardados.
  nombre: 'Santuario',
  icon: '🐄',
  categoria: 'complemento',
  color: '#ca8a04',
  App: Resumen,
  tipo: 'infraestructura',
  sinMetaDiaria: true,
  construir: () => useGranja.getState().iniciar(),
  flujos: flujosGranja,
}

export default granja

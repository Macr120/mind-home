import { lazy } from 'react'
import type { Plantilla } from '../../core/appContrato'
import { flujosGarage } from './tutorial'
import { planMetasGarage } from './plan'

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const GarageApp = lazy(() => import('./GarageApp').then((m) => ({ default: m.GarageApp })))

const garage: Plantilla = {
  id: 'garage',
  nombre: 'Garage · Mantenimiento',
  icon: '🔧',
  categoria: 'complemento',
  color: '#fbbf24',
  App: GarageApp,
  flujos: flujosGarage,
  // Acotamiento del planificador ✨: mantenimiento, ordenado por urgencia real.
  planMetas: planMetasGarage,
  // Un servicio del coche toca cada varios miles de km, no cada día: el garage
  // queda fuera de la meta diaria por decisión del usuario.
  sinMetaDiaria: true,
  comandos: [
    { seccion: 'resumen', etiqueta: 'Resumen', nombres: ['resumen del garage'] },
    { seccion: 'vehiculos', etiqueta: 'Vehículos', nombres: ['vehiculos', 'mis vehiculos'] },
    {
      // La libreta ya no es pestaña del garaje: vive dentro de cada ficha, así
      // que «mi taller» deja al usuario en la lista de vehículos.
      seccion: 'vehiculos',
      etiqueta: 'Contactos',
      nombres: ['contactos', 'talleres', 'mi taller', 'aseguradora', 'contactos del taller'],
    },
  ],
}

export default garage

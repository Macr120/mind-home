import { lazy } from 'react'
import type { Plantilla } from '../../core/appContrato'
import { registrarProveedorRecursos } from '../../core/recursosStudio'
import { registrarProveedorCompartible } from '../../core/buzon/compartibles'
import { COLOR_FABRICA } from './constantes'
import { OPERACIONES_IA } from './costosIA'

// El Studio de video trae los dibujos como imágenes (registro eager, datos con import()).
registrarProveedorRecursos({
  app: 'arte',
  listar: async () => (await import('./recursos')).listarRecursos(),
  obtener: async (clave) => (await import('./recursos')).obtenerRecurso(clave),
})

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense).
const ArteApp = lazy(() => import('./ArteApp').then((m) => ({ default: m.ArteApp })))

// Los dibujos se pueden mandar a otra persona por el buzón (registro eager, datos con import()).
registrarProveedorCompartible({
  app: 'arte',
  tipos: [
    {
      tipo: 'dibujo',
      icono: 'pincel',
      etiqueta: (t) => t('buzon.compartible.dibujo', 'Dibujo'),
      listar: async () => (await import('./compartible')).listarDibujos(),
      empaquetar: async (clave) => (await import('./compartible')).empaquetarDibujoPorClave(clave),
      importar: async (p) => (await import('./compartible')).importarDibujo(p),
    },
  ],
})

const arte: Plantilla = {
  id: 'arte',
  nombre: 'Arte · Dibujo, pintura y fotografía',
  icon: '🖌️',
  categoria: 'mente',
  color: COLOR_FABRICA,
  App: ArteApp,
  operacionesIA: OPERACIONES_IA,
  comandos: [
    {
      seccion: 'galeria',
      etiqueta: 'Galería',
      nombres: ['dibujo', 'dibujos', 'dibujar', 'pintar', 'lienzo', 'paint', 'galeria de arte'],
    },
  ],
}

export default arte

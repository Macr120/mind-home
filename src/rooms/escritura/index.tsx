import { lazy } from 'react'
import type { Plantilla } from '../../core/appContrato'
import { registrarProveedorRecursos } from '../../core/recursosStudio'
import { COLOR_FABRICA } from './constantes'
import { OPERACIONES_IA } from './costosIA'

// El Studio de video trae los textos como guion de narración (registro eager, datos con import()).
registrarProveedorRecursos({
  app: 'escritura',
  listar: async () => (await import('./recursos')).listarRecursos(),
  obtener: async (clave) => (await import('./recursos')).obtenerRecurso(clave),
})

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense).
const EscrituraApp = lazy(() => import('./EscrituraApp').then((m) => ({ default: m.EscrituraApp })))

const escritura: Plantilla = {
  id: 'escritura',
  nombre: 'Escritura · Libros',
  icon: '📝',
  categoria: 'mente',
  color: COLOR_FABRICA,
  App: EscrituraApp,
  operacionesIA: OPERACIONES_IA,
  comandos: [
    {
      seccion: 'libros',
      etiqueta: 'Libros',
      nombres: ['libro', 'libros', 'documento', 'documentos', 'escribir', 'escritura', 'historia', 'historias', 'novela', 'cuento', 'guion', 'word'],
    },
  ],
}

export default escritura

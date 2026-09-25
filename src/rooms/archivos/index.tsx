import { lazy } from 'react'
import type { Plantilla } from '../../core/appContrato'
import { COLOR_FABRICA } from './constantes'

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense).
const ArchivosApp = lazy(() => import('./ArchivosApp').then((m) => ({ default: m.ArchivosApp })))

/**
 * Archivo: la nube del usuario Pro (10/30/100 GB según su nivel) sobre
 * Cloudflare R2. Id `archivos` y no `archivo`: esa palabra ya abre la pestaña
 * Archivo de Entretenimiento desde el chat.
 */
const archivos: Plantilla = {
  id: 'archivos',
  nombre: 'Archivo · Tu nube',
  icon: '🗄️',
  categoria: 'complemento',
  color: COLOR_FABRICA,
  App: ArchivosApp,
  comandos: [
    {
      seccion: 'archivos',
      etiqueta: 'Archivos',
      nombres: ['mis archivos', 'mi nube', 'nube', 'drive', 'archivos en la nube', 'subir archivo', 'subir archivos'],
    },
    {
      seccion: 'recientes',
      etiqueta: 'Recientes',
      nombres: ['archivos recientes', 'ultimos archivos'],
    },
    {
      seccion: 'studio',
      etiqueta: 'Del Studio',
      nombres: ['archivos del studio', 'nube del studio'],
    },
  ],
}

export default archivos

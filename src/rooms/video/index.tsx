import { lazy } from 'react'
import type { Plantilla } from '../../core/appContrato'
import { COLOR_FABRICA } from './constantes'
import { OPERACIONES_IA } from './costosIA'

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense).
const VideoApp = lazy(() => import('./VideoApp').then((m) => ({ default: m.VideoApp })))

const video: Plantilla = {
  id: 'video',
  nombre: 'Video · Editor de guion',
  icon: '🎞️',
  categoria: 'mente',
  color: COLOR_FABRICA,
  App: VideoApp,
  operacionesIA: OPERACIONES_IA,
  comandos: [
    {
      seccion: 'videos',
      etiqueta: 'Videos',
      nombres: ['editor de video', 'editar video', 'videos', 'montar video', 'medios de video', 'clips'],
    },
    {
      seccion: 'animacion3d',
      etiqueta: 'Animación 3D',
      nombres: ['animacion 3d', 'animaciones 3d', 'modo pelicula', 'pelicula 3d', 'animar asistentes'],
    },
  ],
}

export default video

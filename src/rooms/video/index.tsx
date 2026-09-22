import { lazy } from 'react'
import type { Plantilla } from '../../core/appContrato'
import { registrarAterrizaje } from '../../core/espacios/enlaces'
import { COLOR_FABRICA } from './constantes'
import { OPERACIONES_IA } from './costosIA'

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense).
const VideoApp = lazy(() => import('./VideoApp').then((m) => ({ default: m.VideoApp })))

// Un proyecto compartido por enlace aterriza aquí (registro eager, código con
// import(): el lector defensivo del snapshot no pinta nada en el arranque).
registrarAterrizaje('video', async (e) => {
  await (await import('./compartido')).aterrizarProyecto(e)
})

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

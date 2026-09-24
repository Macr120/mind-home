import { lazy } from 'react'
import type { Plantilla } from '../../core/appContrato'
import { registrarAterrizaje } from '../../core/espacios/enlaces'
import { registrarProveedorRecursos } from '../../core/recursosStudio'
import { registrarProveedorCompartible } from '../../core/buzon/compartibles'
import { COLOR_FABRICA } from './constantes'
import { OPERACIONES_IA } from './costosIA'

// El Studio de video trae canciones, grabaciones y «Tu música» como medios. Se
// registra aquí (módulo eager) y lo pesado —el render offline— va con import().
registrarProveedorRecursos({
  app: 'audio',
  listar: async () => (await import('./recursos')).listarRecursos(),
  obtener: async (clave) => (await import('./recursos')).obtenerRecurso(clave),
})

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense).
const StudioAudioApp = lazy(() => import('./StudioAudioApp').then((m) => ({ default: m.StudioAudioApp })))

// Un proyecto compartido por enlace aterriza aquí (registro eager, código con
// import(): el lector defensivo del snapshot no pinta nada en el arranque).
registrarAterrizaje('audio', async (e) => {
  await (await import('./compartido')).aterrizarProyecto(e)
})

// Una COPIA de la canción (solo sus pistas de notas) se puede mandar a otra persona
// por el buzón o sacar como WAV (registro eager, datos con import()).
registrarProveedorCompartible({
  app: 'audio',
  tipos: [
    {
      tipo: 'cancion',
      icono: 'musica',
      etiqueta: (t) => t('buzon.compartible.cancion', 'Canción'),
      listar: async () => (await import('./compartible')).listarCanciones(),
      empaquetar: async (clave) => (await import('./compartible')).empaquetarCancionPorClave(clave),
      importar: async (p) => (await import('./compartible')).importarCancion(p),
      exportar: async (p) => (await import('./compartible')).exportarCancion(p),
    },
  ],
})

const audio: Plantilla = {
  id: 'audio',
  nombre: 'Audio · Estudio musical',
  icon: '🎹',
  categoria: 'mente',
  color: COLOR_FABRICA,
  App: StudioAudioApp,
  operacionesIA: OPERACIONES_IA,
  comandos: [
    {
      seccion: 'canciones',
      etiqueta: 'Canciones',
      nombres: ['estudio de audio', 'estudio musical', 'daw', 'piano roll', 'hacer musica', 'componer', 'canciones'],
    },
    {
      seccion: 'mezclar',
      etiqueta: 'Mezclador DJ',
      nombres: ['dj', 'mezclador', 'mezclador dj', 'tornamesa', 'mezclar musica'],
    },
  ],
}

export default audio

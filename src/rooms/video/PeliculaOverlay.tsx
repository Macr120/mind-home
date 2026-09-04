import { usePelicula } from '../../core/state/peliculaStore'
import { ErrorBoundary } from '../../core/ui/ErrorBoundary'
import { Editor } from './Editor'

/**
 * El Editor del Studio de video como dock sobre el mapa («Modo película», ver
 * `peliculaStore`). Default export: lo carga App con lazy, en la raíz. El
 * ErrorBoundary es obligado: con el HUD ya oculto, un throw del Editor vaciaría
 * la App sin forma de volver.
 */
export default function PeliculaOverlay() {
  const proyectoId = usePelicula((s) => s.proyectoId)
  const salir = usePelicula((s) => s.salir)
  if (proyectoId == null) return null
  return (
    <ErrorBoundary titulo="Error en el modo película">
      <Editor key={proyectoId} id={proyectoId} pelicula alCerrar={salir} />
    </ErrorBoundary>
  )
}

import { lazy, Suspense } from 'react'
import { useDiseño } from '../state/disenoStore'
import { useModoFoto } from '../state/modoFotoStore'

const Inner = lazy(() =>
  import('./EfectosPostInner').then((m) => ({ default: m.EfectosPostInner })),
)

/**
 * Postprocesado de la escena (oclusión ambiental, bloom y estilos de render).
 * El chunk de `postprocessing` solo se descarga si los efectos están activos;
 * el interruptor y el estilo viven en editor → Configuraciones.
 */
export function EfectosPost() {
  const efectosOn = useDiseño((s) => s.efectosVisuales)
  const config = useDiseño((s) => s.efectosConfig)
  // En el modo foto el trazador toma el lienzo: el composer se quita para no pisarlo.
  const enFoto = useModoFoto((s) => s.activo)
  if (!efectosOn || enFoto) return null
  return (
    <Suspense fallback={null}>
      <Inner config={config} />
    </Suspense>
  )
}

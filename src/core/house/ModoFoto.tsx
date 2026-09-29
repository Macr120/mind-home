import { lazy, Suspense } from 'react'
import { useModoFoto } from '../state/modoFotoStore'

const Inner = lazy(() => import('./ModoFotoInner').then((m) => ({ default: m.ModoFotoInner })))

/**
 * Modo foto con trazado de rayos. Va DENTRO del `<Canvas>` de la casa; el chunk
 * del trazador (three-gpu-pathtracer) solo se descarga al abrir el modo.
 */
export function ModoFoto() {
  const activo = useModoFoto((s) => s.activo)
  const calidad = useModoFoto((s) => s.calidad)
  if (!activo) return null
  return (
    <Suspense fallback={null}>
      {/* La calidad como key: cambiarla rearma el trazador desde cero. */}
      <Inner key={calidad} calidad={calidad} />
    </Suspense>
  )
}

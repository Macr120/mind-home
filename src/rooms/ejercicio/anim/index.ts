import { lazy } from 'react'

/**
 * Puerta del visor 3D de ejercicios: el Canvas (three + rig + patrones) llega
 * en su propio chunk, como `Superficie3D` en Cómputo. `tienePatron` sí es
 * eager (solo strings) para decidir si se ofrece la pestaña Animación.
 */
export const VisorEjercicio = lazy(() => import('./VisorEjercicio'))
export { tienePatron } from './mapa'

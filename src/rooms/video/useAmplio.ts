import { useMediaQuery } from '../../core/ui/useMediaQuery'
import { MEDIA_AMPLIO } from './constantes'

export { useMediaQuery }

/**
 * ¿Modo columnas (la variante `amplio:` de index.css) o modo cajones? La misma
 * media query que el CSS, leída desde JS: los cajones móviles llevan telón,
 * `role="dialog"` y Escape propio, y la preferencia de plegado persistida solo
 * aplica a las columnas.
 */
export function useAmplio(): boolean {
  return useMediaQuery(MEDIA_AMPLIO)
}

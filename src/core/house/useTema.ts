import { useDiseño } from '../state/disenoStore'
import { getTema, type Tema } from './temas'

/**
 * Tema activo de la casa ya fusionado con la personalización del usuario.
 * Observa `temaRev` para refrescar la escena en vivo mientras se edita el tema.
 */
export function useTemaActivo(): Tema | null {
  const id = useDiseño((s) => s.temaGlobal)
  // Suscripción de reactividad: al editar un tema cambia temaRev y esto vuelve a renderizar.
  useDiseño((s) => s.temaRev)
  return getTema(id)
}

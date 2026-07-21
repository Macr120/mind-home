import { useT } from '../i18n/useT'
import { useTutorial } from './tutorialStore'
import { tutorialAppGenerica } from './appGenerica'
import type { Plantilla } from '../registry'

/**
 * "?" del encabezado de una app: lanza su tutorial (el genérico si no tiene uno
 * propio). Se pinta en amarillo mientras el tour corre, igual que el selector.
 *
 * `montada`: la app ya está en pantalla (previa del catálogo), así que el tour
 * no debe abrir su cuarto — se le quita el `preparar`.
 */
export function BotonTutorialApp({
  plantilla,
  montada = false,
  className = '',
}: {
  plantilla: Plantilla
  montada?: boolean
  className?: string
}) {
  const t = useT()
  const tourActivo = useTutorial((s) => !!s.def)
  const lanzar = () => {
    const def = plantilla.tutorial ?? tutorialAppGenerica
    void useTutorial.getState().iniciar(montada ? { ...def, preparar: undefined } : def)
  }
  return (
    <button
      type="button"
      onClick={lanzar}
      title={t('tut.boton', 'Ver tutorial')}
      aria-label={t('tut.boton', 'Ver tutorial')}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-sm font-bold transition ${
        tourActivo
          ? 'border-amber-400/70 bg-amber-400/25 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.35)]'
          : 'border-white/10 bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/90'
      } ${className}`}
    >
      ?
    </button>
  )
}

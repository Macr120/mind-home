import { useState } from 'react'
import { useT } from '../i18n/useT'
import { useTutorial } from './tutorialStore'
import { flujosDeApp, lanzarFlujo } from './registro'
import type { TutorialDef } from './tipos'
import type { Plantilla } from '../registry'

/**
 * "?" del encabezado de una app. Con UN tutorial lo lanza directo (comportamiento
 * clásico); con varios FLUJOS abre un menú para elegir cuál. Los flujos corren
 * sobre el año de datos de la casa demo (desde la casa real, saltan a ella).
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
  const [abierto, setAbierto] = useState(false)
  const flujos = flujosDeApp(plantilla.id)

  const elegir = (def: TutorialDef) => {
    setAbierto(false)
    lanzarFlujo(plantilla.id, def, { montada })
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => (flujos.length > 1 ? setAbierto((v) => !v) : elegir(flujos[0]))}
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
      {abierto && (
        <div className="ui-panel absolute right-0 top-9 z-30 w-56 space-y-1 rounded-xl border border-white/10 p-1.5 shadow-xl">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
            {t('tut.flujos.titulo', 'Tutoriales de esta app')}
          </p>
          {flujos.map((def) => (
            <button
              key={def.id}
              type="button"
              onClick={() => elegir(def)}
              className="block w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold text-white/75 transition hover:bg-white/10"
            >
              {t(def.titulo.clave, def.titulo.es)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

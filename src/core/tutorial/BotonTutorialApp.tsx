import { useState } from 'react'
import { useT } from '../i18n/useT'
import { useTutorial } from './tutorialStore'
import { flujosDeApp, lanzarEsencial } from './registro'
import { ListaToursApp } from './ListaToursApp'
import type { Plantilla } from '../registry'
import { Icono } from '../ui/iconos/Icono'
import { esDemo } from '../edicion'
import { entrarDemo } from '../../demo/modo'
import { BUILDERS_DEMO } from '../../demo/builders'

/**
 * "?" del encabezado de una app. Abre el menú con los dos tipos de tutorial:
 * «Lo esencial» (corre aquí mismo, recorre los menús) y los «Ejemplos · casa
 * demo» (los flujos sobre el año de Pep@; desde la casa real saltan a ella).
 * Sin ejemplos ni año demo (plantillas propias), lanza el esencial directo.
 *
 * El menú suma la entrada «El año de Pep@ en [App]»: abre la app DEMO con su año
 * de datos para explorar libremente, sin tour (`entrarDemo` sin `tour`). Dentro
 * del demo la entrada sobra (ya se está ahí) y las apps sin builder (las de
 * infraestructura) no tienen año que enseñar.
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
  const conPep = !esDemo() && !!BUILDERS_DEMO[plantilla.id]

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() =>
          flujos.length > 0 || conPep
            ? setAbierto((v) => !v)
            : void lanzarEsencial(plantilla.id, { montada })
        }
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
        <div className="ui-panel absolute end-0 top-9 z-30 w-56 space-y-1 rounded-xl border border-white/10 p-1.5 shadow-xl">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
            {t('tut.flujos.titulo', 'Tutoriales de esta app')}
          </p>
          <ListaToursApp
            plantillaId={plantilla.id}
            montada={montada}
            alLanzar={() => setAbierto(false)}
          />
          {conPep && (
            <>
              <div className="mx-1 border-t border-white/10" />
              {/* Sin tour: aterriza en la app demo con el año de Pep@ y a explorar. */}
              <button
                type="button"
                onClick={() => entrarDemo({ app: plantilla.id })}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-start text-xs font-semibold text-white/75 transition hover:bg-white/10"
              >
                <Icono nombre="casa" />
                <span className="min-w-0 truncate">
                  {t('demo.anioPep.app', 'El año de Pep@ en {app}', {
                    app: t(`room.${plantilla.id}.nombre`, plantilla.nombre).split(' · ')[0],
                  })}
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

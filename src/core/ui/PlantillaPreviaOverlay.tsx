import { Suspense, useSyncExternalStore } from 'react'
import { catalogoPlantillasStore, getPlantilla } from '../registry'
import { usePreviaPlantilla } from '../state/previaPlantillaStore'
import { ErrorBoundary } from './ErrorBoundary'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { BotonTutorialApp } from '../tutorial/BotonTutorialApp'
import { vivo } from './estilos'
import { GateAppDemo } from '../../demo/GateAppDemo'

/**
 * Previsualización de una app del catálogo: entra a la app sin necesidad de un
 * cuarto, a pantalla completa (por encima del menú lateral que la abrió).
 */
export default function PlantillaPreviaOverlay() {
  const t = useT()
  const plantillaId = usePreviaPlantilla((s) => s.plantillaId)
  const cerrar = usePreviaPlantilla((s) => s.cerrar)
  // Una custom recién creada llega de Dexie después: re-resolver al publicarse.
  useSyncExternalStore(catalogoPlantillasStore.subscribe, catalogoPlantillasStore.getSnapshot)
  const previa = plantillaId ? getPlantilla(plantillaId) : null
  if (!previa) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col ui-app">
      <header
        className="flex items-center gap-3 border-b border-white/10 px-4 py-3"
        style={{ borderTopColor: previa.color }}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base"
          style={{ background: `${previa.color}33` }}
        >
          <Icono emoji={previa.icon} />
        </span>
        <h1 className="texto-vivo min-w-0 flex-1 truncate text-lg font-bold" style={vivo(previa.color)}>
          {t(`room.${previa.id}.nombre`, previa.nombre).split(' · ')[0]}
        </h1>
        {/* Tutorial de la app, igual que en su cuarto (aquí ya está montada). */}
        <BotonTutorialApp plantilla={previa} montada />
        <button
          type="button"
          onClick={cerrar}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/20"
        >
          {t('plantillas.cerrarPrevia', '‹ Cerrar')}
        </button>
      </header>
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <ErrorBoundary
          titulo={`Error en ${previa.nombre}`}
          textoReintentar={t('ui.reintentar', 'Reintentar')}
        >
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] items-center justify-center text-white/50">
                {t('ui.cargando', 'Cargando…')}
              </div>
            }
          >
            <GateAppDemo plantillaId={previa.id}>
              <previa.App />
            </GateAppDemo>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}

import { useRef } from 'react'
import { PlanoCanvas } from './PlanoCanvas'
import { PlanoAccionesFlotantes } from './PlanoBarraAcciones'
import { VIEW_CUBE_PX } from '../ViewCube'
import { IconoOjo } from '../editor/IconoOjo'
import { usePlanos } from '../../state/planosStore'
import { useT } from '../../i18n/useT'

/** Croquis con zoom/pan y botones flotantes. `compacto` = dentro del panel lateral (sin pr-80 ni menús). */
export function PlanosEditor({ compacto = false }: { compacto?: boolean }) {
  const t = useT()
  const fitRef = useRef<(() => void) | null>(null)
  const modo = usePlanos((s) => s.modo)
  const muroLibreSel = usePlanos((s) => s.muroLibreSel)
  const seleccion = usePlanos((s) => s.seleccion)
  const previewVisible = usePlanos((s) => s.previewVisible)
  const setPreviewVisible = usePlanos((s) => s.setPreviewVisible)
  // El ojo solo aplica al previsualizador del editor de mapa (compacto): muro independiente
  // o pared de cuarto (arista) en muros/puertas/ventanas, o el cuarto seleccionado en
  // cuartos/piso interior/techos. El piso exterior no se previsualiza (debe coincidir con
  // el bloque de preview de ConstructorMapa).
  const conPreview =
    compacto &&
    (muroLibreSel != null ||
      seleccion?.tipo === 'arista' ||
      ((modo === 'cuartos' || modo === 'piso-int' || modo === 'techos') && seleccion?.tipo === 'cuarto'))

  return (
    <div className={`relative flex h-full min-h-0 w-full flex-1 flex-col ${compacto ? '' : 'pr-80'}`}>
      {/* Área del croquis (sin contar el padding del panel lateral). */}
      <div className="relative min-h-0 flex-1 w-full">
        <PlanoCanvas onFitRef={(fit) => { fitRef.current = fit }} />
        <div
          className={`pointer-events-none absolute z-30 flex flex-col items-stretch gap-1.5 ${
            compacto ? 'bottom-2 right-2' : 'bottom-4 right-4'
          }`}
          style={compacto ? undefined : { width: VIEW_CUBE_PX }}
        >
          {conPreview && (
            <button
              type="button"
              title={
                previewVisible
                  ? t('planos.preview.ocultar', 'Ocultar previsualización 3D')
                  : t('planos.preview.mostrar', 'Mostrar previsualización 3D')
              }
              onClick={() => setPreviewVisible(!previewVisible)}
              className={`pointer-events-auto flex h-9 w-full items-center justify-center rounded-lg border shadow-md transition active:scale-95 ${
                previewVisible
                  ? 'border-emerald-400 bg-emerald-600 texto-cta hover:bg-emerald-600'
                  : 'border-white/10 ui-panel-glass text-white/70 backdrop-blur-sm hover:bg-white/10'
              }`}
            >
              <IconoOjo off={!previewVisible} />
            </button>
          )}
          <button
            type="button"
            title={t('planos.zoom.encajar', 'Encajar plano en pantalla')}
            onClick={() => fitRef.current?.()}
            className="ui-panel-glass pointer-events-auto flex h-9 w-full items-center justify-center rounded-lg border border-white/10 text-base text-white/70 shadow-md backdrop-blur-sm transition hover:bg-white/10 active:scale-95"
          >
            ⊙
          </button>
          {!compacto && (
            <div className="pointer-events-auto">
              <PlanoAccionesFlotantes />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

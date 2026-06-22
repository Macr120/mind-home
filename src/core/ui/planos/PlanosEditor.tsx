import { useRef } from 'react'
import { PlanoCanvas } from './PlanoCanvas'
import { PlanoAccionesFlotantes } from './PlanoBarraAcciones'
import { VIEW_CUBE_PX } from '../ViewCube'
import { useT } from '../../i18n/useT'

/** Croquis con zoom/pan y botones flotantes. `compacto` = dentro del panel lateral (sin pr-80 ni menús). */
export function PlanosEditor({ compacto = false }: { compacto?: boolean }) {
  const t = useT()
  const fitRef = useRef<(() => void) | null>(null)

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
          <button
            type="button"
            title={t('planos.zoom.encajar', 'Encajar plano en pantalla')}
            onClick={() => fitRef.current?.()}
            className="pointer-events-auto flex h-9 w-full items-center justify-center rounded-lg border border-stone-300 bg-white text-base text-stone-600 shadow-md transition hover:border-stone-400 hover:bg-stone-50 active:scale-95"
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

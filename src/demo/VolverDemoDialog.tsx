import { create } from 'zustand'
import { useT } from '../core/i18n/useT'
import { salirDemo } from './modo'

/**
 * «¿Volver a tu casa?» — se abre al TERMINAR (o abandonar) el flujo de tutorial
 * que trajo al visitante desde su casa real (`lanzarFlujoEnDemo` lo inyecta en
 * `alTerminar`). Es el cierre natural del viaje: vino solo a ese tour.
 */
export const useVolverDemo = create<{
  abierto: boolean
  abrir: () => void
  cerrar: () => void
}>((set) => ({
  abierto: false,
  abrir: () => set({ abierto: true }),
  cerrar: () => set({ abierto: false }),
}))

export function VolverDemoDialog() {
  const t = useT()
  const abierto = useVolverDemo((s) => s.abierto)
  const cerrar = useVolverDemo((s) => s.cerrar)
  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="ui-panel ui-pop w-full max-w-sm space-y-2 rounded-2xl border border-white/10 p-5 shadow-2xl">
        <h2 className="text-sm font-bold text-white/90">
          {t('demo.volver.titulo', 'Fin del tutorial')}
        </h2>
        <p className="text-xs leading-snug text-white/60">
          {t(
            'demo.volver.cuerpo',
            'Esto era la casa demo de Pep@. ¿Volvemos a tu casa, o te quedas a curiosear un rato?',
          )}
        </p>
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={() => salirDemo()}
            className="ui-accent-bg block w-full rounded-md px-2 py-1.5 text-center text-xs font-bold"
          >
            {t('demo.volver.si', 'Volver a mi casa')}
          </button>
          <button
            type="button"
            onClick={cerrar}
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
          >
            {t('demo.volver.seguir', 'Seguir explorando la casa demo')}
          </button>
        </div>
      </div>
    </div>
  )
}

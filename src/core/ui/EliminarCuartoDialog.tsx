import { useCuartos } from '../state/cuartosStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Cuando se pide borrar un cuarto que tiene una app asignada, `cuartosStore.eliminar`
 * deja el borrado pendiente en vez de aplicarlo directo. Este modal avisa y deja que el
 * usuario confirme o cancele (reemplaza a `window.confirm`, poco fiable en WebView/Capacitor).
 */
export function EliminarCuartoDialog() {
  const t = useT()
  const pendiente = useCuartos((s) => s.eliminarPendiente)
  const confirmar = useCuartos((s) => s.confirmarEliminarCuarto)
  const cancelar = useCuartos((s) => s.cancelarEliminarCuarto)

  if (!pendiente) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={cancelar}
    >
      <div
        className="ui-panel ui-pop w-full max-w-md rounded-2xl border border-white/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-xl">
            <Icono nombre="basura" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black">
              {t('casa.eliminarCuartoTitulo', 'Eliminar cuarto')}
            </p>
            <p className="text-[11px] text-white/45">
              {t(
                'casa.confirmarEliminarCuarto',
                '«{nombre}» tiene una app asignada. ¿Eliminar el cuarto? La plantilla volverá al catálogo.',
                { nombre: pendiente.nombre },
              )}
            </p>
          </div>
          <button
            onClick={cancelar}
            className="ml-auto rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="cerrar" />
          </button>
        </header>

        <div className="flex gap-2">
          <button
            onClick={cancelar}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            {t('ui.cancelar', 'Cancelar')}
          </button>
          <button
            onClick={() => void confirmar()}
            className="flex-1 rounded-xl border border-red-400/30 bg-red-400/10 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-400/20"
          >
            {t('celdas.eliminarCuarto', 'Eliminar el cuarto')}
          </button>
        </div>
      </div>
    </div>
  )
}

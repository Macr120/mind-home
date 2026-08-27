import { useT } from '../core/i18n/useT'
import { useHud } from '../core/state/hudStore'
import { salirProbar } from './modo'

/**
 * Píldora persistente del modo probar (montada en App solo con `esProbar()`):
 * recuerda que la casa es de prueba y ofrece la única salida — crear la cuenta.
 * `salirProbar()` conserva la BD de prueba: al pagar se ofrece recuperarla.
 */
export function BarraProbar() {
  const t = useT()
  const movilVertical = useHud((s) => s.movilVertical)

  // Teléfono vertical: baja por debajo de los botones de las esquinas
  // superiores, igual que la píldora de la demo (ver BarraDemo).
  return (
    <div
      className={`safe-sup pointer-events-auto fixed left-1/2 z-[45] -translate-x-1/2 ${
        movilVertical ? 'top-20' : 'top-2'
      }`}
    >
      <div className="ui-panel-glass flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 shadow-lg backdrop-blur-md">
        <span className="text-[11px] font-semibold text-white/60">
          {t('probar.barra.chip', 'Modo prueba')}
        </span>
        <button
          type="button"
          onClick={() => salirProbar()}
          className="text-[11px] font-bold text-white/85"
        >
          {t('probar.barra.crear', 'Crear mi cuenta')}
        </button>
      </div>
    </div>
  )
}

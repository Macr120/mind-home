import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/**
 * Casilla para marcar un ejercicio de la sesión como hecho mientras entrenas.
 * Es estado del formulario (no se guarda): un apoyo para ir tachando lo que ya
 * hiciste. `acento` es la clase de fondo del color de la pestaña.
 */
export function CheckFila({
  hecho,
  onToggle,
  acento,
}: {
  hecho: boolean
  onToggle: () => void
  acento: string
}) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={hecho}
      title={t('ejercicio.check.marcar', 'Marcar como hecho')}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm transition ${
        hecho
          ? `border-transparent texto-cta ${acento}`
          : 'border-white/15 bg-black/20 text-transparent hover:border-white/40'
      }`}
    >
      <Icono nombre="confirmar" />
    </button>
  )
}

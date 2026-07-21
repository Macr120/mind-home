import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/** Selector / visualización de calificación 1–5. */
export function Estrellas({
  valor,
  onChange,
  soloLectura = false,
}: {
  valor: number
  onChange?: (n: number) => void
  soloLectura?: boolean
}) {
  const t = useT()
  return (
    <div className="flex gap-0.5" role={soloLectura ? undefined : 'group'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={soloLectura}
          onClick={() => onChange?.(n === valor && !soloLectura ? 0 : n)}
          className={`text-lg leading-none transition ${
            soloLectura ? 'cursor-default' : 'hover:scale-110'
          } ${n <= valor ? 'text-amber-400' : 'text-white/20'}`}
          aria-label={t('ui.estrellas', `${n} estrellas`, { n: String(n) })}
        >
          <Icono nombre="estrella" />
        </button>
      ))}
    </div>
  )
}

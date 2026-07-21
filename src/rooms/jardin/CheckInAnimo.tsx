import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { ANIMOS } from './constantes'

/** Check-in emocional opcional: 5 emojis (valor 1–5) o saltar (undefined). */
export function CheckInAnimo({
  pregunta,
  onElegir,
}: {
  pregunta: string
  onElegir: (animo?: number) => void
}) {
  const t = useT()
  return (
    <div className="text-center space-y-3">
      <p className="text-sm font-semibold text-white/80">{pregunta}</p>
      <div className="flex justify-center gap-2">
        {ANIMOS.map((emoji, i) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onElegir(i + 1)}
            className="text-3xl p-1.5 rounded-xl bg-white/5 hover:bg-white/15 hover:scale-110 transition"
          >
            <Icono emoji={emoji} />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onElegir(undefined)}
        className="text-xs text-white/40 hover:text-white/70"
      >
        {t('jardin.chk.saltar', 'Saltar')}
      </button>
    </div>
  )
}

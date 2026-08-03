import type { ReactNode } from 'react'
import { useT } from '../../i18n/useT'

/** Fila compacta de deslizador: etiqueta + valor + botón ↺ en una línea, slider debajo. */
export function SliderProp({
  label,
  value,
  min,
  max,
  step,
  fmt,
  onChange,
  onReset,
  extra,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  fmt: (v: number) => string
  onChange: (v: number) => void
  onReset: () => void
  /** Controles extra a la derecha de la etiqueta (ej. giro rápido 90°). */
  extra?: ReactNode
}) {
  const t = useT()
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</span>
        <div className="flex items-center gap-1">
          {extra}
          <span className="text-xs font-semibold tabular-nums text-white/70">{fmt(value)}</span>
          <button
            type="button"
            onClick={onReset}
            title={t('prop.restablecer', 'Restablecer')}
            className="rounded px-1 text-white/30 transition hover:bg-white/10 hover:text-white/70"
          >
            ↺
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 w-full accent-emerald-400"
      />
    </div>
  )
}

import { useT } from '../../i18n/useT'

const PALETA = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#64748b', '#94a3b8', '#cbd5e1', '#fbbf24', '#34d399',
  '#ffd23b', '#2f5fd0', '#e23b3b', '#60a5fa', '#a78bfa', '#fb7185',
]

/** Valor especial que representa "sin color" (transparente). */
export const SIN_COLOR = 'transparent'

/** Selector de color compacto: paleta de swatches + color personalizado. */
export function ColorPicker({
  value,
  onChange,
  paleta = PALETA,
  sinColor = false,
  personalizado = true,
}: {
  value: string
  onChange: (c: string) => void
  /** Paleta de swatches (por defecto la completa). Pasa una más corta para simplificar. */
  paleta?: readonly string[]
  /** Muestra un swatch extra "sin color" (transparente) al final. */
  sinColor?: boolean
  /** Muestra el selector de color personalizado. */
  personalizado?: boolean
}) {
  const t = useT()
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-8 gap-1.5">
        {paleta.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="h-7 w-7 rounded-md transition hover:scale-110"
            style={{
              background: c,
              boxShadow: value === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
            }}
          />
        ))}
        {sinColor && (
          <button
            type="button"
            onClick={() => onChange(SIN_COLOR)}
            title={t('color.sin', 'Sin color')}
            className="relative h-7 w-7 rounded-md border border-dashed border-white/30 bg-[#0a0c10] transition hover:scale-110"
            style={{
              boxShadow: value === SIN_COLOR ? '0 0 0 2px #fff, 0 0 0 4px #64748b' : 'none',
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[11px] text-white/45">✕</span>
          </button>
        )}
      </div>
      {personalizado && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
            title={t('color.personalizado', 'Color personalizado')}
          />
          <span className="text-xs text-white/40">{t('color.personalizado', 'Color personalizado')}: {value}</span>
        </div>
      )}
    </div>
  )
}

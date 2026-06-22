export const PALETA = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#64748b', '#94a3b8', '#cbd5e1', '#fbbf24', '#34d399',
  '#ffd23b', '#2f5fd0', '#e23b3b', '#60a5fa', '#a78bfa', '#fb7185',
]

/** Selector de color compacto: paleta de swatches + color personalizado. */
export function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (c: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-8 gap-1.5">
        {PALETA.map((c) => (
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
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
          title="Color personalizado"
        />
        <span className="text-xs text-white/40">Color personalizado: {value}</span>
      </div>
    </div>
  )
}

export function BarraProgreso({
  label,
  actual,
  objetivo,
  unidad,
  color,
}: {
  label: string
  actual: number
  objetivo: number
  unidad: string
  color: string
}) {
  const pct = objetivo > 0 ? Math.min(100, (actual / objetivo) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-white/80">{label}</span>
        <span className="text-white/50">
          {actual} / {objetivo} {unidad}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-black/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

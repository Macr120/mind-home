/** Anillo de progreso SVG para un macro. */
export function MacroAnillo({
  label,
  consumido,
  objetivo,
  unidad,
  color,
}: {
  label: string
  consumido: number
  objetivo: number
  unidad: string
  color: string
}) {
  const pct = objetivo > 0 ? Math.min(1, consumido / objetivo) : 0
  const r = 36
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" className="-rotate-90">
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[10px] font-bold uppercase tracking-wide text-white/45">
        {label}
      </span>
      <span className="text-sm font-bold text-white/90">
        {Math.round(consumido)}
        <span className="text-white/40 font-normal"> / {objetivo}{unidad}</span>
      </span>
    </div>
  )
}

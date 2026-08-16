import { useT } from '../../core/i18n/useT'

/** Línea de progresión (SVG puro) para una serie de puntos fecha → valor. */
export function GraficaProgreso({
  puntos,
  color,
  unidad = 'kg',
}: {
  puntos: { fecha: string; valor: number }[]
  color: string
  unidad?: string
}) {
  const t = useT()
  if (puntos.length === 0) return null
  const W = 300
  const H = 90
  const PAD = 8
  const vals = puntos.map((p) => p.valor)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const rango = max - min || 1
  const x = (i: number) =>
    puntos.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (puntos.length - 1)
  const y = (v: number) => H - PAD - ((v - min) / rango) * (H - PAD * 2)
  const linea = puntos.map((p, i) => `${x(i)},${y(p.valor)}`).join(' ')
  const fmt = (f: string) => `${f.slice(8)}/${f.slice(5, 7)}`

  const ultimo = puntos[puntos.length - 1]
  const ux = x(puntos.length - 1)
  const uy = y(ultimo.valor)
  // El texto dentro del SVG no pasa por el remapeo del modo claro: se mezcla hacia la tinta.
  const tinta = `color-mix(in srgb, ${color} 55%, var(--ui-ink))`

  return (
    <div>
      {/* máx arriba y mín abajo, cada uno en su extremo real del eje Y */}
      <div className="text-[9px] text-white/35">
        {t('ejercicio.graf.max', 'máx')} {Math.round(max)} {unidad}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          stroke="color-mix(in srgb, var(--ui-ink) 15%, transparent)"
        />
        {puntos.length > 1 && (
          <path d={`M ${x(0)},${H - PAD} L ${linea} ${ux},${H - PAD} Z`} fill={color} fillOpacity={0.12} />
        )}
        <polyline
          points={linea}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {puntos.map((p, i) => {
          const esUltimo = i === puntos.length - 1
          return (
            <circle
              key={`${p.fecha}-${i}`}
              cx={x(i)}
              cy={y(p.valor)}
              r={esUltimo ? 3.5 : 2.5}
              fill={esUltimo ? color : 'var(--ui-bg)'}
              stroke={color}
              strokeWidth="1.5"
            />
          )
        })}
        <text
          x={ux}
          y={uy < H / 2 ? uy + 15 : uy - 8}
          textAnchor="end"
          fontSize="10"
          fontWeight="600"
          fill={tinta}
        >
          {Math.round(ultimo.valor * 10) / 10} {unidad}
        </text>
      </svg>
      <div className="flex justify-between text-[9px] text-white/35">
        <span>
          {t('ejercicio.graf.min', 'mín')} {Math.round(min)} {unidad}
        </span>
        <span>
          {fmt(puntos[0].fecha)}
          {puntos.length > 1 && <> – {fmt(puntos[puntos.length - 1].fecha)}</>}
        </span>
      </div>
    </div>
  )
}

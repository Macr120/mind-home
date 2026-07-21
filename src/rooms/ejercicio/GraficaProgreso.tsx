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

  return (
    <div>
      <div className="flex justify-between text-[9px] text-white/35">
        <span>
          {t('ejercicio.graf.max', 'máx')} {Math.round(max)} {unidad}
        </span>
        <span>
          {t('ejercicio.graf.min', 'mín')} {Math.round(min)} {unidad}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
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
      </svg>
      <div className="flex justify-between text-[9px] text-white/35">
        <span>{fmt(puntos[0].fecha)}</span>
        {puntos.length > 1 && <span>{fmt(puntos[puntos.length - 1].fecha)}</span>}
      </div>
    </div>
  )
}

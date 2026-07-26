/**
 * Gráfica de área del cumplimiento (0–100 %). Sin librería de charts: SVG a mano,
 * como el resto de las gráficas de la casa.
 *
 * El eje Y es FIJO 0–100: es un porcentaje, no una magnitud que haya que
 * autoescalar, y con escala variable un mal mes se vería igual que uno bueno.
 */

const ANCHO = 320
const ALTO = 96
const MARGEN = 6

export interface PuntoGrafica {
  clave: string
  etiqueta: string
  /** 0–100. */
  valor: number
  /** Nada agendado ese día: corta la línea en vez de dibujar un 0 %. */
  vacio?: boolean
}

export function GraficaArea({ puntos, color }: { puntos: PuntoGrafica[]; color: string }) {
  if (puntos.filter((p) => !p.vacio).length < 2) return null

  const x = (i: number) => MARGEN + (i * (ANCHO - MARGEN * 2)) / Math.max(1, puntos.length - 1)
  const y = (v: number) => MARGEN + (1 - v / 100) * (ALTO - MARGEN * 2)
  const base = y(0)

  // Un hueco parte la serie: cada tramo continuo se pinta por separado.
  const tramos: [number, number][][] = []
  let actual: [number, number][] = []
  puntos.forEach((p, i) => {
    if (p.vacio) {
      if (actual.length > 0) tramos.push(actual)
      actual = []
      return
    }
    actual.push([x(i), y(p.valor)])
  })
  if (actual.length > 0) tramos.push(actual)

  const id = `cal-area-${color.replace('#', '')}`

  return (
    <div>
      {/* `preserveAspectRatio="none"` deja fijar la altura y ocupar todo el ancho;
          el trazo no se deforma porque va con `vectorEffect`. */}
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" className="h-24 w-full" role="img">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 50, 100].map((v) => (
          <line
            key={v}
            x1={MARGEN}
            x2={ANCHO - MARGEN}
            y1={y(v)}
            y2={y(v)}
            stroke="color-mix(in srgb, var(--ui-ink) 12%, transparent)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {tramos.map((tramo, k) => (
          <g key={k}>
            <path
              d={`M ${tramo[0][0]},${base} ${tramo.map(([px, py]) => `L ${px},${py}`).join(' ')} L ${tramo.at(-1)![0]},${base} Z`}
              fill={`url(#${id})`}
            />
            <polyline
              points={tramo.map(([px, py]) => `${px},${py}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>
      <div className="flex justify-between px-1 text-[9px] text-white/35">
        <span>{puntos[0].etiqueta}</span>
        <span>{puntos.at(-1)!.etiqueta}</span>
      </div>
    </div>
  )
}

import { extrasPerimetroSvg } from '../../house/formasLoseta'
import type { CeldaFormaLoseta, ExtraPerimetroSvg } from '../../house/formasLoseta'
import { GROSOR_ARISTA } from '../../house/planoGeometria'

/** Un trazo (línea diagonal o arco) del perímetro de forma, con hit opcional para el clic. */
export function TrazoPerimetroSvg({
  extra,
  stroke,
  strokeWidth = GROSOR_ARISTA,
  opacity = 1,
  onPointerDown,
}: {
  extra: ExtraPerimetroSvg
  stroke: string
  strokeWidth?: number
  opacity?: number
  onPointerDown?: (e: React.PointerEvent) => void
}) {
  const hit = onPointerDown
    ? { stroke: 'transparent', strokeWidth: 14, style: { cursor: 'pointer' }, onPointerDown }
    : null
  if (extra.tipo === 'linea') {
    return (
      <g>
        {hit && <line x1={extra.x1} y1={extra.y1} x2={extra.x2} y2={extra.y2} {...hit} />}
        <line
          x1={extra.x1}
          y1={extra.y1}
          x2={extra.x2}
          y2={extra.y2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={opacity}
          pointerEvents="none"
        />
      </g>
    )
  }
  return (
    <g>
      {hit && <path d={extra.d} fill="none" {...hit} />}
      <path
        d={extra.d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
        pointerEvents="none"
      />
    </g>
  )
}

/** Muro diagonal o curvo en el plano 2D (perímetro de forma no cuadrada). */
export function PerimetroFormaPlanoSvg({
  forma,
  x,
  y,
  w,
  h,
  stroke,
  strokeWidth = GROSOR_ARISTA,
  opacity = 1,
  onPointerDown,
}: {
  forma: CeldaFormaLoseta
  x: number
  y: number
  w: number
  h: number
  stroke: string
  strokeWidth?: number
  opacity?: number
  /** Si se pasa, el segmento (diagonal/arco) es clicable con un área ancha invisible. */
  onPointerDown?: (e: React.PointerEvent) => void
}) {
  const extras = extrasPerimetroSvg(forma, x, y, w, h)
  if (!extras.length) return null
  return (
    <>
      {extras.map((e, i) => (
        <TrazoPerimetroSvg
          key={`pf-${i}`}
          extra={e}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={opacity}
          onPointerDown={onPointerDown}
        />
      ))}
    </>
  )
}

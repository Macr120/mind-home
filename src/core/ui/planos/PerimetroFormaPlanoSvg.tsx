import { extrasPerimetroSvg } from '../../house/formasLoseta'
import type { CeldaFormaLoseta } from '../../house/formasLoseta'
import { GROSOR_ARISTA } from '../../house/planoGeometria'

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
}: {
  forma: CeldaFormaLoseta
  x: number
  y: number
  w: number
  h: number
  stroke: string
  strokeWidth?: number
  opacity?: number
}) {
  const extras = extrasPerimetroSvg(forma, x, y, w, h)
  if (!extras.length) return null
  return (
    <>
      {extras.map((e, i) =>
        e.tipo === 'linea' ? (
          <line
            key={`pf-${i}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={opacity}
            pointerEvents="none"
          />
        ) : (
          <path
            key={`pf-${i}`}
            d={e.d}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={opacity}
            pointerEvents="none"
          />
        ),
      )}
    </>
  )
}

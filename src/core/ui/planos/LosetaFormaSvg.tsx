import { useId } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { CeldaFormaLoseta } from '../../house/formasLoseta'
import {
  FORMA_LOSETA_DEFAULT,
  trianguloSvgPoints,
  cuartoCirculoSvgPath,
} from '../../house/formasLoseta'

type Props = {
  x: number
  y: number
  w: number
  h: number
  forma: CeldaFormaLoseta
  fill: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  rx?: number
  pointerEvents?: 'none' | 'auto' | undefined
  onPointerDown?: (ev: ReactPointerEvent) => void
}

/** Recorta cualquier forma al rectángulo exacto de la celda. */
function CeldaClip({
  x,
  y,
  w,
  h,
  clipId,
  children,
}: {
  x: number
  y: number
  w: number
  h: number
  clipId: string
  children: React.ReactNode
}) {
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{children}</g>
    </>
  )
}

/** Celda del plano con forma cuadrada, triangular o circular. */
export function LosetaFormaSvg({
  x,
  y,
  w,
  h,
  forma,
  fill,
  stroke,
  strokeWidth = 1,
  opacity = 1,
  rx = 3,
  pointerEvents,
  onPointerDown,
}: Props) {
  const f = forma ?? FORMA_LOSETA_DEFAULT
  const pad = 1
  const ix = x + pad
  const iy = y + pad
  const iw = w - pad * 2
  const ih = h - pad * 2
  const clipId = useId().replace(/:/g, '')

  if (f.forma === 'triangular') {
    return (
      <CeldaClip x={ix} y={iy} w={iw} h={ih} clipId={clipId}>
        <polygon
          points={trianguloSvgPoints(ix, iy, iw, ih, f.rotacion)}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={opacity}
          pointerEvents={pointerEvents}
          onPointerDown={onPointerDown}
        />
      </CeldaClip>
    )
  }

  if (f.forma === 'circular') {
    return (
      <CeldaClip x={ix} y={iy} w={iw} h={ih} clipId={clipId}>
        <path
          d={cuartoCirculoSvgPath(ix, iy, iw, ih, f.rotacion)}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={opacity}
          pointerEvents={pointerEvents}
          onPointerDown={onPointerDown}
        />
      </CeldaClip>
    )
  }

  return (
    <rect
      x={ix}
      y={iy}
      width={iw}
      height={ih}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={opacity}
      rx={rx}
      pointerEvents={pointerEvents}
      onPointerDown={onPointerDown}
    />
  )
}

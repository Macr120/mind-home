import { useId } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { CeldaFormaLoseta } from '../../house/formasLoseta'
import {
  FORMA_LOSETA_DEFAULT,
  SUBQ_OFF,
  trianguloSvgPoints,
  cuartoCirculoSvgPath,
} from '../../house/formasLoseta'

type Props = {
  x: number
  y: number
  w: number
  h: number
  forma: CeldaFormaLoseta
  /** Recortes finos por cuadrante (NO,NE,SO,SE): la celda se pinta en 4 mini-losetas. */
  subformas?: (CeldaFormaLoseta | undefined)[] | null
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

/** Una pieza (celda entera o mini-cuadrante) con su forma, sin clip propio. */
function PiezaLosetaSvg({
  x,
  y,
  w,
  h,
  forma,
  fill,
  stroke,
  strokeWidth,
  opacity,
  rx,
  pointerEvents,
  onPointerDown,
}: {
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
}) {
  if (forma.forma === 'triangular') {
    return (
      <polygon
        points={trianguloSvgPoints(x, y, w, h, forma.rotacion)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
        pointerEvents={pointerEvents}
        onPointerDown={onPointerDown}
      />
    )
  }
  if (forma.forma === 'circular') {
    return (
      <path
        d={cuartoCirculoSvgPath(x, y, w, h, forma.rotacion)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
        pointerEvents={pointerEvents}
        onPointerDown={onPointerDown}
      />
    )
  }
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
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

/** Celda del plano con forma cuadrada, triangular, circular o con recortes finos. */
export function LosetaFormaSvg({
  x,
  y,
  w,
  h,
  forma,
  subformas,
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

  // Recortes finos: 4 mini-losetas (las sin subforma, cuadradas) bajo un clip de celda.
  if (subformas) {
    return (
      <CeldaClip x={ix} y={iy} w={iw} h={ih} clipId={clipId}>
        {SUBQ_OFF.map((q, i) => (
          <PiezaLosetaSvg
            key={i}
            x={ix + (q.qc ? iw / 2 : 0)}
            y={iy + (q.qr ? ih / 2 : 0)}
            w={iw / 2}
            h={ih / 2}
            forma={subformas[i] ?? FORMA_LOSETA_DEFAULT}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
            rx={1}
            pointerEvents={pointerEvents}
            onPointerDown={onPointerDown}
          />
        ))}
      </CeldaClip>
    )
  }

  if (f.forma === 'triangular' || f.forma === 'circular') {
    return (
      <CeldaClip x={ix} y={iy} w={iw} h={ih} clipId={clipId}>
        <PiezaLosetaSvg
          x={ix}
          y={iy}
          w={iw}
          h={ih}
          forma={f}
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

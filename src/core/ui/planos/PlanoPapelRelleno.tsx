import { useId } from 'react'
import { getPisoTipo } from '../../house/pisos'
import { rellenoPapelPlano } from '../../house/mapaSuperficie'
import { PLANO_PAPEL } from '../../house/planoGeometria'

type Relleno = ReturnType<typeof rellenoPapelPlano>

/** Área de papel del croquis con color, textura o imagen. */
export function PlanoPapelRelleno({
  x,
  y,
  w,
  h,
  borde,
  relleno,
}: {
  x: number
  y: number
  w: number
  h: number
  borde: string
  relleno: Relleno
}) {
  const pid = useId().replace(/:/g, '')
  const tile = 52

  let fill =
    relleno.tipo === 'ninguno'
      ? PLANO_PAPEL
      : relleno.color
  let defs: React.ReactNode = null
  const sinRelleno = relleno.tipo === 'ninguno'

  if (relleno.tipo === 'imagen' && relleno.imagenUrl) {
    defs = (
      <defs>
        <pattern id={pid} patternUnits="userSpaceOnUse" width={w} height={h}>
          <image href={relleno.imagenUrl} x={0} y={0} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
        </pattern>
      </defs>
    )
    fill = `url(#${pid})`
  } else if (relleno.tipo === 'textura' && relleno.textura) {
    const piso = getPisoTipo(relleno.textura)
    const url = piso?.textura ? `/textures/floors/${piso.textura}_color.jpg` : null
    if (url) {
      defs = (
        <defs>
          <pattern id={pid} patternUnits="userSpaceOnUse" width={tile} height={tile}>
            <image href={url} width={tile} height={tile} preserveAspectRatio="xMidYMid slice" />
          </pattern>
        </defs>
      )
      fill = `url(#${pid})`
    }
  }

  return (
    <>
      {defs}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={fill}
        fillOpacity={sinRelleno ? 0.22 : 1}
        stroke={borde}
        strokeWidth={2}
        strokeDasharray={sinRelleno ? '6 4' : undefined}
        rx={4}
      />
    </>
  )
}

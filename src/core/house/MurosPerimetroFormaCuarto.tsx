import { useMemo } from 'react'
import type { Footprint } from './walls'
import { tileLocalEnCuarto, type Cell } from './walls'
import { claveCeldaOff, formaEnCelda, type FormasCeldaMap } from './formasLoseta'
import { perimetroFormaCelda } from './murosPerimetroLoseta'
import { MurosExtraCelda } from './MuroPerimetroForma'

/** Muros diagonales y curvos del perímetro de formas de piso (por celda del footprint). */
export function MurosPerimetroFormaCuarto({
  anchor,
  fp,
  formasCelda,
  baseColor,
  extColor,
  roughness,
  extRough,
  metalness,
  atenuado,
}: {
  anchor: Cell
  fp: Footprint
  formasCelda?: FormasCeldaMap
  baseColor: string
  extColor: string
  roughness: number
  extRough: number
  metalness: number
  atenuado: boolean
}) {
  const celdas = useMemo(() => {
    const out: { extras: NonNullable<ReturnType<typeof perimetroFormaCelda>> }[] = []
    for (const off of fp) {
      const forma = formaEnCelda(formasCelda, claveCeldaOff(off.col, off.row))
      const [lx, lz] = tileLocalEnCuarto(anchor, off, fp)
      const per = perimetroFormaCelda(forma, lx, lz)
      if (per) out.push({ extras: per })
    }
    return out
  }, [anchor, fp, formasCelda])

  if (!celdas.length) return null

  return (
    <>
      {celdas.map((c, i) => (
        <MurosExtraCelda
          key={`mpf-${i}`}
          extras={c.extras.extras}
          color={baseColor}
          extColor={extColor}
          roughness={roughness}
          extRough={extRough}
          metalness={metalness}
          atenuado={atenuado}
        />
      ))}
    </>
  )
}

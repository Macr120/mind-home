import type { SideKey, Seg } from './walls'
import { HALF, SIZE } from './walls'
import type { CeldaFormaLoseta } from './formasLoseta'
import { esFormaCuadrada } from './formasLoseta'

/** Esquinas de la celda en coords locales (centro de celda = 0,0). */
function esquinasCelda(lx: number, lz: number) {
  const h = HALF
  return {
    nw: { x: lx - h, z: lz - h },
    ne: { x: lx + h, z: lz - h },
    sw: { x: lx - h, z: lz + h },
    se: { x: lx + h, z: lz + h },
  }
}

export interface MuroDiagonalPerimetro {
  tipo: 'diagonal'
  x1: number
  z1: number
  x2: number
  z2: number
}

export interface MuroArcoPerimetro {
  tipo: 'arco'
  cx: number
  cz: number
  r: number
  a0: number
  a1: number
}

export type MuroExtraPerimetro = MuroDiagonalPerimetro | MuroArcoPerimetro

export interface PerimetroFormaCelda {
  /** Lados de rejilla (N/S/E/O) que conservan muro recto. */
  lados: Set<SideKey>
  extras: MuroExtraPerimetro[]
}

function arco(
  cx: number,
  cz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
): MuroArcoPerimetro {
  return {
    tipo: 'arco',
    cx,
    cz,
    r: SIZE,
    a0: Math.atan2(z1 - cz, x1 - cx),
    a1: Math.atan2(z2 - cz, x2 - cx),
  }
}

function diag(x1: number, z1: number, x2: number, z2: number): MuroDiagonalPerimetro {
  return { tipo: 'diagonal', x1, z1, x2, z2 }
}

/** Perímetro de muros para una loseta con forma (coords locales de la celda). */
export function perimetroFormaCelda(
  forma: CeldaFormaLoseta,
  lx: number,
  lz: number,
): PerimetroFormaCelda | null {
  if (esFormaCuadrada(forma)) return null
  const c = esquinasCelda(lx, lz)
  const { nw, ne, sw, se } = c

  if (forma.forma === 'triangular') {
    switch (forma.rotacion) {
      case 90:
        return {
          lados: new Set<SideKey>(['N', 'O']),
          extras: [diag(ne.x, ne.z, sw.x, sw.z)],
        }
      case 180:
        return {
          lados: new Set<SideKey>(['N', 'E']),
          extras: [diag(se.x, se.z, nw.x, nw.z)],
        }
      case 270:
        return {
          lados: new Set<SideKey>(['S', 'E']),
          extras: [diag(sw.x, sw.z, ne.x, ne.z)],
        }
      default:
        return {
          lados: new Set<SideKey>(['O', 'S']),
          extras: [diag(nw.x, nw.z, se.x, se.z)],
        }
    }
  }

  // Cuarto de círculo
  switch (forma.rotacion) {
    case 90:
      return {
        lados: new Set<SideKey>(['E', 'S']),
        extras: [arco(se.x, se.z, sw.x, sw.z, ne.x, ne.z)],
      }
    case 180:
      return {
        lados: new Set<SideKey>(['O', 'S']),
        extras: [arco(sw.x, sw.z, se.x, se.z, nw.x, nw.z)],
      }
    case 270:
      return {
        lados: new Set<SideKey>(['N', 'O']),
        extras: [arco(nw.x, nw.z, ne.x, ne.z, sw.x, sw.z)],
      }
    default:
      return {
        lados: new Set<SideKey>(['N', 'E']),
        extras: [arco(ne.x, ne.z, se.x, se.z, nw.x, nw.z)],
      }
  }
}

/** ¿Conservar el muro recto de rejilla en este lado de la celda? */
export function ladoGrillaActivo(forma: CeldaFormaLoseta | undefined, lado: SideKey): boolean {
  if (!forma || esFormaCuadrada(forma)) return true
  const p = perimetroFormaCelda(forma, 0, 0)
  return p?.lados.has(lado) ?? true
}

/** Filtra segmentos de muro que no pertenecen al perímetro de la forma. */
export function filtrarSegmentosPorForma(
  segs: Seg[],
  formasPorOff: Record<string, CeldaFormaLoseta | undefined>,
): Seg[] {
  return segs.filter((s) => {
    if (!s.clave) return true
    const parts = s.clave.split(',')
    if (parts.length < 3) return true
    const offKey = `${parts[0]},${parts[1]}`
    const lado = parts[2] as SideKey
    return ladoGrillaActivo(formasPorOff[offKey], lado)
  })
}

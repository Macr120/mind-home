import type { SideKey, Seg } from './walls'
import { HALF, SIZE } from './walls'
import type { CeldaFormaLoseta, FormasCeldaMap } from './formasLoseta'
import {
  esFormaCuadrada,
  claveCeldaOff,
  formaEnCelda,
  subformasDeCelda,
  arcoCuartoCirculoLocal,
  SUBQ_OFF,
  extrasPerimetroSvg,
  type ExtraPerimetroSvg,
} from './formasLoseta'

/** Esquinas de la celda en coords locales (centro de celda = 0,0). */
function esquinasCelda(lx: number, lz: number, h = HALF) {
  return {
    nw: { x: lx - h, z: lz - h },
    ne: { x: lx + h, z: lz - h },
    sw: { x: lx - h, z: lz + h },
    se: { x: lx + h, z: lz + h },
  }
}

interface MuroDiagonalPerimetro {
  tipo: 'diagonal'
  x1: number
  z1: number
  x2: number
  z2: number
}

interface MuroArcoPerimetro {
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
  r: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
): MuroArcoPerimetro {
  return {
    tipo: 'arco',
    cx,
    cz,
    r,
    a0: Math.atan2(z1 - cz, x1 - cx),
    a1: Math.atan2(z2 - cz, x2 - cx),
  }
}

function diag(x1: number, z1: number, x2: number, z2: number): MuroDiagonalPerimetro {
  return { tipo: 'diagonal', x1, z1, x2, z2 }
}

/**
 * Perímetro de muros para una loseta con forma (coords locales de la celda).
 * `h` = media loseta (HALF para la celda entera; HALF/2 para un cuadrante fino).
 */
export function perimetroFormaCelda(
  forma: CeldaFormaLoseta,
  lx: number,
  lz: number,
  h = HALF,
): PerimetroFormaCelda | null {
  if (esFormaCuadrada(forma)) return null
  const c = esquinasCelda(lx, lz, h)
  const { nw, ne, sw, se } = c
  const r = h * 2

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
        extras: [arco(se.x, se.z, r, sw.x, sw.z, ne.x, ne.z)],
      }
    case 180:
      return {
        lados: new Set<SideKey>(['O', 'S']),
        extras: [arco(sw.x, sw.z, r, se.x, se.z, nw.x, nw.z)],
      }
    case 270:
      return {
        lados: new Set<SideKey>(['N', 'O']),
        extras: [arco(nw.x, nw.z, r, ne.x, ne.z, sw.x, sw.z)],
      }
    default:
      return {
        lados: new Set<SideKey>(['N', 'E']),
        extras: [arco(ne.x, ne.z, r, se.x, se.z, nw.x, nw.z)],
      }
  }
}

/** ¿Conservar el muro recto de rejilla en este lado de la celda? */
export function ladoGrillaActivo(forma: CeldaFormaLoseta | undefined, lado: SideKey): boolean {
  if (!forma || esFormaCuadrada(forma)) return true
  const p = perimetroFormaCelda(forma, 0, 0)
  return p?.lados.has(lado) ?? true
}

// ── Subformas finas (cuadrantes ½×½) ──────────────────────────────────────────

/** Índices de los 2 cuadrantes (NO,NE,SO,SE) adyacentes a cada lado, en orden neg→pos. */
const CUADRANTES_LADO: Record<SideKey, [number, number]> = {
  N: [0, 1],
  S: [2, 3],
  O: [0, 2],
  E: [1, 3],
}

/** ¿La subforma del cuadrante consume su mini-lado `lado` (borde de la celda)? */
function subformaConsumeLado(sub: CeldaFormaLoseta | undefined, lado: SideKey): boolean {
  if (!sub || esFormaCuadrada(sub)) return false
  return !ladoGrillaActivo(sub, lado)
}

/** Mitades consumidas [neg, pos] del lado de una celda con subformas. */
export function mitadesConsumidasLado(
  subformas: (CeldaFormaLoseta | undefined)[],
  lado: SideKey,
): [boolean, boolean] {
  const [a, b] = CUADRANTES_LADO[lado]
  return [subformaConsumeLado(subformas[a], lado), subformaConsumeLado(subformas[b], lado)]
}

/**
 * ¿El lado de la celda conserva su muro recto COMPLETO? Considera la forma entera y
 * las subformas finas: cualquier mitad consumida desactiva el muro de rejilla (la
 * silueta la dibuja MurosPerimetroFormaCuarto: recorte + mitades rectas restantes).
 */
export function ladoGrillaActivoEnMapa(
  map: FormasCeldaMap | undefined,
  offCol: number,
  offRow: number,
  lado: SideKey,
): boolean {
  if (!ladoGrillaActivo(formaEnCelda(map, claveCeldaOff(offCol, offRow)), lado)) return false
  const sub = subformasDeCelda(map, offCol, offRow)
  if (!sub) return true
  const [n, p] = mitadesConsumidasLado(sub, lado)
  return !n && !p
}

/** Un tramo del perímetro fino con el lado del que toma estilo/puerta (null = interior). */
export interface ItemPerimetroCelda {
  extras: MuroExtraPerimetro[]
  ladoRep: SideKey | null
  /** Mitad recta remanente de un lado: toma estilo del lado pero nunca lleva hueco. */
  esMitad?: boolean
  /**
   * Cuadrante (0..3 = NO,NE,SO,SE) del recorte: cada recorte es un MURO propio con su
   * arista virtual (off en el centro de la sub-celda), seleccionable por separado.
   */
  cuadrante?: number
}

const SIDES: SideKey[] = ['N', 'S', 'E', 'O']

/** ¿El cuadrante i toca el borde `lado` de la celda? */
function cuadranteEnBorde(i: number, lado: SideKey): boolean {
  const q = SUBQ_OFF[i]
  if (lado === 'N') return q.qr === 0
  if (lado === 'S') return q.qr === 0.5
  if (lado === 'O') return q.qc === 0
  return q.qc === 0.5
}

/** Centro local (respecto al centro de la celda) del cuadrante i. */
function centroCuadrante(i: number, lx: number, lz: number): { x: number; z: number } {
  const q = SUBQ_OFF[i]
  return {
    x: lx + (q.qc === 0 ? -SIZE / 4 : SIZE / 4),
    z: lz + (q.qr === 0 ? -SIZE / 4 : SIZE / 4),
  }
}

/**
 * Muros del perímetro FINO de una celda con subformas (coords locales de la celda):
 * el recorte de cada cuadrante (mini-diagonal o mini-arco de radio ½ celda) y las
 * mitades rectas que el recorte deja vivas en los lados afectados. `ladosExternos`
 * limita las mitades a lados con arista real (sin muros dentro del propio cuarto).
 */
export function itemsPerimetroSubformas(
  subformas: (CeldaFormaLoseta | undefined)[],
  lx: number,
  lz: number,
  ladosExternos?: Set<SideKey>,
): ItemPerimetroCelda[] {
  const items: ItemPerimetroCelda[] = []

  subformas.forEach((sub, i) => {
    if (!sub || esFormaCuadrada(sub)) return
    const c = centroCuadrante(i, lx, lz)
    let extras: MuroExtraPerimetro[]
    if (sub.forma === 'circular') {
      const a = arcoCuartoCirculoLocal(sub.rotacion, SIZE / 2)
      extras = [{ tipo: 'arco', cx: c.x + a.cx, cz: c.z + a.cz, r: a.r, a0: a.a0, a1: a.a1 }]
    } else {
      extras = perimetroFormaCelda(sub, c.x, c.z, HALF / 2)?.extras ?? []
    }
    // Lado representativo: el primer borde de la celda que el recorte consume.
    const ladoRep =
      SIDES.find((s) => cuadranteEnBorde(i, s) && subformaConsumeLado(sub, s)) ?? null
    items.push({ extras, ladoRep, cuadrante: i })
  })

  // Mitades rectas conservadas de los lados con alguna mitad consumida.
  for (const lado of SIDES) {
    if (ladosExternos && !ladosExternos.has(lado)) continue
    const [negCons, posCons] = mitadesConsumidasLado(subformas, lado)
    if (!negCons && !posCons) continue
    const mitades: MuroDiagonalPerimetro[] = []
    if (lado === 'N' || lado === 'S') {
      const z = lado === 'N' ? lz - HALF : lz + HALF
      if (!negCons) mitades.push(diag(lx - HALF, z, lx, z))
      if (!posCons) mitades.push(diag(lx, z, lx + HALF, z))
    } else {
      const x = lado === 'O' ? lx - HALF : lx + HALF
      if (!negCons) mitades.push(diag(x, lz - HALF, x, lz))
      if (!posCons) mitades.push(diag(x, lz, x, lz + HALF))
    }
    if (mitades.length) items.push({ extras: mitades, ladoRep: lado, esMitad: true })
  }

  return items
}

/** Extra 2D del croquis con su lado representativo (para el clic de puerta/ventana). */
export interface ExtraPerimetroSvgConLado {
  extra: ExtraPerimetroSvg
  ladoRep: SideKey | null
  /** Cuadrante (0..3) si el trazo es un recorte fino (muro propio); las mitades no lo llevan. */
  cuadrante?: number
}

/**
 * Trazos del perímetro fino en el plano 2D: recortes de cada cuadrante y mitades
 * rectas conservadas de los lados afectados (mismas reglas que el 3D).
 */
export function extrasPerimetroSubformasSvg(
  subformas: (CeldaFormaLoseta | undefined)[],
  x: number,
  y: number,
  w: number,
  h: number,
  ladosExternos?: Set<SideKey>,
): ExtraPerimetroSvgConLado[] {
  const out: ExtraPerimetroSvgConLado[] = []

  subformas.forEach((sub, i) => {
    if (!sub || esFormaCuadrada(sub)) return
    const q = SUBQ_OFF[i]
    const sx = x + q.qc * w
    const sy = y + q.qr * h
    const ladoRep =
      SIDES.find((s) => cuadranteEnBorde(i, s) && subformaConsumeLado(sub, s)) ?? null
    for (const extra of extrasPerimetroSvg(sub, sx, sy, w / 2, h / 2))
      out.push({ extra, ladoRep, cuadrante: i })
  })

  for (const lado of SIDES) {
    if (ladosExternos && !ladosExternos.has(lado)) continue
    const [negCons, posCons] = mitadesConsumidasLado(subformas, lado)
    if (!negCons && !posCons) continue
    const linea = (x1: number, y1: number, x2: number, y2: number): ExtraPerimetroSvg => ({
      tipo: 'linea',
      x1,
      y1,
      x2,
      y2,
    })
    if (lado === 'N' || lado === 'S') {
      const ly = lado === 'N' ? y + 1 : y + h - 1
      if (!negCons) out.push({ extra: linea(x + 1, ly, x + w / 2, ly), ladoRep: lado })
      if (!posCons) out.push({ extra: linea(x + w / 2, ly, x + w - 1, ly), ladoRep: lado })
    } else {
      const lxp = lado === 'O' ? x + 1 : x + w - 1
      if (!negCons) out.push({ extra: linea(lxp, y + 1, lxp, y + h / 2), ladoRep: lado })
      if (!posCons) out.push({ extra: linea(lxp, y + h / 2, lxp, y + h - 1), ladoRep: lado })
    }
  }

  return out
}

/** Filtra segmentos de muro que no pertenecen al perímetro de la forma o su recorte fino. */
export function filtrarSegmentosPorForma(
  segs: Seg[],
  formasPorOff: Record<string, CeldaFormaLoseta | undefined>,
): Seg[] {
  return segs.filter((s) => {
    if (!s.clave) return true
    const parts = s.clave.split(',')
    if (parts.length < 3) return true
    const lado = parts[2] as SideKey
    return ladoGrillaActivoEnMapa(
      formasPorOff as FormasCeldaMap,
      Number(parts[0]),
      Number(parts[1]),
      lado,
    )
  })
}

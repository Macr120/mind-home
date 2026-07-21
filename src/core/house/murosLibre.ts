import { SIZE, SPACING } from './walls'
import { verticesTrianguloXZ, centroCirculoCelda } from './formasLoseta'
import type { MuroLibre } from '../data/db'
import { primeraRotMuroForma, siguienteRotMuroForma } from '../data/repository'

/** Segmento de muro de forma (triángulo/círculo), en coords locales de celda centradas. */
interface SegLocal {
  ax: number
  az: number
  bx: number
  bz: number
}

/** Segmento de muro en coordenadas de mundo (X/Z). */
export interface SegMundo {
  x1: number
  z1: number
  x2: number
  z2: number
}

/** Subdivisiones del arco circular (más = más liso). */
const ARCO_SEGMENTOS = 8

/**
 * Segmentos del muro de FORMA: triangular = solo la diagonal (hipotenusa);
 * circular = solo el arco (90°). Coordenadas centradas en la celda.
 */
function segmentosFormaMuro(forma: 'triangular' | 'circular', rotacion: number): SegLocal[] {
  const rot = rotacion as 0 | 90 | 180 | 270

  if (forma === 'triangular') {
    const p = verticesTrianguloXZ({ forma: 'triangular', rotacion: rot }, SIZE)
    // El primer vértice es el ángulo recto; la hipotenusa une los otros dos.
    return [{ ax: p[1].x, az: p[1].z, bx: p[2].x, bz: p[2].z }]
  }

  const c = centroCirculoCelda({ forma: 'circular', rotacion: rot }, SIZE)
  // Extremos del arco: las dos esquinas adyacentes al centro (comparten un eje con él).
  const p0 = { x: -c.x, z: c.z }
  const p1 = { x: c.x, z: -c.z }
  const a0 = Math.atan2(p0.z - c.z, p0.x - c.x)
  const a1 = Math.atan2(p1.z - c.z, p1.x - c.x)
  let da = a1 - a0
  while (da > Math.PI) da -= 2 * Math.PI
  while (da <= -Math.PI) da += 2 * Math.PI
  const segs: SegLocal[] = []
  let prev = p0
  for (let i = 1; i <= ARCO_SEGMENTOS; i++) {
    const a = a0 + (da * i) / ARCO_SEGMENTOS
    const x = c.x + SIZE * Math.cos(a)
    const z = c.z + SIZE * Math.sin(a)
    segs.push({ ax: prev.x, az: prev.z, bx: x, bz: z })
    prev = { x, z }
  }
  return segs
}

/**
 * Lado (arista) más cercano a un punto del mundo, enganchado a ½ celda (para colocar en 3D).
 * Compara directamente la línea vertical y la línea horizontal más próximas al punto (en la
 * misma escala de esquina que `segmentosMundoMuroLibre`) y devuelve la más cercana; las
 * líneas resultan en índices ½, así los muros se alinean con cuartos a media rejilla.
 * Con `orientForzada` se ignora la proximidad y se coloca siempre en horizontal o vertical.
 */
export function aristaMasCercana(
  x: number,
  z: number,
  gridCols: number,
  gridRows: number,
  orientForzada?: 'h' | 'v',
): { orient: 'h' | 'v'; col: number; row: number } {
  // Coordenada continua en escala de esquina (entero = línea de rejilla), inversa de
  // `segmentosMundoMuroLibre`: x = (col - gridCols/2)·SPACING.
  const rawCol = x / SPACING + gridCols / 2
  const rawRow = z / SPACING + gridRows / 2
  const vCol = Math.round(rawCol * 2) / 2
  const hRow = Math.round(rawRow * 2) / 2
  const distV = Math.abs(rawCol - vCol)
  const distH = Math.abs(rawRow - hRow)
  const orient = orientForzada ?? (distV <= distH ? 'v' : 'h')
  if (orient === 'v') return { orient: 'v', col: vCol, row: Math.floor(rawRow) }
  return { orient: 'h', col: Math.floor(rawCol), row: hRow }
}

/** Centro de la celda (col,row) en mundo, mismo criterio que cellToWorld. */
export function centroCeldaMundo(
  col: number,
  row: number,
  gridCols: number,
  gridRows: number,
): { x: number; z: number } {
  return {
    x: (col - (gridCols - 1) / 2) * SPACING,
    z: (row - (gridRows - 1) / 2) * SPACING,
  }
}

/** Arco (90°) del muro circular en coords locales de celda: centro, radio y ángulos. */
export function arcoCircularMuroLocal(rotacion: number): {
  cx: number
  cz: number
  r: number
  a0: number
  a1: number
} {
  const c = centroCirculoCelda({ forma: 'circular', rotacion: rotacion as 0 | 90 | 180 | 270 }, SIZE)
  const p0 = { x: -c.x, z: c.z }
  const p1 = { x: c.x, z: -c.z }
  const a0 = Math.atan2(p0.z - c.z, p0.x - c.x)
  const a1raw = Math.atan2(p1.z - c.z, p1.x - c.x)
  let da = a1raw - a0
  while (da > Math.PI) da -= 2 * Math.PI
  while (da <= -Math.PI) da += 2 * Math.PI
  return { cx: c.x, cz: c.z, r: SIZE, a0, a1: a0 + da }
}

/**
 * Segmentos en coordenadas de mundo de un muro libre:
 * - arista: el lado recto de la rejilla (de esquina a esquina).
 * - forma: la diagonal (triángulo) o los tramos del arco (círculo).
 * Cada tramo se dibuja como un muro recto orientado (reutiliza `MuroSegment`).
 */
/** Geometría de la abertura (puerta) de un muro libre, en coordenadas de mundo. */
export interface AberturaMundo {
  /** Centro de la abertura (sobre la pared, a la altura del piso). */
  cx: number
  cz: number
  /** Dirección unitaria a lo largo de la pared. */
  dirx: number
  dirz: number
  /** Ancho de la abertura en mundo. */
  ancho: number
  /** Normal de la pared (hacia donde abre la hoja). */
  nx: number
  nz: number
}

/**
 * Posición y orientación de la abertura de un muro libre (para la hoja de puerta).
 * Recta/diagonal: centrada sobre el segmento; circular: cuerda del arco en el centro.
 */
export function aberturaMuroLibreMundo(
  m: MuroLibre,
  gridCols: number,
  gridRows: number,
): AberturaMundo | null {
  const posX = m.ventPosX ?? 0
  const anchoF = m.puerta ? (m.puertaAncho ?? 0.5) : (m.ventAncho ?? 0.55)
  if (m.clase === 'forma' && m.forma === 'circular') {
    const cellC = centroCeldaMundo(m.col, m.row, gridCols, gridRows)
    const arc = arcoCircularMuroLocal(m.rotacion ?? 0)
    const acx = cellC.x + arc.cx
    const acz = cellC.z + arc.cz
    const span = arc.a1 - arc.a0
    const aHalf = anchoF / 2
    const uc = 0.5 + posX * (0.5 - aHalf)
    const angC = arc.a0 + span * uc
    const ang0 = arc.a0 + span * (uc - aHalf)
    const ang1 = arc.a0 + span * (uc + aHalf)
    const ax = acx + arc.r * Math.cos(ang0)
    const az = acz + arc.r * Math.sin(ang0)
    const bx = acx + arc.r * Math.cos(ang1)
    const bz = acz + arc.r * Math.sin(ang1)
    const dx = bx - ax
    const dz = bz - az
    const L = Math.hypot(dx, dz) || 1
    return {
      cx: acx + arc.r * Math.cos(angC),
      cz: acz + arc.r * Math.sin(angC),
      dirx: dx / L,
      dirz: dz / L,
      ancho: L,
      nx: Math.cos(angC),
      nz: Math.sin(angC),
    }
  }
  const segs = segmentosMundoMuroLibre(m, gridCols, gridRows)
  if (!segs.length) return null
  const s = segs[0]
  const dx = s.x2 - s.x1
  const dz = s.z2 - s.z1
  const L = Math.hypot(dx, dz) || 1
  const dirx = dx / L
  const dirz = dz / L
  const width = anchoF * L
  const margen = Math.max(0, (L - width) / 2)
  return {
    cx: (s.x1 + s.x2) / 2 + dirx * posX * margen,
    cz: (s.z1 + s.z2) / 2 + dirz * posX * margen,
    dirx,
    dirz,
    ancho: width,
    nx: -dirz,
    nz: dirx,
  }
}

export function segmentosMundoMuroLibre(
  m: Pick<MuroLibre, 'clase' | 'orient' | 'col' | 'row' | 'forma'> & { rotacion?: number },
  gridCols: number,
  gridRows: number,
): SegMundo[] {
  if (m.clase === 'arista' && m.orient) {
    // Esquina de rejilla (i,j) en mundo: ((i - cols/2)·S, (j - rows/2)·S).
    const x = (m.col - gridCols / 2) * SPACING
    const z = (m.row - gridRows / 2) * SPACING
    if (m.orient === 'v') return [{ x1: x, z1: z, x2: x, z2: z + SPACING }]
    return [{ x1: x, z1: z, x2: x + SPACING, z2: z }]
  }
  if (m.clase === 'forma' && m.forma) {
    // Centro de celda (mismo criterio que cellToWorld).
    const cx = (m.col - (gridCols - 1) / 2) * SPACING
    const cz = (m.row - (gridRows - 1) / 2) * SPACING
    return segmentosFormaMuro(m.forma, m.rotacion ?? 0).map((s) => ({
      x1: cx + s.ax,
      z1: cz + s.az,
      x2: cx + s.bx,
      z2: cz + s.bz,
    }))
  }
  return []
}

type MuroSimple = Pick<MuroLibre, 'nivel' | 'clase' | 'orient' | 'col' | 'row' | 'forma' | 'rotacion'>

/** Predicción/fantasma del clic sobre un lado (arista) recto: existe → lo borraría; si no, lo colocaría. */
export function objetivoMuroArista(
  lista: MuroSimple[],
  nivel: number,
  a: { orient: 'h' | 'v'; col: number; row: number },
): { clase: 'arista'; orient: 'h' | 'v'; col: number; row: number; borra: boolean } {
  const ex = lista.some(
    (m) => m.nivel === nivel && m.clase === 'arista' && m.orient === a.orient && m.col === a.col && m.row === a.row,
  )
  return { clase: 'arista', orient: a.orient, col: a.col, row: a.row, borra: ex }
}

/**
 * Predicción/fantasma del clic sobre una forma (triángulo/círculo): celda libre u otra
 * forma → coloca/convierte a la variante inicial; misma forma → avanza a la siguiente
 * variante del ciclo; tras la última, lo borraría. Comparte lógica con `ciclarMuroFormaLibre`
 * (repository.ts) para que el fantasma prediga exactamente lo que hará el clic.
 */
export function objetivoMuroForma(
  lista: MuroSimple[],
  nivel: number,
  celda: { col: number; row: number },
  forma: 'triangular' | 'circular',
  rotForma: 0 | 90 | 180 | 270,
): { clase: 'forma'; col: number; row: number; forma: 'triangular' | 'circular'; rotacion: 0 | 90 | 180 | 270; borra: boolean } {
  const ex = lista.find((m) => m.nivel === nivel && m.clase === 'forma' && m.col === celda.col && m.row === celda.row)
  if (!ex || (ex.forma ?? 'triangular') !== forma) {
    return { clase: 'forma', col: celda.col, row: celda.row, forma, rotacion: primeraRotMuroForma(forma, rotForma), borra: false }
  }
  const sig = siguienteRotMuroForma(forma, ex.rotacion ?? 0)
  return { clase: 'forma', col: celda.col, row: celda.row, forma, rotacion: sig ?? ex.rotacion ?? 0, borra: sig == null }
}

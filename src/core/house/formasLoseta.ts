import * as THREE from 'three'

/** Forma visual de una loseta de piso dentro de un cuarto. */
export type FormaLoseta = 'cuadrado' | 'triangular' | 'circular'

export interface CeldaFormaLoseta {
  forma: FormaLoseta
  /** Grados: 0, 90, 180 o 270 (doble clic / repetir aplica +90°). */
  rotacion: 0 | 90 | 180 | 270
}

export type FormasCeldaMap = Record<string, CeldaFormaLoseta>

export const FORMA_LOSETA_DEFAULT: CeldaFormaLoseta = { forma: 'cuadrado', rotacion: 0 }

export function claveCeldaAbs(col: number, row: number): string {
  return `${Math.round(col)},${Math.round(row)}`
}

export function claveCeldaOff(offCol: number, offRow: number): string {
  return `${offCol},${offRow}`
}

export function formaEnCelda(
  map: FormasCeldaMap | undefined,
  clave: string,
): CeldaFormaLoseta {
  return map?.[clave] ?? FORMA_LOSETA_DEFAULT
}

/** Convierte formas con claves absolutas (`col,row`) a claves por offset desde el ancla. */
export function formasAbsAOff(
  formasAbs: FormasCeldaMap | undefined,
  anchor: { col: number; row: number },
): FormasCeldaMap | undefined {
  if (!formasAbs) return undefined
  const out: FormasCeldaMap = {}
  for (const [k, v] of Object.entries(formasAbs)) {
    const [c, r] = k.split(',').map(Number)
    out[claveCeldaOff(c - anchor.col, r - anchor.row)] = v
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** Aplica forma; si ya tenía la misma, rota 90°. */
export function siguienteFormaEnCelda(
  prev: CeldaFormaLoseta | undefined,
  forma: FormaLoseta,
): CeldaFormaLoseta {
  if (prev?.forma === forma) {
    const r = ((prev.rotacion ?? 0) + 90) % 360
    return { forma, rotacion: r as CeldaFormaLoseta['rotacion'] }
  }
  return { forma, rotacion: 0 }
}

/** Traslada claves absolutas de formas al mover una zona. */
export function trasladarFormasCelda(
  formas: FormasCeldaMap | undefined,
  dc: number,
  dr: number,
): FormasCeldaMap | undefined {
  if (!formas || Object.keys(formas).length === 0) return formas
  const out: FormasCeldaMap = {}
  for (const [k, v] of Object.entries(formas)) {
    const [c, r] = k.split(',').map(Number)
    out[claveCeldaAbs(c + dc, r + dr)] = v
  }
  return out
}

/** Ancla mínima (esquina sup-izq) de un conjunto de celdas absolutas. */
export function anclaMinimaCeldas(celdas: { col: number; row: number }[]): {
  col: number
  row: number
} {
  if (celdas.length === 0) return { col: 0, row: 0 }
  return {
    col: Math.min(...celdas.map((c) => c.col)),
    row: Math.min(...celdas.map((c) => c.row)),
  }
}

/** Delta de ancla al trasladar un cuarto/zona de `origen` a `destino`. */
export function deltaTrasladoAncla(
  origen: { col: number; row: number }[],
  destino: { col: number; row: number }[],
): { dc: number; dr: number } {
  const a0 = anclaMinimaCeldas(origen)
  const a1 = anclaMinimaCeldas(destino)
  return { dc: a1.col - a0.col, dr: a1.row - a0.row }
}

/**
 * Formas con claves relativas (offset) tras cambiar ancla o footprint.
 * Conserva la forma en cada celda que sigue existiendo.
 */
export function remapearFormasOffTrasAncla(
  formas: FormasCeldaMap | undefined,
  anchorAntes: { col: number; row: number },
  fpAntes: { col: number; row: number }[],
  anchorDespues: { col: number; row: number },
  fpDespues: { col: number; row: number }[],
): FormasCeldaMap | undefined {
  if (!formas || Object.keys(formas).length === 0) return formas
  const out: FormasCeldaMap = {}
  const tiene = (fp: { col: number; row: number }[], o: { col: number; row: number }) =>
    fp.some((c) => c.col === o.col && c.row === o.row)
  for (const [k, v] of Object.entries(formas)) {
    const [oc, or] = k.split(',').map(Number)
    const off = { col: oc, row: or }
    if (!tiene(fpAntes, off)) continue
    const absCol = anchorAntes.col + off.col
    const absRow = anchorAntes.row + off.row
    const no = { col: absCol - anchorDespues.col, row: absRow - anchorDespues.row }
    if (tiene(fpDespues, no)) out[claveCeldaOff(no.col, no.row)] = v
  }
  return Object.keys(out).length > 0 ? out : undefined
}

type Esquinas = { tl: string; tr: string; bl: string; br: string }

function esquinasSvg(x: number, y: number, w: number, h: number): Esquinas {
  const tl = `${x},${y}`
  const tr = `${x + w},${y}`
  const bl = `${x},${y + h}`
  const br = `${x + w},${y + h}`
  return { tl, tr, bl, br }
}

/**
 * Triángulo = mitad del cuadrado: dos paredes rectas + diagonal (la otra mitad queda vacía).
 * rot 0: ángulo recto abajo-izq, diagonal sup-izq → inf-der.
 */
export function trianguloSvgPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  rotacion: number,
): string {
  const c = esquinasSvg(x, y, w, h)
  switch (rotacion) {
    case 90:
      return `${c.tl},${c.tr},${c.bl}`
    case 180:
      return `${c.tr},${c.br},${c.tl}`
    case 270:
      return `${c.br},${c.bl},${c.tr}`
    default:
      return `${c.bl},${c.tl},${c.br}`
  }
}

/** Esquina con ángulo recto del cuarto de círculo. */
function esquinaCuartoCirculo(rotacion: number): EsquinaCelda {
  switch (rotacion) {
    case 90:
      return 'br'
    case 180:
      return 'bl'
    case 270:
      return 'tl'
    default:
      return 'tr'
  }
}

type EsquinaCelda = 'tl' | 'tr' | 'br' | 'bl'

type DatosCuarto = {
  centro: { x: number; y: number }
  /** Primer vértice del arco (cierre del path). */
  arcoA: { x: number; y: number }
  /** Vértice donde termina el trazo recto antes del arco. */
  arcoB: { x: number; y: number }
}

function datosCuartoCirculo(
  esquina: EsquinaCelda,
  x: number,
  y: number,
  w: number,
  h: number,
): DatosCuarto {
  switch (esquina) {
    case 'br':
      return {
        centro: { x: x + w, y: y + h },
        arcoA: { x: x + w, y },
        arcoB: { x, y: y + h },
      }
    case 'bl':
      return {
        centro: { x, y: y + h },
        arcoA: { x, y },
        arcoB: { x: x + w, y: y + h },
      }
    case 'tl':
      return {
        centro: { x, y },
        arcoA: { x: x + w, y },
        arcoB: { x, y: y + h },
      }
    default:
      return {
        centro: { x: x + w, y },
        arcoA: { x, y },
        arcoB: { x: x + w, y: y + h },
      }
  }
}

/** Sweep SVG del arco interior de 90° (B → A alrededor del centro). */
function sweepArcoInterior(
  cx: number,
  cy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): 0 | 1 {
  const cross = (bx - cx) * (ay - cy) - (by - cy) * (ax - cx)
  return cross > 0 ? 1 : 0
}

/**
 * Cuarto de círculo en una esquina: dos lados rectos + arco entre esquinas opuestas del sector.
 * rot 0 → sup-der; 90 → inf-der; 180 → inf-izq; 270 → sup-izq.
 */
export function cuartoCirculoSvgPath(
  x: number,
  y: number,
  w: number,
  h: number,
  rotacion: number,
): string {
  const { centro, arcoA, arcoB } = datosCuartoCirculo(esquinaCuartoCirculo(rotacion), x, y, w, h)
  const sweep = sweepArcoInterior(centro.x, centro.y, arcoA.x, arcoA.y, arcoB.x, arcoB.y)
  return (
    `M ${arcoA.x},${arcoA.y} L ${centro.x},${centro.y} L ${arcoB.x},${arcoB.y} ` +
    `A ${w},${h} 0 0 ${sweep} ${arcoA.x},${arcoA.y} Z`
  )
}

type Pt = { x: number; y: number }

export type ExtraPerimetroSvg =
  | { tipo: 'linea'; x1: number; y1: number; x2: number; y2: number }
  | { tipo: 'arco'; d: string }

function esquinasPt(x: number, y: number, w: number, h: number) {
  return {
    nw: { x, y },
    ne: { x: x + w, y },
    sw: { x, y: y + h },
    se: { x: x + w, y: y + h },
  }
}

function linea(p1: Pt, p2: Pt): ExtraPerimetroSvg {
  return { tipo: 'linea', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
}

/** Solo el trazo del arco (sin los lados rectos) para contorno en el plano. */
function arcoSoloSvg(
  esquina: EsquinaCelda,
  ix: number,
  iy: number,
  iw: number,
  ih: number,
): string {
  const { centro, arcoA, arcoB } = datosCuartoCirculo(esquina, ix, iy, iw, ih)
  const sweep = sweepArcoInterior(centro.x, centro.y, arcoA.x, arcoA.y, arcoB.x, arcoB.y)
  return `M ${arcoB.x},${arcoB.y} A ${iw},${ih} 0 0 ${sweep} ${arcoA.x},${arcoA.y}`
}

/** Línea diagonal o trazo de arco (solo borde) para el plano 2D. */
export function extrasPerimetroSvg(
  forma: CeldaFormaLoseta,
  x: number,
  y: number,
  w: number,
  h: number,
): ExtraPerimetroSvg[] {
  if (esFormaCuadrada(forma)) return []
  const pad = 1
  const ix = x + pad
  const iy = y + pad
  const iw = w - pad * 2
  const ih = h - pad * 2
  const c = esquinasPt(ix, iy, iw, ih)

  if (forma.forma === 'triangular') {
    switch (forma.rotacion) {
      case 90:
        return [linea(c.ne, c.sw)]
      case 180:
        return [linea(c.se, c.nw)]
      case 270:
        return [linea(c.sw, c.ne)]
      default:
        return [linea(c.nw, c.se)]
    }
  }

  const esquina = esquinaCuartoCirculo(forma.rotacion)
  return [{ tipo: 'arco', d: arcoSoloSvg(esquina, ix, iy, iw, ih) }]
}

/** ¿El punto SVG cae dentro del área real de la loseta? */
export function puntoEnFormaPlano(
  forma: CeldaFormaLoseta | undefined,
  px: number,
  py: number,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const pad = 1
  const ix = x + pad
  const iy = y + pad
  const iw = w - pad * 2
  const ih = h - pad * 2
  if (px < ix || py < iy || px > ix + iw || py > iy + ih) return false
  if (!forma || esFormaCuadrada(forma)) return true

  if (forma.forma === 'triangular') {
    const pts = trianguloSvgPoints(ix, iy, iw, ih, forma.rotacion)
      .split(' ')
      .map((s) => {
        const [a, b] = s.split(',').map(Number)
        return { x: a, y: b }
      })
    const [a, b, c2] = pts
    const d1 = (px - b.x) * (a.y - b.y) - (a.x - b.x) * (py - b.y)
    const d2 = (px - c2.x) * (b.y - c2.y) - (b.x - c2.x) * (py - c2.y)
    const d3 = (px - a.x) * (c2.y - a.y) - (c2.x - a.x) * (py - a.y)
    const neg = d1 < 0 || d2 < 0 || d3 < 0
    const pos = d1 > 0 || d2 > 0 || d3 > 0
    return !(neg && pos)
  }

  const esquina = esquinaCuartoCirculo(forma.rotacion)
  const { centro, arcoA, arcoB } = datosCuartoCirculo(esquina, ix, iy, iw, ih)
  const dx = px - centro.x
  const dy = py - centro.y
  const r = Math.max(iw, ih)
  if (Math.hypot(dx, dy) > r + 0.5) return false
  const a = Math.atan2(dy, dx)
  const aA = Math.atan2(arcoA.y - centro.y, arcoA.x - centro.x)
  const aB = Math.atan2(arcoB.y - centro.y, arcoB.x - centro.x)
  let da = aB - aA
  while (da > Math.PI) da -= 2 * Math.PI
  while (da <= -Math.PI) da += 2 * Math.PI
  let dp = a - aA
  while (dp > Math.PI) dp -= 2 * Math.PI
  while (dp <= -Math.PI) dp += 2 * Math.PI
  if (da >= 0) return dp >= -0.05 && dp <= da + 0.05
  return dp <= 0.05 && dp >= da - 0.05
}

function anguloDesde(cx: number, cy: number, px: number, py: number): number {
  return Math.atan2(py - cy, px - cx)
}

/** Arco de 90° en Three.js desde el punto actual (px,py) hasta (qx,qy). */
function arcoCuarto3D(
  shape: THREE.Shape,
  cx: number,
  cy: number,
  r: number,
  px: number,
  py: number,
  qx: number,
  qy: number,
) {
  const a0 = anguloDesde(cx, cy, px, py)
  const a1 = anguloDesde(cx, cy, qx, qy)
  let da = a1 - a0
  while (da > Math.PI) da -= 2 * Math.PI
  while (da <= -Math.PI) da += 2 * Math.PI
  shape.absarc(cx, cy, r, a0, a1, da < 0)
}

function shapeCuartoCirculo3D(shape: THREE.Shape, h: number, tile: number, esquina: EsquinaCelda) {
  const tl = { x: -h, y: h }
  const tr = { x: h, y: h }
  const bl = { x: -h, y: -h }
  const br = { x: h, y: -h }

  switch (esquina) {
    case 'br':
      shape.moveTo(tr.x, tr.y)
      shape.lineTo(br.x, br.y)
      shape.lineTo(bl.x, bl.y)
      arcoCuarto3D(shape, br.x, br.y, tile, bl.x, bl.y, tr.x, tr.y)
      break
    case 'bl':
      shape.moveTo(tl.x, tl.y)
      shape.lineTo(bl.x, bl.y)
      shape.lineTo(br.x, br.y)
      arcoCuarto3D(shape, bl.x, bl.y, tile, br.x, br.y, tl.x, tl.y)
      break
    case 'tl':
      shape.moveTo(tr.x, tr.y)
      shape.lineTo(tl.x, tl.y)
      shape.lineTo(bl.x, bl.y)
      arcoCuarto3D(shape, tl.x, tl.y, tile, bl.x, bl.y, tr.x, tr.y)
      break
    default:
      shape.moveTo(tl.x, tl.y)
      shape.lineTo(tr.x, tr.y)
      shape.lineTo(br.x, br.y)
      arcoCuarto3D(shape, tr.x, tr.y, tile, br.x, br.y, tl.x, tl.y)
      break
  }
  shape.closePath()
}

/** Shape Three.js centrado en la loseta (plano X/Y antes de tumbar a X/Z). */
export function shapeLoseta3D(formaLoseta: CeldaFormaLoseta, tile: number): THREE.Shape {
  const h = tile / 2
  const shape = new THREE.Shape()

  if (formaLoseta.forma === 'triangular') {
    switch (formaLoseta.rotacion) {
      case 90:
        shape.moveTo(-h, h)
        shape.lineTo(h, h)
        shape.lineTo(-h, -h)
        break
      case 180:
        shape.moveTo(h, h)
        shape.lineTo(h, -h)
        shape.lineTo(-h, h)
        break
      case 270:
        shape.moveTo(h, -h)
        shape.lineTo(-h, -h)
        shape.lineTo(h, h)
        break
      default:
        shape.moveTo(-h, -h)
        shape.lineTo(-h, h)
        shape.lineTo(h, -h)
        break
    }
    shape.closePath()
    return shape
  }

  if (formaLoseta.forma === 'circular') {
    shapeCuartoCirculo3D(shape, h, tile, esquinaCuartoCirculo(formaLoseta.rotacion))
    return shape
  }

  shape.moveTo(-h, -h)
  shape.lineTo(h, -h)
  shape.lineTo(h, h)
  shape.lineTo(-h, h)
  shape.closePath()
  return shape
}

export function geometriaLoseta3D(
  formaLoseta: CeldaFormaLoseta,
  tile: number,
  _modo: 'solido' | 'plano',
): THREE.BufferGeometry {
  return new THREE.ShapeGeometry(shapeLoseta3D(formaLoseta, tile))
}

/** Geometría extruida del techo (loseta plana con grosor) siguiendo la forma de la celda. */
export function geometriaTechoLoseta3D(
  formaLoseta: CeldaFormaLoseta,
  tile: number,
  grosor = 0.12,
): THREE.BufferGeometry {
  const shape = shapeLoseta3D(formaLoseta, tile)
  const geo = new THREE.ExtrudeGeometry(shape, { depth: grosor, bevelEnabled: false })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, grosor / 2, 0)
  return geo
}

export function esFormaCuadrada(formaLoseta?: CeldaFormaLoseta): boolean {
  return !formaLoseta || formaLoseta.forma === 'cuadrado'
}

/**
 * Contorno (perímetro) de la loseta en el plano del mundo (x,z), centrado en la celda.
 * Usa la misma silueta que el piso (incluye el arco en celdas circulares). Sirve de
 * base para fabricar el techo por celda (tienda, cono, pendiente).
 */
export function outlineCeldaXZ(formaLoseta: CeldaFormaLoseta, tile: number): { x: number; z: number }[] {
  // shapeLoseta3D vive en X/Y; el piso se tumba con rotateX(-90°) → Y pasa a -Z.
  const pts = shapeLoseta3D(formaLoseta, tile).getPoints(24).map((p) => ({ x: p.x, z: -p.y }))
  // Quita duplicados consecutivos (incl. el cierre) para no generar caras degeneradas.
  const out: { x: number; z: number }[] = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (!last || Math.abs(last.x - p.x) > 1e-4 || Math.abs(last.z - p.z) > 1e-4) out.push(p)
  }
  return out
}

/** Los 3 vértices de una celda triangular en mundo (x,z), según su rotación. */
export function verticesTrianguloXZ(formaLoseta: CeldaFormaLoseta, tile: number): { x: number; z: number }[] {
  const h = tile / 2
  let pts: [number, number][]
  switch (formaLoseta.rotacion) {
    case 90:
      pts = [[-h, h], [h, h], [-h, -h]]
      break
    case 180:
      pts = [[h, h], [h, -h], [-h, h]]
      break
    case 270:
      pts = [[h, -h], [-h, -h], [h, h]]
      break
    default:
      pts = [[-h, -h], [-h, h], [h, -h]]
      break
  }
  // shapeLoseta3D vive en X/Y; el piso se tumba con rotateX(-90°) → Y pasa a -Z.
  return pts.map(([x, y]) => ({ x, z: -y }))
}

/** Centro del círculo (esquina recta) de una celda circular, en mundo (x,z). */
export function centroCirculoCelda(formaLoseta: CeldaFormaLoseta, tile: number): { x: number; z: number } {
  const h = tile / 2
  switch (esquinaCuartoCirculo(formaLoseta.rotacion)) {
    case 'tr':
      return { x: h, z: -h }
    case 'tl':
      return { x: -h, z: -h }
    case 'bl':
      return { x: -h, z: h }
    default:
      return { x: h, z: h }
  }
}

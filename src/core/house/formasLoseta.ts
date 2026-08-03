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

// ── Subformas finas (rejilla fina: 4 cuadrantes de ½×½ por celda) ─────────────
// Una esquina fina se guarda en el MISMO mapa de formas con clave de offset
// fraccionario en el CENTRO del cuadrante ("c+¼/¾, r+¼/¾"): nunca colisiona con
// las claves enteras de forma de celda. La celda se dibuja llena salvo el recorte
// (triángulo/arco a media celda) de cada cuadrante.

/** Offsets (en celdas, paso ½) de los 4 cuadrantes de una celda: NO, NE, SO, SE. */
export const SUBQ_OFF: { qc: 0 | 0.5; qr: 0 | 0.5 }[] = [
  { qc: 0, qr: 0 },
  { qc: 0.5, qr: 0 },
  { qc: 0, qr: 0.5 },
  { qc: 0.5, qr: 0.5 },
]

/** Offset (centro de sub-celda) del cuadrante `i` (0..3 = NO,NE,SO,SE) de la celda (c,r). */
export function offSubcelda(offCol: number, offRow: number, i: number): { col: number; row: number } {
  const q = SUBQ_OFF[i]
  return { col: offCol + q.qc + 0.25, row: offRow + q.qr + 0.25 }
}

/** Clave de la sub-celda `i` (0..3 = NO,NE,SO,SE) de la celda offset (c,r): su centro. */
export function claveSubceldaOff(offCol: number, offRow: number, i: number): string {
  const o = offSubcelda(offCol, offRow, i)
  return claveCeldaOff(o.col, o.row)
}

/**
 * Los 2 cuadrantes (índices de `SUBQ_OFF`) que tocan el lado (dc,dr) de una celda, con
 * (dc,dr) = ±1 en un solo eje. Al crecer el cuarto hacia ese lado, son los recortes finos
 * cuya silueta avanza a la celda nueva.
 */
export function cuadrantesDelLado(dc: number, dr: number): number[] {
  if (dc > 0) return [1, 3] // este: qc = ½ (NE, SE)
  if (dc < 0) return [0, 2] // oeste: qc = 0 (NO, SO)
  if (dr > 0) return [2, 3] // sur: qr = ½ (SO, SE)
  return [0, 1] // norte: qr = 0 (NO, NE)
}

/** Subformas finas de la celda offset (c,r): [NO,NE,SO,SE]; null si no hay ninguna. */
export function subformasDeCelda(
  map: FormasCeldaMap | undefined,
  offCol: number,
  offRow: number,
): (CeldaFormaLoseta | undefined)[] | null {
  if (!map) return null
  let hay = false
  const out = SUBQ_OFF.map((q) => {
    const f = map[claveCeldaOff(offCol + q.qc + 0.25, offRow + q.qr + 0.25)]
    if (f && f.forma !== 'cuadrado') {
      hay = true
      return f
    }
    return undefined
  })
  return hay ? out : null
}

/**
 * Migra claves de sub-celda del esquema inicial (esquina del cuadrante a paso ½,
 * ambiguo con las claves enteras) al actual (centro del cuadrante, +¼ en ambos
 * ejes). Idempotente: las claves enteras y las de centro quedan igual.
 */
export function migrarClavesSubcelda(map: FormasCeldaMap | undefined): FormasCeldaMap | undefined {
  if (!map) return map
  const esMedia = (v: number) => Math.abs(v - Math.floor(v) - 0.5) < 1e-6
  // Vieja: coordenadas a paso ½ con AL MENOS una en ½ exacto (las enteras son formas
  // de celda y las de ¼/¾ ya están en el esquema actual).
  const viejas = Object.keys(map).filter((k) => {
    const [c, r] = k.split(',').map(Number)
    const pasoMedio = (v: number) => esMedia(v) || Number.isInteger(v)
    return pasoMedio(c) && pasoMedio(r) && (esMedia(c) || esMedia(r))
  })
  if (!viejas.length) return map
  const out: FormasCeldaMap = { ...map }
  for (const k of viejas) {
    const [c, r] = k.split(',').map(Number)
    const v = out[k]
    delete out[k]
    out[claveCeldaOff(c + 0.25, r + 0.25)] = v
  }
  return out
}

/**
 * Rotación inicial de una subforma según su cuadrante: la que recorta la esquina
 * EXTERIOR de la celda (triángulo: chaflán; círculo: esquina redondeada).
 */
export function rotInicialSubforma(forma: FormaLoseta, cuadrante: number): 0 | 90 | 180 | 270 {
  if (forma === 'circular') return ([90, 180, 0, 270] as const)[cuadrante] ?? 0
  return ([270, 0, 180, 90] as const)[cuadrante] ?? 0
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

/** Traslada claves absolutas de formas al mover una zona (conserva claves de sub-celda). */
export function trasladarFormasCelda(
  formas: FormasCeldaMap | undefined,
  dc: number,
  dr: number,
): FormasCeldaMap | undefined {
  if (!formas || Object.keys(formas).length === 0) return formas
  const out: FormasCeldaMap = {}
  for (const [k, v] of Object.entries(formas)) {
    const [c, r] = k.split(',').map(Number)
    out[claveCeldaOff(c + dc, r + dr)] = v
  }
  return out
}

/** Ancla mínima (esquina sup-izq) de un conjunto de celdas absolutas. */
function anclaMinimaCeldas(celdas: { col: number; row: number }[]): {
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
 * Mapa con claves relativas (offset) tras cambiar ancla o footprint: cada valor sigue a
 * SU celda y se descarta el de las celdas que dejan de existir. Genérico porque lo usan
 * tanto las formas de piso (`FormasCeldaMap`, con claves finas de ¼) como el techo por
 * celda (`TechoCeldaForma`), que van por offset y se renumeran al reanclar el cuarto.
 */
export function remapearFormasOffTrasAncla<T>(
  formas: Record<string, T> | undefined,
  anchorAntes: { col: number; row: number },
  fpAntes: { col: number; row: number }[],
  anchorDespues: { col: number; row: number },
  fpDespues: { col: number; row: number }[],
): Record<string, T> | undefined {
  if (!formas || Object.keys(formas).length === 0) return formas
  const out: Record<string, T> = {}
  const tiene = (fp: { col: number; row: number }[], o: { col: number; row: number }) =>
    fp.some((c) => c.col === o.col && c.row === o.row)
  for (const [k, v] of Object.entries(formas)) {
    const [oc, or] = k.split(',').map(Number)
    // Clave de sub-celda: se remapea con su celda contenedora (floor).
    const base = { col: Math.floor(oc), row: Math.floor(or) }
    if (!tiene(fpAntes, base)) continue
    const absCol = anchorAntes.col + oc
    const absRow = anchorAntes.row + or
    const no = { col: absCol - anchorDespues.col, row: absRow - anchorDespues.row }
    if (tiene(fpDespues, { col: Math.floor(no.col), row: Math.floor(no.row) }))
      out[claveCeldaOff(no.col, no.row)] = v
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

function shapeCuartoCirculo3D(
  shape: THREE.Shape,
  h: number,
  tile: number,
  esquina: EsquinaCelda,
  dx = 0,
  dy = 0,
) {
  const tl = { x: dx - h, y: dy + h }
  const tr = { x: dx + h, y: dy + h }
  const bl = { x: dx - h, y: dy - h }
  const br = { x: dx + h, y: dy - h }

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

/** Shape Three.js de la loseta (plano X/Y antes de tumbar a X/Z), con centro en (dx,dy). */
function shapeLoseta3D(formaLoseta: CeldaFormaLoseta, tile: number, dx = 0, dy = 0): THREE.Shape {
  const h = tile / 2
  const shape = new THREE.Shape()

  if (formaLoseta.forma === 'triangular') {
    switch (formaLoseta.rotacion) {
      case 90:
        shape.moveTo(dx - h, dy + h)
        shape.lineTo(dx + h, dy + h)
        shape.lineTo(dx - h, dy - h)
        break
      case 180:
        shape.moveTo(dx + h, dy + h)
        shape.lineTo(dx + h, dy - h)
        shape.lineTo(dx - h, dy + h)
        break
      case 270:
        shape.moveTo(dx + h, dy - h)
        shape.lineTo(dx - h, dy - h)
        shape.lineTo(dx + h, dy + h)
        break
      default:
        shape.moveTo(dx - h, dy - h)
        shape.lineTo(dx - h, dy + h)
        shape.lineTo(dx + h, dy - h)
        break
    }
    shape.closePath()
    return shape
  }

  if (formaLoseta.forma === 'circular') {
    shapeCuartoCirculo3D(shape, h, tile, esquinaCuartoCirculo(formaLoseta.rotacion), dx, dy)
    return shape
  }

  shape.moveTo(dx - h, dy - h)
  shape.lineTo(dx + h, dy - h)
  shape.lineTo(dx + h, dy + h)
  shape.lineTo(dx - h, dy + h)
  shape.closePath()
  return shape
}

/**
 * Shapes de la celda con recortes finos: cada cuadrante como mini-loseta de ½ celda
 * (cuadrada si no tiene subforma). En el plano X/Y del shape, +Y es el norte de la
 * celda (el piso se tumba con rotateX(-90°) → Y pasa a -Z).
 */
function shapesLosetaSub3D(
  subformas: (CeldaFormaLoseta | undefined)[],
  tile: number,
): THREE.Shape[] {
  const q = tile / 2
  return SUBQ_OFF.map((o, i) => {
    const dx = o.qc === 0 ? -q / 2 : q / 2
    const dy = o.qr === 0 ? q / 2 : -q / 2
    return shapeLoseta3D(subformas[i] ?? FORMA_LOSETA_DEFAULT, q, dx, dy)
  })
}

export function geometriaLoseta3D(
  formaLoseta: CeldaFormaLoseta,
  tile: number,
  _modo: 'solido' | 'plano',
  subformas?: (CeldaFormaLoseta | undefined)[] | null,
): THREE.BufferGeometry {
  const geo = new THREE.ShapeGeometry(
    subformas ? shapesLosetaSub3D(subformas, tile) : shapeLoseta3D(formaLoseta, tile),
  )
  // ShapeGeometry asigna UV = posición del vértice (en unidades de mundo). Se normalizan
  // a 0..1 sobre la celda completa para que las texturas (ajedrez, mosaico, imágenes) se
  // vean a la MISMA escala que en una loseta cuadrada (planeGeometry, UV 0..1).
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  const h = tile / 2
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + h) / tile, (pos.getY(i) + h) / tile)
  }
  uv.needsUpdate = true
  return geo
}

/** Geometría extruida del techo (loseta plana con grosor) siguiendo la forma de la celda. */
export function geometriaTechoLoseta3D(
  formaLoseta: CeldaFormaLoseta,
  tile: number,
  grosor = 0.12,
  subformas?: (CeldaFormaLoseta | undefined)[] | null,
): THREE.BufferGeometry {
  const shape = subformas ? shapesLosetaSub3D(subformas, tile) : shapeLoseta3D(formaLoseta, tile)
  const geo = new THREE.ExtrudeGeometry(shape, { depth: grosor, bevelEnabled: false })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, grosor / 2, 0)
  return geo
}

export function esFormaCuadrada(formaLoseta?: CeldaFormaLoseta): boolean {
  return !formaLoseta || formaLoseta.forma === 'cuadrado'
}

/** ¿El punto (px,pz) cae dentro del triángulo dado por sus 3 vértices (XZ)? */
function puntoEnTriangulo(px: number, pz: number, v: { x: number; z: number }[]): boolean {
  const sig = (ax: number, az: number, bx: number, bz: number) =>
    (px - bx) * (az - bz) - (ax - bx) * (pz - bz)
  const d1 = sig(v[0].x, v[0].z, v[1].x, v[1].z)
  const d2 = sig(v[1].x, v[1].z, v[2].x, v[2].z)
  const d3 = sig(v[2].x, v[2].z, v[0].x, v[0].z)
  const neg = d1 < 0 || d2 < 0 || d3 < 0
  const pos = d1 > 0 || d2 > 0 || d3 > 0
  return !(neg && pos)
}

/** ¿El punto local (lx,lz) de una celda de lado `tile` cae dentro de UNA forma (no fina)? */
function puntoEnFormaLocal(lx: number, lz: number, forma: CeldaFormaLoseta, tile: number): boolean {
  if (forma.forma === 'cuadrado') return true
  if (forma.forma === 'triangular') {
    return puntoEnTriangulo(lx, lz, verticesTrianguloXZ(forma, tile))
  }
  // Cuarto de círculo: centro en una esquina, radio = lado; el sector = puntos de la celda
  // a distancia <= radio del centro (el ángulo de 90° cubre toda la celda desde la esquina).
  const c = centroCirculoCelda(forma, tile)
  return Math.hypot(lx - c.x, lz - c.z) <= tile + 1e-6
}

/**
 * ¿El punto local (lx,lz) de una celda (lado `tile`, centro en 0,0) cae DENTRO de la
 * silueta del piso (forma entera o recortes finos por cuadrante)? Fuera de la silueta es
 * el "complemento" (el trozo relleno con piso exterior). Lo usa el personaje para saber si
 * está sobre el pozo de un sótano (nivel -1) o sobre las esquinas al ras (nivel 0).
 */
export function puntoDentroSilueta(
  lx: number,
  lz: number,
  forma: CeldaFormaLoseta,
  subformas: (CeldaFormaLoseta | undefined)[] | null,
  tile: number,
): boolean {
  const h = tile / 2
  if (lx < -h || lx > h || lz < -h || lz > h) return false
  if (subformas) {
    // Cuadrante (NO,NE,SO,SE) donde cae el punto → su mini-forma (½ celda).
    const i = (lx >= 0 ? 1 : 0) + (lz >= 0 ? 2 : 0)
    const sub = subformas[i]
    if (!sub || sub.forma === 'cuadrado') return true
    const cx = lx >= 0 ? h / 2 : -h / 2
    const cz = lz >= 0 ? h / 2 : -h / 2
    return puntoEnFormaLocal(lx - cx, lz - cz, sub, h)
  }
  return puntoEnFormaLocal(lx, lz, forma, tile)
}

/**
 * COMPLEMENTO de un cuarto de círculo en una esquina: el cuadrado MENOS el sector.
 * Recorre la esquina opuesta + los dos extremos del arco, con el mismo arco recorrido
 * al revés (borde cóncavo). Coords de shape (Y hacia arriba), centro en (dx,dy).
 */
function shapeComplementoCuartoCirculo3D(
  shape: THREE.Shape,
  h: number,
  tile: number,
  esquina: EsquinaCelda,
  dx = 0,
  dy = 0,
) {
  const tl = { x: dx - h, y: dy + h }
  const tr = { x: dx + h, y: dy + h }
  const bl = { x: dx - h, y: dy - h }
  const br = { x: dx + h, y: dy - h }
  // Por esquina (centro del arco): [opuesta, extremo1, extremo2] (extremos en orden del sector).
  const cfg: Record<EsquinaCelda, { c: Pt; opp: Pt; e1: Pt; e2: Pt }> = {
    tr: { c: tr, opp: bl, e1: br, e2: tl },
    br: { c: br, opp: tl, e1: bl, e2: tr },
    bl: { c: bl, opp: tr, e1: br, e2: tl },
    tl: { c: tl, opp: br, e1: bl, e2: tr },
  }
  const { c, opp, e1, e2 } = cfg[esquina]
  shape.moveTo(opp.x, opp.y)
  shape.lineTo(e1.x, e1.y)
  arcoCuarto3D(shape, c.x, c.y, tile, e1.x, e1.y, e2.x, e2.y)
  shape.closePath()
}

/** Shape del COMPLEMENTO de una loseta (cuadrado menos silueta). Cuadrado → null. */
function shapeComplementoLoseta3D(
  formaLoseta: CeldaFormaLoseta,
  tile: number,
  dx = 0,
  dy = 0,
): THREE.Shape | null {
  if (esFormaCuadrada(formaLoseta)) return null
  if (formaLoseta.forma === 'triangular') {
    // El complemento de un triángulo es el triángulo opuesto (rotación +180°).
    const rot = ((formaLoseta.rotacion + 180) % 360) as CeldaFormaLoseta['rotacion']
    return shapeLoseta3D({ forma: 'triangular', rotacion: rot }, tile, dx, dy)
  }
  const shape = new THREE.Shape()
  shapeComplementoCuartoCirculo3D(shape, tile / 2, tile, esquinaCuartoCirculo(formaLoseta.rotacion), dx, dy)
  return shape
}

/**
 * Geometría del COMPLEMENTO de una celda (cuadrado menos su silueta): el trozo que queda
 * FUERA del cuarto. La usa el piso exterior de la planta baja para rellenar las esquinas
 * de una celda de sótano con forma no-cuadrada (si no, se vería el vacío del pozo ahí).
 * Con `subformas`, une el complemento de cada cuadrante recortado (las esquinitas finas).
 * Devuelve null si no hay nada que rellenar (celda cuadrada plena).
 */
export function geometriaComplementoLoseta3D(
  formaLoseta: CeldaFormaLoseta,
  tile: number,
  subformas?: (CeldaFormaLoseta | undefined)[] | null,
): THREE.BufferGeometry | null {
  let shapes: THREE.Shape[]
  if (subformas) {
    const q = tile / 2
    shapes = []
    SUBQ_OFF.forEach((o, i) => {
      const sub = subformas[i]
      if (!sub || esFormaCuadrada(sub)) return // cuadrante pleno = piso del cuarto, sin relleno
      const dx = o.qc === 0 ? -q / 2 : q / 2
      const dy = o.qr === 0 ? q / 2 : -q / 2
      const s = shapeComplementoLoseta3D(sub, q, dx, dy)
      if (s) shapes.push(s)
    })
  } else {
    const s = shapeComplementoLoseta3D(formaLoseta, tile)
    shapes = s ? [s] : []
  }
  if (shapes.length === 0) return null
  const geo = new THREE.ShapeGeometry(shapes)
  // UV normalizado a 0..1 sobre la celda completa (igual que geometriaLoseta3D).
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  const h = tile / 2
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + h) / tile, (pos.getY(i) + h) / tile)
  }
  uv.needsUpdate = true
  return geo
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

/**
 * Contorno en mundo (x,z) de una celda cuadrada con recortes finos por cuadrante
 * (NO,NE,SO,SE): cada esquina recortada se sustituye por su chaflán (triángulo) o su
 * arco (círculo, radio ½ celda centrado en el centro de la celda). La rotación del
 * recorte se ignora: para la silueta del techo todo recorte cuenta como el de la
 * esquina exterior (la variante que coloca el pincel fino). Sirve de base para
 * fabricar el techo de la celda (tienda, faldones) siguiendo su silueta.
 */
export function outlineCeldaRecortadaXZ(
  subformas: (CeldaFormaLoseta | undefined)[],
  tile: number,
): { x: number; z: number }[] {
  const h = tile / 2
  // Recorrido O→N→E→S; por esquina: cuadrante (índice en SUBQ_OFF), punto de entrada
  // (mitad de arista), esquina y ángulo donde arranca su arco de 90°.
  const esquinas: { i: number; ent: [number, number]; esq: [number, number]; a0: number }[] = [
    { i: 0, ent: [-h, 0], esq: [-h, -h], a0: Math.PI },
    { i: 1, ent: [0, -h], esq: [h, -h], a0: Math.PI * 1.5 },
    { i: 3, ent: [h, 0], esq: [h, h], a0: 0 },
    { i: 2, ent: [0, h], esq: [-h, h], a0: Math.PI * 0.5 },
  ]
  const out: { x: number; z: number }[] = []
  const push = (x: number, z: number) => {
    const last = out[out.length - 1]
    if (!last || Math.abs(last.x - x) > 1e-4 || Math.abs(last.z - z) > 1e-4) out.push({ x, z })
  }
  for (const { i, ent, esq, a0 } of esquinas) {
    push(ent[0], ent[1])
    const f = subformas[i]
    if (!f || f.forma === 'cuadrado') {
      push(esq[0], esq[1])
    } else if (f.forma === 'circular') {
      const pasos = 8
      for (let k = 1; k < pasos; k++) {
        const a = a0 + (k / pasos) * (Math.PI / 2)
        push(Math.cos(a) * h, Math.sin(a) * h)
      }
    }
    // Triangular: el chaflán es la recta entrada→salida (sin puntos extra).
  }
  const first = out[0]
  const last = out[out.length - 1]
  if (first && last && Math.abs(first.x - last.x) < 1e-4 && Math.abs(first.z - last.z) < 1e-4) out.pop()
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

/**
 * Arco (90°) del muro circular en coords locales de una loseta de lado `tile`:
 * centro, radio y ángulos con el barrido normalizado. Con `tile = SIZE` equivale al
 * arco del muro libre; con `tile = SIZE/2` es el arco fino de un cuadrante.
 */
export function arcoCuartoCirculoLocal(
  rotacion: number,
  tile: number,
): { cx: number; cz: number; r: number; a0: number; a1: number } {
  const c = centroCirculoCelda({ forma: 'circular', rotacion: rotacion as 0 | 90 | 180 | 270 }, tile)
  const p0 = { x: -c.x, z: c.z }
  const p1 = { x: c.x, z: -c.z }
  const a0 = Math.atan2(p0.z - c.z, p0.x - c.x)
  const a1raw = Math.atan2(p1.z - c.z, p1.x - c.x)
  let da = a1raw - a0
  while (da > Math.PI) da -= 2 * Math.PI
  while (da <= -Math.PI) da += 2 * Math.PI
  return { cx: c.x, cz: c.z, r: tile, a0, a1: a0 + da }
}

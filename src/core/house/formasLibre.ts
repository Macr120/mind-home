import * as THREE from 'three'
import {
  SPACING,
  SIZE,
  HALF,
  WALL_T,
  cellToWorld,
  worldToSubCell,
  subId,
  cellId,
  SIDE_KEYS,
  type Cell,
  type Footprint,
  type AABB,
  type SideKey,
} from './walls'
import type { FormaLibre, PuntoUV, VanoLibre, MuroLibre, TipoFormaLibre } from '../data/db'
import {
  segmentosMundoMuroLibre,
  arcoCircularMuroLocal,
  centroCeldaMundo,
  type AberturaMundo,
  type SegMundo,
} from './murosLibre'
import { claveCeldaOff, esFormaCuadrada, formaEnCelda, subformasDeCelda, type FormasCeldaMap } from './formasLoseta'
import {
  itemsPerimetroSubformas,
  ladoGrillaActivoEnMapa,
  perimetroFormaCelda,
  type MuroExtraPerimetro,
} from './murosPerimetroLoseta'

/**
 * Geometría de las formas de construcción LIBRE (sin rejilla). Es la ÚNICA fuente para el
 * render 3D (`FormasLibres3D`), el croquis 2D y la colisión (`layoutStore.recompute`), en
 * el espíritu de la regla dura de `walls.ts`: render y colisión no pueden divergir.
 *
 * Unidades: los vértices persistidos van en celdas continuas `{u, v}` (ver `PuntoUV`);
 * todo lo demás trabaja en metros de mundo (x, z). `SPACING` se lee en cada llamada
 * porque es mutable (tamaño de celda configurable): PROHIBIDO derivar constantes de él.
 */

export interface PuntoXZ {
  x: number
  z: number
}

/** Tope del piso libre sobre la base del nivel: encima del interior (0.21) y exterior (0.19). */
export const Y_PISO_LIBRE = 0.22
/** Separación entre muestras de una curva suave (y entre muestras extra de un muro recto). */
export const PASO_MUESTRA_LIBRE = 0.5
/** Paso del muestreo de colisión y media caja de cada collider (como RC_FORMA de walls.ts). */
const PASO_COLISION = 0.3
const RC_LIBRE = 0.22
/** Anchos por defecto de los vanos (metros). */
export const ANCHO_PUERTA_LIBRE = 1.6
export const ANCHO_VENTANA_LIBRE = 1.4
/** Una forma cerrada necesita al menos 3 vértices. */
export const MIN_PUNTOS_CERRAR = 3
/** Separación mínima entre vértices consecutivos (metros): evita tangentes degeneradas. */
const MIN_SEP = 0.05

// ── Unidades ──────────────────────────────────────────────────────────────────

export function uvAMundo(p: PuntoUV, gridCols: number, gridRows: number): PuntoXZ {
  return { x: (p.u - gridCols / 2) * SPACING, z: (p.v - gridRows / 2) * SPACING }
}

export function mundoAUV(x: number, z: number, gridCols: number, gridRows: number): PuntoUV {
  return { u: x / SPACING + gridCols / 2, v: z / SPACING + gridRows / 2 }
}

export function puntosMundoForma(puntos: PuntoUV[] | undefined, gridCols: number, gridRows: number): PuntoXZ[] {
  // Una fila malformada (sin vértices) no puede tumbar el arranque de la casa.
  return (puntos ?? []).map((p) => uvAMundo(p, gridCols, gridRows))
}

/** Engancha un punto UV a la media celda más cercana (opción «imán»). */
export function imanMediaCelda(p: PuntoUV): PuntoUV {
  return { u: Math.round(p.u * 2) / 2, v: Math.round(p.v * 2) / 2 }
}

export const tieneMuro = (tipo: TipoFormaLibre) => tipo !== 'piso'
export const tienePiso = (tipo: TipoFormaLibre) => tipo !== 'muro'
/** Pisos y recintos son siempre cerrados; el muro solo si el usuario lo cerró. */
export const formaCerrada = (f: Pick<FormaLibre, 'tipo' | 'cerrada'>) => f.tipo !== 'muro' || f.cerrada

// ── Contorno ──────────────────────────────────────────────────────────────────

/** Quita vértices consecutivos casi coincidentes (y el último si repite al primero en cerradas). */
function depurar(pts: PuntoXZ[], cerrada: boolean): PuntoXZ[] {
  const out: PuntoXZ[] = []
  for (const p of pts) {
    const q = out[out.length - 1]
    if (q && Math.hypot(p.x - q.x, p.z - q.z) < MIN_SEP) continue
    out.push(p)
  }
  if (cerrada && out.length > 2) {
    const a = out[0]
    const b = out[out.length - 1]
    if (Math.hypot(a.x - b.x, a.z - b.z) < MIN_SEP) out.pop()
  }
  return out
}

/** Curva suave (Catmull-Rom, tensión 0.5) por los vértices; null con menos de 2. */
export function curvaLibre(pts: PuntoXZ[], cerrada: boolean): THREE.CatmullRomCurve3 | null {
  if (pts.length < 2) return null
  return new THREE.CatmullRomCurve3(
    pts.map((p) => new THREE.Vector3(p.x, 0, p.z)),
    cerrada && pts.length >= MIN_PUNTOS_CERRAR,
    'catmullrom',
    0.5,
  )
}

/**
 * Contorno EFECTIVO de la forma en mundo: los propios vértices si es recta, o la curva
 * suave muestreada a paso uniforme. En cerradas NO se repite el primer punto.
 */
export function contornoMuestreado(
  pts: PuntoXZ[],
  cerrada: boolean,
  suave: boolean,
  paso = PASO_MUESTRA_LIBRE,
): PuntoXZ[] {
  const base = depurar(pts, cerrada)
  if (!suave || base.length < 3) return base
  const curva = curvaLibre(base, cerrada)
  if (!curva) return base
  const largo = curva.getLength()
  const n = Math.max(base.length * 4, Math.ceil(largo / paso))
  const sp = curva.getSpacedPoints(n)
  if (cerrada) sp.pop() // el último duplica al primero
  return sp.map((v) => ({ x: v.x, z: v.z }))
}

/** Segmentos consecutivos del contorno (y el de cierre si es cerrado). */
export function segmentosDeContorno(pts: PuntoXZ[], cerrada: boolean): SegMundo[] {
  const segs: SegMundo[] = []
  const n = pts.length
  const m = cerrada ? n : n - 1
  for (let i = 0; i < m; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    segs.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z })
  }
  return segs
}

export function longitudContorno(pts: PuntoXZ[], cerrada: boolean): number {
  let L = 0
  for (const s of segmentosDeContorno(pts, cerrada)) L += Math.hypot(s.x2 - s.x1, s.z2 - s.z1)
  return L
}

export function centroide(pts: PuntoXZ[]): PuntoXZ {
  if (!pts.length) return { x: 0, z: 0 }
  let x = 0
  let z = 0
  for (const p of pts) {
    x += p.x
    z += p.z
  }
  return { x: x / pts.length, z: z / pts.length }
}

/** Polígono XZ → THREE.Shape en XY (el mesh se tumba con rotateX(−90°) ⇒ Y = −Z). */
export function shapeDePoligono(pts: PuntoXZ[]): THREE.Shape {
  const s = new THREE.Shape()
  if (pts.length < 3) return s
  s.moveTo(pts[0].x, -pts[0].z)
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i].x, -pts[i].z)
  s.closePath()
  return s
}

/** Punto dentro del polígono (ray casting; el borde cuenta como fuera). */
export function puntoEnPoligono(x: number, z: number, pts: PuntoXZ[]): boolean {
  let dentro = false
  const n = pts.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = pts[i]
    const b = pts[j]
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) dentro = !dentro
  }
  return dentro
}

/** Punto más cercano del segmento AB a P: distancia, parámetro t (0…1) y el punto. */
export function distanciaPuntoSegmento(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): { d: number; t: number; x: number; z: number } {
  const dx = bx - ax
  const dz = bz - az
  const l2 = dx * dx + dz * dz
  const t = l2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2))
  const x = ax + dx * t
  const z = az + dz * t
  return { d: Math.hypot(px - x, pz - z), t, x, z }
}

/** Índice del vértice a menos de `radio` del punto (el más cercano), o −1. */
export function verticeCercano(pts: PuntoXZ[], x: number, z: number, radio: number): number {
  let mejor = -1
  let dMin = radio
  pts.forEach((p, i) => {
    const d = Math.hypot(p.x - x, p.z - z)
    if (d < dMin) {
      dMin = d
      mejor = i
    }
  })
  return mejor
}

/**
 * Tramo (entre los vértices de CONTROL i e i+1, con cierre si aplica) más cercano al punto
 * dentro de `radio`. Sirve para insertar un vértice nuevo en la posición i+1.
 */
export function tramoCercano(
  pts: PuntoXZ[],
  cerrada: boolean,
  x: number,
  z: number,
  radio: number,
): { i: number; t: number; x: number; z: number; d: number } | null {
  let mejor: { i: number; t: number; x: number; z: number; d: number } | null = null
  const n = pts.length
  const m = cerrada ? n : n - 1
  for (let i = 0; i < m; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    const r = distanciaPuntoSegmento(x, z, a.x, a.z, b.x, b.z)
    if (r.d < radio && (!mejor || r.d < mejor.d)) mejor = { i, ...r }
  }
  return mejor
}

/**
 * Distancia del punto al contorno MUESTREADO (con cierre si aplica) y la longitud de
 * arco `s` del punto más cercano: base para colocar vanos (u = s / L).
 */
export function distanciaAContorno(
  contorno: PuntoXZ[],
  cerrada: boolean,
  x: number,
  z: number,
): { d: number; s: number; x: number; z: number } {
  let acum = 0
  let mejor = { d: Infinity, s: 0, x, z }
  for (const seg of segmentosDeContorno(contorno, cerrada)) {
    const len = Math.hypot(seg.x2 - seg.x1, seg.z2 - seg.z1)
    const r = distanciaPuntoSegmento(x, z, seg.x1, seg.z1, seg.x2, seg.z2)
    if (r.d < mejor.d) mejor = { d: r.d, s: acum + r.t * len, x: r.x, z: r.z }
    acum += len
  }
  return mejor
}

/** Douglas-Peucker: reduce un trazo a mano alzada conservando su silueta (tolerancia en metros). */
export function simplificarTrazo(pts: PuntoXZ[], tol: number): PuntoXZ[] {
  if (pts.length <= 2) return pts.slice()
  const keep = new Array<boolean>(pts.length).fill(false)
  keep[0] = true
  keep[pts.length - 1] = true
  const pila: [number, number][] = [[0, pts.length - 1]]
  while (pila.length) {
    const [a, b] = pila.pop()!
    let iMax = -1
    let dMax = tol
    for (let i = a + 1; i < b; i++) {
      const d = distanciaPuntoSegmento(pts[i].x, pts[i].z, pts[a].x, pts[a].z, pts[b].x, pts[b].z).d
      if (d > dMax) {
        dMax = d
        iMax = i
      }
    }
    if (iMax > 0) {
      keep[iMax] = true
      pila.push([a, iMax], [iMax, b])
    }
  }
  return pts.filter((_, i) => keep[i])
}

// ── Muro: muestras con normales ingleteadas y vanos ─────────────────────────────

export interface MuestraMuro {
  x: number
  z: number
  /** Normal (ya escalada para conservar el grosor en las esquinas): borde = p ± n·T/2. */
  nx: number
  nz: number
  /** Longitud de arco acumulada desde el primer vértice. */
  s: number
}

export interface IntervaloVano {
  s0: number
  s1: number
  /** Centro del vano en longitud de arco. */
  sc: number
  vano: VanoLibre
}

/** Intervalos [s0,s1] de los vanos sobre un contorno de largo L (los que no caben se omiten). */
export function intervalosVanos(vanos: VanoLibre[] | undefined, L: number): IntervaloVano[] {
  if (!vanos?.length || L <= 0) return []
  const out: IntervaloVano[] = []
  for (const v of vanos) {
    const half = Math.max(0.2, v.ancho) / 2
    if (2 * half + 0.1 > L) continue
    const sc = Math.min(L - half - 0.05, Math.max(half + 0.05, Math.max(0, Math.min(1, v.u)) * L))
    out.push({ s0: sc - half, s1: sc + half, sc, vano: v })
  }
  return out
}

/** Intervalo de vano que contiene la longitud de arco `s` (bordes inclusive), o null. */
export function vanoEn(intervalos: IntervaloVano[], s: number): IntervaloVano | null {
  for (const iv of intervalos) if (s >= iv.s0 && s <= iv.s1) return iv
  return null
}

/** Contorno de MURO de la forma en mundo (vacío si la forma no tiene muro o no da para uno). */
export function contornoMuro(f: FormaLibre, gridCols: number, gridRows: number): PuntoXZ[] {
  if (!tieneMuro(f.tipo)) return []
  const pts = contornoMuestreado(puntosMundoForma(f.puntos, gridCols, gridRows), formaCerrada(f), f.suave)
  return pts.length >= 2 ? pts : []
}

/** Contorno de PISO de la forma en mundo (vacío si no tiene piso o no llega a polígono). */
export function contornoPiso(f: FormaLibre, gridCols: number, gridRows: number): PuntoXZ[] {
  if (!tienePiso(f.tipo)) return []
  const pts = contornoMuestreado(puntosMundoForma(f.puntos, gridCols, gridRows), true, f.suave)
  return pts.length >= 3 ? pts : []
}

/**
 * Muestras del muro a lo largo del contorno: todos los vértices (normal ingleteada en las
 * esquinas para que el grosor no se adelgace), muestras intermedias cada `PASO_MUESTRA_LIBRE`
 * (las siluetas de arco/pico necesitan columnas) y, en cada borde de vano, un PAR de muestras
 * (fuera/dentro, separadas por ε) para que el hueco corte exactamente ahí. En cerradas la
 * última muestra repite la primera en s = L (la malla se cierra sin tapas).
 */
export function muestrasMuro(
  f: FormaLibre,
  gridCols: number,
  gridRows: number,
): { muestras: MuestraMuro[]; L: number; cerrada: boolean; vanos: IntervaloVano[] } | null {
  const pts = contornoMuro(f, gridCols, gridRows)
  if (pts.length < 2) return null
  const cerrada = formaCerrada(f) && pts.length >= MIN_PUNTOS_CERRAR
  const n = pts.length
  const nSeg = cerrada ? n : n - 1
  const segLen: number[] = []
  const segN: PuntoXZ[] = []
  const sAt: number[] = [0]
  for (let i = 0; i < nSeg; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz) || 1e-6
    segLen.push(len)
    segN.push({ x: -dz / len, z: dx / len })
    sAt.push(sAt[i] + len)
  }
  const L = sAt[nSeg]
  if (L < 0.1) return null

  // Normal ingleteada en el vértice i (bisectriz escalada por 1/cos(θ/2), acotada).
  const normalVertice = (i: number): PuntoXZ => {
    const prev = cerrada ? segN[(i - 1 + nSeg) % nSeg] : i > 0 ? segN[i - 1] : null
    const next = cerrada ? segN[i % nSeg] : i < nSeg ? segN[i] : null
    if (!prev) return next!
    if (!next) return prev
    let bx = prev.x + next.x
    let bz = prev.z + next.z
    const bl = Math.hypot(bx, bz)
    if (bl < 1e-6) return prev // media vuelta: sin inglete posible
    bx /= bl
    bz /= bl
    const factor = 1 / Math.max(0.4, bx * next.x + bz * next.z)
    return { x: bx * Math.min(factor, 2.5), z: bz * Math.min(factor, 2.5) }
  }
  // Posición y normal en la longitud de arco s (interior de un tramo).
  const enS = (s: number): MuestraMuro => {
    let k = 0
    while (k < nSeg - 1 && s > sAt[k + 1]) k++
    const t = Math.max(0, Math.min(1, (s - sAt[k]) / segLen[k]))
    const a = pts[k]
    const b = pts[(k + 1) % n]
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, nx: segN[k].x, nz: segN[k].z, s }
  }

  const vanos = intervalosVanos(f.vanos, L)
  const muestras: MuestraMuro[] = []
  for (let i = 0; i < nSeg; i++) {
    const nv = normalVertice(i)
    muestras.push({ x: pts[i].x, z: pts[i].z, nx: nv.x, nz: nv.z, s: sAt[i] })
    const pasos = Math.floor(segLen[i] / PASO_MUESTRA_LIBRE)
    for (let k = 1; k < pasos; k++) muestras.push(enS(sAt[i] + (segLen[i] * k) / pasos))
  }
  if (cerrada) {
    const nv = normalVertice(0)
    muestras.push({ x: pts[0].x, z: pts[0].z, nx: nv.x, nz: nv.z, s: L })
  } else {
    const nv = normalVertice(n - 1)
    muestras.push({ x: pts[n - 1].x, z: pts[n - 1].z, nx: nv.x, nz: nv.z, s: L })
  }
  const EPS = 0.002
  for (const iv of vanos) {
    for (const s of [iv.s0 - EPS, iv.s0, iv.s1, iv.s1 + EPS]) {
      if (s > 0 && s < L) muestras.push(enS(s))
    }
  }
  muestras.sort((a, b) => a.s - b.s)
  const out: MuestraMuro[] = []
  for (const m of muestras) {
    const q = out[out.length - 1]
    if (q && Math.abs(m.s - q.s) < 1e-6) continue
    out.push(m)
  }
  return { muestras: out, L, cerrada, vanos }
}

/**
 * Posición/dirección/normal de un vano (para la hoja de puerta `MuroLibrePuerta3D`), en
 * coordenadas de MUNDO, sobre el tramo del contorno que contiene su centro.
 */
export function aberturaVano(
  f: FormaLibre,
  vano: VanoLibre,
  gridCols: number,
  gridRows: number,
): AberturaMundo | null {
  const pts = contornoMuro(f, gridCols, gridRows)
  if (pts.length < 2) return null
  const cerrada = formaCerrada(f) && pts.length >= MIN_PUNTOS_CERRAR
  const L = longitudContorno(pts, cerrada)
  const iv = intervalosVanos([vano], L)[0]
  if (!iv) return null
  let acum = 0
  for (const seg of segmentosDeContorno(pts, cerrada)) {
    const dx = seg.x2 - seg.x1
    const dz = seg.z2 - seg.z1
    const len = Math.hypot(dx, dz) || 1e-6
    if (iv.sc <= acum + len || acum + len >= L - 1e-6) {
      const t = Math.max(0, Math.min(1, (iv.sc - acum) / len))
      const dirx = dx / len
      const dirz = dz / len
      return {
        cx: seg.x1 + dx * t,
        cz: seg.z1 + dz * t,
        dirx,
        dirz,
        ancho: iv.s1 - iv.s0,
        nx: -dirz,
        nz: dirx,
      }
    }
    acum += len
  }
  return null
}

// ── Colisión ───────────────────────────────────────────────────────────────────

/**
 * Colliders del muro de la forma: cajitas AABB muestreadas cada 0.3 m (mismo criterio que
 * las curvas/diagonales de los cuartos), con el vano de cada PUERTA abierto (+0.15 m de
 * holgura) y su zona publicada en `puertas` para que ningún objeto tape el paso. Las
 * ventanas no abren hueco de paso.
 */
export function colisionFormaLibre(
  f: FormaLibre,
  gridCols: number,
  gridRows: number,
): { muros: AABB[]; puertas: AABB[] } {
  const muros: AABB[] = []
  const puertas: AABB[] = []
  const pts = contornoMuro(f, gridCols, gridRows)
  if (pts.length < 2) return { muros, puertas }
  const cerrada = formaCerrada(f) && pts.length >= MIN_PUNTOS_CERRAR
  const L = longitudContorno(pts, cerrada)
  const huecos = intervalosVanos(f.vanos, L)
    .filter((iv) => iv.vano.tipo === 'puerta')
    .map((iv) => ({ s0: iv.s0 - 0.15, s1: iv.s1 + 0.15, sc: iv.sc, half: (iv.s1 - iv.s0) / 2 + 0.7 }))
  const enHueco = (s: number) => huecos.some((h) => s > h.s0 && s < h.s1)
  let acum = 0
  for (const seg of segmentosDeContorno(pts, cerrada)) {
    const dx = seg.x2 - seg.x1
    const dz = seg.z2 - seg.z1
    const len = Math.hypot(dx, dz)
    if (len < 0.02) continue
    const n = Math.max(2, Math.ceil(len / PASO_COLISION))
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const s = acum + len * u
      if (enHueco(s)) continue
      const px = seg.x1 + dx * u
      const pz = seg.z1 + dz * u
      muros.push({ minX: px - RC_LIBRE, maxX: px + RC_LIBRE, minZ: pz - RC_LIBRE, maxZ: pz + RC_LIBRE })
    }
    for (const h of huecos) {
      if (h.sc >= acum && h.sc <= acum + len) {
        const u = (h.sc - acum) / len
        const cx = seg.x1 + dx * u
        const cz = seg.z1 + dz * u
        puertas.push({ minX: cx - h.half, maxX: cx + h.half, minZ: cz - h.half, maxZ: cz + h.half })
      }
    }
    acum += len
  }
  return { muros, puertas }
}

/**
 * Sub-celdas (½) cuyo centro cae dentro del polígono del piso: alimentan `pisoPorNivel`
 * para que un piso libre en un nivel alto sea caminable. Se muestrea a ¼ de celda para no
 * saltarse ninguna sub-celda.
 */
export function subCeldasDePoligono(pts: PuntoXZ[]): string[] {
  const out = new Set<string>()
  if (pts.length < 3) return []
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minZ = Math.min(minZ, p.z)
    maxZ = Math.max(maxZ, p.z)
  }
  const paso = SPACING / 4
  for (let x = minX; x <= maxX; x += paso) {
    for (let z = minZ; z <= maxZ; z += paso) {
      if (!puntoEnPoligono(x, z, pts)) continue
      const { sc, sr } = worldToSubCell(x, z)
      out.add(subId(sc, sr))
    }
  }
  return [...out]
}

// ── Conversión de construcciones de rejilla ───────────────────────────────────

/**
 * Vértices (UV) equivalentes a un muro libre de REJILLA: la arista o la diagonal dan dos
 * vértices rectos; el arco de 90° se convierte en una curva suave por 5 puntos del círculo.
 */
export function poligonoDeMuroLibre(
  m: MuroLibre,
  gridCols: number,
  gridRows: number,
): { puntos: PuntoUV[]; suave: boolean } {
  if (m.clase === 'forma' && m.forma === 'circular') {
    const c = centroCeldaMundo(m.col, m.row, gridCols, gridRows)
    const arc = arcoCircularMuroLocal(m.rotacion ?? 0)
    const puntos: PuntoUV[] = []
    const N = 4
    for (let i = 0; i <= N; i++) {
      const a = arc.a0 + ((arc.a1 - arc.a0) * i) / N
      puntos.push(mundoAUV(c.x + arc.cx + arc.r * Math.cos(a), c.z + arc.cz + arc.r * Math.sin(a), gridCols, gridRows))
    }
    return { puntos, suave: true }
  }
  const segs = segmentosMundoMuroLibre(m, gridCols, gridRows)
  if (!segs.length) return { puntos: [], suave: false }
  const s = segs[0]
  return {
    puntos: [mundoAUV(s.x1, s.z1, gridCols, gridRows), mundoAUV(s.x2, s.z2, gridCols, gridRows)],
    suave: false,
  }
}

const DELTA_LADO: Record<SideKey, { col: number; row: number }> = {
  N: { col: 0, row: -1 },
  S: { col: 0, row: 1 },
  E: { col: 1, row: 0 },
  O: { col: -1, row: 0 },
}

/** Lado recto de una celda (centro wx,wz) en mundo. */
function ladoSeg(wx: number, wz: number, side: SideKey): SegMundo {
  switch (side) {
    case 'N':
      return { x1: wx - HALF, z1: wz - HALF, x2: wx + HALF, z2: wz - HALF }
    case 'S':
      return { x1: wx - HALF, z1: wz + HALF, x2: wx + HALF, z2: wz + HALF }
    case 'E':
      return { x1: wx + HALF, z1: wz - HALF, x2: wx + HALF, z2: wz + HALF }
    default:
      return { x1: wx - HALF, z1: wz - HALF, x2: wx - HALF, z2: wz + HALF }
  }
}

/** Extra del perímetro (diagonal o arco, ya en coordenadas absolutas) → segmentos rectos. */
function segsDeExtra(m: MuroExtraPerimetro, out: SegMundo[]) {
  if (m.tipo === 'diagonal') {
    out.push({ x1: m.x1, z1: m.z1, x2: m.x2, z2: m.z2 })
    return
  }
  let da = m.a1 - m.a0
  while (da > Math.PI) da -= 2 * Math.PI
  while (da <= -Math.PI) da += 2 * Math.PI
  const n = m.r >= SIZE * 0.9 ? 6 : 4
  let px = m.cx + m.r * Math.cos(m.a0)
  let pz = m.cz + m.r * Math.sin(m.a0)
  for (let i = 1; i <= n; i++) {
    const a = m.a0 + (da * i) / n
    const x = m.cx + m.r * Math.cos(a)
    const z = m.cz + m.r * Math.sin(a)
    out.push({ x1: px, z1: pz, x2: x, z2: z })
    px = x
    pz = z
  }
}

/**
 * Contorno exterior de un cuarto (footprint + formas por celda, enteras y finas) como anillo
 * de vértices UV: base de «liberar la forma del cuarto». Encadena los tramos del perímetro
 * (lados de rejilla vivos, diagonales, arcos discretizados y mitades finas) y se queda con el
 * anillo cerrado más largo; los vértices colineales se eliminan. null si no cierra.
 */
export function contornoCuartoUV(
  anchor: Cell,
  fp: Footprint,
  formasCelda: FormasCeldaMap | undefined,
  gridCols: number,
  gridRows: number,
): PuntoUV[] | null {
  const propias = new Set(fp.map((c) => cellId(c.col, c.row)))
  const segs: SegMundo[] = []
  for (const off of fp) {
    const [wx, , wz] = cellToWorld(anchor.col + off.col, anchor.row + off.row)
    const forma = formaEnCelda(formasCelda, claveCeldaOff(off.col, off.row))
    const sub = subformasDeCelda(formasCelda, off.col, off.row)
    const externos = new Set<SideKey>()
    for (const side of SIDE_KEYS) {
      const d = DELTA_LADO[side]
      if (propias.has(cellId(off.col + d.col, off.row + d.row))) continue
      externos.add(side)
      if (ladoGrillaActivoEnMapa(formasCelda, off.col, off.row, side)) segs.push(ladoSeg(wx, wz, side))
    }
    if (!esFormaCuadrada(forma)) {
      for (const e of perimetroFormaCelda(forma, wx, wz)?.extras ?? []) segsDeExtra(e, segs)
    } else if (sub) {
      for (const item of itemsPerimetroSubformas(sub, wx, wz, externos)) for (const e of item.extras) segsDeExtra(e, segs)
    }
  }
  return anilloDeSegmentos(segs, gridCols, gridRows)
}

/** Encadena segmentos por extremos coincidentes y devuelve el anillo cerrado más largo (UV). */
function anilloDeSegmentos(segs: SegMundo[], gridCols: number, gridRows: number): PuntoUV[] | null {
  const clave = (x: number, z: number) => `${Math.round(x * 1000)},${Math.round(z * 1000)}`
  const ady = new Map<string, number[]>()
  segs.forEach((s, i) => {
    for (const k of [clave(s.x1, s.z1), clave(s.x2, s.z2)]) {
      const arr = ady.get(k)
      if (arr) arr.push(i)
      else ady.set(k, [i])
    }
  })
  const usado = new Array<boolean>(segs.length).fill(false)
  let mejor: PuntoXZ[] | null = null
  let mejorL = 0
  for (let i0 = 0; i0 < segs.length; i0++) {
    if (usado[i0]) continue
    usado[i0] = true
    const inicio = { x: segs[i0].x1, z: segs[i0].z1 }
    const anillo: PuntoXZ[] = [inicio]
    let cur = { x: segs[i0].x2, z: segs[i0].z2 }
    let cerrado = false
    let largo = Math.hypot(cur.x - inicio.x, cur.z - inicio.z)
    for (let paso = 0; paso < segs.length; paso++) {
      if (clave(cur.x, cur.z) === clave(inicio.x, inicio.z)) {
        cerrado = true
        break
      }
      anillo.push(cur)
      const j = (ady.get(clave(cur.x, cur.z)) ?? []).find((k) => !usado[k])
      if (j == null) break
      usado[j] = true
      const s = segs[j]
      const sig =
        clave(s.x1, s.z1) === clave(cur.x, cur.z) ? { x: s.x2, z: s.z2 } : { x: s.x1, z: s.z1 }
      largo += Math.hypot(sig.x - cur.x, sig.z - cur.z)
      cur = sig
    }
    if (cerrado && anillo.length >= 3 && largo > mejorL) {
      mejor = anillo
      mejorL = largo
    }
  }
  if (!mejor) return null
  // Quitar vértices colineales (lados de celdas contiguas se funden en uno).
  const n = mejor.length
  const limpio = mejor.filter((p, i) => {
    const a = mejor![(i - 1 + n) % n]
    const b = mejor![(i + 1) % n]
    const cruz = (p.x - a.x) * (b.z - p.z) - (p.z - a.z) * (b.x - p.x)
    return Math.abs(cruz) > 1e-4
  })
  return (limpio.length >= 3 ? limpio : mejor).map((p) => mundoAUV(p.x, p.z, gridCols, gridRows))
}

/** Grosor del muro libre (el mismo de los cuartos). */
export const GROSOR_MURO_LIBRE = WALL_T

// ── Techo del recinto ────────────────────────────────────────────────────────────

/** Área con signo del polígono: su signo dice hacia qué lado apunta `(dz, −dx)`. */
export function areaConSigno(pts: PuntoXZ[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    a += p.x * q.z - q.x * p.z
  }
  return a / 2
}

/**
 * Polígono desplazado `d` metros hacia FUERA (normal ingleteada en cada vértice, acotada
 * para que las esquinas agudas no disparen). Con `d` negativo se contrae.
 */
export function contornoDesplazado(pts: PuntoXZ[], d: number): PuntoXZ[] {
  const n = pts.length
  if (n < 3 || d === 0) return pts
  const signo = areaConSigno(pts) >= 0 ? 1 : -1
  const normal = (a: PuntoXZ, b: PuntoXZ): PuntoXZ => {
    const dx = b.x - a.x
    const dz = b.z - a.z
    const l = Math.hypot(dx, dz) || 1
    return { x: (signo * dz) / l, z: (-signo * dx) / l }
  }
  const out: PuntoXZ[] = []
  for (let i = 0; i < n; i++) {
    const n1 = normal(pts[(i - 1 + n) % n], pts[i])
    const n2 = normal(pts[i], pts[(i + 1) % n])
    let bx = n1.x + n2.x
    let bz = n1.z + n2.z
    const bl = Math.hypot(bx, bz)
    if (bl < 1e-6) {
      bx = n2.x
      bz = n2.z
    } else {
      bx /= bl
      bz /= bl
    }
    // Inglete: 1/cos(θ/2), acotado como en las muestras del muro.
    const k = d / Math.max(0.4, bx * n2.x + bz * n2.z)
    out.push({ x: pts[i].x + bx * k, z: pts[i].z + bz * k })
  }
  return out
}

/**
 * Polígono convexo (todos los giros en el mismo sentido; los casi colineales no cuentan).
 * Una tienda (abanico hacia un ápice) solo tiene sentido sobre un polígono convexo.
 */
export function esPoligonoConvexo(pts: PuntoXZ[]): boolean {
  const n = pts.length
  if (n < 3) return false
  let signo = 0
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    const c = pts[(i + 2) % n]
    const cruz = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x)
    if (Math.abs(cruz) < 1e-6) continue
    const s = cruz > 0 ? 1 : -1
    if (signo === 0) signo = s
    else if (s !== signo) return false
  }
  return true
}

/** La forma admite techo: muro cerrado que encierra área (recinto o muro cerrado). */
export const tieneTecho = (f: Pick<FormaLibre, 'tipo' | 'cerrada' | 'puntos'>) =>
  tieneMuro(f.tipo) && formaCerrada(f) && (f.puntos?.length ?? 0) >= MIN_PUNTOS_CERRAR

/**
 * Contorno del TECHO de una forma: el muro cerrado desplazado medio grosor hacia fuera, para
 * que la losa cubra la cara exterior del muro (como las losetas de los cuartos). Vacío si la
 * forma no admite techo.
 */
export function contornoTecho(f: FormaLibre, gridCols: number, gridRows: number): PuntoXZ[] {
  if (!tieneTecho(f)) return []
  const pts = contornoMuro(f, gridCols, gridRows)
  if (pts.length < MIN_PUNTOS_CERRAR) return []
  return contornoDesplazado(pts, WALL_T / 2)
}

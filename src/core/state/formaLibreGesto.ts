import type { FormaLibre, MuroLibre } from '../data/db'
import { usePlanos } from './planosStore'
import { useLayout } from './layoutStore'
import { useConfirmar } from './confirmarStore'
import { useFormaLibre, formasLibresDelNivel, puntosEfectivos, type HitLibre } from './formaLibreStore'
import { FOOTPRINT_DEFAULT, HALF, WALL_T, cellToWorld, footprintCells } from '../house/walls'
import { segmentosMundoMuroLibre } from '../house/murosLibre'
import {
  MIN_PUNTOS_CERRAR,
  contornoMuestreado,
  contornoMuro,
  distanciaAContorno,
  distanciaPuntoSegmento,
  formaCerrada,
  longitudContorno,
  mundoAUV,
  puntoEnPoligono,
  puntosMundoForma,
  simplificarTrazo,
  tienePiso,
  uvAMundo,
  verticeCercano,
  type PuntoXZ,
} from '../house/formasLibre'

/**
 * Gestos del modo Libre, COMPARTIDOS por el croquis 2D y el mapa 3D: los controladores
 * solo traducen los eventos de puntero a puntos de mundo (x,z) y llaman a `gestoDown`,
 * `gestoMove` y `gestoUp`. Toda la semántica (dibujar, seleccionar, arrastrar vértices,
 * insertar, borrar, vanos, convertir rejilla) vive aquí, una sola vez.
 */

export interface CtxGesto {
  gridCols: number
  gridRows: number
  nivel: number
  /** Radio de agarre de un vértice, en metros (≈ 12 px al zoom actual). */
  radioVert: number
}

/** Distancia (px) a partir de la cual un gesto es arrastre y no clic. */
export const UMBRAL_ARRASTRE_PX = 6
/** Separación mínima (m) entre muestras del trazo a mano alzada. */
const PASO_TRAZO = 0.18
/** Tolerancia (m) del simplificado del trazo a mano alzada. */
const TOL_TRAZO = 0.14

// Muros libres de REJILLA visibles (los publica el componente 3D; sirven para «convertir»).
let murosRejilla: MuroLibre[] = []
export function publicarMurosRejilla(lista: MuroLibre[]) {
  murosRejilla = lista
}

/** Estado interno del gesto en curso (un solo puntero). */
let down: PuntoXZ | null = null
let hitDown: HitLibre = null
let trazo: PuntoXZ[] | null = null

/** Vértices (mundo) de una forma, con la edición en vivo si la hay. */
function verticesMundo(f: FormaLibre, ctx: CtxGesto): PuntoXZ[] {
  return puntosMundoForma(puntosEfectivos(f, useFormaLibre.getState().edicion), ctx.gridCols, ctx.gridRows)
}

/** Contorno efectivo (muestreado) de la forma en mundo y si está cerrado. */
function contornoDe(f: FormaLibre, ctx: CtxGesto): { contorno: PuntoXZ[]; cerrada: boolean } {
  const pts = verticesMundo(f, ctx)
  const cerrada = formaCerrada(f) && pts.length >= MIN_PUNTOS_CERRAR
  return { contorno: contornoMuestreado(pts, cerrada, f.suave), cerrada }
}

/** ¿El punto toca el BORDE de la forma (muro o contorno del piso)? */
function tocaBorde(f: FormaLibre, x: number, z: number, ctx: CtxGesto): boolean {
  const { contorno, cerrada } = contornoDe(f, ctx)
  if (contorno.length < 2) return false
  const tol = WALL_T / 2 + Math.max(0.15, ctx.radioVert * 0.6)
  return distanciaAContorno(contorno, cerrada, x, z).d <= tol
}

/** Área (m²) del piso de la forma si el punto cae DENTRO; null si no tiene piso o está fuera. */
function areaSiDentro(f: FormaLibre, x: number, z: number, ctx: CtxGesto): number | null {
  if (!tienePiso(f.tipo)) return null
  const { contorno } = contornoDe(f, ctx)
  if (contorno.length < 3 || !puntoEnPoligono(x, z, contorno)) return null
  let a = 0
  for (let i = 0, j = contorno.length - 1; i < contorno.length; j = i++) {
    a += contorno[j].x * contorno[i].z - contorno[i].x * contorno[j].z
  }
  return Math.abs(a) / 2
}

/** Cuarto de rejilla del nivel que contiene el punto. */
function cuartoEnPunto(x: number, z: number, nivel: number): string | null {
  const L = useLayout.getState()
  for (const id of Object.keys(L.placed)) {
    if (!L.placed[id] || !L.cells[id] || (L.niveles[id] ?? 0) !== nivel) continue
    for (const c of footprintCells(L.cells[id], L.footprints[id] ?? FOOTPRINT_DEFAULT)) {
      const [wx, , wz] = cellToWorld(c.col, c.row)
      if (Math.abs(x - wx) <= HALF && Math.abs(z - wz) <= HALF) return id
    }
  }
  return null
}

/** Muro libre de rejilla del nivel cerca del punto. */
function muroRejillaEnPunto(x: number, z: number, ctx: CtxGesto): number | null {
  const tol = WALL_T / 2 + Math.max(0.15, ctx.radioVert * 0.6)
  for (const m of murosRejilla) {
    if (m.nivel !== ctx.nivel || m.id == null) continue
    for (const s of segmentosMundoMuroLibre(m, ctx.gridCols, ctx.gridRows)) {
      if (distanciaPuntoSegmento(x, z, s.x1, s.z1, s.x2, s.z2).d <= tol) return m.id
    }
  }
  return null
}

/**
 * Qué hay bajo el punto (mundo). Prioridad: los vértices y puntos medios de la forma
 * seleccionada; después el BORDE de cualquier forma (la más reciente encima) — así una
 * forma dibujada dentro de un recinto sigue siendo alcanzable aunque el recinto esté
 * seleccionado—; luego el interior de los pisos (el más pequeño gana, para poder tocar
 * un piso anidado); por último los muros de rejilla y los cuartos.
 */
export function hitFormaLibre(x: number, z: number, ctx: CtxGesto): HitLibre {
  const formas = formasLibresDelNivel(ctx.nivel)
  const selId = usePlanos.getState().formaLibreSel
  const sel = selId != null ? formas.find((f) => f.id === selId) : undefined
  if (sel?.id != null) {
    const pts = verticesMundo(sel, ctx)
    const iv = verticeCercano(pts, x, z, ctx.radioVert)
    if (iv >= 0) return { tipo: 'vertice', id: sel.id, i: iv }
    const cerrada = formaCerrada(sel) && pts.length >= MIN_PUNTOS_CERRAR
    const n = pts.length
    const m = cerrada ? n : n - 1
    let mejor: { i: number; d: number; x: number; z: number } | null = null
    for (let i = 0; i < m; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % n]
      const mx = (a.x + b.x) / 2
      const mz = (a.z + b.z) / 2
      const d = Math.hypot(mx - x, mz - z)
      if (d < ctx.radioVert && (!mejor || d < mejor.d)) mejor = { i, d, x: mx, z: mz }
    }
    if (mejor) return { tipo: 'tramo', id: sel.id, i: mejor.i, x: mejor.x, z: mejor.z }
  }
  for (let k = formas.length - 1; k >= 0; k--) {
    const f = formas[k]
    if (f.id != null && tocaBorde(f, x, z, ctx)) return { tipo: 'forma', id: f.id }
  }
  let dentro: { id: number; area: number } | null = null
  for (const f of formas) {
    if (f.id == null) continue
    const area = areaSiDentro(f, x, z, ctx)
    if (area != null && (!dentro || area < dentro.area)) dentro = { id: f.id, area }
  }
  if (dentro) return { tipo: 'forma', id: dentro.id }
  const mr = muroRejillaEnPunto(x, z, ctx)
  if (mr != null) return { tipo: 'muroRejilla', id: mr }
  const rid = cuartoEnPunto(x, z, ctx.nivel)
  if (rid) return { tipo: 'cuarto', roomId: rid }
  return null
}

function formaPorId(id: number, ctx: CtxGesto): FormaLibre | undefined {
  return formasLibresDelNivel(ctx.nivel).find((f) => f.id === id)
}

/** Vértices del borrador en mundo. */
function borradorMundo(ctx: CtxGesto): PuntoXZ[] {
  const b = useFormaLibre.getState().borrador
  return b ? puntosMundoForma(b, ctx.gridCols, ctx.gridRows) : []
}

/** ¿Hay un arrastre de vértice/forma en curso? (el controlador captura el puntero). */
export const arrastrandoFormaLibre = () => useFormaLibre.getState().arrastre != null

/** Puntero abajo en (x,z) de mundo. Devuelve true si el gesto quiere capturar el puntero. */
export function gestoDown(p: PuntoXZ, ctx: CtxGesto): boolean {
  down = p
  trazo = null
  hitDown = null
  const herr = usePlanos.getState().herramienta
  const S = useFormaLibre.getState()
  if (herr === 'seleccionar') {
    const h = hitFormaLibre(p.x, p.z, ctx)
    hitDown = h
    if (h?.tipo === 'vertice') {
      const f = formaPorId(h.id, ctx)
      if (f) S.empezarArrastreVertice(f, h.i)
      return true
    }
    if (h?.tipo === 'tramo') {
      const f = formaPorId(h.id, ctx)
      if (f) void S.insertarVertice(f, h.i, mundoAUV(h.x, h.z, ctx.gridCols, ctx.gridRows))
      return true
    }
    if (h?.tipo === 'forma' && h.id === usePlanos.getState().formaLibreSel) {
      const f = formaPorId(h.id, ctx)
      if (f) S.empezarArrastreForma(f, mundoAUV(p.x, p.z, ctx.gridCols, ctx.gridRows))
      return true
    }
    return false
  }
  // Dibujar: el arrastre se decide al moverse (mano alzada); el clic, al soltar.
  return herr === 'trazar'
}

/**
 * Puntero en movimiento. `arrastre` = ya se superó el umbral de clic desde el down (o no
 * hay down). Con el botón suelto solo actualiza el hover.
 */
export function gestoMove(p: PuntoXZ | null, ctx: CtxGesto, arrastre: boolean): void {
  const S = useFormaLibre.getState()
  if (S.arrastre) {
    if (p) S.moverArrastre(mundoAUV(p.x, p.z, ctx.gridCols, ctx.gridRows))
    return
  }
  const herr = usePlanos.getState().herramienta
  if (down && arrastre && herr === 'trazar') {
    if (!p) return
    if (!trazo) trazo = [down]
    const ult = trazo[trazo.length - 1]
    if (Math.hypot(p.x - ult.x, p.z - ult.z) >= PASO_TRAZO) trazo.push(p)
    S.setHover(null)
    return
  }
  if (!down) S.setHover(p ? hitFormaLibre(p.x, p.z, ctx) : null)
}

/** Puntero arriba. `fueArrastre` = se movió más del umbral desde el down. */
export function gestoUp(p: PuntoXZ | null, ctx: CtxGesto, fueArrastre: boolean): void {
  const S = useFormaLibre.getState()
  const P = usePlanos.getState()
  const herr = P.herramienta
  const d = down
  const hd = hitDown
  const tz = trazo
  down = null
  hitDown = null
  trazo = null

  if (S.arrastre) {
    void S.soltarArrastre()
    return
  }
  if (!d) return

  if (herr === 'trazar') {
    if (tz && tz.length >= 2) {
      // Mano alzada: se simplifica el trazo y se pega al borrador.
      const pts = simplificarTrazo(p ? [...tz, p] : tz, TOL_TRAZO)
      S.agregarTrazoBorrador(pts.map((q) => mundoAUV(q.x, q.z, ctx.gridCols, ctx.gridRows)))
      return
    }
    if (fueArrastre || !p) return
    const b = borradorMundo(ctx)
    // Tocar el primer vértice (con 3 o más) cierra la forma y la termina.
    if (b.length >= MIN_PUNTOS_CERRAR && Math.hypot(b[0].x - p.x, b[0].z - p.z) <= ctx.radioVert) {
      void S.terminarBorrador(true)
      return
    }
    S.agregarPuntoBorrador(mundoAUV(p.x, p.z, ctx.gridCols, ctx.gridRows))
    return
  }

  if (fueArrastre || !p) return
  const h = hd ?? hitFormaLibre(p.x, p.z, ctx)

  if (herr === 'seleccionar') {
    if (h?.tipo === 'forma') {
      P.setFormaLibreSel(h.id)
      P.setMuroLibreSel(null)
      if (P.seleccion) P.setSeleccion(null)
    } else if (h?.tipo === 'muroRejilla') {
      P.setFormaLibreSel(null)
      P.setMuroLibreSel(h.id)
      if (P.seleccion) P.setSeleccion(null)
    } else if (h?.tipo === 'cuarto') {
      P.setFormaLibreSel(null)
      P.setMuroLibreSel(null)
      P.setSeleccion({ tipo: 'cuarto', roomId: h.roomId })
    } else if (!h) {
      P.setFormaLibreSel(null)
      P.setMuroLibreSel(null)
      if (P.seleccion) P.setSeleccion(null)
    }
    return
  }

  if (herr === 'borrar') {
    if (h?.tipo === 'vertice') {
      const f = formaPorId(h.id, ctx)
      if (f) void S.borrarVertice(f, h.i)
    } else if (h?.tipo === 'forma') {
      P.setFormaLibreSel(h.id)
    }
    return
  }

  if (herr === 'puerta' || herr === 'ventana') {
    // El vano va sobre el muro más cercano al punto tocado (seleccionado o no).
    const objetivo = h && (h.tipo === 'forma' || h.tipo === 'vertice' || h.tipo === 'tramo') ? formaPorId(h.id, ctx) : undefined
    if (!objetivo?.id) return
    const contorno = contornoMuro(objetivo, ctx.gridCols, ctx.gridRows)
    if (contorno.length < 2) return
    const cerrada = formaCerrada(objetivo) && contorno.length >= MIN_PUNTOS_CERRAR
    const L = longitudContorno(contorno, cerrada)
    const cerca = distanciaAContorno(contorno, cerrada, p.x, p.z)
    if (L <= 0 || cerca.d > 1.2) return
    P.setFormaLibreSel(objetivo.id)
    void S.alternarVano(objetivo, cerca.s / L, herr)
  }
}

/** Cancela el gesto en curso (p. ej. el puntero se perdió). */
export function gestoCancelar(): void {
  down = null
  hitDown = null
  trazo = null
  const S = useFormaLibre.getState()
  if (S.arrastre) void S.soltarArrastre()
}

/** Trazo a mano alzada en curso (mundo), para el fantasma. */
export function trazoEnCurso(): PuntoXZ[] | null {
  return trazo
}

/** Teclado del modo Libre: Escape cancela/deselecciona, Retroceso quita el último punto, Intro termina. */
export function gestoTecla(key: string): boolean {
  const S = useFormaLibre.getState()
  const P = usePlanos.getState()
  if (P.modo !== 'libre') return false
  // Con un diálogo de confirmación abierto, Escape es suyo (cancela), no deselecciona.
  if (useConfirmar.getState().pendiente) return false
  if (key === 'Escape') {
    if (S.borrador) S.cancelarBorrador()
    else if (P.formaLibreSel != null) P.setFormaLibreSel(null)
    else return false
    return true
  }
  if ((key === 'Backspace' || key === 'Delete') && S.borrador) {
    S.quitarUltimoBorrador()
    return true
  }
  if (key === 'Enter' && S.borrador) {
    void S.terminarBorrador(S.tipoNuevo !== 'muro')
    return true
  }
  return false
}

/** Vértices del borrador en mundo (para pintarlo). */
export function borradorEnMundo(gridCols: number, gridRows: number): PuntoXZ[] {
  const b = useFormaLibre.getState().borrador
  return b ? b.map((q) => uvAMundo(q, gridCols, gridRows)) : []
}

import type { Pieza3D } from '../chat/mascotas'
import type { ObjetoCuarto } from '../data/db'
import { nivelesDe, superficiesDeMueble, type Superficie } from '../muebles/superficies'
import { ALTO_BURO, ALTO_MESA_SALA, TIPO_DESPERTADOR, TIPO_GLOBO } from './especialesPlantillaMeta'
import { defSeparable } from './separables'

/**
 * Objetos APOYADOS en un mueble (`apoyoId` + `apoyoNivel`): la geometría pura de
 * dónde caen y cómo siguen al mueble. En metros y en las coordenadas del cuarto
 * (las mismas `x`/`z` de `ObjetoCuarto`). Sin stores: la usan `disenoStore`, los
 * controladores de arrastre y la siembra.
 *
 * «Mueble» es todo lo que tiene superficies: una receta del taller o un
 * compuesto ya separado (el escritorio de la laptop, el sofá, la repisa de
 * juegos), con las que declara `separables.ts`.
 */

/**
 * Nivel de las partes que descansan en el SUELO junto a su base (el banco del
 * piano, la torre de la computadora): viajan con ella, pero al arrastrarlas
 * solas `apoyoEn` nunca devuelve este nivel y quedan independientes.
 */
export const NIVEL_SUELO = -1

type ConSuperficies = Pick<ObjetoCuarto, 'mueble' | 'separado' | 'tipo' | 'tipoOriginal'>

/** Dónde se puede apoyar algo en `o` (mm, locales): su receta o lo que declara al separarse. */
export function superficiesDeObjeto(o: ConSuperficies): Superficie[] {
  if (o.mueble) return superficiesDeMueble(o.mueble)
  return (o.separado && defSeparable(o)?.superficies) || []
}

/** El nivel «a la mano» (el más alto hasta 1.3 m): la cubierta de un escritorio, el entrepaño medio de un librero. */
export function nivelAMano(sup: Superficie[]): number {
  const aMano = sup.filter((s) => s.y <= ALTO_MANO).map((s) => s.nivel)
  return aMano.length ? Math.max(...aMano) : 0
}

/**
 * Modelos que ya traen su propia altura dentro (se sembraban en la misma x/z que
 * el mueble y arrancan a la altura del tope viejo). Al apoyarlos se resta: si
 * no, flotarían esa altura por encima de la superficie.
 */
export const BASE_HORNEADA: Record<string, number> = {
  'recurso:50': 0.54,
  'recurso:69': 0.65,
  'recurso:40': 0.675,
  [TIPO_DESPERTADOR]: ALTO_BURO,
  [TIPO_GLOBO]: ALTO_MESA_SALA,
}

/** Lo que la siembra deja encima de un mueble: se enlaza solo al sembrar o migrar. */
export const TIPOS_ENCIMA = new Set(Object.keys(BASE_HORNEADA))

/** Por encima de esto (mm) un entrepaño ya no está «a la mano» al soltar algo. */
const ALTO_MANO = 1300

type Pos = Pick<ObjetoCuarto, 'x' | 'z' | 'rotY' | 'escala'>

/** Punto del cuarto → sistema del mueble (m, sin escala), con el mismo giro que `rotation=[0, rotY, 0]`. */
export function aLocal(f: Pos, x: number, z: number): [number, number] {
  const r = ((f.rotY ?? 0) * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  const e = f.escala ?? 1
  const dx = x - (f.x ?? 0)
  const dz = z - (f.z ?? 0)
  return [(c * dx - s * dz) / e, (s * dx + c * dz) / e]
}

/** Sistema del mueble → punto del cuarto. */
export function aCuarto(f: Pos, lx: number, lz: number): [number, number] {
  const r = ((f.rotY ?? 0) * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  const e = f.escala ?? 1
  const sx = lx * e
  const sz = lz * e
  return [(f.x ?? 0) + c * sx + s * sz, (f.z ?? 0) - s * sx + c * sz]
}

/** Altura `y` que deja al objeto `a` sentado en el nivel `nivel` del mueble `f` (en el suelo, a su altura). */
export function yApoyo(f: ObjetoCuarto, nivel: number, a: Pick<ObjetoCuarto, 'tipo' | 'escala'>): number {
  if (nivel === NIVEL_SUELO) return Math.max(0, f.y ?? 0)
  const tope = Math.max(0, ...superficiesDeObjeto(f).filter((s) => s.nivel === nivel).map((s) => s.y))
  const y = (f.y ?? 0) + tope * 0.001 * (f.escala ?? 1) - (BASE_HORNEADA[a.tipo] ?? 0) * (a.escala ?? 1)
  return Math.max(0, y)
}

/** Niveles del mueble que cubren el punto (x, z) del cuarto. */
function nivelesEn(f: ObjetoCuarto, x: number, z: number): number[] {
  const sup = superficiesDeObjeto(f)
  if (!sup.length) return []
  const [lx, lz] = aLocal(f, x, z).map((v) => v * 1000)
  const niveles = new Set<number>()
  for (const s of sup) {
    const dentro = s.disco
      ? Math.hypot(lx - s.cx, lz - s.cz) <= s.ancho / 2
      : Math.abs(lx - s.cx) <= s.ancho / 2 && Math.abs(lz - s.cz) <= s.fondo / 2
    if (dentro) niveles.add(s.nivel)
  }
  return [...niveles].sort((a, b) => a - b)
}

/** ¿`f` está (directa o indirectamente) apoyado en `o`? Evita ciclos al encajar. */
function cuelgaDe(objetos: ObjetoCuarto[], f: ObjetoCuarto, oId: number): boolean {
  let actual: ObjetoCuarto | undefined = f
  for (let i = 0; actual?.apoyoId != null && i < 8; i++) {
    if (actual.apoyoId === oId) return true
    const sig: number = actual.apoyoId
    actual = objetos.find((x) => x.id === sig)
  }
  return false
}

export interface Apoyo {
  apoyoId: number
  apoyoNivel: number
  y: number
}

/**
 * ¿Dónde queda `o` si se suelta en (x, z)? El mueble del taller del mismo cuarto
 * que cubra el punto (el que ya tenía, si sigue debajo) y su nivel: el que ya
 * tenía si aún lo cubre; si no, el más alto a la mano (un escritorio da su
 * cubierta, un librero su entrepaño medio); si no, el más bajo.
 */
export function apoyoEn(objetos: ObjetoCuarto[], o: ObjetoCuarto, x: number, z: number): Apoyo | null {
  const candidatos = objetos.filter(
    (f) =>
      f.id != null &&
      f.id !== o.id &&
      f.roomId === o.roomId &&
      superficiesDeObjeto(f).length > 0 &&
      !(o.id != null && cuelgaDe(objetos, f, o.id)),
  )
  candidatos.sort((a, b) => Number(b.id === o.apoyoId) - Number(a.id === o.apoyoId))
  for (const f of candidatos) {
    const niveles = nivelesEn(f, x, z)
    if (!niveles.length) continue
    let nivel: number
    if (f.id === o.apoyoId && o.apoyoNivel != null && niveles.includes(o.apoyoNivel)) nivel = o.apoyoNivel
    else {
      const sup = superficiesDeObjeto(f)
      const aMano = niveles.filter((n) => sup.some((s) => s.nivel === n && s.y <= ALTO_MANO))
      nivel = aMano.length ? aMano[aMano.length - 1] : niveles[0]
    }
    return { apoyoId: f.id!, apoyoNivel: nivel, y: yApoyo(f, nivel, o) }
  }
  return null
}

/** Mueble del taller al que el personaje puede dejarle encima lo que carga. */
export interface MuebleAlAlcance {
  mueble: ObjetoCuarto
  /** Punto de la superficie más cercano al personaje, en coordenadas del cuarto. */
  x: number
  z: number
  nivel: number
  /** Cuántos niveles tiene (para ofrecer elegir). */
  niveles: number
}

/** Margen desde el borde de la superficie: el objeto no queda colgando del canto. */
const MARGEN_BORDE = 0.05

/**
 * Jugando, el personaje no puede meterse DENTRO de un mueble (colisiona con su
 * huella), así que soltar donde está nunca cae en una repisa. Esto busca el
 * mueble del taller del mismo cuarto cuya superficie quede a `alcance` metros
 * de (x, z) —la posición del personaje— y el punto de ella más cercano. Nivel:
 * el pedido si existe; si no, el mismo «a la mano» que `apoyoEn`.
 */
export function muebleAlAlcance(
  objetos: ObjetoCuarto[],
  o: ObjetoCuarto,
  x: number,
  z: number,
  nivelPedido?: number | null,
  alcance = 1.2,
): MuebleAlAlcance | null {
  let mejor: (MuebleAlAlcance & { d: number }) | null = null
  for (const f of objetos) {
    if (f.id == null || f.id === o.id || f.roomId !== o.roomId) continue
    if (o.id != null && cuelgaDe(objetos, f, o.id)) continue
    const sup = superficiesDeObjeto(f)
    const total = nivelesDe(sup)
    if (!total) continue
    const nivel = nivelPedido != null && nivelPedido >= 0 && nivelPedido < total ? nivelPedido : nivelAMano(sup)
    const e = f.escala ?? 1
    const [lx, lz] = aLocal(f, x, z)
    for (const s of sup) {
      if (s.nivel !== nivel) continue
      const cx = s.cx / 1000
      const cz = s.cz / 1000
      let px: number
      let pz: number
      if (s.disco) {
        const r = Math.max(0, s.ancho / 2000 - MARGEN_BORDE)
        const dx = lx - cx
        const dz = lz - cz
        const len = Math.hypot(dx, dz)
        const k = len > r ? r / len : 1
        px = cx + dx * k
        pz = cz + dz * k
      } else {
        const hx = Math.max(0, s.ancho / 2000 - MARGEN_BORDE)
        const hz = Math.max(0, s.fondo / 2000 - MARGEN_BORDE)
        px = Math.max(cx - hx, Math.min(cx + hx, lx))
        pz = Math.max(cz - hz, Math.min(cz + hz, lz))
      }
      const d = Math.hypot(lx - px, lz - pz) * e
      if (d > alcance || (mejor && d >= mejor.d)) continue
      const [wx, wz] = aCuarto(f, px, pz)
      mejor = { mueble: f, x: wx, z: wz, nivel, niveles: total, d }
    }
  }
  return mejor && { mueble: mejor.mueble, x: mejor.x, z: mejor.z, nivel: mejor.nivel, niveles: mejor.niveles }
}

/**
 * Media extensión en X de una pieza ya girada: la de su caja envolvente (un
 * cilindro acostado mide su alto; una esfera, su radio).
 */
function medioAnchoPieza(p: Pieza3D): number {
  const t = p.tam
  const [hx, hy, hz] =
    p.tipo === 'caja'
      ? [(t[0] ?? 0) / 2, (t[1] ?? 0) / 2, (t[2] ?? 0) / 2]
      : p.tipo === 'esfera'
        ? [t[0] ?? 0, t[0] ?? 0, t[0] ?? 0]
        : p.tipo === 'plano'
          ? [(t[0] ?? 0) / 2, (t[1] ?? 0) / 2, 0]
          : p.tipo === 'cono'
            ? [t[0] ?? 0, (t[1] ?? 0) / 2, t[0] ?? 0]
            : [Math.max(t[0] ?? 0, t[1] ?? 0), (t[2] ?? 0) / 2, Math.max(t[0] ?? 0, t[1] ?? 0)]
  // Primera fila de la matriz de giro de un Euler XYZ (el de three).
  const [, b, c] = p.rot ?? [0, 0, 0]
  return Math.abs(Math.cos(b) * Math.cos(c)) * hx + Math.abs(Math.cos(b) * Math.sin(c)) * hy + Math.abs(Math.sin(b)) * hz
}

/** Ancho (m, eje X del objeto) de lo ya apoyado: el de sus piezas, o uno genérico. */
function anchoDe(a: ObjetoCuarto): number {
  if (!a.piezas?.length) return 0.3
  const borde = Math.max(...a.piezas.map((p) => Math.abs(p.pos[0]) + medioAnchoPieza(p)))
  return 2 * borde * (a.escala ?? 1)
}

/**
 * Alto (m, sobre la base de `f`) de lo que está apoyado en `f` justo sobre el
 * punto (x, z) del cuarto, o 0 si no hay nada: sentarse en el sofá cae sobre
 * sus cojines, que son objetos aparte.
 */
export function altoEncima(objetos: ObjetoCuarto[], f: ObjetoCuarto, x: number, z: number): number {
  const [px, pz] = aLocal(f, x, z)
  let alto = 0
  for (const a of objetos) {
    if (a.apoyoId !== f.id || a.apoyoNivel === NIVEL_SUELO || !a.piezas?.length) continue
    const [lx, lz] = aLocal(f, a.x ?? 0, a.z ?? 0)
    const m = anchoDe(a) / 2
    if (Math.abs(px - lx) > m || Math.abs(pz - lz) > m) continue
    const tope = Math.max(
      ...a.piezas.map((p) => {
        const t = p.tam
        const h = p.tipo === 'caja' ? (t[1] ?? 0) / 2 : p.tipo === 'esfera' ? (t[0] ?? 0) : p.tipo === 'cilindro' ? (t[2] ?? 0) / 2 : p.tipo === 'cono' ? (t[1] ?? 0) / 2 : 0
        return p.pos[1] + h
      }),
    )
    alto = Math.max(alto, (a.y ?? 0) - (f.y ?? 0) + tope * (a.escala ?? 1))
  }
  return alto
}

/** Separación entre objetos acomodados en una repisa. */
const HUECO_ENTRE = 0.01

/**
 * Siguiente hueco libre de `ancho` metros en el mueble `f`, para acomodar en fila
 * (libros, cajas): recorre de izquierda a derecha cada superficie del nivel
 * pedido y, si está llena, los demás niveles de abajo arriba. Lo ya apoyado en
 * cada nivel ocupa su tramo. Devuelve el punto en coordenadas del cuarto.
 */
export function huecoEnMueble(
  objetos: ObjetoCuarto[],
  f: ObjetoCuarto,
  ancho: number,
  nivelPreferido = 0,
): { x: number; z: number; nivel: number } | null {
  if (f.id == null) return null
  const sup = superficiesDeObjeto(f)
  const total = nivelesDe(sup)
  const orden = [nivelPreferido, ...Array.from({ length: total }, (_, n) => n).filter((n) => n !== nivelPreferido)]
  const e = f.escala ?? 1
  const w = ancho / e
  for (const nivel of orden) {
    const ocupados = objetos
      .filter((a) => a.apoyoId === f.id && a.apoyoNivel === nivel)
      .map((a) => {
        const [lx, lz] = aLocal(f, a.x ?? 0, a.z ?? 0)
        const m = anchoDe(a) / e / 2
        return { ini: lx - m, fin: lx + m, lz }
      })
    const superficies = sup.filter((s) => s.nivel === nivel && !s.disco).sort((a, b) => a.cx - b.cx)
    for (const s of superficies) {
      const izq = (s.cx - s.ancho / 2) / 1000 + MARGEN_BORDE
      const der = (s.cx + s.ancho / 2) / 1000 - MARGEN_BORDE
      const cz = s.cz / 1000
      const hz = s.fondo / 2000
      const enEsta = ocupados
        .filter((o) => o.fin > izq && o.ini < der && Math.abs(o.lz - cz) <= hz)
        .sort((a, b) => a.ini - b.ini)
      let cursor = izq
      for (const o of enEsta) {
        if (cursor + w <= o.ini - HUECO_ENTRE) break
        cursor = Math.max(cursor, o.fin + HUECO_ENTRE)
      }
      if (cursor + w <= der) {
        const [x, z] = aCuarto(f, cursor + w / 2, cz)
        return { x, z, nivel }
      }
    }
  }
  return null
}

/**
 * Nueva posición de `a` cuando su mueble pasa de `antes` a `despues` (se movió,
 * giró, cambió de escala o de receta): conserva su sitio relativo al mueble y
 * limita el nivel a los que queden.
 */
export function recolocarApoyado(
  a: ObjetoCuarto,
  antes: ObjetoCuarto,
  despues: ObjetoCuarto,
): Pick<ObjetoCuarto, 'x' | 'z' | 'y' | 'rotY' | 'apoyoNivel'> {
  const [lx, lz] = aLocal(antes, a.x ?? 0, a.z ?? 0)
  const [x, z] = aCuarto(despues, lx, lz)
  const total = nivelesDe(superficiesDeObjeto(despues))
  // Lo que va en el suelo junto a su base sigue en el suelo.
  const apoyoNivel = a.apoyoNivel === NIVEL_SUELO ? NIVEL_SUELO : Math.max(0, Math.min(a.apoyoNivel ?? 0, total - 1))
  return {
    x,
    z,
    y: yApoyo(despues, apoyoNivel, a),
    rotY: (a.rotY ?? 0) + (despues.rotY ?? 0) - (antes.rotY ?? 0),
    apoyoNivel,
  }
}

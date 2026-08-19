import { create } from 'zustand'
import * as THREE from 'three'
import { useHouse } from './houseStore'
import { playerPos } from './playerPosition'
import { cellToWorld } from '../house/walls'
import { esquinaDe, puntoArco, alturaArco, H } from '../house/caminosCurvas'
import { ALTURA_NIVEL } from './caminosStore'
import { sonar } from '../audio/sfx'
import { claveLS } from '../edicion'
import type { CaminoCelda } from '../data/db'

/**
 * Tren (rieles) y carrito (montaña rusa): recorren SOLOS el trazado de
 * `db.caminos`, celda a celda, eligiendo seguir de frente en cruces y dando la
 * vuelta en los extremos. Mismo molde que la montura de vehículos: store
 * reactivo + `trenFrame` mutable por-frame + conducción en Character.tsx.
 *
 * Cada VÍA (componente conexa de celdas del mismo tipo) tiene su tren, que da
 * vueltas aunque no haya nadie a bordo — la `flota`, que mueve y dibuja
 * `house/tren.tsx`. Al montarte, el tren de esa vía te cede el sitio; al
 * bajarte vuelve a nacer con tu recorrido y sigue su camino. Nunca hay dos
 * trenes en la misma vía.
 */

export type TipoRiel = 'riel' | 'coaster'

/** Lo que el render necesita de un vagón: hacia dónde mira y cuánto ha rodado. */
export interface PoseTren {
  heading: number
  vel: number
  /** Distancia rodada acumulada (gira las ruedas del vagón). */
  faseRueda: number
}

/** Datos por-frame del recorrido del JUGADOR (mutable, no reactivo). */
export const trenFrame = {
  montado: false,
  tipo: null as TipoRiel | null,
  heading: 0,
  vel: 0,
  /** Distancia rodada acumulada (gira las ruedas del vagón). */
  faseRueda: 0,
  /** Vía que ocupa el jugador: mientras la conduce, su tren autónomo no existe. */
  viaId: null as string | null,
}

/** Altura del punto de riel de una celda (piso del vagón); el riel también se eleva. */
const yDe = (c: CaminoCelda): number =>
  (c.tipo === 'coaster' ? 0.45 : 0.2) + (c.altura ?? 0) * ALTURA_NIVEL

// ─── Red de rieles (celdas riel/coaster de db.caminos, sincronizada por TrenProximity) ───

let red = new Map<string, CaminoCelda>()
/** Celdas de cada vía (componente conexa del mismo tipo), por id de vía. */
let componentes = new Map<string, CaminoCelda[]>()
/** `col,row` → id de su vía, para no recorrer la red en cada consulta. */
let viaDeCelda = new Map<string, string>()

/** Id de la vía a la que pertenece una celda (null si ahí no hay riel). */
export const viaDe = (col: number, row: number): string | null =>
  viaDeCelda.get(`${col},${row}`) ?? null

const DIRS = [
  { dx: 0, dz: -1 },
  { dx: 1, dz: 0 },
  { dx: 0, dz: 1 },
  { dx: -1, dz: 0 },
]

const vecinosDe = (c: CaminoCelda): CaminoCelda[] =>
  DIRS.map((d) => red.get(`${c.col + d.dx},${c.row + d.dz}`)).filter(
    (v): v is CaminoCelda => !!v && v.tipo === c.tipo,
  )

/** La celda de arranque de una vía: la menor en (row, col). Da un id estable. */
function celdaAncla(grupo: CaminoCelda[]): CaminoCelda {
  let min = grupo[0]
  for (const c of grupo) if (c.row < min.row || (c.row === min.row && c.col < min.col)) min = c
  return min
}

/** Parte la red en vías: dos celdas son de la misma solo si se tocan Y son del mismo tipo. */
function recalcularComponentes() {
  componentes = new Map()
  viaDeCelda = new Map()
  const visto = new Set<string>()
  for (const [clave, celda] of red) {
    if (visto.has(clave)) continue
    visto.add(clave)
    const pila = [celda]
    const grupo: CaminoCelda[] = []
    while (pila.length) {
      const actual = pila.pop()!
      grupo.push(actual)
      for (const v of vecinosDe(actual)) {
        const k = `${v.col},${v.row}`
        if (visto.has(k)) continue
        visto.add(k)
        pila.push(v)
      }
    }
    const ancla = celdaAncla(grupo)
    const id = `${grupo[0].tipo}:${ancla.col},${ancla.row}`
    componentes.set(id, grupo)
    for (const g of grupo) viaDeCelda.set(`${g.col},${g.row}`, id)
  }
}

export function setRedRieles(filas: CaminoCelda[]) {
  red = new Map(filas.filter((f) => f.tipo !== 'pista').map((f) => [`${f.col},${f.row}`, f]))
  recalcularComponentes()
  // Si el tramo bajo el tren desapareció (lo borraron en el editor), bájate.
  if (trenFrame.montado && !red.has(`${viaJugador.cur.col},${viaJugador.cur.row}`)) {
    trenFrame.viaId = null // sin esto renacería un tren en una vía recién rota
    useTren.getState().bajar()
  }
  reconciliarFlota()
}

// ─── Recorrido: cola de puntos (centro de celda / punto medio de arista) ───

/** Por dónde va un vagón: celda actual, de dónde vino y los puntos que le faltan. */
export interface Recorrido {
  cur: { col: number; row: number }
  prev: { col: number; row: number } | null
  puntos: { x: number; y: number; z: number }[]
}

/** El primer `extender()` encola el tránsito por la celda (centro + arista). */
export const crearRecorrido = (col: number, row: number): Recorrido => ({
  cur: { col, row },
  prev: null,
  puntos: [],
})

/** El recorrido que lleva el jugador mientras va montado. */
let viaJugador: Recorrido = crearRecorrido(0, 0)

function puntoCentro(c: CaminoCelda) {
  const [x, , z] = cellToWorld(c.col, c.row)
  return { x, y: yDe(c), z }
}

function puntoArista(a: CaminoCelda, b: CaminoCelda) {
  const [ax, , az] = cellToWorld(a.col, a.row)
  const [bx, , bz] = cellToWorld(b.col, b.row)
  return { x: (ax + bx) / 2, y: (yDe(a) + yDe(b)) / 2, z: (az + bz) / 2 }
}

/** Índice de dirección (N,E,S,O) de `a` hacia su vecino ortogonal `b`. */
const dirHacia = (a: { col: number; row: number }, b: { col: number; row: number }) =>
  DIRS.findIndex((d) => a.col + d.dx === b.col && a.row + d.dz === b.row)

/**
 * Puntos interiores del tránsito por `c` (de la arista de entrada a la de
 * salida): en un giro en L son muestras del arco de esquina (con la altura en
 * Bézier del coaster); en recta, reversa o arranque, el centro de la celda.
 */
function puntosTransito(c: CaminoCelda, de: CaminoCelda | null, a: CaminoCelda) {
  if (de && !(de.col === a.col && de.row === a.row)) {
    const brazos: (CaminoCelda | null)[] = [null, null, null, null]
    brazos[dirHacia(c, de)] = de
    brazos[dirHacia(c, a)] = a
    const arco = esquinaDe(brazos)
    if (arco) {
      const [wx, , wz] = cellToWorld(c.col, c.row)
      const y0 = yDe(c)
      const yJ = (y0 + yDe(brazos[arco.j] ?? c)) / 2
      const yI = (y0 + yDe(brazos[arco.i] ?? c)) / 2
      // t=0 cae en la arista del brazo j: recorrer el arco desde el lado de entrada.
      const desdeJ = brazos[arco.j] === de
      const pts: { x: number; y: number; z: number }[] = []
      for (let k = 1; k <= 6; k++) {
        const t = (desdeJ ? k : 7 - k) / 7
        const p = puntoArco(arco, H, t)
        pts.push({ x: wx + p.x, y: alturaArco(yJ, y0, yI, t), z: wz + p.z })
      }
      return pts
    }
  }
  return [puntoCentro(c)]
}

/** Elige la siguiente celda (de frente si se puede; nunca de regreso salvo tope) y encola. */
function extender(v: Recorrido) {
  const actual = red.get(`${v.cur.col},${v.cur.row}`)
  if (!actual) return
  const opciones = vecinosDe(actual).filter(
    (n) => !(v.prev && n.col === v.prev.col && n.row === v.prev.row),
  )
  let siguiente: CaminoCelda | undefined
  if (v.prev) {
    const dx = v.cur.col - v.prev.col
    const dz = v.cur.row - v.prev.row
    siguiente = opciones.find((n) => n.col === v.cur.col + dx && n.row === v.cur.row + dz)
  }
  if (!siguiente && opciones.length > 0)
    siguiente = opciones[Math.floor(Math.random() * opciones.length)]
  // Tope de vía: dar la vuelta.
  if (!siguiente && v.prev) siguiente = red.get(`${v.prev.col},${v.prev.row}`)
  if (!siguiente) return // celda aislada: quieto
  const anterior = v.prev ? (red.get(`${v.prev.col},${v.prev.row}`) ?? null) : null
  v.puntos.push(...puntosTransito(actual, anterior, siguiente), puntoArista(actual, siguiente))
  v.prev = { col: v.cur.col, row: v.cur.row }
  v.cur = { col: siguiente.col, row: siguiente.row }
}

/**
 * Avanza UN vagón por su vía: mueve `pos` hacia el siguiente punto encolado y
 * actualiza su pose. No toca al jugador — de eso se encarga `conducirTren`,
 * que lo envuelve.
 */
export function avanzarTren(
  v: Recorrido,
  tipo: TipoRiel,
  pos: THREE.Vector3,
  pose: PoseTren,
  delta: number,
) {
  const d = Math.min(delta, 0.1)
  if (v.puntos.length < 2) extender(v)
  const destino = v.puntos[0]
  if (!destino) {
    pose.vel = 0
    return
  }
  const dx = destino.x - pos.x
  const dy = destino.y - pos.y
  const dz = destino.z - pos.z
  const dist = Math.hypot(dx, dz)
  // Velocidad: el tren es constante; el carrito acelera cuesta abajo y frena subiendo.
  const vel =
    tipo === 'coaster'
      ? THREE.MathUtils.clamp(7 - (dist > 0.01 ? dy / Math.max(dist, 0.3) : 0) * 9, 3.5, 14)
      : 6.5
  const paso = vel * d
  if (dist <= paso) {
    pos.set(destino.x, destino.y, destino.z)
    v.puntos.shift()
  } else {
    pos.x += (dx / dist) * paso
    pos.y += (dy / dist) * paso
    pos.z += (dz / dist) * paso
    // Rumbo suave hacia la dirección de avance.
    const objetivo = Math.atan2(dx, dz)
    let giro = objetivo - pose.heading
    while (giro > Math.PI) giro -= Math.PI * 2
    while (giro < -Math.PI) giro += Math.PI * 2
    pose.heading += giro * Math.min(1, d * 8)
  }
  pose.vel = vel
  pose.faseRueda += paso
}

/**
 * Avanza el tren del jugador y pisa la pose del avatar. La llama Character.tsx
 * cada frame mientras `trenFrame.montado` (misma responsabilidad que `conducir`).
 */
export function conducirTren(cur: THREE.Vector3, group: THREE.Group, delta: number) {
  if (!trenFrame.tipo) return
  avanzarTren(viaJugador, trenFrame.tipo, cur, trenFrame, delta)
  playerPos.copy(cur)
  useHouse.getState().target.set(cur.x, 0, cur.z)
  group.rotation.set(0, trenFrame.heading, 0)
}

// ─── La flota: un tren por vía, dando vueltas sin nadie a bordo ───

/** Cómo trata cada vía a su tren; lo elige el menú y sobrevive a la recarga. */
export interface ModoVia {
  /** Asistente que va de maquinista (null = el tren va vacío). */
  conductorId: string | null
  detenido: boolean
}

export interface TrenAutonomo extends ModoVia {
  viaId: string
  tipo: TipoRiel
  via: Recorrido
  pos: THREE.Vector3
  pose: PoseTren
}

/** Trenes sin jugador a bordo (mutable por-frame, como `trenFrame`). */
export const flota: TrenAutonomo[] = []

export const hayTrenEn = (viaId: string | null): boolean =>
  !!viaId && flota.some((t) => t.viaId === viaId)

/** ¿Este asistente va conduciendo? (para no dibujarlo además paseando). */
export const conduceTren = (asistenteId: string): boolean =>
  flota.some((t) => t.conductorId === asistenteId)

const LS_MODOS = claveLS('mh.tren.modos')

function leerModos(): Record<string, ModoVia> {
  try {
    return JSON.parse(localStorage.getItem(LS_MODOS) ?? '{}') as Record<string, ModoVia>
  } catch {
    return {}
  }
}

/** Nace un tren en su vía, en la celda ancla y con el modo que tenga guardado. */
function nacerTren(viaId: string, celdas: CaminoCelda[], modo: ModoVia | undefined) {
  const ancla = celdaAncla(celdas)
  const [x, , z] = cellToWorld(ancla.col, ancla.row)
  flota.push({
    viaId,
    tipo: ancla.tipo as TipoRiel,
    via: crearRecorrido(ancla.col, ancla.row),
    pos: new THREE.Vector3(x, yDe(ancla), z),
    pose: { heading: 0, vel: 0, faseRueda: 0 },
    conductorId: modo?.conductorId ?? null,
    detenido: modo?.detenido ?? false,
  })
}

/**
 * Un tren por vía, ni más ni menos. Corre con cada cambio de `db.caminos`: los
 * que sobreviven NO se reposicionan (pintar una celda al otro lado del mapa no
 * debe hacer saltar al tren) y la versión solo sube si la lista de vías cambió
 * — pintar un anillo entero serían si no decenas de re-renders.
 */
function reconciliarFlota() {
  const modos = useTren.getState().modos
  let cambio = false
  for (let i = flota.length - 1; i >= 0; i--) {
    const t = flota[i]
    if (!componentes.has(t.viaId) || !red.has(`${t.via.cur.col},${t.via.cur.row}`)) {
      flota.splice(i, 1)
      cambio = true
    }
  }
  for (const [viaId, celdas] of componentes) {
    // Una celda suelta no lleva a ninguna parte, y la vía del jugador es suya.
    if (celdas.length < 2 || viaId === trenFrame.viaId) continue
    if (flota.some((t) => t.viaId === viaId)) continue
    nacerTren(viaId, celdas, modos[viaId])
    cambio = true
  }
  if (cambio) useTren.setState((s) => ({ version: s.version + 1 }))
}

// ─── Store reactivo (overlay de montar/bajar y render del vagón) ───

interface TrenState {
  montado: boolean
  tipo: TipoRiel | null
  /** Celda de riel al alcance para montar (null = lejos). */
  cerca: { col: number; row: number; tipo: TipoRiel; viaId: string | null } | null
  /** Sube al nacer o morir un tren y al cambiar el modo de una vía. */
  version: number
  modos: Record<string, ModoVia>
  /** Vía cuyo menú está abierto (solo a pie: bajarse no pregunta nada). */
  menu: { viaId: string } | null
  setCerca: (c: { col: number; row: number; tipo: TipoRiel } | null) => void
  setMenu: (m: { viaId: string } | null) => void
  setModoVia: (viaId: string, modo: ModoVia) => void
  montar: () => void
  bajar: () => void
}

export const useTren = create<TrenState>((set, get) => ({
  montado: false,
  tipo: null,
  cerca: null,
  version: 0,
  modos: leerModos(),
  menu: null,

  setCerca: (c) => {
    const prev = get().cerca
    if (!c && !prev) return
    if (c && prev && c.col === prev.col && c.row === prev.row && c.tipo === prev.tipo) return
    set({ cerca: c ? { ...c, viaId: viaDe(c.col, c.row) } : null })
  },

  setMenu: (m) => set({ menu: m }),

  setModoVia: (viaId, modo) => {
    const modos = { ...get().modos, [viaId]: modo }
    localStorage.setItem(LS_MODOS, JSON.stringify(modos))
    const t = flota.find((f) => f.viaId === viaId)
    if (t) {
      t.conductorId = modo.conductorId
      t.detenido = modo.detenido
    }
    set((s) => ({ modos, version: s.version + 1 }))
  },

  montar: () => {
    const c = get().cerca
    if (!c || get().montado) return
    const celda = red.get(`${c.col},${c.row}`)
    if (!celda) return
    // El tren de esta vía te cede el sitio: nunca hay dos en la misma.
    const i = flota.findIndex((t) => t.viaId === c.viaId)
    if (i >= 0) flota.splice(i, 1)
    viaJugador = crearRecorrido(c.col, c.row)
    trenFrame.montado = true
    trenFrame.tipo = c.tipo
    trenFrame.vel = 0
    trenFrame.viaId = c.viaId
    sonar('campana')
    set((s) => ({ montado: true, tipo: c.tipo, cerca: null, version: s.version + 1 }))
  },

  bajar: () => {
    if (!get().montado) return
    // La foto del tren ANTES de mover al jugador: se la queda el autónomo.
    const viaId = trenFrame.viaId
    const tipo = trenFrame.tipo
    const via = viaJugador
    const pos = playerPos.clone()
    const pose: PoseTren = {
      heading: trenFrame.heading,
      vel: trenFrame.vel,
      faseRueda: trenFrame.faseRueda,
    }
    trenFrame.montado = false
    trenFrame.tipo = null
    trenFrame.viaId = null
    // Bájate a un costado de la vía, a ras de suelo.
    const lado = 1.6
    playerPos.set(
      playerPos.x + Math.cos(trenFrame.heading) * lado,
      0.2, // SUPERFICIE_SUELO (literal: importar carreraStore aquí arriesga un ciclo)
      playerPos.z - Math.sin(trenFrame.heading) * lado,
    )
    useHouse.getState().target.set(playerPos.x, 0, playerPos.z)
    // El tren sigue su camino desde donde lo dejaste, con el modo de su vía.
    if (viaId && tipo && red.has(`${via.cur.col},${via.cur.row}`)) {
      const modo = get().modos[viaId]
      flota.push({
        viaId,
        tipo,
        via,
        pos,
        pose,
        conductorId: modo?.conductorId ?? null,
        detenido: modo?.detenido ?? false,
      })
    }
    set((s) => ({ montado: false, tipo: null, menu: null, version: s.version + 1 }))
  },
}))

// En desarrollo, para medir la flota desde la consola sin depender del render.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  Object.assign(window as unknown as Record<string, unknown>, {
    useTren,
    trenFrame,
    flotaTren: flota,
  })
}

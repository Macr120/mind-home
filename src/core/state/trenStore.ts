import { create } from 'zustand'
import * as THREE from 'three'
import { useHouse } from './houseStore'
import { playerPos } from './playerPosition'
import { cellToWorld } from '../house/walls'
import { esquinaDe, puntoArco, alturaArco, H } from '../house/caminosCurvas'
import { ALTURA_NIVEL } from './caminosStore'
import { sonar } from '../audio/sfx'
import type { CaminoCelda } from '../data/db'

/**
 * Tren (rieles) y carrito (montaña rusa): al montarte recorren SOLOS el trazado
 * de `db.caminos`, celda a celda, eligiendo seguir de frente en cruces y dando
 * la vuelta en los extremos. Mismo molde que la montura de vehículos:
 * store reactivo + `trenFrame` mutable por-frame + conducción en Character.tsx.
 */

export type TipoRiel = 'riel' | 'coaster'

/** Datos por-frame del recorrido (mutable, no reactivo). */
export const trenFrame = {
  montado: false,
  tipo: null as TipoRiel | null,
  heading: 0,
  vel: 0,
  /** Distancia rodada acumulada (gira las ruedas del vagón). */
  faseRueda: 0,
}

/** Altura del punto de riel de una celda (piso del vagón); el riel también se eleva. */
const yDe = (c: CaminoCelda): number =>
  (c.tipo === 'coaster' ? 0.45 : 0.2) + (c.altura ?? 0) * ALTURA_NIVEL

// ─── Red de rieles (celdas riel/coaster de db.caminos, sincronizada por TrenProximity) ───

let red = new Map<string, CaminoCelda>()

export function setRedRieles(filas: CaminoCelda[]) {
  red = new Map(filas.filter((f) => f.tipo !== 'pista').map((f) => [`${f.col},${f.row}`, f]))
  // Si el tramo bajo el tren desapareció (lo borraron en el editor), bájate.
  if (trenFrame.montado && !red.has(`${via.cur.col},${via.cur.row}`)) useTren.getState().bajar()
}

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

// ─── Recorrido: cola de puntos (centro de celda / punto medio de arista) ───

const via = {
  cur: { col: 0, row: 0 },
  prev: null as { col: number; row: number } | null,
  puntos: [] as { x: number; y: number; z: number }[],
}

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
function extender() {
  const actual = red.get(`${via.cur.col},${via.cur.row}`)
  if (!actual) return
  const opciones = vecinosDe(actual).filter(
    (v) => !(via.prev && v.col === via.prev.col && v.row === via.prev.row),
  )
  let siguiente: CaminoCelda | undefined
  if (via.prev) {
    const dx = via.cur.col - via.prev.col
    const dz = via.cur.row - via.prev.row
    siguiente = opciones.find((v) => v.col === via.cur.col + dx && v.row === via.cur.row + dz)
  }
  if (!siguiente && opciones.length > 0)
    siguiente = opciones[Math.floor(Math.random() * opciones.length)]
  // Tope de vía: dar la vuelta.
  if (!siguiente && via.prev) siguiente = red.get(`${via.prev.col},${via.prev.row}`)
  if (!siguiente) return // celda aislada: quieto
  const anterior = via.prev ? (red.get(`${via.prev.col},${via.prev.row}`) ?? null) : null
  via.puntos.push(...puntosTransito(actual, anterior, siguiente), puntoArista(actual, siguiente))
  via.prev = { col: via.cur.col, row: via.cur.row }
  via.cur = { col: siguiente.col, row: siguiente.row }
}

/**
 * Avanza el tren y pisa la pose del avatar. La llama Character.tsx cada frame
 * mientras `trenFrame.montado` (misma responsabilidad que `conducir`).
 */
export function conducirTren(cur: THREE.Vector3, group: THREE.Group, delta: number) {
  const d = Math.min(delta, 0.1)
  if (via.puntos.length < 2) extender()
  const destino = via.puntos[0]
  if (!destino) {
    trenFrame.vel = 0
    return
  }
  const dx = destino.x - cur.x
  const dy = destino.y - cur.y
  const dz = destino.z - cur.z
  const dist = Math.hypot(dx, dz)
  // Velocidad: el tren es constante; el carrito acelera cuesta abajo y frena subiendo.
  const vel =
    trenFrame.tipo === 'coaster'
      ? THREE.MathUtils.clamp(7 - (dist > 0.01 ? dy / Math.max(dist, 0.3) : 0) * 9, 3.5, 14)
      : 6.5
  const paso = vel * d
  if (dist <= paso) {
    cur.set(destino.x, destino.y, destino.z)
    via.puntos.shift()
  } else {
    cur.x += (dx / dist) * paso
    cur.y += (dy / dist) * paso
    cur.z += (dz / dist) * paso
    // Rumbo suave hacia la dirección de avance.
    const objetivo = Math.atan2(dx, dz)
    let giro = objetivo - trenFrame.heading
    while (giro > Math.PI) giro -= Math.PI * 2
    while (giro < -Math.PI) giro += Math.PI * 2
    trenFrame.heading += giro * Math.min(1, d * 8)
  }
  trenFrame.vel = vel
  trenFrame.faseRueda += paso
  playerPos.copy(cur)
  useHouse.getState().target.set(cur.x, 0, cur.z)
  group.rotation.set(0, trenFrame.heading, 0)
}

// ─── Store reactivo (overlay de montar/bajar y render del vagón) ───

interface TrenState {
  montado: boolean
  tipo: TipoRiel | null
  /** Celda de riel al alcance para montar (null = lejos). */
  cerca: { col: number; row: number; tipo: TipoRiel } | null
  setCerca: (c: { col: number; row: number; tipo: TipoRiel } | null) => void
  montar: () => void
  bajar: () => void
}

export const useTren = create<TrenState>((set, get) => ({
  montado: false,
  tipo: null,
  cerca: null,

  setCerca: (c) => {
    const prev = get().cerca
    if (!c && !prev) return
    if (c && prev && c.col === prev.col && c.row === prev.row && c.tipo === prev.tipo) return
    set({ cerca: c })
  },

  montar: () => {
    const c = get().cerca
    if (!c || get().montado) return
    const celda = red.get(`${c.col},${c.row}`)
    if (!celda) return
    via.cur = { col: c.col, row: c.row }
    via.prev = null
    // El primer extender() encola el tránsito por la celda (centro + arista).
    via.puntos = []
    trenFrame.montado = true
    trenFrame.tipo = c.tipo
    trenFrame.vel = 0
    sonar('campana')
    set({ montado: true, tipo: c.tipo, cerca: null })
  },

  bajar: () => {
    if (!get().montado) return
    trenFrame.montado = false
    trenFrame.tipo = null
    // Bájate a un costado de la vía, a ras de suelo.
    const lado = 1.6
    playerPos.set(
      playerPos.x + Math.cos(trenFrame.heading) * lado,
      0,
      playerPos.z - Math.sin(trenFrame.heading) * lado,
    )
    useHouse.getState().target.set(playerPos.x, 0, playerPos.z)
    set({ montado: false, tipo: null })
  },
}))

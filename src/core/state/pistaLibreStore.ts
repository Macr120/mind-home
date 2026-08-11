import { create } from 'zustand'
import * as THREE from 'three'
import { db, type PistaLibre } from '../data/db'

/**
 * Trazo libre: pista de carreras dibujada con PUNTOS DE CONTROL (clics) que se
 * unen con una curva Catmull-Rom. Dos partes:
 * - `usePistaLibreEditor`: sub-modo dentro del editor de Caminos (agregar,
 *   mover y borrar puntos; persiste directo en db.pistasLibres — core/state).
 * - Runtime de carrera: muestreo denso de la curva + hash espacial para saber
 *   si un punto del mundo pisa el asfalto libre. Lo sincroniza PistaLibre3D
 *   con `setPistaLibre` (espejo del patrón setRedPista).
 */

/**
 * Herramientas del trazo. Borrar no es una herramienta aparte: con `punto`, tocar
 * un punto existente lo borra y tocar el primero (la meta) cierra o abre el
 * circuito. Ver el `onUp` de `house/pistaLibre.tsx`.
 */
export type HerramientaTrazo = 'punto' | 'mover'

/** Medio ancho de la cinta de asfalto (ancho total 2.6, como la pista de celdas). */
export const ANCHO_MEDIO_LIBRE = 1.3

interface PistaLibreEditorState {
  /** Sub-modo de trazo libre activo (dentro del editor de Caminos). */
  activo: boolean
  herramienta: HerramientaTrazo
  pistaId: number | null
  /** Copia en edición (el render en vivo la lee mientras el sub-modo está activo). */
  puntos: { x: number; z: number }[]
  cerrada: boolean
  entrar: () => Promise<void>
  salir: () => void
  setHerramienta: (h: HerramientaTrazo) => void
  agregarPunto: (x: number, z: number) => void
  /** Mueve en vivo (sin persistir); al soltar el arrastre se llama `persistir`. */
  moverPunto: (i: number, x: number, z: number) => void
  persistir: () => void
  borrarPunto: (i: number) => void
  alternarCerrada: () => void
  borrarTodo: () => void
}

export const usePistaLibreEditor = create<PistaLibreEditorState>((set, get) => {
  const guardar = () => {
    const s = get()
    if (s.pistaId == null) return
    void db.pistasLibres.update(s.pistaId, {
      puntos: s.puntos,
      cerrada: s.cerrada,
      fecha: Date.now(),
    })
  }
  return {
    activo: false,
    herramienta: 'punto',
    pistaId: null,
    puntos: [],
    cerrada: false,

    entrar: async () => {
      if (get().activo) return
      // v1: una sola pista (fila singleton; el esquema '++id' deja varias gratis).
      const fila = await db.pistasLibres.toCollection().first()
      if (fila?.id != null) {
        set({
          activo: true,
          herramienta: 'punto',
          pistaId: fila.id,
          puntos: fila.puntos,
          cerrada: fila.cerrada,
        })
      } else {
        const id = await db.pistasLibres.add({ puntos: [], cerrada: false, fecha: Date.now() })
        set({ activo: true, herramienta: 'punto', pistaId: id, puntos: [], cerrada: false })
      }
    },

    salir: () => {
      if (!get().activo) return
      guardar()
      set({ activo: false })
    },

    setHerramienta: (herramienta) => set({ herramienta }),

    agregarPunto: (x, z) => {
      set((s) => ({ puntos: [...s.puntos, { x, z }] }))
      guardar()
    },

    moverPunto: (i, x, z) =>
      set((s) => ({ puntos: s.puntos.map((p, k) => (k === i ? { x, z } : p)) })),

    persistir: guardar,

    borrarPunto: (i) => {
      // Por debajo de 3 puntos no hay circuito que cerrar: se reabre solo.
      set((s) => {
        const puntos = s.puntos.filter((_, k) => k !== i)
        return { puntos, cerrada: s.cerrada && puntos.length >= 3 }
      })
      guardar()
    },

    alternarCerrada: () => {
      set((s) => ({ cerrada: !s.cerrada }))
      guardar()
    },

    borrarTodo: () => {
      set({ puntos: [], cerrada: false })
      guardar()
    },
  }
})

// ─── Runtime de carrera sobre el trazo (módulo mutable, sin React) ───

/** Separación entre muestras de la curva (densa: el rival la recorre directo). */
const PASO_MUESTRA = 0.35
/** Lado de las celdas del hash espacial (3×3 celdas cubren el ancho de la cinta). */
const CELDA_HASH = 2

let muestras: { x: number; y: number; z: number }[] = []
let hash = new Map<string, number[]>()
let tangente0 = { x: 1, z: 0 }
let habilitada = false
let version = 0
/** Firma del último trazo procesado: evita re-muestrear (y subir versión) en balde. */
let firma = ''

const claveHash = (x: number, z: number) =>
  `${Math.floor(x / CELDA_HASH)},${Math.floor(z / CELDA_HASH)}`

/** Curva Catmull-Rom de la pista (la comparten render y muestreo). */
export function curvaDePista(
  puntos: { x: number; z: number }[],
  cerrada: boolean,
): THREE.CatmullRomCurve3 | null {
  if (puntos.length < 2) return null
  return new THREE.CatmullRomCurve3(
    puntos.map((p) => new THREE.Vector3(p.x, 0, p.z)),
    cerrada && puntos.length >= 3,
    'catmullrom',
    0.5,
  )
}

/**
 * Sincroniza el runtime con la pista persistida (null o pista abierta =
 * carrera deshabilitada). Solo re-muestrea y sube `version` si el trazo cambió
 * de verdad (el useLiveQuery re-emite la misma pista con otra identidad) — así
 * una carrera libre en curso no se cancela por un re-render inocuo.
 */
export function setPistaLibre(p: PistaLibre | null): void {
  const nuevaFirma =
    !p || !p.cerrada || p.puntos.length < 3
      ? ''
      : p.puntos.map((pt) => `${pt.x.toFixed(3)},${pt.z.toFixed(3)}`).join(';')
  if (nuevaFirma === firma) return // sin cambios reales: no tocar el runtime
  firma = nuevaFirma
  version++
  muestras = []
  hash = new Map()
  habilitada = false
  if (nuevaFirma === '' || !p) return // firma no vacía ⇒ p es una pista válida
  const curva = curvaDePista(p.puntos, true)
  if (!curva) return
  const largo = curva.getLength()
  const n = Math.max(16, Math.round(largo / PASO_MUESTRA))
  const pts = curva.getSpacedPoints(n)
  pts.pop() // cerrada: el último duplica al primero (índice muerto en el wrap)
  muestras = pts.map((v) => ({ x: v.x, y: 0, z: v.z }))
  for (let i = 0; i < muestras.length; i++) {
    const k = claveHash(muestras[i].x, muestras[i].z)
    const arr = hash.get(k)
    if (arr) arr.push(i)
    else hash.set(k, [i])
  }
  const t0 = curva.getTangentAt(0)
  tangente0 = { x: t0.x, z: t0.z }
  habilitada = true
}

export const versionPistaLibre = () => version
export const hayPistaLibre = () => habilitada
export const muestrasPistaLibre = () => muestras

/** Meta del trazo: primera muestra + tangente de la curva ahí. */
export function metaLibre(): { x: number; z: number; tx: number; tz: number } | null {
  if (!habilitada || muestras.length === 0) return null
  return { x: muestras[0].x, z: muestras[0].z, tx: tangente0.x, tz: tangente0.z }
}

/** Distancia del punto a la línea central de la cinta (Infinity sin pista cerca). */
export function distanciaAPistaLibre(x: number, z: number): number {
  if (!habilitada) return Infinity
  const cx = Math.floor(x / CELDA_HASH)
  const cz = Math.floor(z / CELDA_HASH)
  let d2Min = Infinity
  for (let a = -1; a <= 1; a++) {
    for (let b = -1; b <= 1; b++) {
      const arr = hash.get(`${cx + a},${cz + b}`)
      if (!arr) continue
      for (const i of arr) {
        const dx = x - muestras[i].x
        const dz = z - muestras[i].z
        const d2 = dx * dx + dz * dz
        if (d2 < d2Min) d2Min = d2
      }
    }
  }
  return Math.sqrt(d2Min)
}

export const enPistaLibre = (x: number, z: number) =>
  habilitada && distanciaAPistaLibre(x, z) <= ANCHO_MEDIO_LIBRE

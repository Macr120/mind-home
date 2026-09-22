import type { Caja, FiltroArte, FormaArte } from './lienzo'

/**
 * Las operaciones del dibujo compartido: la unidad que viaja por el log del
 * espacio y por el broadcast. Módulo PURO (sin React ni canvas): lo usan el
 * editor para emitir y el motor de replay (`core/espacios/trazos.ts`) para
 * aplicar lo que llega.
 *
 * Reglas del formato:
 * - coordenadas en px del BITMAP (no de pantalla), con 2 decimales como mucho;
 * - todo lo que llega de fuera pasa por `leerOp`, que valida tipos, rangos y
 *   longitudes: una operación mal formada se descarta entera (`null`), nunca
 *   se aplica a medias;
 * - `separarObjetos` NO tiene operación a propósito (el etiquetado de manchas
 *   diverge entre clientes); el gotero, las ayudas de dibujo y el export PNG
 *   son locales y tampoco generan nada.
 */

/** Un punto del trazo: `[x, y]` o `[x, y, presión]`. */
export type PuntoTrazo = [number, number] | [number, number, number]

export type HerrTrazo = 'pincel' | 'spray' | 'borrador'

export type AccionCapa =
  | 'crear'
  | 'borrar'
  | 'visible'
  | 'opacidad'
  | 'renombrar'
  | 'mover'
  | 'duplicar'
  | 'fusionar'

export type OpArte =
  | {
      tipo: 'trazo'
      capa: string
      herr: HerrTrazo
      color: string
      grosor: number
      pts: PuntoTrazo[]
      /** Espejo congelado al empezar el trazo: `[vertical, horizontal]`. */
      espejo: [boolean, boolean]
      /** Semilla del aerosol: el mismo dibujo en todos los dispositivos. */
      semilla: number
    }
  | {
      tipo: 'forma'
      capa: string
      herr: FormaArte
      x0: number
      y0: number
      x1: number
      y1: number
      color: string
      grosor: number
      espejo: [boolean, boolean]
    }
  | { tipo: 'relleno'; capa: string; x: number; y: number; color: string }
  | { tipo: 'texto'; capa: string; x: number; y: number; texto: string; color: string; tam: number }
  | { tipo: 'transformar'; capa: string; de: Caja; a: Caja }
  | {
      tipo: 'imagen'
      capa: string
      /** `<espacioId>/img/<uid>.png` en el bucket del espacio. */
      ruta: string
      x: number
      y: number
      w: number
      h: number
      /** true = cubre la capa entera (resultado de la IA); false = objeto insertado. */
      cubrir?: boolean
      /** La imagen nació en una capa propia: hay que crearla con ESE id. */
      nueva?: { capaId: string; nombre: string }
    }
  | { tipo: 'limpiar'; capa: string }
  | { tipo: 'filtro'; capa: string; filtro: FiltroArte }
  | { tipo: 'redimensionar'; ancho: number; alto: number; escalar: boolean }
  | {
      tipo: 'capa'
      accion: AccionCapa
      capaId: string
      nombre?: string
      /** Opacidad (0..1) o visibilidad (0/1), según la acción. */
      valor?: number
      /** `mover`: +1 sube, −1 baja. */
      delta?: 1 | -1
      /** `duplicar`: id de la copia (el mismo en todos los dispositivos). */
      nuevoId?: string
    }
  | { tipo: 'deshacer'; op: string }
  | { tipo: 'rehacer'; op: string }

/** Puntos por operación al EMITIR: más no cabría en un broadcast de 48 KB. */
export const MAX_PTS_OP = 1000
/** Puntos que se aceptan al leer (tope del formato). */
const MAX_PTS = 4000
const MAX_TEXTO = 500
const MAX_CAPA_ID = 40
/** Lado máximo del lienzo (el mismo de `constantes.ts`, repetido para no arrastrar la UI). */
const LADO_MAX = 4096

const HERR_TRAZO = new Set<string>(['pincel', 'spray', 'borrador'])
const FORMAS = new Set<string>(['linea', 'rect', 'elipse', 'compas'])
const FILTROS = new Set<string>(['brillo+', 'brillo-', 'contraste+', 'contraste-', 'grises', 'desenfoque'])
const ACCIONES = new Set<string>([
  'crear',
  'borrar',
  'visible',
  'opacidad',
  'renombrar',
  'mover',
  'duplicar',
  'fusionar',
])

/** Redondeo a 2 decimales: lo que viaja no necesita más y el JSON pesa la mitad. */
export const r2 = (v: number): number => Math.round(v * 100) / 100

// ─── lectura defensiva ───────────────────────────────────────────────────────

const obj = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

/** Número finito dentro del rango, o `null`. */
function num(v: unknown, min: number, max: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) return null
  return r2(v)
}

function ent(v: unknown, min: number, max: number): number | null {
  const n = num(v, min, max)
  return n === null || !Number.isInteger(n) ? null : n
}

function texto(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= max ? v : null
}

function color(v: unknown): string | null {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null
}

const capaId = (v: unknown) => texto(v, MAX_CAPA_ID)

function espejo(v: unknown): [boolean, boolean] {
  return Array.isArray(v) ? [v[0] === true, v[1] === true] : [false, false]
}

function caja(v: unknown): Caja | null {
  const d = obj(v)
  if (!d) return null
  const x = num(d.x, -LADO_MAX, LADO_MAX)
  const y = num(d.y, -LADO_MAX, LADO_MAX)
  const w = num(d.w, 1, LADO_MAX * 2)
  const h = num(d.h, 1, LADO_MAX * 2)
  return x === null || y === null || w === null || h === null ? null : { x, y, w, h }
}

function puntos(v: unknown): PuntoTrazo[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_PTS) return null
  const res: PuntoTrazo[] = []
  for (const p of v) {
    if (!Array.isArray(p) || p.length < 2) return null
    const x = num(p[0], -LADO_MAX, LADO_MAX)
    const y = num(p[1], -LADO_MAX, LADO_MAX)
    if (x === null || y === null) return null
    const pr = p.length > 2 ? num(p[2], 0, 1) : null
    res.push(pr === null ? [x, y] : [x, y, pr])
  }
  return res
}

/**
 * Convierte lo que llegó por el canal o por el log en una operación válida, o
 * `null`. Viene de otra persona: aquí no se confía en nada.
 */
export function leerOp(bruto: unknown): OpArte | null {
  const d = obj(bruto)
  if (!d) return null
  switch (d.tipo) {
    case 'trazo': {
      const capa = capaId(d.capa)
      const c = color(d.color)
      const grosor = num(d.grosor, 0.5, 400)
      const pts = puntos(d.pts)
      const semilla = ent(d.semilla, 0, 2 ** 32 - 1)
      if (!capa || !c || grosor === null || !pts || semilla === null) return null
      if (typeof d.herr !== 'string' || !HERR_TRAZO.has(d.herr)) return null
      return { tipo: 'trazo', capa, herr: d.herr as HerrTrazo, color: c, grosor, pts, espejo: espejo(d.espejo), semilla }
    }
    case 'forma': {
      const capa = capaId(d.capa)
      const c = color(d.color)
      const grosor = num(d.grosor, 0.5, 400)
      const x0 = num(d.x0, -LADO_MAX, LADO_MAX)
      const y0 = num(d.y0, -LADO_MAX, LADO_MAX)
      const x1 = num(d.x1, -LADO_MAX, LADO_MAX)
      const y1 = num(d.y1, -LADO_MAX, LADO_MAX)
      if (!capa || !c || grosor === null) return null
      if (x0 === null || y0 === null || x1 === null || y1 === null) return null
      if (typeof d.herr !== 'string' || !FORMAS.has(d.herr)) return null
      return { tipo: 'forma', capa, herr: d.herr as FormaArte, x0, y0, x1, y1, color: c, grosor, espejo: espejo(d.espejo) }
    }
    case 'relleno': {
      const capa = capaId(d.capa)
      const c = color(d.color)
      const x = num(d.x, 0, LADO_MAX)
      const y = num(d.y, 0, LADO_MAX)
      if (!capa || !c || x === null || y === null) return null
      return { tipo: 'relleno', capa, x, y, color: c }
    }
    case 'texto': {
      const capa = capaId(d.capa)
      const c = color(d.color)
      const x = num(d.x, -LADO_MAX, LADO_MAX)
      const y = num(d.y, -LADO_MAX, LADO_MAX)
      const txt = texto(d.texto, MAX_TEXTO)
      const tam = num(d.tam, 4, 400)
      if (!capa || !c || x === null || y === null || !txt || tam === null) return null
      return { tipo: 'texto', capa, x, y, texto: txt, color: c, tam }
    }
    case 'transformar': {
      const capa = capaId(d.capa)
      const de = caja(d.de)
      const a = caja(d.a)
      if (!capa || !de || !a) return null
      return { tipo: 'transformar', capa, de, a }
    }
    case 'imagen': {
      const capa = capaId(d.capa)
      const ruta = texto(d.ruta, 200)
      const x = num(d.x, -LADO_MAX, LADO_MAX)
      const y = num(d.y, -LADO_MAX, LADO_MAX)
      const w = num(d.w, 1, LADO_MAX * 2)
      const h = num(d.h, 1, LADO_MAX * 2)
      if (!capa || !ruta || x === null || y === null || w === null || h === null) return null
      // Ruta siempre dentro del bucket del espacio y sin saltos de carpeta.
      if (ruta.includes('..') || !/^[A-Za-z0-9/_.-]+$/.test(ruta)) return null
      const n = obj(d.nueva)
      const nuevoId = n ? capaId(n.capaId) : null
      const nueva = n && nuevoId ? { capaId: nuevoId, nombre: texto(n.nombre, 60) ?? nuevoId } : undefined
      return { tipo: 'imagen', capa, ruta, x, y, w, h, cubrir: d.cubrir === true, ...(nueva ? { nueva } : {}) }
    }
    case 'limpiar': {
      const capa = capaId(d.capa)
      return capa ? { tipo: 'limpiar', capa } : null
    }
    case 'filtro': {
      const capa = capaId(d.capa)
      if (!capa || typeof d.filtro !== 'string' || !FILTROS.has(d.filtro)) return null
      return { tipo: 'filtro', capa, filtro: d.filtro as FiltroArte }
    }
    case 'redimensionar': {
      const ancho = ent(d.ancho, 1, LADO_MAX)
      const alto = ent(d.alto, 1, LADO_MAX)
      if (ancho === null || alto === null) return null
      return { tipo: 'redimensionar', ancho, alto, escalar: d.escalar === true }
    }
    case 'capa': {
      const id = capaId(d.capaId)
      if (!id || typeof d.accion !== 'string' || !ACCIONES.has(d.accion)) return null
      const accion = d.accion as AccionCapa
      const nombre = texto(d.nombre, 60)
      const valor = num(d.valor, 0, 1)
      const delta = d.delta === 1 || d.delta === -1 ? d.delta : undefined
      const nuevoId = capaId(d.nuevoId)
      // Cada acción exige lo suyo: sin ello no hay nada que hacer.
      if ((accion === 'crear' || accion === 'renombrar') && !nombre) return null
      if ((accion === 'visible' || accion === 'opacidad') && valor === null) return null
      if (accion === 'mover' && !delta) return null
      if (accion === 'duplicar' && (!nuevoId || !nombre)) return null
      return {
        tipo: 'capa',
        accion,
        capaId: id,
        ...(nombre ? { nombre } : {}),
        ...(valor === null ? {} : { valor }),
        ...(delta ? { delta } : {}),
        ...(nuevoId ? { nuevoId } : {}),
      }
    }
    case 'deshacer':
    case 'rehacer': {
      const op = texto(d.op, 64)
      return op ? { tipo: d.tipo, op } : null
    }
    default:
      return null
  }
}

/**
 * Parte un trazo largo en varias operaciones encadenadas: cada tramo arranca
 * en el último punto del anterior (si no, quedaría un hueco) y lleva su propia
 * semilla, para que el aerosol siga siendo determinista.
 */
export function partirTrazo(op: Extract<OpArte, { tipo: 'trazo' }>): OpArte[] {
  if (op.pts.length <= MAX_PTS_OP) return [op]
  const res: OpArte[] = []
  for (let i = 0; i < op.pts.length - 1; i += MAX_PTS_OP - 1) {
    res.push({ ...op, pts: op.pts.slice(i, i + MAX_PTS_OP), semilla: (op.semilla + res.length) >>> 0 })
  }
  return res
}

/** Generador pseudoaleatorio sembrado (mulberry32): el aerosol se replica igual. */
export function rngSembrado(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

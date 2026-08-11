/**
 * El motor de reescritura de referencias: el corazón de copiar, pegar, mover,
 * insertar y eliminar.
 *
 * Todo se reduce a una TRANSFORMACIÓN, una función pura de referencia a
 * referencia (o a `null`, que significa «esta referencia murió» → `#REF!`).
 * Pegar, cortar, insertar y eliminar solo se diferencian en qué transformación
 * aplican y a qué celdas.
 *
 * Dos cosas que hay que hacer bien o el resultado es un número plausible pero
 * equivocado, que es el peor error posible en una hoja:
 *
 * 1. UNA SOLA PASADA. Rangos y referencias sueltas se buscan con una regex
 *    combinada. Si se aplicaran en dos pasadas, el `A1` de `A1:B3` se
 *    reescribiría dos veces y el rango quedaría corrido.
 * 2. LOS LITERALES DE CADENA NO SE TOCAN. En `=SI(A1>0;"A1 es positivo";"")`
 *    ese segundo `A1` es texto que el usuario escribió, no una referencia.
 */
import type { CeldaHoja } from '../../core/data/db'
import { MAX_COLS, MAX_FILAS } from './constantes'
import { colDeNombre, deRef, esFormula, nombreCol, refA1, RE_RANGO, RE_REF, type Celdas } from './hoja'

/** Un rectángulo de celdas, con los índices ya ordenados (f0 ≤ f1, c0 ≤ c1). */
export interface Rect {
  f0: number
  c0: number
  f1: number
  c1: number
}

export interface Pos {
  fila: number
  col: number
}

/** Una referencia tal cual está escrita, con sus anclajes `$`. */
export interface RefEscrita {
  fila: number
  col: number
  /** Lleva `$` delante del número. */
  filaFija: boolean
  /** Lleva `$` delante de la letra. */
  colFija: boolean
}

export type Transformacion = (r: RefEscrita) => RefEscrita | null

export const rectDe = (a: Pos, b: Pos): Rect => ({
  f0: Math.min(a.fila, b.fila),
  c0: Math.min(a.col, b.col),
  f1: Math.max(a.fila, b.fila),
  c1: Math.max(a.col, b.col),
})

export const dentroDe = (r: Rect, fila: number, col: number) =>
  fila >= r.f0 && fila <= r.f1 && col >= r.c0 && col <= r.c1

/** Las referencias A1 de un rectángulo, por filas. */
export function refsDe(r: Rect): string[] {
  const refs: string[] = []
  for (let f = r.f0; f <= r.f1; f++) for (let c = r.c0; c <= r.c1; c++) refs.push(refA1(f, c))
  return refs
}

const RE_ESCRITA = /^(\$?)([A-Z]{1,2})(\$?)([0-9]{1,3})$/

export function leerRef(txt: string): RefEscrita | null {
  const m = RE_ESCRITA.exec(txt.toUpperCase())
  if (!m) return null
  return {
    col: colDeNombre(m[2]),
    fila: Number(m[4]) - 1,
    colFija: m[1] === '$',
    filaFija: m[3] === '$',
  }
}

export function escribirRef(r: RefEscrita | null): string {
  if (!r || r.fila < 0 || r.col < 0 || r.fila >= MAX_FILAS || r.col >= MAX_COLS) return '#REF!'
  return `${r.colFija ? '$' : ''}${nombreCol(r.col)}${r.filaFija ? '$' : ''}${r.fila + 1}`
}

// Trocea por literales de cadena: los tramos impares son texto entrecomillado.
const RE_CADENA = /("(?:[^"\\]|\\.)*")/

/**
 * Reescribe TODAS las referencias de una fórmula aplicando `fn`. Los rangos se
 * transforman extremo a extremo; si un extremo muere, el rango entero queda
 * `#REF!`. El texto entre comillas se deja intacto.
 */
export function reescribir(crudo: string, fn: Transformacion): string {
  if (!crudo.startsWith('=')) return crudo
  const combinada = new RegExp(`${RE_RANGO.source}|${RE_REF.source}`, 'g')

  const trozos = crudo.slice(1).split(RE_CADENA)
  const salida = trozos
    .map((trozo, i) => {
      // Los impares son literales de cadena por la captura del split.
      if (i % 2 === 1) return trozo
      return trozo.replace(combinada, (todo, a?: string, b?: string, suelta?: string) => {
        if (a && b) {
          const ra = leerRef(a)
          const rb = leerRef(b)
          if (!ra || !rb) return todo
          const na = fn(ra)
          const nb = fn(rb)
          if (!na || !nb) return '#REF!'
          return `${escribirRef(na)}:${escribirRef(nb)}`
        }
        if (!suelta) return todo
        const r = leerRef(suelta)
        return r ? escribirRef(fn(r)) : todo
      })
    })
    .join('')
  return `=${salida}`
}

// ── Las cuatro transformaciones ─────────────────────────────────────────────

/** Copiar/pegar y relleno: lo que lleva `$` se queda donde está. */
export const desplazar =
  (df: number, dc: number): Transformacion =>
  (r) => ({
    fila: r.filaFija ? r.fila : r.fila + df,
    col: r.colFija ? r.col : r.col + dc,
    filaFija: r.filaFija,
    colFija: r.colFija,
  })

/**
 * Cortar/mover: las referencias a celdas que están DENTRO del rango movido se
 * desplazan aunque lleven `$`. Es lo que hace Excel al cortar, y es la
 * diferencia que casi todo el mundo implementa mal: una referencia absoluta
 * apunta a un CONTENIDO, y ese contenido se fue de sitio.
 */
export const trasladar =
  (rango: Rect, df: number, dc: number): Transformacion =>
  (r) =>
    dentroDe(rango, r.fila, r.col)
      ? { ...r, fila: r.fila + df, col: r.col + dc }
      : r

/** Insertar `n` filas o columnas a partir de `desde`. */
export const insertar =
  (eje: 'fila' | 'col', desde: number, n: number): Transformacion =>
  (r) =>
    r[eje] >= desde ? { ...r, [eje]: r[eje] + n } : r

/** Eliminar `n` filas o columnas desde `desde`; lo borrado da `#REF!`. */
export const eliminar =
  (eje: 'fila' | 'col', desde: number, n: number): Transformacion =>
  (r) => {
    if (r[eje] >= desde && r[eje] < desde + n) return null
    return r[eje] >= desde + n ? { ...r, [eje]: r[eje] - n } : r
  }

// ── Operaciones de alto nivel (lo que llama la UI) ──────────────────────────

/** Aplica una transformación a las fórmulas de TODAS las celdas dadas. */
function mapear(celdas: Celdas, fn: Transformacion): Celdas {
  const salida: Celdas = {}
  for (const [ref, celda] of Object.entries(celdas)) {
    salida[ref] = esFormula(celda) ? { ...celda, crudo: reescribir(celda.crudo, fn) } : celda
  }
  return salida
}

/**
 * Pega un rango en `destino`. Al COPIAR, las fórmulas pegadas se desplazan lo
 * que se movieron. Al CORTAR, además hay que reescribir el resto de la hoja:
 * las fórmulas que apuntaban al origen tienen que seguir apuntando al contenido,
 * que ahora está en otro sitio.
 */
export function pegarRango(
  celdas: Celdas,
  origen: { rect: Rect; celdas: Celdas },
  destino: Pos,
  cortar: boolean,
): Celdas {
  const df = destino.fila - origen.rect.f0
  const dc = destino.col - origen.rect.c0
  if (df === 0 && dc === 0 && cortar) return celdas

  // 1. El resto de la hoja: solo cambia si se cortó.
  const base: Celdas = cortar ? mapear(celdas, trasladar(origen.rect, df, dc)) : { ...celdas }

  // 2. Al cortar, el origen se vacía (antes de escribir el destino, que puede solaparse).
  if (cortar) for (const ref of refsDe(origen.rect)) delete base[ref]

  // 3. Las celdas pegadas, con sus fórmulas desplazadas.
  const mover = desplazar(df, dc)
  for (const [ref, celda] of Object.entries(origen.celdas)) {
    const p = deRef(ref)
    if (!p) continue
    const fila = p.fila + df
    const col = p.col + dc
    if (fila < 0 || col < 0 || fila >= MAX_FILAS || col >= MAX_COLS) continue
    const nueva: CeldaHoja = esFormula(celda)
      ? { ...celda, crudo: cortar ? celda.crudo : reescribir(celda.crudo, mover) }
      : { ...celda }
    base[refA1(fila, col)] = nueva
  }
  return base
}

/** Inserta filas o columnas en medio, reescribiendo todas las referencias. */
export function insertarLinea(celdas: Celdas, eje: 'fila' | 'col', desde: number, n = 1): Celdas {
  const movidas = mapear(celdas, insertar(eje, desde, n))
  const salida: Celdas = {}
  for (const [ref, celda] of Object.entries(movidas)) {
    const p = deRef(ref)
    if (!p) continue
    const fila = eje === 'fila' && p.fila >= desde ? p.fila + n : p.fila
    const col = eje === 'col' && p.col >= desde ? p.col + n : p.col
    if (fila >= MAX_FILAS || col >= MAX_COLS) continue
    salida[refA1(fila, col)] = celda
  }
  return salida
}

/** Elimina filas o columnas; lo que apuntaba a ellas queda `#REF!`. */
export function eliminarLinea(celdas: Celdas, eje: 'fila' | 'col', desde: number, n = 1): Celdas {
  const movidas = mapear(celdas, eliminar(eje, desde, n))
  const salida: Celdas = {}
  for (const [ref, celda] of Object.entries(movidas)) {
    const p = deRef(ref)
    if (!p) continue
    const v = eje === 'fila' ? p.fila : p.col
    if (v >= desde && v < desde + n) continue // la celda borrada se va
    const fila = eje === 'fila' && p.fila >= desde + n ? p.fila - n : p.fila
    const col = eje === 'col' && p.col >= desde + n ? p.col - n : p.col
    salida[refA1(fila, col)] = celda
  }
  return salida
}

/**
 * Rellena desde una selección hasta `hasta`, en la dirección dominante. Dos o
 * más números con paso constante extrapolan la serie; el resto se copia (y las
 * fórmulas, con sus referencias desplazadas).
 */
export function rellenar(celdas: Celdas, semilla: Rect, hasta: Pos): Celdas {
  const abajo = hasta.fila > semilla.f1
  const derecha = hasta.col > semilla.c1
  if (!abajo && !derecha) return celdas
  // Una sola dirección: la que más se estiró.
  const vertical = abajo && (!derecha || hasta.fila - semilla.f1 >= hasta.col - semilla.c1)

  const salida: Celdas = { ...celdas }
  const largo = vertical ? semilla.f1 - semilla.f0 + 1 : semilla.c1 - semilla.c0 + 1
  const final = vertical ? Math.min(hasta.fila, MAX_FILAS - 1) : Math.min(hasta.col, MAX_COLS - 1)
  const inicio = vertical ? semilla.f1 + 1 : semilla.c1 + 1

  const fijo = vertical ? { de: semilla.c0, a: semilla.c1 } : { de: semilla.f0, a: semilla.f1 }
  for (let k = fijo.de; k <= fijo.a; k++) {
    // La columna (o fila) de semilla, en orden.
    const base: (CeldaHoja | undefined)[] = []
    for (let i = 0; i < largo; i++) {
      const f = vertical ? semilla.f0 + i : k
      const c = vertical ? k : semilla.c0 + i
      base.push(celdas[refA1(f, c)])
    }
    const paso = pasoSerie(base)

    for (let pos = inicio, n = 0; pos <= final; pos++, n++) {
      const origen = base[n % largo]
      const f = vertical ? pos : k
      const c = vertical ? k : pos
      const ref = refA1(f, c)
      if (!origen) {
        delete salida[ref]
        continue
      }
      if (paso != null) {
        const primero = Number(base[0]!.crudo.replace(',', '.'))
        salida[ref] = { ...origen, crudo: String(primero + paso * (largo + n)) }
        continue
      }
      if (esFormula(origen)) {
        const df = vertical ? pos - (semilla.f0 + (n % largo)) : 0
        const dc = vertical ? 0 : pos - (semilla.c0 + (n % largo))
        salida[ref] = { ...origen, crudo: reescribir(origen.crudo, desplazar(df, dc)) }
      } else {
        salida[ref] = { ...origen }
      }
    }
  }
  return salida
}

/** El paso de una serie numérica, o null si no lo es (entonces se copia). */
function pasoSerie(base: (CeldaHoja | undefined)[]): number | null {
  if (base.length < 2) return null
  const ns: number[] = []
  for (const c of base) {
    if (!c || esFormula(c)) return null
    const n = Number(c.crudo.replace(',', '.'))
    if (!Number.isFinite(n) || c.crudo.trim() === '') return null
    ns.push(n)
  }
  const paso = ns[1] - ns[0]
  for (let i = 2; i < ns.length; i++) {
    if (Math.abs(ns[i] - ns[i - 1] - paso) > 1e-9) return null
  }
  return paso
}

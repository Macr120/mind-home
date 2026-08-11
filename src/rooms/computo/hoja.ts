/**
 * El modelo de una hoja: referencias A1, fórmulas y recálculo.
 *
 * Lo que SÍ hace: referencias A1 y $A$1, rangos, fórmulas en español, grafo de
 * dependencias con orden topológico y detección de ciclos.
 *
 * Lo que NO hace, y es a propósito (cada una duplicaría el motor o pediría otro
 * modelo de datos): gráficas dentro de la hoja —para eso está el graficador—,
 * tablas dinámicas, formato condicional, fórmulas matriciales, varias pestañas
 * dentro de una hoja —cada hoja es un documento—, referencias entre hojas
 * (`Hoja2!A1`) y fechas como tipo (una fecha es texto; `HOY()` da el ISO).
 *
 * Sin referencias entre hojas, el grafo de dependencias vive entero dentro de
 * una fila de Dexie, que es justo lo que hace barato guardar la hoja de un tirón.
 */
import type { CeldaHoja } from '../../core/data/db'
import { MAX_COLS, MAX_FILAS } from './constantes'
import { ALIAS_PUNTO, FUNCIONES_HOJA } from './funcionesHoja'
import type { Motor } from './motor'

export type Celdas = Record<string, CeldaHoja>

/** 0 → A, 25 → Z, 26 → AA. */
export function nombreCol(col: number): string {
  let n = col
  let s = ''
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

/** 'A' → 0, 'AA' → 26. */
export function colDeNombre(nombre: string): number {
  let n = 0
  for (const c of nombre) n = n * 26 + (c.charCodeAt(0) - 64)
  return n - 1
}

export const refA1 = (fila: number, col: number) => `${nombreCol(col)}${fila + 1}`

/** 'B7' → { fila: 6, col: 1 }; null si no es una referencia válida. */
export function deRef(ref: string): { fila: number; col: number } | null {
  const m = /^\$?([A-Z]{1,2})\$?([0-9]{1,3})$/.exec(ref.toUpperCase())
  if (!m) return null
  const col = colDeNombre(m[1])
  const fila = Number(m[2]) - 1
  if (col < 0 || col >= MAX_COLS || fila < 0 || fila >= MAX_FILAS) return null
  return { fila, col }
}

/** Normaliza quitando los `$`: la identidad de una celda no depende de ellos. */
export const sinDolares = (ref: string) => ref.replace(/\$/g, '').toUpperCase()

/**
 * Una referencia suelta. El lookbehind y el lookahead son lo que evita que
 * `LOG10(` se lea como la celda G10, y que `A1(` pase por referencia.
 *
 * Se exportan porque `refs.ts` reescribe fórmulas con ellas: una sola gramática
 * para leer y para reescribir, o las dos se desincronizan.
 */
export const RE_REF = /(?<![A-Za-z0-9_.$])(\$?[A-Z]{1,2}\$?[0-9]{1,3})(?![A-Za-z0-9_(])/g
export const RE_RANGO = /(?<![A-Za-z0-9_.$])(\$?[A-Z]{1,2}\$?[0-9]{1,3}):(\$?[A-Z]{1,2}\$?[0-9]{1,3})/g

/** Todas las celdas de un rango 'A1:B3', por filas. */
export function celdasDeRango(desde: string, hasta: string): string[] {
  const a = deRef(desde)
  const b = deRef(hasta)
  if (!a || !b) return []
  const refs: string[] = []
  for (let f = Math.min(a.fila, b.fila); f <= Math.max(a.fila, b.fila); f++) {
    for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) refs.push(refA1(f, c))
  }
  return refs
}

/** ¿La celda guarda una fórmula? */
export const esFormula = (celda?: CeldaHoja) => !!celda?.crudo.startsWith('=')

/** Referencias de las que depende una celda (ya sin `$`). */
export function dependenciasDe(crudo: string): string[] {
  if (!crudo.startsWith('=')) return []
  const cuerpo = crudo.slice(1)
  const refs = new Set<string>()
  for (const m of cuerpo.matchAll(RE_RANGO)) {
    for (const r of celdasDeRango(sinDolares(m[1]), sinDolares(m[2]))) refs.add(r)
  }
  // Las que ya entraron por un rango se vuelven a añadir sin efecto (es un Set).
  for (const m of cuerpo.matchAll(RE_REF)) refs.add(sinDolares(m[1]))
  return [...refs]
}

/** El valor de una celda para meterlo en una expresión. */
function literal(celda: CeldaHoja | undefined, valores: Map<string, number | string>, ref: string): string {
  const v = valores.get(ref)
  if (v == null) {
    if (!celda || celda.crudo === '') return '0'
    const n = Number(celda.crudo.replace(',', '.'))
    return Number.isFinite(n) ? String(n) : JSON.stringify(celda.crudo)
  }
  return typeof v === 'number' ? String(v) : JSON.stringify(v)
}

/** Traduce la fórmula del usuario a algo que mathjs entienda. */
function aExpresion(crudo: string, celdas: Celdas, valores: Map<string, number | string>): string {
  let cuerpo = crudo.slice(1)

  // Rangos primero: se vuelven argumentos sueltos, así SUMA(...) es variádica.
  cuerpo = cuerpo.replace(RE_RANGO, (_, a: string, b: string) =>
    celdasDeRango(sinDolares(a), sinDolares(b))
      .map((r) => literal(celdas[r], valores, r))
      .join(', ') || '0',
  )
  // Después las referencias sueltas.
  cuerpo = cuerpo.replace(RE_REF, (_, r: string) => {
    const ref = sinDolares(r)
    return literal(celdas[ref], valores, ref)
  })
  // Nombres con punto (no valen como identificador) y operadores de hoja.
  for (const [es, plano] of Object.entries(ALIAS_PUNTO)) cuerpo = cuerpo.split(es).join(plano)
  cuerpo = cuerpo.replace(/<>/g, '!=').replace(/&/g, '+')
  // El `=` suelto de una comparación (`SI(A1=2; …)`) es igualdad, no asignación.
  cuerpo = cuerpo.replace(/(?<![<>!=])=(?!=)/g, '==')
  return cuerpo
}

export interface ResultadoCelda {
  valor?: number | string
  error?: string
}

/**
 * Recalcula la hoja entera. Kahn primero: lo que no entra en el orden
 * topológico está en un ciclo y se marca `#CICLO` — así nunca hay una recursión
 * sin fondo que cuelgue el hilo.
 */
export function recalcular(celdas: Celdas, motor: Motor | null): Record<string, ResultadoCelda> {
  const salida: Record<string, ResultadoCelda> = {}
  const formulas = Object.keys(celdas).filter((ref) => esFormula(celdas[ref]))

  // Valores de las celdas literales (las que no son fórmula).
  const valores = new Map<string, number | string>()
  for (const [ref, celda] of Object.entries(celdas)) {
    if (esFormula(celda)) continue
    if (celda.crudo === '') continue
    const n = Number(celda.crudo.replace(',', '.'))
    const v = Number.isFinite(n) && celda.crudo.trim() !== '' ? n : celda.crudo
    valores.set(ref, v)
    salida[ref] = { valor: v }
  }

  if (formulas.length === 0) return salida

  // Grafo: ref → las fórmulas que dependen de ella.
  const deps = new Map<string, string[]>()
  const pendientes = new Map<string, number>()
  const dependen = new Map<string, string[]>()
  for (const ref of formulas) {
    const suyas = dependenciasDe(celdas[ref].crudo).filter((d) => formulas.includes(d))
    deps.set(ref, suyas)
    pendientes.set(ref, suyas.length)
    for (const d of suyas) dependen.set(d, [...(dependen.get(d) ?? []), ref])
  }

  const cola = formulas.filter((ref) => pendientes.get(ref) === 0)
  const orden: string[] = []
  while (cola.length > 0) {
    const ref = cola.shift()!
    orden.push(ref)
    for (const hija of dependen.get(ref) ?? []) {
      const n = (pendientes.get(hija) ?? 1) - 1
      pendientes.set(hija, n)
      if (n === 0) cola.push(hija)
    }
  }

  for (const ref of orden) {
    if (!motor) {
      salida[ref] = { valor: celdas[ref].crudo }
      continue
    }
    try {
      const expr = aExpresion(celdas[ref].crudo, celdas, valores)
      const bruto = motor.evaluar(expr, FUNCIONES_HOJA)
      const v = typeof bruto === 'number' || typeof bruto === 'string' ? bruto : String(bruto)
      valores.set(ref, v)
      salida[ref] = { valor: v }
    } catch {
      salida[ref] = { error: '#VALOR' }
    }
  }

  // Lo que quedó fuera del orden topológico forma parte de un ciclo.
  for (const ref of formulas) {
    if (!orden.includes(ref)) salida[ref] = { error: '#CICLO' }
  }
  return salida
}

/** Formatea un valor ya calculado según el formato de su celda. */
export function pintar(valor: number | string | undefined, celda?: CeldaHoja): string {
  if (valor == null) return ''
  if (typeof valor === 'string') return valor
  const dec = celda?.fmt?.dec
  const texto = dec != null ? valor.toFixed(dec) : String(Math.round(valor * 1e10) / 1e10)
  return celda?.fmt?.moneda ? `${celda.fmt.moneda}${texto}` : texto
}

/** Resumen de una selección para la barra de estado. */
export function resumenSeleccion(
  refs: string[],
  resultados: Record<string, ResultadoCelda>,
): { suma: number; promedio: number; cuenta: number } {
  const ns = refs
    .map((r) => resultados[r]?.valor)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const suma = ns.reduce((s, x) => s + x, 0)
  return { suma, promedio: ns.length ? suma / ns.length : 0, cuenta: ns.length }
}

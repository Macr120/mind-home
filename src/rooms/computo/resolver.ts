/**
 * Resolvedor: raíces, derivadas, integrales, extremos y sistemas lineales.
 *
 * mathjs NO trae despeje simbólico general, así que resolver una ecuación es una
 * cascada de dos caminos:
 *
 *  1. EXACTO — si al normalizar queda un polinomio de grado ≤ 3, `polynomialRoot`
 *     da las raíces de verdad (x² − 5x + 6 → 2 y 3, no 1.9999998).
 *  2. NUMÉRICO — si no, se muestrea el intervalo VISIBLE buscando cambios de
 *     signo y en cada uno se hace bisección (que siempre converge) rematada con
 *     Newton (que afina rápido).
 *
 * El resultado dice siempre en qué intervalo se buscó: prometer «todas las
 * soluciones» de sin(x) = x/2 sería mentir.
 */
import {
  ITER_BISECCION,
  ITER_NEWTON,
  MUESTRAS_RAIZ,
  TOL_CERO,
  TOL_RAIZ,
} from './constantes'
import type { Motor } from './motor'

export interface Solucion {
  /** Raíces encontradas, de menor a mayor. */
  raices: number[]
  /** Salieron del camino exacto (polinomio): no hay intervalo que aclarar. */
  exacto: boolean
  /** Intervalo explorado en el camino numérico. */
  x0: number
  x1: number
}

/**
 * Pasa `izq = der` a la forma `f(x) = 0`. Parte por el primer `=` de nivel
 * superior; los comparadores (`<=`, `>=`, `==`, `!=`) no cuentan.
 */
export function normalizarEcuacion(texto: string): string {
  let nivel = 0
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (c === '(' || c === '[') nivel++
    else if (c === ')' || c === ']') nivel--
    else if (c === '=' && nivel === 0) {
      const antes = texto[i - 1]
      const despues = texto[i + 1]
      if (antes === '<' || antes === '>' || antes === '!' || antes === '=' || despues === '=') continue
      const izq = texto.slice(0, i).trim()
      const der = texto.slice(i + 1).trim()
      if (!izq || !der) break
      return `(${izq}) - (${der})`
    }
  }
  return texto.trim()
}

/** ¿El texto trae un `=` de ecuación? */
export const esEcuacion = (texto: string) => normalizarEcuacion(texto) !== texto.trim()

/** Quita las repetidas y las que no son cero de verdad (asíntotas). */
function limpiar(crudas: number[], f: (x: number) => number, escala: number): number[] {
  const tol = TOL_CERO * Math.max(1, escala)
  const buenas: number[] = []
  for (const r of crudas.sort((a, b) => a - b)) {
    if (!Number.isFinite(r)) continue
    // 1/x cambia de signo en 0 sin tener raíz: la bisección la "encuentra" y
    // este filtro es lo único que la descarta.
    if (Math.abs(f(r)) > tol) continue
    if (buenas.length > 0 && Math.abs(r - buenas[buenas.length - 1]) < TOL_RAIZ) continue
    buenas.push(r)
  }
  return buenas
}

/** Resuelve `expr = 0` en la variable dada, dentro del intervalo visible. */
export function resolverEcuacion(
  motor: Motor,
  expr: string,
  variable: string,
  x0: number,
  x1: number,
  extra?: Record<string, unknown>,
): Solucion {
  const compilada = motor.compilar(expr)
  const f = (x: number) => {
    try {
      return compilada({ ...extra, [variable]: x })
    } catch {
      return NaN
    }
  }

  // ── Camino exacto ────────────────────────────────────────────────────
  const coefs = motor.coeficientes(expr)
  if (coefs && coefs.length >= 2 && coefs.length <= 4) {
    const raices = motor.raicesPolinomio(coefs)
    if (raices) return { raices, exacto: true, x0, x1 }
  }

  // ── Camino numérico ──────────────────────────────────────────────────
  const derivada = motor.derivar(expr, variable)
  const df = derivada
    ? (() => {
        const c = motor.compilar(derivada)
        return (x: number) => {
          try {
            return c({ ...extra, [variable]: x })
          } catch {
            return NaN
          }
        }
      })()
    : (x: number) => {
        // Sin derivada simbólica, secante con paso relativo.
        const h = 1e-7 * Math.max(1, Math.abs(x))
        return (f(x + h) - f(x - h)) / (2 * h)
      }

  const paso = (x1 - x0) / MUESTRAS_RAIZ
  const crudas: number[] = []
  let xa = x0
  let ya = f(xa)
  let escala = Number.isFinite(ya) ? Math.abs(ya) : 0

  for (let i = 1; i <= MUESTRAS_RAIZ; i++) {
    const xb = x0 + i * paso
    const yb = f(xb)
    if (Number.isFinite(yb)) escala = Math.max(escala, Math.abs(yb))

    if (Number.isFinite(ya) && Number.isFinite(yb)) {
      if (ya === 0) crudas.push(xa)
      else if (ya * yb < 0) crudas.push(afinar(f, df, xa, xb))
    }
    xa = xb
    ya = yb
  }
  if (Number.isFinite(ya) && ya === 0) crudas.push(xa)

  return { raices: limpiar(crudas, f, escala), exacto: false, x0, x1 }
}

/** Bisección (converge siempre) rematada con Newton (converge rápido). */
function afinar(f: (x: number) => number, df: (x: number) => number, a: number, b: number): number {
  let lo = a
  let hi = b
  let ylo = f(lo)
  for (let i = 0; i < ITER_BISECCION; i++) {
    const medio = (lo + hi) / 2
    const y = f(medio)
    if (!Number.isFinite(y)) break
    if (ylo * y <= 0) hi = medio
    else {
      lo = medio
      ylo = y
    }
  }
  let x = (lo + hi) / 2
  for (let i = 0; i < ITER_NEWTON; i++) {
    const y = f(x)
    const d = df(x)
    if (!Number.isFinite(y) || !Number.isFinite(d) || d === 0) break
    const siguiente = x - y / d
    if (!Number.isFinite(siguiente)) break
    // Newton se puede escapar del intervalo: si lo hace, se queda la bisección.
    if (siguiente < Math.min(a, b) || siguiente > Math.max(a, b)) break
    if (Math.abs(siguiente - x) < TOL_RAIZ) return siguiente
    x = siguiente
  }
  return x
}

/**
 * Integral definida por Simpson compuesto (mathjs no trae integración). `n` se
 * fuerza a par, que es lo que pide el método.
 */
export function integralDefinida(
  motor: Motor,
  expr: string,
  variable: string,
  a: number,
  b: number,
  n = 1000,
): number {
  const f = motor.compilar(expr)
  const pares = n % 2 === 0 ? n : n + 1
  const h = (b - a) / pares
  const y = (x: number) => {
    try {
      return f({ [variable]: x })
    } catch {
      return NaN
    }
  }
  let suma = y(a) + y(b)
  for (let i = 1; i < pares; i++) suma += (i % 2 === 0 ? 2 : 4) * y(a + i * h)
  return (h / 3) * suma
}

export interface Extremo {
  x: number
  y: number
  tipo: 'max' | 'min'
}

/** Máximos y mínimos locales: raíces de f' con el signo de f'' decidiendo cuál. */
export function extremosLocales(
  motor: Motor,
  expr: string,
  variable: string,
  x0: number,
  x1: number,
): Extremo[] {
  const d1 = motor.derivar(expr, variable)
  if (!d1) return []
  const { raices } = resolverEcuacion(motor, d1, variable, x0, x1)
  if (raices.length === 0) return []
  const f = motor.compilar(expr)
  const d2 = motor.derivar(d1, variable)
  const segunda = d2 ? motor.compilar(d2) : null

  const salida: Extremo[] = []
  for (const x of raices) {
    try {
      const y = f({ [variable]: x })
      if (!Number.isFinite(y)) continue
      const curva = segunda
        ? segunda({ [variable]: x })
        : // Sin segunda derivada simbólica, se compara con los vecinos.
          f({ [variable]: x + 1e-4 }) + f({ [variable]: x - 1e-4 }) - 2 * y
      if (!Number.isFinite(curva) || curva === 0) continue
      salida.push({ x, y, tipo: curva < 0 ? 'max' : 'min' })
    } catch {
      // Un punto que no se puede evaluar simplemente no es un extremo.
    }
  }
  return salida
}

/**
 * Resuelve un sistema LINEAL de N ecuaciones con N incógnitas.
 *
 * La matriz se arma evaluando cada ecuación normalizada: el término
 * independiente es `f(0)` y cada coeficiente, `f(e_i) − f(0)`. Es exacto
 * mientras el sistema sea lineal, que es justo lo que promete.
 */
export function resolverSistema(
  motor: Motor,
  ecuaciones: string[],
  incognitas: string[],
): number[] | null {
  const n = incognitas.length
  if (n === 0 || ecuaciones.length !== n) return null
  const A: number[][] = []
  const b: number[] = []

  for (const cruda of ecuaciones) {
    const f = motor.compilar(normalizarEcuacion(cruda))
    const cero: Record<string, number> = {}
    for (const x of incognitas) cero[x] = 0
    let base: number
    try {
      base = f(cero)
    } catch {
      return null
    }
    if (!Number.isFinite(base)) return null

    const fila: number[] = []
    for (const x of incognitas) {
      try {
        const valor = f({ ...cero, [x]: 1 }) - base
        if (!Number.isFinite(valor)) return null
        fila.push(valor)
      } catch {
        return null
      }
    }
    A.push(fila)
    b.push(-base)
  }
  return motor.resolverSistema(A, b)
}

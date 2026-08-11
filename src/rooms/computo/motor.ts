/**
 * El motor de cálculo de la sala de cómputo: mathjs (evaluar, derivar, LaTeX) y
 * KaTeX (pintar).
 *
 * ESTE ARCHIVO Y `xlsx.ts` SON LOS ÚNICOS QUE PUEDEN NOMBRAR A ESAS LIBRERÍAS, y
 * siempre con `import()` dinámico. Un `import` estático desde cualquier módulo
 * eager (empezando por `index.tsx`, que el núcleo carga sin abrir el cuarto) las
 * metería en el bundle de arranque, que hoy son 1,17 MB gz y es sagrado.
 *
 * Se usa la entrada COMPLETA de mathjs y no `mathjs/number`, que es bastante más
 * pequeña pero no trae `polynomialRoot` ni `lusolve` — justo las dos que hacen
 * que resolver una ecuación dé respuestas exactas en vez de aproximadas.
 */
import { SIMBOLOS_RESERVADOS } from './constantes'

type Math = typeof import('mathjs')
type Katex = (typeof import('katex'))['default']

/** Error del motor ya traducible: la UI nunca pinta el inglés de la librería. */
export class ErrorMotor extends Error {
  /** Clave i18n: 'computo.error.sintaxis' | '.simbolo' | '.dominio'. */
  clave: string
  /** Lo que rompió (símbolo desconocido, trozo de expresión). */
  detalle: string

  constructor(clave: string, detalle: string) {
    super(clave)
    this.clave = clave
    this.detalle = detalle
  }
}

/** Traduce el mensaje crudo de mathjs a una de las tres claves. */
function comoErrorMotor(e: unknown): ErrorMotor {
  const msg = e instanceof Error ? e.message : String(e)
  const sinDefinir = /Undefined symbol\s+(\S+)/.exec(msg)
  if (sinDefinir) return new ErrorMotor('computo.error.simbolo', sinDefinir[1])
  if (/Unexpected|Parenthesis|Value expected|Syntax/i.test(msg)) {
    return new ErrorMotor('computo.error.sintaxis', msg)
  }
  return new ErrorMotor('computo.error.dominio', msg)
}

export interface Motor {
  /** Evalúa con un ámbito de variables. Lanza `ErrorMotor`. */
  evaluar(expr: string, scope?: Record<string, unknown>): number | string
  /** Compilado cacheado: tabular 800 puntos compila UNA vez. */
  compilar(expr: string): (scope: Record<string, unknown>) => number
  /** Símbolos libres (sin funciones ni constantes): alimenta el editor de variables. */
  simbolos(expr: string): string[]
  /** LaTeX de una expresión. */
  aTex(expr: string): string
  /** Pinta LaTeX en un nodo; nunca lanza. */
  pintarTex(el: HTMLElement, tex: string, bloque?: boolean): void
  /** Derivada simbólica; null si mathjs no sabe derivarla. */
  derivar(expr: string, variable: string): string | null
  /** Muestrea la expresión; NaN donde no está definida o el resultado no es real. */
  tabular(
    expr: string,
    variable: string,
    x0: number,
    x1: number,
    n: number,
    extra?: Record<string, unknown>,
  ): Float64Array
  /** Coeficientes del polinomio (de menor a mayor grado), o null si no lo es. */
  coeficientes(expr: string): number[] | null
  /** Raíces reales exactas de un polinomio de grado ≤ 3, o null. */
  raicesPolinomio(coefs: number[]): number[] | null
  /** Resuelve el sistema lineal A·x = b; null si la matriz es singular. */
  resolverSistema(A: number[][], b: number[]): number[] | null
  /** Ámbito con las trigonométricas en grados (vacío si se trabaja en radianes). */
  alcanceAngulos(grados: boolean): Record<string, unknown>
  /** Formatea un número para pintarlo (14 cifras significativas, sin ruido binario). */
  formatear(valor: unknown): string
}

let promesa: Promise<Motor> | null = null

/**
 * Carga el motor una sola vez. La promesa se cachea, y eso es lo único que
 * garantiza UN chunk: el formulario, la calculadora, el graficador y la rejilla
 * la piden todos, cada uno cuando le toca.
 */
export function cargarMotor(): Promise<Motor> {
  promesa ??= (async () => {
    const [math, katex] = await Promise.all([
      import('mathjs'),
      import('katex').then((m) => m.default),
      import('katex/dist/katex.min.css'),
    ])
    return crearMotor(math, katex)
  })()
  return promesa
}

/** Olvida el motor cargado para que el botón «Reintentar» vuelva a pedirlo. */
export function olvidarMotor() {
  promesa = null
}

/** El motor ya cargado, o null. Para código que no puede esperar (exportar). */
export function motorCargado(): Promise<Motor> | null {
  return promesa
}

function crearMotor(math: Math, katex: Katex): Motor {
  const compilados = new Map<string, { evaluate: (scope?: object) => unknown }>()

  const compilar = (expr: string) => {
    let c = compilados.get(expr)
    if (!c) {
      try {
        c = math.compile(expr)
      } catch (e) {
        throw comoErrorMotor(e)
      }
      compilados.set(expr, c)
    }
    return c
  }

  /** Un resultado sirve si es un número real; lo demás (complejos, matrices) no. */
  const aNumero = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : NaN)

  return {
    evaluar(expr, scope) {
      const bruto = (() => {
        try {
          return compilar(expr).evaluate({ ...scope })
        } catch (e) {
          throw comoErrorMotor(e)
        }
      })()
      if (typeof bruto === 'number' || typeof bruto === 'string') return bruto
      if (typeof bruto === 'boolean') return bruto ? 1 : 0
      return this.formatear(bruto)
    },

    compilar(expr) {
      const c = compilar(expr)
      return (scope) => aNumero(c.evaluate({ ...scope }))
    },

    simbolos(expr) {
      let nodo
      try {
        nodo = math.parse(expr)
      } catch (e) {
        throw comoErrorMotor(e)
      }
      const fuera = new Set<string>()
      // Los nombres de función son SymbolNode igual que las variables: se
      // reconocen por venir en la rama `fn` de un FunctionNode.
      nodo.filter((n, ruta, padre) => {
        if (padre && 'isFunctionNode' in padre && padre.isFunctionNode && ruta === 'fn') {
          fuera.add((n as unknown as { name: string }).name)
        }
        return false
      })
      const vistos = new Set<string>()
      const libres: string[] = []
      nodo.filter((n) => {
        const s = n as unknown as { isSymbolNode?: boolean; name?: string }
        if (!s.isSymbolNode || !s.name) return false
        if (fuera.has(s.name) || SIMBOLOS_RESERVADOS.has(s.name) || vistos.has(s.name)) return false
        vistos.add(s.name)
        libres.push(s.name)
        return false
      })
      return libres
    },

    aTex(expr) {
      try {
        return math.parse(expr).toTex({ parenthesis: 'keep', implicit: 'hide' })
      } catch {
        // Una expresión a medio escribir no debe romper la vista previa.
        return expr
      }
    },

    pintarTex(el, tex, bloque = false) {
      katex.render(tex, el, { throwOnError: false, displayMode: bloque, output: 'html' })
    },

    derivar(expr, variable) {
      try {
        return math.derivative(expr, variable).toString()
      } catch {
        return null
      }
    },

    tabular(expr, variable, x0, x1, n, extra) {
      const f = compilar(expr)
      const ys = new Float64Array(n)
      const paso = (x1 - x0) / (n - 1 || 1)
      const scope: Record<string, unknown> = { ...extra }
      for (let i = 0; i < n; i++) {
        scope[variable] = x0 + i * paso
        try {
          ys[i] = aNumero(f.evaluate(scope))
        } catch {
          ys[i] = NaN
        }
      }
      return ys
    },

    coeficientes(expr) {
      try {
        const r = math.rationalize(expr, {}, true)
        // `rationalize` también acepta fracciones: si quedó un denominador con
        // variables, los coeficientes no describen la expresión.
        if (r.expression.toString().includes('/')) return null
        const coefs = r.coefficients as unknown[]
        if (!Array.isArray(coefs) || coefs.some((c) => typeof c !== 'number')) return null
        return coefs as number[]
      } catch {
        return null
      }
    },

    raicesPolinomio(coefs) {
      if (coefs.length < 2 || coefs.length > 4) return null
      try {
        const raices = math.polynomialRoot(...(coefs as [number, number, number?, number?]))
        const reales: number[] = []
        for (const r of raices) {
          if (typeof r === 'number') reales.push(r)
          // Un complejo con parte imaginaria despreciable es una raíz real que
          // el redondeo ensució.
          else if (Math.abs(r.im) < 1e-10) reales.push(r.re)
        }
        return reales.sort((a, b) => a - b)
      } catch {
        return null
      }
    },

    resolverSistema(A, b) {
      try {
        if (Math.abs(math.det(A)) < 1e-12) return null
        const x = math.lusolve(A, b) as unknown as number[][]
        return x.map((fila) => Number(fila[0]))
      } catch {
        return null
      }
    },

    alcanceAngulos(grados) {
      if (!grados) return {}
      const aRad = Math.PI / 180
      return {
        sin: (x: number) => Math.sin(x * aRad),
        cos: (x: number) => Math.cos(x * aRad),
        tan: (x: number) => Math.tan(x * aRad),
        asin: (x: number) => Math.asin(x) / aRad,
        acos: (x: number) => Math.acos(x) / aRad,
        atan: (x: number) => Math.atan(x) / aRad,
      }
    },

    formatear(valor) {
      if (typeof valor === 'number') {
        if (!Number.isFinite(valor)) return String(valor)
        // `precision` corta la basura binaria (0.1+0.2) sin recortar de verdad.
        return math.format(valor, { precision: 14 })
      }
      try {
        return math.format(valor, { precision: 14 })
      } catch {
        return String(valor)
      }
    },
  }
}

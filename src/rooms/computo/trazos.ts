import type { Vista } from './useVistaSvg'

/**
 * De puntos a trazos de SVG. Es la geometría que comparten los cuatro tipos de
 * gráfica: una curva, sea y=f(x), r=f(θ) o (x(t), y(t)), acaba siendo siempre
 * una lista de puntos que hay que partir y proyectar.
 *
 * Vive aparte de `ejes.ts` a propósito: aquello es «elegir un paso de rejilla
 * legible y rotularlo» y lo comparten las hojas de cálculo; esto es píxeles del
 * plano y no lo toca nadie más.
 */

/** Una curva ya muestreada, en unidades del plano. */
export interface Curva {
  id: number
  xs: Float64Array
  ys: Float64Array
  /** La expresión no compila o el motor la rechazó. */
  error?: boolean
}

/** `n` valores repartidos de `a` a `b`, ambos incluidos. */
export function muestras(a: number, b: number, n: number): Float64Array {
  const salida = new Float64Array(n)
  const paso = (b - a) / (n - 1 || 1)
  for (let i = 0; i < n; i++) salida[i] = a + i * paso
  return salida
}

/**
 * Puntos → los `points` de cada `<polyline>`, cortando donde la curva no existe.
 *
 * El corte es lo que decide si se ve bien: un trazo por trozo continuo, cortando
 * en los NaN y donde dos puntos seguidos se separan más de `cortePx` PÍXELES.
 * Sin eso, `tan(x)` y `1/x` pintan una vertical falsa en cada asíntota que
 * parece parte de la función.
 *
 * La distancia se mide en píxeles y no en unidades del eje Y porque en una curva
 * paramétrica el salto puede ser todo en X, y un criterio que solo mire la Y no
 * lo vería.
 */
export function tramosDeXY(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  px: (x: number) => number,
  py: (y: number) => number,
  cortePx: number,
): string[] {
  const salida: string[] = []
  let actual: string[] = []
  let ax = NaN
  let ay = NaN

  const n = Math.min(xs.length, ys.length)
  for (let i = 0; i < n; i++) {
    const x = xs[i]
    const y = ys[i]
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      if (actual.length > 1) salida.push(actual.join(' '))
      actual = []
      ax = NaN
      ay = NaN
      continue
    }
    const cx = px(x)
    const cy = py(y)
    if (Number.isFinite(ax) && Math.hypot(cx - ax, cy - ay) > cortePx) {
      if (actual.length > 1) salida.push(actual.join(' '))
      actual = []
    }
    actual.push(`${cx.toFixed(1)},${cy.toFixed(1)}`)
    ax = cx
    ay = cy
  }
  if (actual.length > 1) salida.push(actual.join(' '))
  return salida
}

/** Aire alrededor de un tramo, o alto propio si la curva es plana. */
function conAire(min: number, max: number, aire: number): [number, number] {
  const largo = max - min
  // Una curva constante (o un punto suelto) necesita alto propio o se vería como
  // una raya pegada al borde.
  const margen = largo > 1e-9 ? largo * aire : Math.max(1, Math.abs(max) * 0.5)
  return [min - margen, max + margen]
}

/** La ventana que contiene todos los puntos finitos. null si no hay ninguno. */
export function encuadrarXY(curvas: Curva[], aire = 0.12): Vista | null {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const c of curvas) {
    const n = Math.min(c.xs.length, c.ys.length)
    for (let i = 0; i < n; i++) {
      const x = c.xs[i]
      const y = c.ys[i]
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (minX > maxX || minY > maxY) return null

  const [x0, x1] = conAire(minX, maxX, aire)
  const [y0, y1] = conAire(minY, maxY, aire)
  return { x0, x1, y0, y1 }
}

/**
 * Huella del contenido de una lista de funciones. Sirve de dependencia de los
 * `useMemo` que muestrean: así cambiar cuál se está editando —que no toca ni las
 * expresiones ni la visibilidad— no vuelve a muestrear nada.
 */
export function claveDe(lista: { expr: string; expr2?: string; visible: boolean }[]): string {
  return lista.map((f) => `${f.visible ? 1 : 0}|${f.expr}|${f.expr2 ?? ''}`).join('¦')
}

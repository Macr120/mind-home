/**
 * Matemática de las curvas de caminos (la comparten el render y el recorrido
 * del tren): en una celda con exactamente dos brazos perpendiculares (una "L")
 * el tramo se dibuja como cuarto de círculo con centro en la esquina de la
 * celda y radio H = SIZE/2. Ese arco pasa exacto por los puntos medios de
 * arista (donde empatan los brazos rectos vecinos) y es tangente a ellos.
 */

/** Medio lado de celda (SIZE/2 de walls.ts) = radio del arco de esquina. */
export const H = 3

/**
 * Arco de esquina de una celda en L. El arco cubre θ ∈ [a0, a0+π/2] con
 * P(θ) = (cx + R·cosθ, cz + R·sinθ) en el plano xz local de la celda:
 * θ = a0 cae en la arista del brazo `j` y θ = a0+π/2 en la del brazo `i`.
 */
export interface ArcoEsquina {
  i: number
  j: number
  cx: number
  cz: number
  a0: number
}

/** dx/dz por índice de dirección (mismo orden que DIRS: N, E, S, O). */
const DX = [0, 1, 0, -1]
const DZ = [-1, 0, 1, 0]

/**
 * Detecta la "L": exactamente dos brazos y en direcciones perpendiculares
 * (índices consecutivos en el ciclo N→E→S→O). Devuelve null para rectas,
 * puntas, T y cruces (esos conservan el render de hub + brazos).
 */
export function esquinaDe(brazos: readonly (unknown | null)[]): ArcoEsquina | null {
  const con: number[] = []
  brazos.forEach((b, i) => {
    if (b) con.push(i)
  })
  if (con.length !== 2) return null
  const [a, b] = con
  let i: number
  if ((a + 1) % 4 === b) i = a
  else if ((b + 1) % 4 === a) i = b
  else return null // opuestos = recta
  const j = (i + 1) % 4
  return {
    i,
    j,
    cx: H * (DX[i] + DX[j]),
    cz: H * (DZ[i] + DZ[j]),
    a0: ((i + 1) * Math.PI) / 2,
  }
}

/** Punto del arco a radio R, con t ∈ [0,1] (0 = arista del brazo j, 1 = la del i). */
export function puntoArco(a: ArcoEsquina, R: number, t: number): { x: number; z: number } {
  const th = a.a0 + (t * Math.PI) / 2
  return { x: a.cx + R * Math.cos(th), z: a.cz + R * Math.sin(th) }
}

/**
 * Altura del riel a lo largo del arco (curva y rampa a la vez): Bézier
 * cuadrática entre los medios de arista (los mismos que usan las rampas
 * rectas) con la altura propia de la celda como punto de control.
 */
export function alturaArco(yIn: number, y0: number, yOut: number, t: number): number {
  const u = 1 - t
  return u * u * yIn + 2 * u * t * y0 + t * t * yOut
}

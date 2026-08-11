/**
 * Ejes «bonitos» para las dos superficies que dibujan SVG a mano en esta sala:
 * el graficador de funciones y las gráficas de las hojas. Es el mismo problema
 * en los dos sitios (elegir un paso de rejilla legible y rotularlo), así que
 * vive una sola vez aquí.
 */

/** Paso de rejilla "bonito": la potencia de 10 más cercana, ajustada a 1, 2 o 5. */
export function pasoRejilla(rango: number): number {
  if (!Number.isFinite(rango) || rango <= 0) return 1
  const crudo = rango / 8
  const pot = 10 ** Math.floor(Math.log10(crudo))
  const n = crudo / pot
  return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * pot
}

/** Etiqueta corta de un número de eje (sin colas de decimales binarios). */
export function etiqueta(v: number, paso: number): string {
  if (Math.abs(v) < paso / 1000) return '0'
  const dec = Math.max(0, -Math.floor(Math.log10(paso)))
  return Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(1) : v.toFixed(Math.min(dec, 6))
}

/**
 * Rango de un eje de valores, redondeado hacia fuera al paso de rejilla para
 * que la última marca caiga justo en el borde.
 *
 * `desdeCero` es lo que separa una barra de una línea: una barra que no arranca
 * en el cero miente sobre la proporción, y una línea que lo incluye a la fuerza
 * aplasta la variación que se quería ver.
 */
export function escalaEje(valores: number[], desdeCero: boolean): { min: number; max: number; paso: number } {
  const vs = valores.filter((v) => Number.isFinite(v))
  if (vs.length === 0) return { min: 0, max: 1, paso: 1 }
  let min = Math.min(...vs)
  let max = Math.max(...vs)
  if (desdeCero) {
    min = Math.min(0, min)
    max = Math.max(0, max)
  }
  if (min === max) {
    // Una serie plana: se le da aire alrededor o la línea queda pegada al borde.
    const aire = Math.abs(min) || 1
    min -= aire / 2
    max += aire / 2
  }
  const paso = pasoRejilla(max - min)
  return { min: Math.floor(min / paso) * paso, max: Math.ceil(max / paso) * paso, paso }
}

/** Las marcas de un eje, de `min` a `max` (ambas incluidas). */
export function marcas(min: number, max: number, paso: number): number[] {
  const salida: number[] = []
  // Se cuenta por índices y no sumando el paso: acumular flotantes va corriendo
  // la última marca y aparece un 9.999999999 en el eje.
  const n = Math.round((max - min) / paso)
  for (let i = 0; i <= n; i++) salida.push(min + i * paso)
  return salida
}

/**
 * Las marcas que caen DENTRO de una ventana, redondeando hacia dentro.
 *
 * Es la de los planos que se panean: `marcas()` da el eje entero de una serie de
 * datos, esta da solo lo que se ve. Se apoya en aquella para heredar su cuenta
 * por índices, que es lo que evita el 9.999999999.
 */
export function marcasVisibles(desde: number, hasta: number, paso: number): number[] {
  if (!Number.isFinite(desde) || !Number.isFinite(hasta) || !(paso > 0)) return []
  const min = Math.ceil(desde / paso) * paso
  const max = Math.floor(hasta / paso) * paso
  return max < min ? [] : marcas(min, max, paso)
}

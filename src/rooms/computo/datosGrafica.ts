/**
 * Leer un rango de la hoja como series de datos.
 *
 * Este archivo es la ÚNICA lectura del rango de una gráfica: lo usan tanto el
 * SVG que se ve en pantalla como el exportador de .xlsx. Si cada uno recortara
 * las cabeceras por su cuenta, la gráfica de Excel acabaría enseñando otra cosa
 * que la de la app, y ese desajuste es imposible de ver hasta que un usuario
 * abre el archivo.
 *
 * Se guardan los VALORES ya calculados (para pintar y para la caché del .xlsx)
 * y también el RANGO A1 de cada serie, que es lo que hace la gráfica de Excel
 * viva: sin él Excel pintaría números muertos que no se actualizan al editar.
 */
import type { GraficaHoja, TipoGraficaHoja } from '../../core/data/db'
import { COLORES_FUNCION } from './constantes'
import { celdasDeRango, deRef, nombreCol, pintar, refA1, type Celdas, type ResultadoCelda } from './hoja'

export interface SerieDatos {
  /** Rótulo de la serie: la cabecera, o el nombre de la columna. */
  nombre: string
  /** Celda A1 del rótulo, si sale de una cabecera. */
  refNombre?: string
  /** Rango A1 de los valores ('B2:B7'). */
  rango: string
  /** Valores ya calculados; `null` donde la celda no era un número. */
  valores: (number | null)[]
  /** Color en hex, compartido con el graficador de funciones. */
  color: string
}

export interface DatosGrafica {
  tipo: TipoGraficaHoja
  titulo: string
  /** Etiquetas del eje de categorías, ya formateadas. */
  etiquetas: string[]
  /** Rango A1 de las etiquetas, si salen de una columna de la hoja. */
  rangoCat?: string
  /** Las categorías como números: solo significan algo en una dispersión. */
  numerosCat: (number | null)[]
  series: SerieDatos[]
}

/** 'C7:A2' → rectángulo normalizado; null si el rango no es válido. */
export function cajaDeRango(rango: string): { f0: number; f1: number; c0: number; c1: number } | null {
  const [a, b = a] = rango.split(':')
  const p = deRef(a ?? '')
  const q = deRef(b ?? '')
  if (!p || !q) return null
  return {
    f0: Math.min(p.fila, q.fila),
    f1: Math.max(p.fila, q.fila),
    c0: Math.min(p.col, q.col),
    c1: Math.max(p.col, q.col),
  }
}

/**
 * Las series de una gráfica. Una serie por COLUMNA, que es como se leen las
 * tablas: los meses bajan y los conceptos van al lado.
 *
 * Devuelve `null` si el rango no da para nada (mal escrito, o solo cabeceras).
 * Nunca lanza: una gráfica rota no puede impedir abrir la hoja ni exportarla.
 */
export function datosDeGrafica(
  g: GraficaHoja,
  celdas: Celdas,
  resultados: Record<string, ResultadoCelda>,
): DatosGrafica | null {
  const caja = cajaDeRango(g.rango)
  if (!caja) return null

  const filaRotulos = g.encabezadoFila ? caja.f0 : null
  // En una dispersión la primera columna son las X siempre: un scatter sin X no
  // significa nada, y pedirlo aparte sería una casilla más que nadie entiende.
  const colEtiquetas = g.encabezadoCol || g.tipo === 'dispersion' ? caja.c0 : null
  const f0 = filaRotulos != null ? caja.f0 + 1 : caja.f0
  const c0 = colEtiquetas != null ? caja.c0 + 1 : caja.c0
  if (f0 > caja.f1 || c0 > caja.c1) return null

  const texto = (ref: string) => pintar(resultados[ref]?.valor, celdas[ref])
  const numero = (ref: string) => {
    const v = resultados[ref]?.valor
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  const filas = celdasDeRango(refA1(f0, 0), refA1(caja.f1, 0)).map((_, i) => f0 + i)

  const series: SerieDatos[] = []
  for (let c = c0; c <= caja.c1; c++) {
    series.push({
      nombre: filaRotulos != null ? texto(refA1(filaRotulos, c)) || nombreCol(c) : nombreCol(c),
      refNombre: filaRotulos != null ? refA1(filaRotulos, c) : undefined,
      rango: `${refA1(f0, c)}:${refA1(caja.f1, c)}`,
      valores: filas.map((f) => numero(refA1(f, c))),
      color: COLORES_FUNCION[series.length % COLORES_FUNCION.length],
    })
  }
  if (series.length === 0) return null

  const refsCat = colEtiquetas != null ? filas.map((f) => refA1(f, colEtiquetas)) : []
  const numerosCat = colEtiquetas != null ? refsCat.map(numero) : filas.map((_, i) => i + 1)
  // Una dispersión cuya primera columna son textos (meses, nombres…) no tiene X
  // que valgan: se reparten los puntos 1..n, que es también lo que hace Excel al
  // encontrarse texto en el rango de las X. Sin esto la gráfica saldría vacía.
  const sinX = g.tipo === 'dispersion' && numerosCat.every((v) => v == null)

  return {
    tipo: g.tipo,
    titulo: g.titulo,
    // Sin columna de etiquetas se numeran 1..n, igual que hace Excel.
    etiquetas: colEtiquetas != null ? refsCat.map(texto) : filas.map((_, i) => String(i + 1)),
    rangoCat: colEtiquetas != null ? `${refA1(f0, colEtiquetas)}:${refA1(caja.f1, colEtiquetas)}` : undefined,
    numerosCat: sinX ? filas.map((_, i) => i + 1) : numerosCat,
    // Un pastel es un reparto: solo puede enseñar UNA serie (Excel hace lo mismo).
    series: g.tipo === 'pastel' ? series.slice(0, 1) : series,
  }
}

/** ¿Hay al menos un número que dibujar? */
export const hayDatos = (d: DatosGrafica) => d.series.some((s) => s.valores.some((v) => v != null))

/**
 * ¿La primera fila y la primera columna del rango son cabeceras? Se decide por
 * el TIPO de lo que hay: una fila de textos encima de una tabla de números es
 * un encabezado en cualquier hoja del mundo.
 *
 * Sin esto, «insertar gráfica» nunca acierta a la primera y el usuario tiene
 * que corregir las dos casillas cada vez.
 */
export function detectarEncabezados(
  rango: string,
  resultados: Record<string, ResultadoCelda>,
): { encabezadoFila: boolean; encabezadoCol: boolean } {
  const caja = cajaDeRango(rango)
  if (!caja) return { encabezadoFila: false, encabezadoCol: false }

  const texto = (f: number, c: number) => {
    const v = resultados[refA1(f, c)]?.valor
    return v != null && typeof v !== 'number' && String(v).trim() !== ''
  }
  const numero = (f: number, c: number) => typeof resultados[refA1(f, c)]?.valor === 'number'
  const cols = Array.from({ length: caja.c1 - caja.c0 + 1 }, (_, i) => caja.c0 + i)
  const filas = Array.from({ length: caja.f1 - caja.f0 + 1 }, (_, i) => caja.f0 + i)

  return {
    encabezadoFila:
      caja.f1 > caja.f0 && cols.some((c) => texto(caja.f0, c)) && cols.some((c) => numero(caja.f0 + 1, c)),
    encabezadoCol:
      caja.c1 > caja.c0 && filas.some((f) => texto(f, caja.c0)) && filas.some((f) => numero(f, caja.c0 + 1)),
  }
}

/**
 * El portapapeles de la hoja: TSV para fuera, celdas de verdad para dentro.
 *
 * Copiar hace las dos cosas a la vez y es intencionado:
 * - guarda un `Recorte` en memoria, que conserva las FÓRMULAS y deja que
 *   `refs.ts` las reescriba al pegar;
 * - y escribe en el portapapeles del sistema el TSV de los VALORES, porque
 *   pegar `=SUMA(B2:B7)` en un Excel en inglés no serviría de nada.
 *
 * En el WebView de Android leer el portapapeles falla casi siempre; por eso
 * `leerDelSistema` devuelve `null` en vez de lanzar y la UI cae en un cuadro
 * donde el usuario pega a mano. Sin eso, el pegado externo no existiría en la
 * plataforma objetivo.
 */
import { deRef, esFormula, pintar, refA1, type Celdas, type ResultadoCelda } from './hoja'
import type { Rect } from './refs'

export interface Recorte {
  rect: Rect
  celdas: Celdas
  cortado: boolean
}

/**
 * Un rango como texto separado por tabuladores. Con `crudo` salen las fórmulas
 * tal cual (es lo que necesita la IA para poder editarlas); sin él, los valores
 * ya calculados (que es lo que espera Excel).
 */
export function aTsv(
  celdas: Celdas,
  rect: Rect,
  resultados: Record<string, ResultadoCelda>,
  opts: { crudo?: boolean; conCabeceras?: boolean } = {},
): string {
  const filas: string[] = []
  if (opts.conCabeceras) {
    const cab = ['']
    for (let c = rect.c0; c <= rect.c1; c++) cab.push(nombreColumna(c))
    filas.push(cab.join('\t'))
  }
  for (let f = rect.f0; f <= rect.f1; f++) {
    const fila: string[] = opts.conCabeceras ? [String(f + 1)] : []
    for (let c = rect.c0; c <= rect.c1; c++) {
      const ref = refA1(f, c)
      const celda = celdas[ref]
      if (opts.crudo) {
        fila.push(celda?.crudo ?? '')
      } else {
        const r = resultados[ref]
        fila.push(r?.error ?? pintar(r?.valor, celda))
      }
    }
    filas.push(fila.join('\t'))
  }
  return filas.join('\n')
}

// Se importa perezosamente para no crear un ciclo con `hoja.ts`.
function nombreColumna(col: number): string {
  let n = col
  let s = ''
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

/** Un TSV pegado, convertido en matriz de crudos. Tolera CRLF y comillas de Excel. */
export function deTsv(texto: string): string[][] {
  return texto
    .replace(/\r\n?/g, '\n')
    .replace(/\n$/, '')
    .split('\n')
    .map((linea) =>
      linea.split('\t').map((celda) => {
        const t = celda.trim()
        // Excel entrecomilla lo que lleva tabuladores o saltos dentro.
        return t.startsWith('"') && t.endsWith('"') && t.length > 1
          ? t.slice(1, -1).replace(/""/g, '"')
          : celda
      }),
    )
}

/** Una matriz de crudos colocada a partir de una celda. */
export function celdasDeMatriz(matriz: string[][], destino: { fila: number; col: number }): Celdas {
  const celdas: Celdas = {}
  matriz.forEach((fila, i) =>
    fila.forEach((crudo, j) => {
      if (crudo !== '') celdas[refA1(destino.fila + i, destino.col + j)] = { crudo }
    }),
  )
  return celdas
}

/** Copia al portapapeles del sistema; false si el navegador no deja. */
export async function copiarAlSistema(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

/** Lee el portapapeles del sistema; null si no se puede (WebView de Android). */
export async function leerDelSistema(): Promise<string | null> {
  try {
    const texto = await navigator.clipboard.readText()
    return texto || null
  } catch {
    return null
  }
}

/** Las celdas de un rango, tal cual, para guardarlas en un `Recorte`. */
export function recortar(celdas: Celdas, rect: Rect, cortado: boolean): Recorte {
  const dentro: Celdas = {}
  for (const [ref, celda] of Object.entries(celdas)) {
    const p = deRef(ref)
    if (p && p.fila >= rect.f0 && p.fila <= rect.f1 && p.col >= rect.c0 && p.col <= rect.c1) {
      dentro[ref] = celda
    }
  }
  return { rect, celdas: dentro, cortado }
}

/** ¿El recorte trae alguna fórmula? (decide si merece la pena avisar al pegar) */
export const traeFormulas = (r: Recorte) => Object.values(r.celdas).some(esFormula)

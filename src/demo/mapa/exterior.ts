/**
 * El suelo del mapa: césped en todo y calles de adoquín en las fronteras entre
 * bloques, para que la división en zonas se lea desde el aire. Se pinta ANTES
 * que las zonas — cada una repinta encima lo suyo (el piso exterior es un
 * upsert por celda: gana el último).
 *
 * Las calles solo van en fronteras INTERNAS: en el borde del mapa recortado
 * esa columna/fila es del anillo del tren, y una calle ahí delataría el corte.
 */
import { aplicarPisoExteriorCeldas } from '../../core/data/repository'
import type { Cell } from '../../core/house/walls'
import { TAM_BLOQUE, celdasRect } from './cuadrantes'

export async function construirExteriorBase(cols: number, rows: number): Promise<void> {
  // Césped explícito (más vivo que el color que deriva del tema).
  await aplicarPisoExteriorCeldas(0, celdasRect(0, 0, cols - 1, rows - 1), 'pasto', '#4e7a44')

  const calles: Cell[] = []
  for (let c = TAM_BLOQUE - 1; c < cols - 1; c += TAM_BLOQUE) {
    calles.push(...celdasRect(c, 0, c, rows - 1))
  }
  for (let r = TAM_BLOQUE - 1; r < rows - 1; r += TAM_BLOQUE) {
    calles.push(...celdasRect(0, r, cols - 1, r))
  }
  if (calles.length) await aplicarPisoExteriorCeldas(0, calles, 'adoquin', '#9ca3af')
}

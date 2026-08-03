/**
 * El suelo del mapa: césped en todo y calles de adoquín en las fronteras entre
 * bloques, para que la división en zonas se lea desde el aire. Se pinta ANTES
 * que las zonas — cada una repinta encima lo suyo (el piso exterior es un
 * upsert por celda: gana el último).
 *
 * Las calles solo van en fronteras INTERNAS: en el borde del mapa recortado
 * esa columna/fila es del anillo del tren, y una calle ahí delataría el corte.
 *
 * El adoquín va TOSTADO, no gris: canchas, pista y feria pavimentan su patio de
 * cemento gris y la calle se disolvía contra ellos. Encima, una hilera de setos
 * marca el filo de la calle horizontal.
 */
import { aplicarPisoExteriorCeldas } from '../../core/data/repository'
import { MAPA_ROOM, useDiseño } from '../../core/state/disenoStore'
import type { Cell } from '../../core/house/walls'
import { TAM_BLOQUE, celdasRect, mundo } from './cuadrantes'

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
  if (calles.length) await aplicarPisoExteriorCeldas(0, calles, 'adoquin', '#c2a878')

  await guarnecerCalleHorizontal(cols)
}

/**
 * Setos a ambos lados de la calle que cruza el mapa de este a oeste: son los que
 * la convierten en camino y no en una franja de piso. Van a 0.38 de celda del
 * eje (≈3 m), así que dejan libres los 6 m centrales.
 */
async function guarnecerCalleHorizontal(cols: number): Promise<void> {
  const D = useDiseño.getState
  const fila = TAM_BLOQUE - 1
  for (let col = 1; col <= cols - 2; col += 2) {
    // Los cruces con las calles verticales quedan despejados.
    if ((col + 1) % TAM_BLOQUE === 0) continue
    // El spawn del motor es el punto fijo (-3, 0, 0): cae en el borde norte de
    // la celda central de esta fila, y un seto ahí atraparía al personaje.
    if (col === Math.floor((cols - 1) / 2)) continue
    for (const lado of [-0.38, 0.38]) {
      await D().addObjeto(MAPA_ROOM, 'recurso:78', '#2f7d32', undefined, mundo(col, fila + lado))
    }
  }
}

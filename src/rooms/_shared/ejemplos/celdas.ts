import { caminosRepo, corralesRepo, cultivosRepo } from '../../../core/data/repository'
import { celdasOcupadasEnNivel } from '../../../core/house/planoGeometria'
import { useLayout } from '../../../core/state/layoutStore'

/**
 * Dónde plantar el ejemplo de una construcción del mapa sin pisar nada.
 *
 * La infraestructura (huerto, granja, caminos) no vive en una lista: ocupa
 * celdas de la rejilla, y un ejemplo que aparezca encima de la casa o del
 * huerto que ya tenías sería un destrozo, no una demostración. Así que se busca
 * un rectángulo libre —de cuartos y de cualquier otra construcción— y se
 * prefiere el más alejado de la casa, para que quede claro que es un añadido.
 *
 * Devuelve `null` si no cabe: la barra del ejemplo lo dice en vez de forzarlo.
 */
export async function huecoLibre(ancho: number, alto: number): Promise<{ col: number; row: number } | null> {
  const { placed, cells, footprints, niveles, gridCols, gridRows } = useLayout.getState()
  const deCuartos = celdasOcupadasEnNivel(0, placed, cells, footprints, niveles)
  const ocupadas = new Set(deCuartos.keys())
  // Las celdas de cuartos vienen con la llave de `planoGeometria`; el resto de
  // construcciones se marcan aquí con el mismo formato 'col,row'.
  const marcar = (col: number, row: number) => ocupadas.add(`${col},${row}`)
  for (const c of await cultivosRepo.list()) marcar(c.col, c.row)
  for (const c of await caminosRepo.list()) marcar(c.col, c.row)
  for (const c of await corralesRepo.list()) {
    for (let i = 0; i < c.ancho; i++) for (let j = 0; j < c.alto; j++) marcar(c.col + i, c.row + j)
  }

  const libre = (col: number, row: number) => {
    for (let i = 0; i < ancho; i++) {
      for (let j = 0; j < alto; j++) if (ocupadas.has(`${col + i},${row + j}`)) return false
    }
    return true
  }
  // Distancia a la celda de cuarto más cercana: el hueco bueno es el que más
  // lejos queda de la casa, no el primero que aparezca.
  const lejania = (col: number, row: number) => {
    let min = Infinity
    for (const llave of deCuartos.keys()) {
      const [c, r] = llave.split(',').map(Number)
      min = Math.min(min, Math.abs(c - col) + Math.abs(r - row))
    }
    return min
  }

  let mejor: { col: number; row: number } | null = null
  let mejorLejania = -1
  for (let col = 0; col + ancho <= gridCols; col++) {
    for (let row = 0; row + alto <= gridRows; row++) {
      if (!libre(col, row)) continue
      const d = lejania(col, row)
      if (d > mejorLejania) {
        mejorLejania = d
        mejor = { col, row }
      }
    }
  }
  return mejor
}

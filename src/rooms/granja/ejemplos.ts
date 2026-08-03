import type { TipoAnimal } from '../../core/data/db'
import { animalesRepo, corralesRepo } from '../../core/data/repository'
import { huecoLibre } from '../_shared/ejemplos/celdas'
import { yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'

/**
 * Ejemplo de fábrica de la granja: un corral de 2×2 con tres animales y una
 * pelota.
 *
 * Los tres animales se dejan recién comidos y recién mimados: un ejemplo que
 * aparezca con el rebaño hambriento parece un problema en vez de una
 * demostración, y el hambre ya llegará sola con las horas.
 */

const ID = 'granja.corral'

const ANIMALES: TipoAnimal[] = ['gallina', 'gallina', 'cabra']
const ANCHO = 2
const ALTO = 2

export const ejemploGranja: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => corralesRepo.list())) return
    const hueco = await huecoLibre(ANCHO, ALTO)
    if (!hueco) return
    const ahora = Date.now()
    const corralId = await corralesRepo.add({
      col: hueco.col,
      row: hueco.row,
      ancho: ANCHO,
      alto: ALTO,
      accesorios: [{ tipo: 'pelota', col: hueco.col + 1, row: hueco.row + 1 }],
      limpiadoEn: ahora,
      ejemploDe: ID,
    })
    for (const tipo of ANIMALES) {
      await animalesRepo.add({ corralId, tipo, alimentadoEn: ahora, mimadoEn: ahora, ejemploDe: ID })
    }
  },
  async impedimento() {
    return (await huecoLibre(ANCHO, ALTO)) ? null : 'ejemplo.sinSitio'
  },
}

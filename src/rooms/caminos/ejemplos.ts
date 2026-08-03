import { caminosRepo } from '../../core/data/repository'
import { huecoLibre } from '../_shared/ejemplos/celdas'
import { type PaqueteEjemplo } from '../_shared/ejemplos/tipos'

/**
 * Ejemplo de fábrica de los caminos: un circuito cerrado de 3×3 con su meta.
 *
 * Cerrado a propósito: una pista suelta se puede recorrer, pero el modo carrera
 * necesita una vuelta completa y una línea de meta, que es justo lo que hay que
 * ver para entender de qué va. Son las ocho celdas del borde del cuadrado; el
 * centro queda libre.
 */

const ID = 'caminos.circuito'

const LADO = 3

export const ejemploCaminos: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    const caminos = await caminosRepo.list()
    if (caminos.some((c) => c.ejemploDe === ID)) return
    const hueco = await huecoLibre(LADO, LADO)
    if (!hueco) return
    // La meta es ÚNICA en el mapa: si ya hay un circuito con la suya, el
    // ejemplo se queda sin línea de meta en vez de robársela.
    const yaHayMeta = caminos.some((c) => c.meta)
    for (let i = 0; i < LADO; i++) {
      for (let j = 0; j < LADO; j++) {
        // Solo el borde: el centro del cuadrado no es pista.
        if (i > 0 && i < LADO - 1 && j > 0 && j < LADO - 1) continue
        await caminosRepo.add({
          col: hueco.col + i,
          row: hueco.row + j,
          tipo: 'pista',
          // La meta va en una recta del lado de arriba, no en una curva.
          meta: !yaHayMeta && i === 1 && j === 0,
          ejemploDe: ID,
        })
      }
    }
  },
  async impedimento() {
    return (await huecoLibre(LADO, LADO)) ? null : 'ejemplo.sinSitio'
  },
}

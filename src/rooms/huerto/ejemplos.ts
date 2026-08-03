import type { EspecieCultivo } from '../../core/data/db'
import { cultivosRepo } from '../../core/data/repository'
import { huecoLibre } from '../_shared/ejemplos/celdas'
import { yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'

/**
 * Ejemplo de fábrica del huerto: cuatro parcelas juntas en las cuatro etapas.
 *
 * El huerto no tiene texto: lo que enseña es el CICLO, y para verlo hacen falta
 * las cuatro etapas a la vez. Como las etapas se derivan de los timestamps, se
 * consigue fechando cada siembra hacia atrás: la de hace días está lista, la de
 * hace un rato va creciendo, y una sin regar desde hace mucho sale marchita.
 *
 * Los tiempos reales viven en `core/house/cultivos.ts`; aquí solo se retrocede
 * lo bastante para que la etapa salga sola.
 */

const ID = 'huerto.parcelas'

const MINUTO = 60_000

/**
 * Las cuatro parcelas del ejemplo, en fila: recién sembrada, creciendo, lista y
 * marchita. Los minutos están calculados contra los tiempos de `ESPECIES`
 * (calabaza 120 min, maíz 60, girasol 10, zanahoria 3), así que si esos tiempos
 * cambian hay que recalcular estos.
 */
const PARCELAS: { especie: EspecieCultivo; minDesdeSiembra: number; minSinAgua: number }[] = [
  // Calabaza recién plantada: progreso 0 → semilla.
  { especie: 'calabaza', minDesdeSiembra: 1, minSinAgua: 1 },
  // Maíz a media vida y recién regado → planta creciendo.
  { especie: 'maiz', minDesdeSiembra: 35, minSinAgua: 5 },
  // Girasol pasado de tiempo y siempre regado → listo para cosechar.
  { especie: 'girasol', minDesdeSiembra: 12, minSinAgua: 3 },
  // Zanahoria sin agua más que su ventana antes de estar lista → marchita.
  { especie: 'zanahoria', minDesdeSiembra: 5, minSinAgua: 5 },
]

export const ejemploHuerto: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => cultivosRepo.list())) return
    const hueco = await huecoLibre(PARCELAS.length, 1)
    if (!hueco) return
    const ahora = Date.now()
    for (const [i, p] of PARCELAS.entries()) {
      await cultivosRepo.add({
        col: hueco.col + i,
        row: hueco.row,
        especie: p.especie,
        plantadoEn: ahora - p.minDesdeSiembra * MINUTO,
        regadoEn: ahora - p.minSinAgua * MINUTO,
        ejemploDe: ID,
      })
    }
  },
  async impedimento() {
    return (await huecoLibre(PARCELAS.length, 1)) ? null : 'ejemplo.sinSitio'
  },
}

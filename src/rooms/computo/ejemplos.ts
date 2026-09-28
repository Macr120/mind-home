import { calculosComputoRepo } from '../../core/data/repository'
import { addDias, fechaLocalISO } from '../../core/fechaLocal'
import { filaEjemplo, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'

/**
 * Ejemplo de fábrica del historial de la calculadora: una fila de cada tipo que
 * guarda la app, tal cual la guardaría (entrada y salida del motor). Son
 * expresiones, así que no hay texto que traducir.
 */
const ID = 'computo.historial'

const CALCULOS: { dias: number; tipo: string; entrada: string; salida: string }[] = [
  { dias: -3, tipo: 'matriz', entrada: '[[1, 2], [3, 4]] * [[5, 6], [7, 8]]', salida: '[[19, 22], [43, 50]]' },
  // ModoBases guarda la salida en la base elegida y con su prefijo.
  { dias: -2, tipo: 'base', entrada: '256 + 9', salida: '0x109' },
  { dias: -1, tipo: 'ecuacion', entrada: 'x^2 - 5*x + 6 = 0', salida: '2, 3' },
  { dias: 0, tipo: 'calculo', entrada: 'sqrt(144) + 3^2', salida: '21' },
]

export const ejemploHistorial: PaqueteEjemplo = {
  id: ID,
  tablas: [calculosComputoRepo],
  async materializar(restaurar) {
    if (await yaMaterializado(ID, () => calculosComputoRepo.list())) return
    for (const [i, c] of CALCULOS.entries()) {
      const cuando = addDias(new Date(), c.dias)
      await calculosComputoRepo.addSeed(
        filaEjemplo(ID, i, restaurar, {
          tipo: c.tipo,
          entrada: c.entrada,
          salida: c.salida,
          fecha: fechaLocalISO(cuando),
          creadoEn: cuando.toISOString(),
        }),
      )
    }
  },
}

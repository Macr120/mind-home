import type { MomentoComida, Receta } from '../../core/data/db'
import { comidasRepo } from '../../core/data/repository'

/**
 * Una receta se convierte en comida registrada. Único sitio que arma ese objeto:
 * lo llaman el detalle de la receta y la rejilla semanal del Registro, y con dos
 * copias del literal bastaría un campo nuevo para que se separaran.
 */
export function registrarRecetaEnDiario(
  receta: Receta,
  fecha: string,
  momento: MomentoComida,
): Promise<number> {
  return comidasRepo.add({
    fecha,
    momento,
    nombre: receta.nombre,
    calorias: receta.calorias,
    proteinas: receta.proteinas,
    carbohidratos: receta.carbohidratos,
    grasas: receta.grasas,
  })
}

import { gratitudDiariaRepo, sesionesMindfulnessRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { porIdioma, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_JARDIN } from './ejemplos.data'

/**
 * Ejemplo de fábrica del jardín: tres prácticas y dos días de agradecimientos.
 *
 * Las tres sesiones son de los tres tipos que se ven distintos en la lista: una
 * meditación con pista, una respiración y una meditación de noche con check-in
 * de ánimo antes y después. Aquí no hay racha ni XP que falsear: la calma
 * acumulada sí sube, que es justo lo que el ejemplo enseña.
 */

const ID = 'jardin.practicas'

export const ejemploJardin: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => sesionesMindfulnessRepo.list(), () => gratitudDiariaRepo.list())) return
    const T = porIdioma(TEXTOS_JARDIN)
    const hoy = fechaLocalISO()
    // El título de la sesión es su nota recortada, igual que cuando se registra
    // por chat (ver `jardin/index.tsx`).
    const titulo = (nota: string) => nota.slice(0, 60)

    await sesionesMindfulnessRepo.add({
      fecha: isoMasDias(hoy, -5),
      tipo: 'meditacion',
      titulo: titulo(T.sesionManana),
      duracionMin: 10,
      tema: 'bosque',
      nota: T.sesionManana,
      ejemploDe: ID,
    })
    await sesionesMindfulnessRepo.add({
      fecha: isoMasDias(hoy, -2),
      tipo: 'respiracion',
      titulo: titulo(T.sesionRespiracion),
      duracionMin: 5,
      tema: 'caja',
      nota: T.sesionRespiracion,
      ejemploDe: ID,
    })
    await sesionesMindfulnessRepo.add({
      fecha: hoy,
      tipo: 'meditacion',
      titulo: titulo(T.sesionNoche),
      duracionMin: 20,
      tema: 'lluvia',
      nota: T.sesionNoche,
      animoAntes: 2,
      animoDespues: 4,
      ejemploDe: ID,
    })

    await gratitudDiariaRepo.add({
      fecha: isoMasDias(hoy, -3),
      item1: T.graciasA1,
      item2: T.graciasA2,
      item3: T.graciasA3,
      ejemploDe: ID,
    })
    await gratitudDiariaRepo.add({
      fecha: hoy,
      item1: T.graciasB1,
      item2: T.graciasB2,
      item3: T.graciasB3,
      ejemploDe: ID,
    })
  },
}

import { gratitudDiariaRepo, sesionesMindfulnessRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
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

  async retraducir() {
    for (const s of await sesionesMindfulnessRepo.list()) {
      if (s.ejemploDe !== ID || s.id == null) continue
      const nota = retraducido(TEXTOS_JARDIN, s.nota, 'sesionManana', 'sesionRespiracion', 'sesionNoche')
      if (!nota) continue
      // El título derivado se rehace solo si seguía siendo el recorte de la nota.
      await sesionesMindfulnessRepo.update(
        s.id,
        s.titulo === s.nota?.slice(0, 60) ? { nota, titulo: nota.slice(0, 60) } : { nota },
      )
    }
    for (const g of await gratitudDiariaRepo.list()) {
      if (g.ejemploDe !== ID || g.id == null) continue
      const item1 = retraducido(TEXTOS_JARDIN, g.item1, 'graciasA1', 'graciasB1')
      const item2 = retraducido(TEXTOS_JARDIN, g.item2, 'graciasA2', 'graciasB2')
      const item3 = retraducido(TEXTOS_JARDIN, g.item3, 'graciasA3', 'graciasB3')
      if (item1 || item2 || item3) {
        await gratitudDiariaRepo.update(g.id, {
          ...(item1 && { item1 }),
          ...(item2 && { item2 }),
          ...(item3 && { item3 }),
        })
      }
    }
  },
}

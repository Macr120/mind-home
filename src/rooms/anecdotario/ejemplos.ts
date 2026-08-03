import { anecdotasRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { fotoEjemplo } from '../_shared/ejemplos/fotos'
import { porIdioma, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_ANECDOTARIO } from './ejemplos.data'

/**
 * Ejemplo de fábrica del anecdotario: tres recuerdos de días distintos de las
 * últimas dos semanas, con su ánimo y dos con foto.
 *
 * Van repartidos en el mes para que el calendario de ánimo tenga tres días
 * pintados de colores distintos: uno bueno, uno emocionado y uno regular. El
 * texto sale de `ejemplos.data.ts` (los dos idiomas).
 */

const ID = 'anecdotario.recuerdos'

export const ejemploAnecdotario: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => anecdotasRepo.list())) return
    const T = porIdioma(TEXTOS_ANECDOTARIO)
    const hoy = fechaLocalISO()
    const [fotoPaseo, fotoCena] = await Promise.all([
      fotoEjemplo('anecdotario.paseo'),
      fotoEjemplo('anecdotario.cena'),
    ])

    await anecdotasRepo.add({
      fecha: isoMasDias(hoy, -9),
      titulo: T.tituloPaseo,
      contenido: T.textoPaseo,
      animo: '🙂',
      fotos: fotoPaseo ? [fotoPaseo] : undefined,
      ejemploDe: ID,
    })
    await anecdotasRepo.add({
      fecha: isoMasDias(hoy, -4),
      titulo: T.tituloCena,
      contenido: T.textoCena,
      animo: '🤩',
      fotos: fotoCena ? [fotoCena] : undefined,
      ejemploDe: ID,
    })
    // Sin foto y con un ánimo bajo: los días regulares también se apuntan, y
    // así se ve que la foto es opcional.
    await anecdotasRepo.add({
      fecha: isoMasDias(hoy, -1),
      titulo: T.tituloBache,
      contenido: T.textoBache,
      animo: '😐',
      ejemploDe: ID,
    })
  },
}

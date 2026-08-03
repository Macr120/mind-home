import { rutinasRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { porIdioma, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_CALENDARIO } from './ejemplos.data'

/**
 * Ejemplo de fábrica del calendario: dos rutinas con sus pasos.
 *
 * Una diaria de primera hora y otra semanal por la tarde: con las dos se ven a
 * la vez las dos formas de repetir y cómo un bloque ocupa su franja en la
 * rejilla de 0 a 24. Van sin `plantillaId` porque son rutinas de la casa, no de
 * una app: es lo que crea el usuario desde el propio calendario.
 */

const ID = 'calendario.rutinas'

/** Jueves: el bloque semanal cae siempre en el mismo día de la rejilla. */
const JUEVES = 4

export const ejemploCalendario: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => rutinasRepo.list())) return
    const T = porIdioma(TEXTOS_CALENDARIO)
    const hoy = fechaLocalISO()
    const paso = (titulo: string) => ({ titulo, roomId: '' })

    await rutinasRepo.add({
      nombre: T.rutinaManana,
      emoji: '☀️',
      hora: '07:30',
      horaFin: '08:15',
      dias: [],
      repeticion: 'indefinido',
      fechaInicio: isoMasDias(hoy, -14),
      color: '#38bdf8',
      pasos: [paso(T.pasoManana1), paso(T.pasoManana2), paso(T.pasoManana3)],
      activa: true,
      creadoEn: `${isoMasDias(hoy, -14)}T09:00:00.000Z`,
      ejemploDe: ID,
    })
    await rutinasRepo.add({
      nombre: T.rutinaSemanal,
      emoji: '🛒',
      hora: '18:00',
      horaFin: '19:30',
      dias: [JUEVES],
      repeticion: 'semanal',
      fechaInicio: isoMasDias(hoy, -14),
      color: '#f472b6',
      pasos: [paso(T.pasoSemanal1), paso(T.pasoSemanal2)],
      activa: true,
      creadoEn: `${isoMasDias(hoy, -14)}T09:00:00.000Z`,
      ejemploDe: ID,
    })
  },
}

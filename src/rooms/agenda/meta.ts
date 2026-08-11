import { eventosAgendaRepo } from '../../core/data/repository'
import type { MetaDiaria } from '../../core/appContrato'

/**
 * Meta del día: lo que tenías agendado hoy contra lo que ya palomeaste.
 *
 * El objetivo es DINÁMICO a propósito. Un día sin nada agendado da objetivo 0, y
 * el núcleo trata el 0 como meta apagada: ni se evalúa ni avisa. Una agenda no
 * es un hábito y no tiene sentido presionar por un día tranquilo — por eso
 * también va `sinRacha`.
 */
export const metaAgenda: MetaDiaria = {
  clave: 'agenda.metaDiaria',
  etiquetaEs: 'Agenda de hoy',
  sinRacha: true,
  seccion: 'trabajo',
  del: async (fecha) => {
    const hoy = (await eventosAgendaRepo.list()).filter((e) => e.fecha === fecha)
    return { hecho: hoy.filter((e) => e.hecho).length, objetivo: hoy.length }
  },
}

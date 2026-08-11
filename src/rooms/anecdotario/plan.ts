import { anecdotasRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { CLAUSULA_RECHAZO, type ContextoPlanApp } from '../../core/planIA'

/**
 * Acotamiento del planificador ✨ en el Anecdotario: el plan es SIEMPRE de
 * escritura — sostener el hábito o cerrar una etapa contada (un viaje, un año).
 */
export async function planMetasAnecdotario(): Promise<ContextoPlanApp> {
  const hoy = fechaLocalISO()
  const entradas = await anecdotasRepo.list()
  const delMes = entradas.filter((e) => e.fecha >= isoMasDias(hoy, -29) && e.fecha <= hoy)

  const contexto: string[] = []
  if (entradas.length > 0) {
    const ultima = entradas.reduce((a, b) => (a.fecha > b.fecha ? a : b)).fecha
    contexto.push(`Diario: ${entradas.length} entradas escritas; la última, el ${ultima}.`)
    contexto.push(`Últimos 30 días: ${delMes.length} entradas.`)
    const conFoto = entradas.filter((e) => (e.fotos?.length ?? 0) > 0).length
    if (conFoto > 0) contexto.push(`${conFoto} entradas llevan foto.`)
  }

  return {
    guia: [
      'La meta es de la app del Anecdotario (un diario personal con fotos y estado de ánimo): el plan es SIEMPRE de escritura — sostener el hábito o dejar contada una etapa.',
      'Las fases son tramos de tiempo o bloques de la historia que se quiere dejar escrita, en orden.',
      'Los hijos son entradas o tandas concretas («Escribir los tres días del viaje que faltan», «Ponerle foto a las entradas de marzo»), con un momento fijo para escribirlas.',
      'Nada de metas de cantidad vacías: cada hijo dice QUÉ se escribe, no solo cuántas palabras.',
      CLAUSULA_RECHAZO('escribir un diario o dejar recuerdos por escrito'),
    ],
    contexto,
    ejemplo: tGlobal('anecdotario.plan.ejemplo', 'Dejar contado el viaje de este año'),
  }
}

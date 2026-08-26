import { eventosAgendaRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { CLAUSULA_RECHAZO, CLAUSULA_SALUD, type ContextoPlanApp } from '../../core/planIA'

/**
 * Acotamiento del planificador ✨ en la Agenda: el plan es SIEMPRE de trabajo —
 * llevar un proyecto o un compromiso hasta su fecha de entrega.
 *
 * El material son los PENDIENTES sin fecha de la bandeja: si alguno pertenece a
 * la meta, el plan lo coloca en su fase en vez de inventarse tareas nuevas.
 */
export async function planMetasAgenda(): Promise<ContextoPlanApp> {
  const hoy = fechaLocalISO()
  const eventos = await eventosAgendaRepo.list()
  const sinFecha = eventos.filter((e) => !e.fecha && !e.hecho)
  const porVenir = eventos.filter((e) => e.fecha && e.fecha >= hoy && !e.hecho)
  const atrasados = eventos.filter((e) => e.fecha && e.fecha < hoy && !e.hecho)

  const contexto: string[] = []
  if (porVenir.length > 0) {
    const proxima = porVenir.reduce((a, b) => ((a.fecha ?? '') < (b.fecha ?? '') ? a : b))
    contexto.push(`${porVenir.length} citas por venir; la más próxima, «${proxima.titulo}» el ${proxima.fecha}.`)
  }
  if (sinFecha.length > 0) contexto.push(`Bandeja: ${sinFecha.length} pendientes sin fecha.`)
  if (atrasados.length > 0) contexto.push(`${atrasados.length} pendientes atrasados.`)
  const finMes = eventos.filter((e) => e.fecha && e.fecha >= hoy && e.fecha <= isoMasDias(hoy, 29)).length
  if (finMes > 0) contexto.push(`En los próximos 30 días hay ${finMes} compromisos ya agendados.`)

  return {
    guia: [
      'La meta es de la app de Agenda (trabajo, salud y personas): el plan es SIEMPRE llevar un proyecto o un compromiso hasta su entrega.',
      'Las fases son etapas del trabajo, en el orden en que hay que hacerlas, y la última reserva tiempo para cerrar y revisar — no dejes la entrega para el último día.',
      'Los hijos son entregables concretos («Reunir las diez fuentes», «Tres tandas de medidas»), no recordatorios.',
      'Respeta lo que la agenda ya tiene ocupado: no llenes los días que ya están llenos de citas.',
      CLAUSULA_SALUD,
      CLAUSULA_RECHAZO('un proyecto, un compromiso o una gestión con fecha'),
    ],
    contexto,
    ejemplo: tGlobal('agenda.plan.ejemplo', 'Entregar el proyecto a tiempo'),
    material:
      sinFecha.length > 0
        ? {
            titulo: tGlobal('agenda.plan.material', 'Pendientes del plan'),
            instruccion:
              'El material son pendientes que el usuario ya escribió y que aún no tienen fecha. Coloca en el plan los que pertenezcan a la meta y en el motivo di en qué fase encajan; ignora el resto. Deja "rutina" vacía.',
            items: sinFecha.slice(0, 20).map((e) => ({
              nombre: e.titulo,
              detalle: e.area,
            })),
          }
        : undefined,
  }
}

import { lecturasDiarioRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { CLAUSULA_RECHAZO, type ContextoPlanApp } from '../../core/planIA'
import { CATEGORIAS } from './constantes'

/**
 * Acotamiento del planificador ✨ en Noticias: el plan es SIEMPRE de lectura —
 * qué se lee, cuándo se lee y qué se hace con lo leído.
 */
export async function planMetasDiario(): Promise<ContextoPlanApp> {
  const hoy = fechaLocalISO()
  const desde = isoMasDias(hoy, -29)
  const leidos = (await lecturasDiarioRepo.list()).filter((l) => l.fecha >= desde && l.fecha <= hoy)

  const contexto: string[] = []
  if (leidos.length > 0) contexto.push(`Últimos 30 días: leyó la edición ${leidos.length} días.`)
  contexto.push(`Secciones del periódico: ${CATEGORIAS.map((c) => c.id).join(', ')}.`)

  return {
    guia: [
      'La meta es de la app de Noticias (un periódico propio que se arma cada mañana y se reparte entre los asistentes de la casa): el plan es SIEMPRE de lectura informativa.',
      'Las fases van de asegurar el hueco diario a repartir el trabajo entre los asistentes y, al final, hacer algo con lo leído.',
      'Los hijos son acciones concretas («Leerla en el descanso de la comida», «Dar deportes y ciencia a dos asistentes», «Guardar las tres noticias del mes»).',
      'No inventes titulares ni noticias: la edición se descarga cada día y es efímera.',
      CLAUSULA_RECHAZO('leer noticias o estar al día de la actualidad'),
    ],
    contexto,
    ejemplo: tGlobal('diario.plan.ejemplo', 'Leer la edición de la mañana todos los días'),
  }
}

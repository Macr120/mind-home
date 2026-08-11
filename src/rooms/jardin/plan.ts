import { gratitudDiariaRepo, sesionesMindfulnessRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { CLAUSULA_RECHAZO, type ContextoPlanApp } from '../../core/planIA'

/**
 * Acotamiento del planificador ✨ en el Jardín: plan de práctica contemplativa.
 *
 * Con una regla que no tiene ninguna otra app: aquí NO se exige. El jardín es el
 * cuarto que no lleva rachas ni castiga faltar (ver `calma.ts`), así que su plan
 * tampoco puede hablar de rachas, de días seguidos ni de recuperar lo perdido.
 */
export async function planMetasJardin(): Promise<ContextoPlanApp> {
  const hoy = fechaLocalISO()
  const desde = isoMasDias(hoy, -29)
  const sesiones = (await sesionesMindfulnessRepo.list()).filter((s) => s.fecha >= desde && s.fecha <= hoy)
  const gratitudes = (await gratitudDiariaRepo.list()).filter((g) => g.fecha >= desde && g.fecha <= hoy)

  const contexto: string[] = []
  if (sesiones.length > 0) {
    const minutos = sesiones.reduce((s, x) => s + x.duracionMin, 0)
    contexto.push(`Últimos 30 días: ${sesiones.length} sesiones, ${minutos} min de práctica.`)
    const tipos = [...new Set(sesiones.map((s) => s.tipo))]
    contexto.push(`Prácticas que ya usa: ${tipos.join(', ')}.`)
  }
  if (gratitudes.length > 0) contexto.push(`Agradecimientos escritos este mes: ${gratitudes.length}.`)

  return {
    guia: [
      'La meta es de la app del Jardín (meditación, respiración y agradecimientos): el plan es SIEMPRE de práctica contemplativa.',
      'Las fases van de encontrar el momento a sostener la práctica, subiendo la duración poco a poco.',
      'Los hijos son prácticas concretas y amables («Cinco días de respiración en caja», «Subir de 5 a 10 minutos»), atadas a algo que ya se hace a diario.',
      'PROHIBIDO hablar de rachas, de días seguidos, de recuperar lo perdido o de cualquier castigo por faltar: esta app no empuja, acompaña.',
      CLAUSULA_RECHAZO('la meditación, la respiración o la calma'),
    ],
    contexto,
    nivel: 'algo',
    ejemplo: tGlobal('jardin.plan.ejemplo', 'Diez minutos de calma al día'),
  }
}

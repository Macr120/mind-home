import { perfilSuenoRepo, suenoRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { CLAUSULA_RECHAZO, CLAUSULA_SALUD, type ContextoPlanApp } from '../../core/planIA'

/**
 * Acotamiento del planificador ✨ en Descanso: aquí un plan es SIEMPRE de
 * higiene del sueño, y se calibra con lo que la app ya sabe — el horario que el
 * usuario se fijó y lo que de verdad durmió el último mes.
 */
export async function planMetasDescanso(): Promise<ContextoPlanApp> {
  const hoy = fechaLocalISO()
  const desde = isoMasDias(hoy, -29)
  const noches = (await suenoRepo.list()).filter((s) => s.fecha >= desde && s.fecha <= hoy)
  const perfil = (await perfilSuenoRepo.list())[0]

  const contexto: string[] = []
  if (noches.length > 0) {
    const media = noches.reduce((s, n) => s + n.horas, 0) / noches.length
    const calidad = noches.reduce((s, n) => s + n.calidad, 0) / noches.length
    contexto.push(
      `Últimos 30 días: ${noches.length} noches registradas, ${media.toFixed(1)} h de media y calidad ${calidad.toFixed(1)}/5.`,
    )
    const cortas = noches.filter((n) => n.horas < 6).length
    if (cortas > 0) contexto.push(`${cortas} noches por debajo de 6 h.`)
  }
  if (perfil)
    contexto.push(
      `Horario objetivo: dormir a las ${perfil.horaDormir}, despertar a las ${perfil.horaDespertar} (${perfil.objetivoHoras} h).`,
    )

  return {
    guia: [
      'La meta es de la app de Descanso: eres un experto en higiene del sueño y el plan es SIEMPRE para dormir mejor.',
      'Las fases van de lo que más pesa a lo que menos: primero el horario, luego el entorno del cuarto y los hábitos de la tarde, y solo al final medir y ajustar.',
      'Los hijos son cambios concretos y verificables («Apagar pantallas 30 min antes», «Nada de cafeína después de las 16:00»), nunca consejos genéricos.',
      'No cambies varias cosas a la vez: cada fase toca un frente para poder saber cuál funcionó.',
      CLAUSULA_SALUD,
      CLAUSULA_RECHAZO('el sueño y el descanso'),
    ],
    contexto,
    ejemplo: tGlobal('descanso.plan.ejemplo', 'Dormirme en menos de 15 minutos'),
  }
}

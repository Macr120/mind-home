import { ideasRepo, mapasIdeasRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { CLAUSULA_RECHAZO, type ContextoPlanApp } from '../../core/planIA'

/**
 * Acotamiento del planificador ✨ en Ideas: el plan es SIEMPRE el camino de una
 * idea a algo real — elegirla, probarla en pequeño y decidir con lo que pase.
 *
 * El material son las ideas FAVORITAS ya escritas: si alguna toca la meta, el
 * plan la usa en vez de inventarse uno nuevo de la nada.
 */
export async function planMetasIdeas(): Promise<ContextoPlanApp> {
  const hoy = fechaLocalISO()
  const ideas = await ideasRepo.list()
  const favoritas = ideas.filter((i) => i.favorita)
  const recientes = ideas.filter((i) => i.fecha >= isoMasDias(hoy, -29) && i.fecha <= hoy)

  const contexto: string[] = []
  if (ideas.length > 0) {
    contexto.push(`Diario de ideas: ${ideas.length} apuntadas, ${favoritas.length} destacadas.`)
    if (recientes.length > 0) contexto.push(`Últimos 30 días: ${recientes.length} ideas nuevas.`)
    const temas = [...new Set(ideas.map((i) => i.tema).filter(Boolean))]
    if (temas.length > 0) contexto.push(`Lluvias con tema: ${temas.slice(0, 5).join(', ')}.`)
  }
  const mapas = (await mapasIdeasRepo.list()).filter((m) => !m.ejemplo)
  if (mapas.length > 0)
    contexto.push(`Mapas y diagramas dibujados: ${mapas.slice(0, 5).map((m) => `«${m.nombre}»`).join(', ')}.`)

  return {
    guia: [
      'La meta es de la app de Ideas (diario de ideas, mapas conceptuales y diagramas para decidir): el plan es SIEMPRE llevar una idea de la cabeza a algo real, o cerrar una decisión.',
      'Las fases son elegir, probar en pequeño y decidir con lo que salga — nunca meses de preparación antes del primer intento.',
      'Los hijos son pasos verificables («Hacer la versión de una tarde», «Enseñársela a tres personas», «Anotar qué salió mal»).',
      'La última fase decide de verdad: seguir o soltarla, con un criterio escrito.',
      CLAUSULA_RECHAZO('una idea propia, un proyecto por decidir o una decisión que tomar'),
    ],
    contexto,
    ejemplo: tGlobal('ideas.plan.ejemplo', 'Convertir una idea del diario en algo real'),
    material:
      favoritas.length > 0
        ? {
            titulo: tGlobal('ideas.plan.material', 'Ideas del plan'),
            instruccion:
              'El material son ideas que el usuario ya escribió y destacó. Elige las que sirven para la meta y en el motivo di qué aporta cada una; ignora las que no tengan que ver. Deja "rutina" vacía.',
            items: favoritas.slice(0, 20).map((i) => ({
              nombre: i.texto,
              detalle: i.detalle ?? i.tema ?? '',
            })),
          }
        : undefined,
  }
}

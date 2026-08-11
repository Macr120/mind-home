import { carpetasFormulaRepo, formulasRepo, hojasRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import { CLAUSULA_RECHAZO, type ContextoPlanApp } from '../../core/planIA'

/**
 * Acotamiento del planificador ✨ en la sala de cómputo: el plan es SIEMPRE
 * dominar algo cuantitativo — un temario de fórmulas, un modelo en una hoja o
 * una técnica de cálculo — practicándolo, no leyéndolo.
 *
 * El material son las fórmulas que el usuario ya guardó: si alguna toca la meta,
 * el plan trabaja sobre ella en vez de inventarse un temario nuevo.
 */
export async function planMetasComputo(): Promise<ContextoPlanApp> {
  const formulas = (await formulasRepo.list()).filter((f) => !f.ejemploDe)
  const carpetas = await carpetasFormulaRepo.list()
  const hojas = await hojasRepo.list()

  const contexto: string[] = []
  if (formulas.length > 0) {
    const porCarpeta = new Map(carpetas.map((c) => [c.carpetaId, c.nombre]))
    const nombres = [...new Set(formulas.map((f) => porCarpeta.get(f.carpetaId)).filter(Boolean))]
    contexto.push(`Formulario: ${formulas.length} fórmulas propias en ${carpetas.length} carpetas.`)
    if (nombres.length > 0) contexto.push(`Carpetas: ${nombres.slice(0, 6).join(', ')}.`)
  }
  if (hojas.length > 0)
    contexto.push(`Hojas de cálculo: ${hojas.slice(0, 5).map((h) => `«${h.nombre}»`).join(', ')}.`)

  return {
    guia: [
      'La meta es de la sala de cómputo (formulario de fórmulas, calculadora con graficador y hojas de cálculo): el plan es SIEMPRE dominar algo cuantitativo practicándolo.',
      'Las fases van de entender a aplicar: primero las fórmulas del tema, luego problemas resueltos a mano y al final un caso propio en una hoja o una gráfica.',
      'Los hijos son pasos verificables («Guardar las cinco fórmulas de cinemática», «Resolver diez problemas de tiro parabólico», «Montar la hoja del presupuesto con sus fórmulas»).',
      'Nada de "repasar" a secas: cada paso deja algo escrito —una fórmula guardada, una hoja, una gráfica.',
      CLAUSULA_RECHAZO('un tema de matemáticas, física o química, un cálculo que dominar o un modelo que montar'),
    ],
    contexto,
    ejemplo: tGlobal('computo.plan.ejemplo', 'Dominar las fórmulas de un tema y aplicarlas'),
    material:
      formulas.length > 0
        ? {
            titulo: tGlobal('computo.plan.material', 'Fórmulas del plan'),
            instruccion:
              'El material son fórmulas que el usuario ya guardó. Elige las que sirven para la meta y en el motivo di qué se practica con cada una; ignora las que no tengan que ver. Deja "rutina" vacía.',
            items: formulas.slice(0, 20).map((f) => ({
              nombre: f.nombre,
              detalle: f.descripcion ?? `${f.resultado} = ${f.expresion}`,
            })),
          }
        : undefined,
  }
}

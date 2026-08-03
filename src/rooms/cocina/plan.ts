import type { PerfilNutricion } from '../../core/data/db'
import {
  comidasRepo,
  dietasGuardadasRepo,
  perfilNutricionRepo,
  pesoRepo,
  recetasRepo,
} from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { CLAUSULA_RECHAZO, type ContextoPlanApp } from '../../core/planIA'
import { progresoMeta } from './peso'
import { macrosPorDia, resumenAlimentacion } from './stats'

/**
 * Acotamiento del planificador ✨ en cocina: el plan es SIEMPRE alimenticio —
 * cambio de peso o probar una dieta particular — y se calibra con el perfil de
 * nutrición y los pesajes reales. La guía va en español fijo, como todo prompt.
 */

const GUIA = [
  'La meta es de la app de Nutrición: eres un nutriólogo y el plan es SIEMPRE alimenticio, de una de dos clases según la meta — cambiar el peso (bajar, subir o mantener) o probar una dieta particular (keto, vegetariana, mediterránea, ayuno intermitente…).',
  'Para cambio de peso las fases son etapas del cambio (ajustar hábitos, déficit o superávit sostenido, consolidar); para una dieta particular son la adaptación gradual (transición, dieta plena, evaluación).',
  'Los hijos son acciones de alimentación medibles («Cenar sin harinas 5 días por semana», «Llegar a 120 g de proteína al día», «Bajar a 82 kg»), no consejos sueltos.',
  'Nada de rutinas de gimnasio ni contenidos ajenos a la comida: si la meta menciona ejercicio, cúbrelo solo por su lado alimenticio.',
  'El plan sale con recetas CONCRETAS del recetario del usuario repartidas en sus momentos de comida; si una dieta guardada encaja con la meta, prefiere sus recetas.',
  CLAUSULA_RECHAZO('la alimentación, las dietas o el peso'),
]

const PRESET: Record<NonNullable<PerfilNutricion['objetivo']>, string> = {
  deficit: 'bajar de peso',
  mantener: 'mantener el peso',
  superavit: 'subir de peso',
}

export async function planMetasCocina(): Promise<ContextoPlanApp> {
  const hoy = fechaLocalISO()
  const perfil = (await perfilNutricionRepo.list())[0]
  const contexto: string[] = []
  let ejemplo = tGlobal('cocina.plan.ejemplo', 'Probar la dieta mediterránea')
  if (perfil) {
    contexto.push(
      `Objetivos diarios: ${perfil.calorias} kcal, ${perfil.proteinas} g de proteína, ${perfil.aguaMl} ml de agua.`,
    )
    if (perfil.objetivo) contexto.push(`Preset de dieta: ${PRESET[perfil.objetivo]}.`)
    const prog = progresoMeta(await pesoRepo.list(), perfil, hoy)
    if (prog) {
      contexto.push(
        `Peso actual ${prog.actual} kg, objetivo ${prog.objetivo} kg (faltan ${prog.restanteKg.toFixed(1)} kg); ritmo pactado ${prog.ritmoMetaSemana} kg/semana.`,
      )
      if (prog.ritmoRealSemana != null)
        contexto.push(
          `Ritmo real últimos 30 días: ${prog.ritmoRealSemana.toFixed(2)} kg/semana` +
            (prog.fechaEstimada ? `; llegada estimada ${prog.fechaEstimada}` : '') +
            `; ${prog.enRumbo ? 'en rumbo' : 'fuera de rumbo'}.`,
        )
      const kg = String(prog.objetivo)
      ejemplo =
        perfil.objetivo === 'superavit'
          ? tGlobal('cocina.plan.ejSubir', 'Subir a {kg} kg', { kg })
          : perfil.objetivo === 'mantener'
            ? tGlobal('cocina.plan.ejMantener', 'Mantenerme en {kg} kg', { kg })
            : tGlobal('cocina.plan.ejBajar', 'Bajar a {kg} kg', { kg })
    } else if (perfil.pesoKg) {
      contexto.push(`Peso actual: ${perfil.pesoKg} kg.`)
    }
    const res = resumenAlimentacion(macrosPorDia(await comidasRepo.list()), perfil, 'mes', hoy)
    if (res.diasRegistrados > 0)
      contexto.push(
        `Este mes: ${res.diasRegistrados} días registrados, ${res.promedio.calorias} kcal promedio, adherencia calórica ${res.adherencia}%.`,
      )
  }

  // El material del plan son las recetas reales del recetario: la IA las reparte
  // entre los momentos de comida (las «rutinas» que ya ofrece rutinasPlan) y
  // justifica cada una. Las dietas guardadas van como contexto para que «probar
  // la dieta keto» elija las recetas de ESA dieta.
  const recetas = await recetasRepo.list()
  const dietas = await dietasGuardadasRepo.list()
  for (const d of dietas.slice(0, 4)) {
    const nombres = d.recetaIds
      .map((id) => recetas.find((r) => r.id === id)?.nombre)
      .filter(Boolean)
    contexto.push(
      `Dieta guardada «${d.nombre}»${d.calorias ? ` (${d.calorias} kcal)` : ''}${nombres.length ? `; recetas: ${nombres.join(', ')}` : ''}.`,
    )
  }
  const material =
    recetas.length > 0
      ? {
          titulo: tGlobal('cocina.plan.material', 'Recetas del plan'),
          instruccion:
            'El material son recetas del recetario del usuario (macros POR PORCIÓN). Cada elegida va en un momento de comida (Desayuno, Comida, Cena o Snack) según el objetivo calórico, y su motivo explica qué aporta a la meta.',
          items: recetas.map((r) => ({
            nombre: r.nombre,
            detalle:
              `${r.calorias} kcal · P${r.proteinas} C${r.carbohidratos} G${r.grasas}` +
              (r.etiquetas.length ? ` · ${r.etiquetas.slice(0, 3).join('/')}` : ''),
          })),
        }
      : undefined

  return { guia: GUIA, contexto, ejemplo, material }
}

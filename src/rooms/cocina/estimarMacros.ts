import { conversarIA, extraerJSON } from '../../core/chat/ia'
import { caloriasDesdeMacros } from './macros'
import type { TotalesMacros } from './macros'

const SYSTEM = [
  'Eres un nutriólogo que estima los macronutrientes de un platillo a partir de su descripción en lenguaje natural.',
  'Responde ÚNICAMENTE con un objeto JSON, sin texto ni markdown alrededor:',
  '{"calorias":number,"proteinas":number,"carbohidratos":number,"grasas":number}',
  'Las calorías van en kcal y los macros en gramos, para la PORCIÓN descrita; si no se indica cantidad, asume una porción normal de una persona.',
  'Usa enteros y valores realistas, coherentes con la fórmula 4-4-9 (proteína y carbos 4 kcal/g, grasa 9 kcal/g).',
].join('\n')

/**
 * Estima los macros de un platillo con la IA. Lanza si la IA no está activa o
 * la respuesta no es interpretable (el caller decide la UI del error).
 */
export async function estimarMacros(descripcion: string): Promise<TotalesMacros> {
  const respuesta = await conversarIA(SYSTEM, [{ rol: 'usuario', texto: descripcion }], 200)
  const json = extraerJSON(respuesta)

  const num = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
  }
  const proteinas = num(json.proteinas)
  const carbohidratos = num(json.carbohidratos)
  const grasas = num(json.grasas)
  const calorias = num(json.calorias) || caloriasDesdeMacros(proteinas, carbohidratos, grasas)
  if (calorias <= 0) throw new Error('La IA no devolvió macros usables')

  return { calorias, proteinas, carbohidratos, grasas }
}

import type { PerfilNutricion, RegistroComida } from '../../core/data/db'
import type { ProgresoMeta } from './peso'
import { sumarMacros } from './macros'
import { sumarDias } from './fecha'

/** Un kilo de grasa corporal ≈ 7700 kcal (equivalencia clásica de nutrición). */
const KCAL_POR_KG = 7700

/** Días mínimos con comidas registradas para que el balance signifique algo. */
export const DIAS_MINIMOS = 5

export interface BalanceSemanal {
  kcalReales: number
  /** Objetivo del periodo, contando SOLO los días que sí tienen registro. */
  kcalObjetivo: number
  /** Negativo = déficit (estás comiendo menos de tu objetivo). */
  netoKcal: number
  diasRegistrados: number
  /** Kilos por semana que implica ese ritmo de comida. Negativo = bajarías. */
  kgSemanaEstimados: number
  /** false = hay tan pocos días que el número es ruido. */
  fiable: boolean
}

/**
 * Qué dice la comida de los últimos 7 días sobre el peso. Compara solo contra
 * los días registrados y luego extrapola a la semana: si comparara los 7 días
 * completos, tres días sin registrar parecerían un déficit gigante.
 */
export function balanceSemanal(
  comidas: RegistroComida[],
  perfil: PerfilNutricion,
  fecha: string,
  dias = 7,
): BalanceSemanal {
  const desde = sumarDias(fecha, -(dias - 1))
  const enRango = comidas.filter((c) => c.fecha >= desde && c.fecha <= fecha)
  const diasRegistrados = new Set(enRango.map((c) => c.fecha)).size

  const kcalReales = sumarMacros(enRango).calorias
  const kcalObjetivo = perfil.calorias * diasRegistrados
  const netoKcal = kcalReales - kcalObjetivo
  const netoDiario = diasRegistrados > 0 ? netoKcal / diasRegistrados : 0

  return {
    kcalReales,
    kcalObjetivo,
    netoKcal,
    diasRegistrados,
    kgSemanaEstimados: (netoDiario * 7) / KCAL_POR_KG,
    fiable: diasRegistrados >= DIAS_MINIMOS,
  }
}

export interface AjusteSugerido {
  /** Cuántas kcal al día habría que sumar (positivo) o restar (negativo). */
  deltaKcal: number
  kcalPropuestas: number
}

/**
 * Propuesta de ajuste cuando la báscula no acompaña: la diferencia entre el
 * ritmo pactado y el real, traducida a kcal diarias. Nunca se aplica sola —
 * se muestra con un botón para que el usuario decida.
 */
export function sugerirAjusteKcal(
  meta: ProgresoMeta | null,
  balance: BalanceSemanal,
  perfil: PerfilNutricion,
): AjusteSugerido | null {
  if (!meta || meta.logrado || meta.enRumbo) return null
  if (meta.ritmoRealSemana === null || !balance.fiable) return null

  const faltaPorSemana = meta.ritmoMetaSemana - meta.ritmoRealSemana
  const crudo = (faltaPorSemana * KCAL_POR_KG) / 7
  // Tope del 15% del objetivo: un salto mayor no se sostiene y hace daño.
  const tope = perfil.calorias * 0.15
  const acotado = Math.max(-tope, Math.min(tope, crudo))
  const deltaKcal = Math.round(acotado / 50) * 50
  if (deltaKcal === 0) return null

  return { deltaKcal, kcalPropuestas: Math.max(1000, perfil.calorias + deltaKcal) }
}

import type { PerfilNutricion, RegistroComida } from '../../core/data/db'
import type { ProgresoMeta } from './peso'
import { SIGNO_OBJETIVO, TOLERANCIA_PESO_KG } from './constantes'
import { sumarMacros } from './macros'
import { sumarDias } from './fecha'

/** Un kilo de grasa corporal ≈ 7700 kcal (equivalencia clásica de nutrición). */
export const KCAL_POR_KG = 7700

/** Suelo de seguridad: por debajo de esto una dieta deja de ser sana. */
export const PISO_KCAL = 1000

/** Más rápido que esto no se sostiene y hace daño; solo se avisa, no se bloquea. */
export const RITMO_MAX_KG_SEMANA = 1

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

  return { deltaKcal, kcalPropuestas: Math.max(PISO_KCAL, perfil.calorias + deltaKcal) }
}

/**
 * Hacia dónde va la dieta según a dónde quieres llegar. Ya no se elige a mano:
 * si el destino está por debajo del peso de hoy es déficit, si está por encima
 * es superávit y dentro del margen es mantener.
 */
export function derivarObjetivo(
  pesoKg: number | undefined,
  pesoObjetivoKg: number | undefined,
): NonNullable<PerfilNutricion['objetivo']> {
  if (!pesoKg || !pesoObjetivoKg) return 'mantener'
  if (pesoObjetivoKg < pesoKg - TOLERANCIA_PESO_KG) return 'deficit'
  if (pesoObjetivoKg > pesoKg + TOLERANCIA_PESO_KG) return 'superavit'
  return 'mantener'
}

/** Datos corporales con los que se calcula el gasto diario. */
export interface DatosTdee {
  pesoKg?: number
  alturaCm?: number
  edad?: number
  sexo?: 'm' | 'f'
  actividad?: number
}

/** Gasto energético diario (Mifflin-St Jeor × factor de actividad). */
export function tdeeDe({ pesoKg, alturaCm, edad, sexo, actividad }: DatosTdee): number {
  const peso = pesoKg || 70
  const altura = alturaCm || 170
  const anios = edad || 30
  const base =
    sexo === 'f' ? 10 * peso + 6.25 * altura - 5 * anios - 161 : 10 * peso + 6.25 * altura - 5 * anios + 5
  return Math.round(base * (actividad || 1.55))
}

/** Kilos por semana que hay que mover para llegar al destino en ese plazo. */
export function ritmoSugerido(
  pesoKg: number | undefined,
  pesoObjetivoKg: number | undefined,
  semanas: number,
): number | null {
  if (!pesoKg || !pesoObjetivoKg || semanas <= 0) return null
  return Math.abs(pesoObjetivoKg - pesoKg) / semanas
}

export interface ObjetivosSugeridos {
  tdee: number
  /** Kcal diarias que hay que sumar (positivo) o restar (negativo) a la TDEE. */
  deltaKcalDia: number
  calorias: number
  /** Desvío sobre la TDEE con signo: −12 = un 12 % por debajo. */
  pctSobreTdee: number
  proteinas: number
  carbohidratos: number
  grasas: number
  /** El ritmo pedido pasa del máximo sostenible. */
  peligroso: boolean
  /** Las calorías caían por debajo del piso y hubo que levantarlas. */
  bajoElPiso: boolean
}

/**
 * Los números diarios que salen del plazo: el ritmo se traduce a kcal (7700 por
 * kilo) y se reparte 30/40/30. Sin ritmo el resultado es la TDEE tal cual, que
 * es justo lo que quiere quien se mantiene.
 */
export function objetivosSugeridos(
  datos: DatosTdee,
  ritmoKgSemana: number,
  objetivo: NonNullable<PerfilNutricion['objetivo']>,
): ObjetivosSugeridos {
  const tdee = tdeeDe(datos)
  const ritmo = Math.abs(ritmoKgSemana) || 0
  const deltaKcalDia = Math.round((SIGNO_OBJETIVO[objetivo] * ritmo * KCAL_POR_KG) / 7)
  const crudas = tdee + deltaKcalDia
  const calorias = Math.max(PISO_KCAL, crudas)

  return {
    tdee,
    deltaKcalDia,
    calorias,
    pctSobreTdee: tdee > 0 ? Math.round(((calorias - tdee) / tdee) * 100) : 0,
    proteinas: Math.round((calorias * 0.3) / 4),
    carbohidratos: Math.round((calorias * 0.4) / 4),
    grasas: Math.round((calorias * 0.3) / 9),
    peligroso: ritmo > RITMO_MAX_KG_SEMANA,
    bajoElPiso: crudas < PISO_KCAL,
  }
}

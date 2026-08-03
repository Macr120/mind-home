import type { PerfilNutricion, RegistroComida } from '../../core/data/db'

export interface TotalesMacros {
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
}

const totalesVacios = (): TotalesMacros => ({
  calorias: 0,
  proteinas: 0,
  carbohidratos: 0,
  grasas: 0,
})

export function sumarMacros(items: Pick<RegistroComida, 'calorias' | 'proteinas' | 'carbohidratos' | 'grasas'>[]): TotalesMacros {
  return items.reduce(
    (acc, i) => ({
      calorias: acc.calorias + i.calorias,
      proteinas: acc.proteinas + i.proteinas,
      carbohidratos: acc.carbohidratos + i.carbohidratos,
      grasas: acc.grasas + i.grasas,
    }),
    totalesVacios(),
  )
}

/** Calorías estimadas a partir de macros (fórmula 4-4-9). */
export function caloriasDesdeMacros(p: number, c: number, f: number) {
  return Math.round(p * 4 + c * 4 + f * 9)
}

/**
 * Reparto calórico de los macros (4-4-9) en porcentajes. Con `kcalMeta` se mide
 * sobre las calorías de la dieta (así el 30% que escribes es el 30% que se
 * muestra); sin ella, sobre lo que aportan los propios gramos. No se fuerza a
 * sumar 100: si los gramos no cuadran con la meta, se ve.
 */
export function repartoMacros(p: number, c: number, g: number, kcalMeta?: number) {
  const kcal = kcalMeta && kcalMeta > 0 ? kcalMeta : p * 4 + c * 4 + g * 9
  if (kcal <= 0) return null
  const pct = (x: number) => Math.round((x * 100) / kcal)
  return { proteinas: pct(p * 4), carbohidratos: pct(c * 4), grasas: pct(g * 9) }
}

/** Gramos de un macro para un porcentaje de las calorías (4-4-9). */
export function gramosDesdePct(kcal: number, pct: number, kcalPorGramo: 4 | 9) {
  return Math.round((kcal * pct) / 100 / kcalPorGramo)
}

export function pctObjetivo(consumido: number, objetivo: number) {
  if (objetivo <= 0) return 0
  return Math.min(100, Math.round((consumido / objetivo) * 100))
}

export function adherenciaCalorias(
  dias: { consumido: number; objetivo: number }[],
): number {
  if (dias.length === 0) return 0
  const ok = dias.filter(
    (d) => d.objetivo > 0 && Math.abs(d.consumido - d.objetivo) / d.objetivo <= 0.1,
  ).length
  return Math.round((ok / dias.length) * 100)
}

export type PerfilConId = PerfilNutricion & { id: number }

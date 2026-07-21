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

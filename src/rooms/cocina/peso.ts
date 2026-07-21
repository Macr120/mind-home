import type { PerfilNutricion, RegistroPeso } from '../../core/data/db'
import { perfilNutricionRepo, pesoRepo } from '../../core/data/repository'
import { sumarDias } from './fecha'

/** Guarda un pesaje y sincroniza el peso del perfil (lo usa la TDEE). */
export async function registrarPeso(fecha: string, kg: number) {
  await pesoRepo.add({ fecha, kg })
  const perfil = (await perfilNutricionRepo.list())[0]
  if (perfil?.id) await perfilNutricionRepo.update(perfil.id, { pesoKg: kg })
}

/** Signo que la meta de peso espera del avance semanal según el preset de dieta. */
const SIGNO: Record<NonNullable<PerfilNutricion['objetivo']>, number> = {
  deficit: -1,
  mantener: 0,
  superavit: 1,
}

export interface ProgresoMeta {
  actual: number
  objetivo: number
  /** Kg que faltan (siempre ≥ 0). */
  restanteKg: number
  /** Ritmo medido en los pesajes: negativo = bajando. null = menos de 2 pesajes. */
  ritmoRealSemana: number | null
  /** Ritmo pactado, ya con signo (−0.5 si la meta es bajar). */
  ritmoMetaSemana: number
  /** Fecha ISO estimada de llegada al objetivo; null si el ritmo real no acerca. */
  fechaEstimada: string | null
  /** El ritmo real avanza hacia el objetivo al menos a la mitad de lo pactado. */
  enRumbo: boolean
  /** Ya se alcanzó el objetivo (dentro de 0.3 kg de tolerancia). */
  logrado: boolean
}

/**
 * Cruza los pesajes con la meta del perfil. El ritmo real se mide de punta a
 * punta de la ventana (por defecto 30 días): sirve para proyectar la llegada,
 * no para juzgar un día suelto.
 */
export function progresoMeta(
  pesos: RegistroPeso[],
  perfil: PerfilNutricion,
  fecha: string,
  dias = 30,
): ProgresoMeta | null {
  const objetivo = perfil.pesoObjetivoKg
  if (!objetivo || objetivo <= 0) return null

  // Último pesaje de cada día dentro de la ventana (desempata por id).
  const desde = sumarDias(fecha, -(dias - 1))
  const porDia = new Map<string, number>()
  for (const p of [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.id ?? 0) - (b.id ?? 0))) {
    if (p.fecha >= desde && p.fecha <= fecha) porDia.set(p.fecha, p.kg)
  }
  const serie = [...porDia.entries()].map(([f, kg]) => ({ fecha: f, kg }))
  const actual = serie.length ? serie[serie.length - 1].kg : perfil.pesoKg
  if (!actual) return null

  const signoMeta = SIGNO[perfil.objetivo ?? 'mantener']
  const ritmoMetaSemana = (perfil.ritmoKgSemana ?? 0) * signoMeta

  let ritmoRealSemana: number | null = null
  if (serie.length >= 2) {
    const ini = serie[0]
    const fin = serie[serie.length - 1]
    const diasEntre =
      (new Date(`${fin.fecha}T12:00:00`).getTime() - new Date(`${ini.fecha}T12:00:00`).getTime()) / 86_400_000
    if (diasEntre >= 1) ritmoRealSemana = ((fin.kg - ini.kg) / diasEntre) * 7
  }

  const faltan = objetivo - actual
  const restanteKg = Math.abs(faltan)
  const logrado = restanteKg <= 0.3

  // Solo proyecta si el ritmo real empuja hacia el objetivo (mismo signo que lo que falta).
  let fechaEstimada: string | null = null
  if (!logrado && ritmoRealSemana && Math.sign(ritmoRealSemana) === Math.sign(faltan)) {
    const semanas = restanteKg / Math.abs(ritmoRealSemana)
    if (semanas <= 260) fechaEstimada = sumarDias(fecha, Math.ceil(semanas * 7))
  }

  const avanceReal = ritmoRealSemana != null && faltan !== 0 ? ritmoRealSemana * Math.sign(faltan) : 0
  const enRumbo = logrado || avanceReal >= Math.abs(ritmoMetaSemana) / 2

  return { actual, objetivo, restanteKg, ritmoRealSemana, ritmoMetaSemana, fechaEstimada, enRumbo, logrado }
}

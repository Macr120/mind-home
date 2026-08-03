import type { PerfilEjercicio, SesionEjercicio, SerieFuerza, TipoEntrenamiento } from '../../core/data/db'
import { hoyISO } from './fecha'
import { diasTranscurridos, metaDelPeriodo, sesionesPeriodo, type Periodo } from './periodo'
import { fechaLocalISO } from '../../core/fechaLocal'

export function volumenSerie(s: Pick<SerieFuerza, 'series' | 'repeticiones' | 'pesoKg'>) {
  return s.series * s.repeticiones * s.pesoKg
}

export function volumenSesion(series: SerieFuerza[]) {
  return series.reduce((acc, s) => acc + volumenSerie(s), 0)
}

export function minutosTipo(semana: SesionEjercicio[], tipo: TipoEntrenamiento) {
  return semana
    .filter((s) => s.tipo === tipo)
    .reduce((acc, s) => acc + s.duracionMin, 0)
}

export function sesionesTipo(semana: SesionEjercicio[], tipo: TipoEntrenamiento) {
  return semana.filter((s) => s.tipo === tipo).length
}

function diasActivos(semana: SesionEjercicio[]) {
  return new Set(semana.map((s) => s.fecha)).size
}

export function rachaDias(sesiones: SesionEjercicio[]): number {
  let racha = 0
  let f = hoyISO()
  const fechas = new Set(sesiones.map((s) => s.fecha))
  while (fechas.has(f)) {
    racha++
    const d = new Date(`${f}T12:00:00`)
    d.setDate(d.getDate() - 1)
    f = fechaLocalISO(d)
  }
  return racha
}

export function pctObjetivo(actual: number, objetivo: number) {
  if (objetivo <= 0) return 0
  return Math.min(100, Math.round((actual / objetivo) * 100))
}

/** Clave de comparación para agrupar el mismo ejercicio escrito distinto. */
export const normalizarEjercicio = (nombre: string) => nombre.trim().toLowerCase()

/** Totales de resistencia para la vista de progreso. */
export function statsResistencia(sesiones: SesionEjercicio[]) {
  const cardio = sesiones.filter((s) => s.tipo === 'resistencia')
  const conDist = cardio.filter((s) => (s.distanciaKm ?? 0) > 0)
  let mejorRitmo = Infinity
  for (const s of conDist) {
    const r = s.duracionMin / (s.distanciaKm as number)
    if (r < mejorRitmo) mejorRitmo = r
  }
  return {
    totalSes: cardio.length,
    totalMin: cardio.reduce((a, s) => a + s.duracionMin, 0),
    totalKm: cardio.reduce((a, s) => a + (s.distanciaKm ?? 0), 0),
    masLarga: conDist.reduce((m, s) => Math.max(m, s.distanciaKm ?? 0), 0),
    mejorRitmo: Number.isFinite(mejorRitmo) ? mejorRitmo : 0,
  }
}

/** 1RM estimado con la fórmula de Epley. */
function e1rm(pesoKg: number, repeticiones: number) {
  if (pesoKg <= 0 || repeticiones <= 0) return 0
  if (repeticiones === 1) return pesoKg
  return pesoKg * (1 + repeticiones / 30)
}

export interface RecordFuerza {
  ejercicio: string
  /** Récord de carga: el peso más alto y las reps con las que se logró. */
  pesoKg: number
  repeticiones: number
  /** Récord de repeticiones y el peso que se movía en ese momento. */
  maxReps: number
  maxRepsPesoKg: number
  /** Mejor 1RM estimado del historial. */
  e1rmKg: number
}

export function recordsFuerza(series: SerieFuerza[]): RecordFuerza[] {
  const mapa = new Map<string, RecordFuerza>()
  for (const s of series) {
    const clave = normalizarEjercicio(s.ejercicio)
    if (!clave) continue
    const prev = mapa.get(clave)
    if (!prev) {
      mapa.set(clave, {
        ejercicio: s.ejercicio,
        pesoKg: s.pesoKg,
        repeticiones: s.repeticiones,
        maxReps: s.repeticiones,
        maxRepsPesoKg: s.pesoKg,
        e1rmKg: e1rm(s.pesoKg, s.repeticiones),
      })
      continue
    }
    if (s.pesoKg > prev.pesoKg || (s.pesoKg === prev.pesoKg && s.repeticiones > prev.repeticiones)) {
      prev.pesoKg = s.pesoKg
      prev.repeticiones = s.repeticiones
    }
    if (s.repeticiones > prev.maxReps || (s.repeticiones === prev.maxReps && s.pesoKg > prev.maxRepsPesoKg)) {
      prev.maxReps = s.repeticiones
      prev.maxRepsPesoKg = s.pesoKg
    }
    prev.e1rmKg = Math.max(prev.e1rmKg, e1rm(s.pesoKg, s.repeticiones))
  }
  return [...mapa.values()].sort((a, b) => b.pesoKg - a.pesoKg || b.maxReps - a.maxReps)
}

/** Mejor 1RM estimado por sesión para un ejercicio, ordenado por fecha. */
export function progresionEjercicio(
  nombre: string,
  series: SerieFuerza[],
  fechaPorSesion: Map<number, string>,
): { fecha: string; valor: number }[] {
  const clave = normalizarEjercicio(nombre)
  const porSesion = new Map<number, number>()
  for (const s of series) {
    if (normalizarEjercicio(s.ejercicio) !== clave) continue
    const v = e1rm(s.pesoKg, s.repeticiones)
    if (v <= 0) continue
    porSesion.set(s.sesionId, Math.max(porSesion.get(s.sesionId) ?? 0, v))
  }
  return [...porSesion.entries()]
    .map(([sesionId, valor]) => ({ fecha: fechaPorSesion.get(sesionId) ?? '', valor }))
    .filter((p) => p.fecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/**
 * Cumplido y objetivo dentro del periodo elegido. Las metas del perfil son
 * semanales, así que en mes/año se prorratean por los días ya transcurridos.
 */
export function resumenPeriodo(
  sesiones: SesionEjercicio[],
  perfil: PerfilEjercicio,
  periodo: Periodo = 'semana',
  ref = hoyISO(),
) {
  const del = sesionesPeriodo(sesiones, periodo, ref)
  const meta = (semanal: number) => metaDelPeriodo(semanal, periodo, sesiones, ref)
  return {
    fuerza: sesionesTipo(del, 'fuerza'),
    minResistencia: minutosTipo(del, 'resistencia'),
    minFlex: minutosTipo(del, 'flexibilidad'),
    dias: diasActivos(del),
    metaFuerza: meta(perfil.sesionesFuerzaSemana),
    metaResistencia: meta(perfil.minutosResistenciaSemana),
    metaFlex: meta(perfil.minutosFlexibilidadSemana),
    // Los días activos no pueden pasar de los días que lleva el periodo.
    metaDias: Math.min(meta(perfil.diasActivosSemana), diasTranscurridos(periodo, sesiones, ref)),
  }
}

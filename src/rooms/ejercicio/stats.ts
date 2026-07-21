import type { PerfilEjercicio, SesionEjercicio, SerieFuerza, TipoEntrenamiento } from '../../core/data/db'
import { diasSemana, hoyISO, inicioSemana } from './fecha'
import { fechaLocalISO } from '../../core/fechaLocal'

export function volumenSerie(s: Pick<SerieFuerza, 'series' | 'repeticiones' | 'pesoKg'>) {
  return s.series * s.repeticiones * s.pesoKg
}

export function volumenSesion(series: SerieFuerza[]) {
  return series.reduce((acc, s) => acc + volumenSerie(s), 0)
}

export function sesionesSemana(sesiones: SesionEjercicio[], ref = hoyISO()) {
  const inicio = inicioSemana(ref)
  const dias = new Set(diasSemana(inicio))
  return sesiones.filter((s) => dias.has(s.fecha))
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

/** Ritmo en formato m:ss por km (ej. "5:30"). */
export function ritmoMinKm(duracionMin: number, km: number): string {
  if (km <= 0) return '—'
  const ritmo = duracionMin / km
  const min = Math.floor(ritmo)
  const seg = Math.round((ritmo - min) * 60)
  return `${min}:${String(seg).padStart(2, '0')}`
}

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

export function recordsFuerza(
  series: SerieFuerza[],
): { ejercicio: string; pesoKg: number; repeticiones: number }[] {
  const mapa = new Map<string, { ejercicio: string; pesoKg: number; repeticiones: number }>()
  for (const s of series) {
    const clave = normalizarEjercicio(s.ejercicio)
    if (!clave) continue
    const prev = mapa.get(clave)
    if (
      !prev ||
      s.pesoKg > prev.pesoKg ||
      (s.pesoKg === prev.pesoKg && s.repeticiones > prev.repeticiones)
    ) {
      mapa.set(clave, { ejercicio: s.ejercicio, pesoKg: s.pesoKg, repeticiones: s.repeticiones })
    }
  }
  return [...mapa.values()].sort((a, b) => b.pesoKg - a.pesoKg)
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

export function resumenSemanal(
  sesiones: SesionEjercicio[],
  perfil: PerfilEjercicio,
  ref = hoyISO(),
) {
  const sem = sesionesSemana(sesiones, ref)
  return {
    fuerza: sesionesTipo(sem, 'fuerza'),
    minResistencia: minutosTipo(sem, 'resistencia'),
    minFlex: minutosTipo(sem, 'flexibilidad'),
    dias: diasActivos(sem),
    metaFuerza: perfil.sesionesFuerzaSemana,
    metaResistencia: perfil.minutosResistenciaSemana,
    metaFlex: perfil.minutosFlexibilidadSemana,
    metaDias: perfil.diasActivosSemana,
  }
}

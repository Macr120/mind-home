import type { SesionEstudio } from '../../core/data/db'
import { fechaLocalISO } from '../../core/fechaLocal'
import { hoyISO } from './fecha'

// Helpers de fecha del cuarto (mismo criterio que hobbies/stats.ts; los
// rooms no se importan entre sí).
export function sumarDias(fecha: string, delta: number): string {
  const d = new Date(`${fecha}T12:00:00`)
  d.setDate(d.getDate() + delta)
  return fechaLocalISO(d)
}

export function inicioSemana(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`)
  const dia = d.getDay()
  const ajuste = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + ajuste)
  return fechaLocalISO(d)
}

export function diasSemana(desdeLunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(desdeLunes, i))
}

// La conversión "#rrggbb" + alfa ahora vive una sola vez en el heatmap compartido.
export { rgba } from '../_shared/Heatmap'

/** Minutos estudiados por fecha (yyyy-mm-dd). */
export function minutosPorDia(sesiones: SesionEstudio[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of sesiones) m.set(s.fecha, (m.get(s.fecha) ?? 0) + s.minutos)
  return m
}

/** Racha actual: días consecutivos hacia atrás; hoy sin estudio no rompe hasta mañana. */
export function rachaActual(fechas: Set<string>): number {
  const inicio = fechas.has(hoyISO()) ? 0 : 1
  let n = 0
  while (fechas.has(sumarDias(hoyISO(), -(inicio + n)))) n++
  return n
}

/** Formatea minutos: "45 m" o "1 h 35 m". */
export function fmtMin(min: number): string {
  if (min < 60) return `${min} m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} m` : `${h} h`
}

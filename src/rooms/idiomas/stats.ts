import type { RepasoIdioma } from '../../core/data/db'
import { fechaLocalISO } from '../../core/fechaLocal'

export const hoyISO = () => fechaLocalISO()

// Helpers de fecha del cuarto (mismo criterio que biblioteca/stats.ts; los
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

/** Convierte "#rrggbb" + alfa en rgba(). */
export function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Repasos por fecha (yyyy-mm-dd). */
export function repasosPorDia(filas: RepasoIdioma[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const f of filas) m.set(f.fecha, (m.get(f.fecha) ?? 0) + f.repasos)
  return m
}

/** Racha actual: días consecutivos hacia atrás; hoy sin repasar no rompe hasta mañana. */
export function rachaActual(fechas: Set<string>): number {
  const inicio = fechas.has(hoyISO()) ? 0 : 1
  let n = 0
  while (fechas.has(sumarDias(hoyISO(), -(inicio + n)))) n++
  return n
}

import type { SesionHobby } from '../../core/data/db'
import { fechaLocalISO } from '../../core/fechaLocal'

// Helpers de fecha del cuarto (mismo criterio que ejercicio/fecha.ts; los
// rooms no se importan entre sí).
export const hoyISO = () => fechaLocalISO()

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

/** Paleta de colores por hobby (el primero es el color del cuarto). */
export const COLORES_HOBBY = ['#8b5cf6', '#a78bfa', '#e879f9', '#f472b6', '#fb7185', '#f59e0b', '#22c55e', '#38bdf8']

export const EMOJIS_HOBBY = ['🎯', '🎸', '🎨', '📷', '🧶', '🎮', '🏃', '📚', '🌱', '♟️']

/** Minutos practicados por fecha (las sesiones ya vienen filtradas por hobby). */
export function minutosPorDia(sesiones: SesionHobby[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of sesiones) m.set(s.fecha, (m.get(s.fecha) ?? 0) + s.minutos)
  return m
}

/** Racha actual: días consecutivos hacia atrás; hoy sin práctica no rompe hasta mañana. */
export function rachaActual(fechas: Set<string>): number {
  const inicio = fechas.has(hoyISO()) ? 0 : 1
  let n = 0
  while (fechas.has(sumarDias(hoyISO(), -(inicio + n)))) n++
  return n
}

/** Mejor racha histórica de días consecutivos. */
export function mejorRacha(fechas: Set<string>): number {
  const orden = [...fechas].sort()
  let mejor = 0
  let actual = 0
  let prev = ''
  for (const f of orden) {
    actual = prev && sumarDias(prev, 1) === f ? actual + 1 : 1
    mejor = Math.max(mejor, actual)
    prev = f
  }
  return mejor
}

/** Fechas practicadas de la semana en curso (lunes a domingo). */
export function fechasSemanaActual(fechas: Set<string>): string[] {
  return diasSemana(inicioSemana(hoyISO())).filter((f) => fechas.has(f))
}

/** Totales del hobby: minutos, días activos y promedio por día activo. */
export function totales(sesiones: SesionHobby[]) {
  const porDia = minutosPorDia(sesiones)
  let totalMin = 0
  for (const min of porDia.values()) totalMin += min
  const diasActivos = porDia.size
  return { totalMin, diasActivos, promedioMin: diasActivos ? Math.round(totalMin / diasActivos) : 0 }
}

/** Formatea minutos: "45 m" o "1 h 35 m". */
export function fmtMin(min: number): string {
  if (min < 60) return `${min} m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} m` : `${h} h`
}

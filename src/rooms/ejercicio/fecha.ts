import { localeActual } from '../../core/i18n/useT'
import { fechaLocalISO } from '../../core/fechaLocal'
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

export function nombreFecha(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`)
  return d.toLocaleDateString(localeActual(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Índice de día con semana iniciando en lunes: 0 = lunes … 6 = domingo. */
export function indiceDiaSemana(fecha: string): number {
  return (new Date(`${fecha}T12:00:00`).getDay() + 6) % 7
}

export function nombreDiaCorto(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`)
  return d.toLocaleDateString(localeActual(), { weekday: 'long', day: 'numeric' })
}

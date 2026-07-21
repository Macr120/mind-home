import { localeActual } from '../../core/i18n/useT'
import { fechaLocalISO } from '../../core/fechaLocal'
export const hoyISO = () => fechaLocalISO()

export function sumarDias(fecha: string, delta: number): string {
  const d = new Date(`${fecha}T12:00:00`)
  d.setDate(d.getDate() + delta)
  return fechaLocalISO(d)
}

export function formatearFecha(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString(localeActual(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const dinero = (n: number) =>
  n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  })

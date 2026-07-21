import { localeActual } from '../../core/i18n/useT'
import { fechaLocalISO } from '../../core/fechaLocal'
export const hoyISO = () => fechaLocalISO()

export function formatearFecha(fecha: string) {
  const d = new Date(`${fecha}T12:00:00`)
  if (fecha.endsWith('-01-01') && fecha.length === 10) {
    return d.getFullYear().toString()
  }
  return d.toLocaleDateString(localeActual(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

import { localeActual } from '../../core/i18n/useT'
import { fechaLocalISO } from '../../core/fechaLocal'
export const hoyISO = () => fechaLocalISO()

export function sumarDias(fecha: string, delta: number): string {
  const d = new Date(`${fecha}T12:00:00`)
  d.setDate(d.getDate() + delta)
  return fechaLocalISO(d)
}

/** Semanas enteras que faltan hasta esa fecha (mínimo 1: un plazo vencido no sirve). */
export function semanasHasta(fecha: string): number {
  const dias = (new Date(`${fecha}T12:00:00`).getTime() - new Date(`${hoyISO()}T12:00:00`).getTime()) / 86_400_000
  return Math.max(1, Math.ceil(dias / 7))
}

/** La fecha a la que caen N semanas contadas desde hoy. */
export function fechaEnSemanas(semanas: number): string {
  return sumarDias(hoyISO(), Math.max(1, Math.round(semanas)) * 7)
}

export function nombreFecha(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`)
  return d.toLocaleDateString(localeActual(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Día 1 del mes de esa fecha. */
export const inicioMes = (fecha: string) => `${fecha.slice(0, 7)}-01`

/** Cuántos días tiene el mes de esa fecha. */
export function diasDelMes(fecha: string): number {
  const [y, m] = fecha.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Corre la fecha N meses, sin desbordar a otro mes cuando el destino es más corto. */
export function sumarMeses(fecha: string, delta: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const destino = new Date(y, m - 1 + delta, 1)
  const tope = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate()
  destino.setDate(Math.min(d, tope))
  return fechaLocalISO(destino)
}

/** «ago 2026» / «August 2026»: la etiqueta de la ventana de mes. */
export const nombreMes = (fecha: string) =>
  new Date(`${fecha}T12:00:00`).toLocaleDateString(localeActual(), { month: 'long', year: 'numeric' })

/** «3 – 9 ago»: la etiqueta de una ventana de varios días. */
export function rangoCorto(desde: string, hasta: string): string {
  const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const a = new Date(`${desde}T12:00:00`).toLocaleDateString(localeActual(), opciones)
  const b = new Date(`${hasta}T12:00:00`).toLocaleDateString(localeActual(), opciones)
  return `${a} – ${b}`
}

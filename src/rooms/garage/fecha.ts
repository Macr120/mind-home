import { localeActual, tGlobal } from '../../core/i18n/useT'
import { fechaLocalISO } from '../../core/fechaLocal'
export const hoyISO = () => fechaLocalISO()

export function sumarDias(fecha: string, delta: number): string {
  const d = new Date(`${fecha}T12:00:00`)
  d.setDate(d.getDate() + delta)
  return fechaLocalISO(d)
}

/**
 * Suma meses cuidando el desborde de día: 31 de enero + 1 mes es el 28 (o 29) de
 * febrero, no el 3 de marzo — que es a donde lo llevaría `setMonth` a secas.
 */
export function sumarMeses(fecha: string, meses: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const destino = new Date(y, m - 1 + meses, 1)
  const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate()
  destino.setDate(Math.min(d, ultimoDia))
  return fechaLocalISO(destino)
}

/** Días de hoy a esa fecha (negativo = ya pasó). */
export function diasHasta(fecha: string): number {
  return Math.round(
    (new Date(`${fecha}T12:00:00`).getTime() - new Date(`${hoyISO()}T12:00:00`).getTime()) /
      86400000,
  )
}

/**
 * Cuánto falta, en la unidad que se lee de un vistazo: días cerca del
 * vencimiento y meses o años cuando queda lejos («faltan 1186 días» no dice nada).
 */
export function textoRestante(dias: number): string {
  if (dias === 0) return tGlobal('garage.tram.hoy', 'vence hoy')
  if (dias < 0) {
    const n = Math.abs(dias)
    return n > 60
      ? tGlobal('garage.tram.vencidoMeses', 'vencido hace {n} meses', {
          n: String(Math.round(n / 30)),
        })
      : tGlobal('garage.tram.vencidoHace', 'vencido hace {n} días', { n: String(n) })
  }
  if (dias > 400) {
    return tGlobal('garage.tram.faltanAnios', 'en {n} años', { n: String(Math.round(dias / 365)) })
  }
  if (dias > 60) {
    return tGlobal('garage.tram.faltanMeses', 'en {n} meses', { n: String(Math.round(dias / 30)) })
  }
  return tGlobal('garage.tram.faltan', 'faltan {n} días', { n: String(dias) })
}

/** 'HH:mm' + minutos (para cerrar el bloque del calendario). */
export function sumarMin(hora: string, min: number): string {
  const [h, m] = hora.split(':').map(Number)
  const total = (h * 60 + m + min) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
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

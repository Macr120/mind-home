import { localeActual } from './i18n/useT'

/**
 * Formato de importes compartido. Antes cada app tenía su copia clavada a
 * `es-MX`/`MXN` (`despacho/mes.ts`, `garage/fecha.ts`); las dos siguen fijando
 * su moneda a propósito —cambiar lo que ya ve el usuario en Finanzas es otra
 * decisión—, pero el formateo vive aquí. El taller de muebles sí usa la moneda
 * que el usuario configura.
 *
 * `Intl.NumberFormat` se memoiza: una tabla de presupuesto de 60 renglones creaba
 * 60 formateadores por render.
 */

export const MONEDA_DEFECTO = 'MXN'

export interface OpcMoneda {
  moneda?: string
  /** Sin locale usa el idioma activo de la app. */
  locale?: string
  decimales?: number
}

const cache = new Map<string, Intl.NumberFormat>()

export function formatoMoneda(o: OpcMoneda = {}): Intl.NumberFormat {
  const moneda = o.moneda || MONEDA_DEFECTO
  const locale = o.locale || localeActual()
  const dec = o.decimales
  const clave = `${locale}|${moneda}|${dec ?? '-'}`
  const previo = cache.get(clave)
  if (previo) return previo
  let fmt: Intl.NumberFormat
  try {
    fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: moneda,
      ...(dec != null ? { minimumFractionDigits: dec, maximumFractionDigits: dec } : {}),
    })
  } catch {
    // Un código de moneda inválido (el usuario escribe el suyo) tiraría Intl.
    fmt = new Intl.NumberFormat(locale, { style: 'decimal', maximumFractionDigits: dec ?? 2 })
  }
  cache.set(clave, fmt)
  return fmt
}

/** Importe formateado en la moneda dada. */
export const dinero = (n: number, o: OpcMoneda = {}): string =>
  formatoMoneda(o).format(Number.isFinite(n) ? n : 0)

/** Solo el símbolo ('$', '€'), para encabezados de columna y campos de precio. */
export function simboloMoneda(moneda: string, locale?: string): string {
  const partes = formatoMoneda({ moneda, locale, decimales: 0 }).formatToParts(0)
  return partes.find((p) => p.type === 'currency')?.value ?? moneda
}

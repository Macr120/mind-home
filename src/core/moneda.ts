import { idiomaActual, localeActual } from './i18n/useT'
import type { Idioma } from './i18n/idiomas'
import { useAjustes } from './state/ajustesStore'
import { esDemo } from './edicion'

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

/** Moneda de cada región (ISO 3166 → ISO 4217) para resolver la automática. */
const MONEDA_DE_REGION: Record<string, string> = {
  MX: 'MXN', ES: 'EUR', AR: 'ARS', CO: 'COP', CL: 'CLP', PE: 'PEN', UY: 'UYU', VE: 'VES', EC: 'USD',
  GT: 'GTQ', CR: 'CRC', DO: 'DOP', BO: 'BOB', PY: 'PYG', PA: 'USD', HN: 'HNL', NI: 'NIO', SV: 'USD',
  CU: 'CUP', PR: 'USD', US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD', IE: 'EUR', ZA: 'ZAR',
  IN: 'INR', SG: 'SGD', PH: 'PHP', NG: 'NGN', KE: 'KES', BR: 'BRL', PT: 'EUR', AO: 'AOA', MZ: 'MZN',
  FR: 'EUR', BE: 'EUR', CH: 'CHF', LU: 'EUR', MC: 'EUR', SN: 'XOF', CI: 'XOF', MA: 'MAD', DZ: 'DZD',
  TN: 'TND', DE: 'EUR', AT: 'EUR', LI: 'CHF', IT: 'EUR', SM: 'EUR', JP: 'JPY', CN: 'CNY', TW: 'TWD',
  HK: 'HKD', MO: 'MOP', KR: 'KRW', RU: 'RUB', BY: 'BYN', KZ: 'KZT', UA: 'UAH', TR: 'TRY', CY: 'EUR',
  ID: 'IDR', PL: 'PLN', NL: 'EUR', SR: 'SRD', SA: 'SAR', AE: 'AED', EG: 'EGP', QA: 'QAR', KW: 'KWD',
  BH: 'BHD', OM: 'OMR', JO: 'JOD', LB: 'LBP', IQ: 'IQD', SY: 'SYP', LY: 'LYD', SD: 'SDG', YE: 'YER',
  PK: 'PKR', NP: 'NPR', BD: 'BDT', LK: 'LKR', MY: 'MYR', TH: 'THB', VN: 'VND', IL: 'ILS', SE: 'SEK',
  NO: 'NOK', DK: 'DKK', FI: 'EUR', GR: 'EUR', CZ: 'CZK', HU: 'HUF', RO: 'RON',
}

/** Sin región en el dispositivo: la moneda más probable de quien usa ese idioma. */
const MONEDA_DE_IDIOMA: Record<Idioma, string> = {
  es: 'MXN', en: 'USD', pt: 'BRL', fr: 'EUR', de: 'EUR', it: 'EUR', ja: 'JPY', zh: 'CNY', ko: 'KRW',
  ru: 'RUB', hi: 'INR', tr: 'TRY', id: 'IDR', pl: 'PLN', nl: 'EUR', ar: 'SAR',
}

/**
 * La moneda «automática»: la de la región del dispositivo en el idioma de la app
 * (es-ES → EUR, es-AR → ARS, en-GB → GBP); sin región para ese idioma, la de
 * `MONEDA_DE_IDIOMA`.
 */
export function monedaAutomatica(idioma: Idioma = idiomaActual()): string {
  const locales = typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? []), navigator.language]
  for (const l of locales) {
    const [lengua, region] = (l ?? '').split('-')
    if (lengua?.toLowerCase() !== idioma || !region) continue
    const moneda = MONEDA_DE_REGION[region.toUpperCase()]
    if (moneda) return moneda
  }
  return MONEDA_DE_IDIOMA[idioma] ?? MONEDA_DEFECTO
}

/** Las monedas que ofrece Configuraciones, con su nombre en el idioma activo y por orden alfabético. */
export function monedasElegibles(): { codigo: string; nombre: string }[] {
  const locale = localeActual()
  let nombres: Intl.DisplayNames | null = null
  try {
    nombres = new Intl.DisplayNames([locale], { type: 'currency' })
  } catch {
    nombres = null
  }
  return [...new Set(Object.values(MONEDA_DE_REGION))]
    .map((codigo) => ({ codigo, nombre: nombres?.of(codigo) ?? codigo }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, locale))
}

/**
 * Pesos mexicanos → otra moneda, aproximado y FIJO. Solo para la casa demo: el año
 * de Pep@ está escrito en pesos y se enseña en la moneda del idioma. Las de yen,
 * yuan, won, rublo, rupia, lira, zloty, euro y riyal son las que usaron las
 * traducciones al escribir cifras en los textos (los 45 000 de Japón = 390 000 ¥).
 */
const TASA_DESDE_MXN: Record<string, number> = {
  MXN: 1, USD: 0.055, EUR: 0.0578, GBP: 0.043, JPY: 8.67, CNY: 0.433, KRW: 86.7, RUB: 5.78, INR: 5.2,
  TRY: 2.6, IDR: 1011, PLN: 0.244, BRL: 0.3, SAR: 0.231, AED: 0.2, ARS: 55, COP: 220, CLP: 52,
  PEN: 0.2, CAD: 0.075, AUD: 0.083, CHF: 0.048, EGP: 2.7, TWD: 1.75, HKD: 0.43,
}

/** La moneda de la demo: la automática si sabemos convertir a ella; si no, dólares. */
export function monedaDemo(): string {
  const m = monedaAutomatica()
  return m in TASA_DESDE_MXN ? m : 'USD'
}

/** Un importe del año de Pep@ (en pesos) en la moneda de la demo, a 3 cifras. */
export function montoDemo(mxn: number): number {
  const moneda = monedaDemo()
  const v = Number((mxn * TASA_DESDE_MXN[moneda]).toPrecision(3))
  const decimales = formatoMoneda({ moneda }).resolvedOptions().maximumFractionDigits ?? 2
  return decimales === 0 ? Math.round(v) : v
}

/** Rellena los `{monto:N}` del contenido demo (N en pesos) con su importe en la moneda de la demo. */
export const conMontos = (texto: string): string =>
  texto.replace(/\{monto:(\d+)\}/g, (_, n: string) => dinero(montoDemo(Number(n)), { decimales: 0 }))

/** La moneda en que la app enseña los importes: el ajuste del usuario, o la de la demo. */
export function monedaActual(): string {
  if (esDemo()) return monedaDemo()
  const m = useAjustes.getState().moneda
  return m === 'auto' ? monedaAutomatica() : m
}

export interface OpcMoneda {
  moneda?: string
  /** Sin locale usa el idioma activo de la app. */
  locale?: string
  decimales?: number
}

const cache = new Map<string, Intl.NumberFormat>()

export function formatoMoneda(o: OpcMoneda = {}): Intl.NumberFormat {
  const moneda = o.moneda || monedaActual()
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

import { deIso, fechaLocalISO, inicioSemana, isoMasDias } from '../fechaLocal'

/**
 * Matemática pura de los periodos del Wrapped (sin base de datos).
 * Fechas ISO yyyy-mm-dd LOCALES siempre (nunca toISOString).
 */

export type TipoPeriodo = 'semana' | 'mes' | 'anio'

export interface Periodo {
  tipo: TipoPeriodo
  /** Primer día (semana: lunes · mes: día 01 · año: 01-01). */
  desde: string
  /** Último día (domingo · último del mes · 12-31). */
  hasta: string
  /** Id estable para claves de aviso/localStorage: '2026-07-13' | '2026-06' | '2025'. */
  id: string
}

/** Periodo que contiene la fecha ancla. */
export function periodoDe(tipo: TipoPeriodo, ancla: string): Periodo {
  if (tipo === 'semana') {
    const desde = fechaLocalISO(inicioSemana(deIso(ancla)))
    return { tipo, desde, hasta: isoMasDias(desde, 6), id: desde }
  }
  if (tipo === 'mes') {
    const [anio, mes] = ancla.split('-').map(Number)
    // Día 0 del mes siguiente = último día del mes del ancla.
    return {
      tipo,
      desde: `${ancla.slice(0, 7)}-01`,
      hasta: fechaLocalISO(new Date(anio, mes, 0)),
      id: ancla.slice(0, 7),
    }
  }
  const anio = ancla.slice(0, 4)
  return { tipo, desde: `${anio}-01-01`, hasta: `${anio}-12-31`, id: anio }
}

export const periodoAnterior = (p: Periodo): Periodo => periodoDe(p.tipo, isoMasDias(p.desde, -1))

export const periodoSiguiente = (p: Periodo): Periodo => periodoDe(p.tipo, isoMasDias(p.hasta, 1))

/** Último periodo ya terminado (semana/mes/año pasados): el default del Wrapped. */
export function ultimoCerrado(tipo: TipoPeriodo, hoy: string = fechaLocalISO()): Periodo {
  return periodoAnterior(periodoDe(tipo, hoy))
}

export const esEnCurso = (p: Periodo, hoy: string = fechaLocalISO()): boolean => p.hasta >= hoy

/** Etiqueta legible: "13 – 19 jul 2026" · "julio 2026" · "2025". */
export function etiquetaPeriodo(p: Periodo, locale: string): string {
  if (p.tipo === 'anio') return p.id
  if (p.tipo === 'mes')
    return deIso(p.desde).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const ini = deIso(p.desde).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const fin = deIso(p.hasta).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${ini} – ${fin}`
}

import { DIA_MS, deIso, fechaLocalISO, inicioSemana } from '../../core/fechaLocal'
import type { PeriodoMovimiento, Transaccion } from '../../core/data/db'
import { localeActual } from '../../core/i18n/useT'
/** Utilidades de fecha y de periodo para Finanzas. */

export const hoyISO = () => fechaLocalISO()

/** Etiqueta corta 'jun' de una clave 'YYYY-MM', en el idioma activo. */
function mesCorto(mes: string): string {
  return deIso(`${mes}-01`).toLocaleDateString(localeActual(), { month: 'short' })
}

export const money = (n: number) =>
  n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  })

export const money2 = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

// ----- Periodos (el filtro del Balance y el plazo de cada movimiento) -----

/** Los cuatro plazos con los que se filtra el balance y se repite un movimiento. */
export type Periodo = 'dia' | 'semana' | 'mes' | 'anio'

export const PERIODOS: Periodo[] = ['dia', 'semana', 'mes', 'anio']

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const diasDelMes = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

/** Rango [desde, hasta] (ISO, ambos incluidos) del periodo que contiene `ancla`. */
export function rangoPeriodo(ancla: string, p: Periodo): { desde: string; hasta: string } {
  const [y, m] = ancla.split('-').map(Number)
  switch (p) {
    case 'dia':
      return { desde: ancla, hasta: ancla }
    case 'semana': {
      const lunes = inicioSemana(deIso(ancla))
      const domingo = new Date(lunes.getTime() + 6 * DIA_MS)
      return { desde: fechaLocalISO(lunes), hasta: fechaLocalISO(domingo) }
    }
    case 'mes':
      return { desde: iso(y, m - 1, 1), hasta: iso(y, m - 1, diasDelMes(y, m - 1)) }
    case 'anio':
      return { desde: `${y}-01-01`, hasta: `${y}-12-31` }
  }
}

/** Mueve el ancla `delta` periodos (‹ y › de la barra del Balance). */
export function sumarPeriodo(ancla: string, p: Periodo, delta: number): string {
  const [y, m, d] = ancla.split('-').map(Number)
  switch (p) {
    case 'dia':
      return fechaLocalISO(new Date(deIso(ancla).getTime() + delta * DIA_MS))
    case 'semana':
      return fechaLocalISO(new Date(deIso(ancla).getTime() + delta * 7 * DIA_MS))
    case 'mes': {
      const mes = m - 1 + delta
      const anio = y + Math.floor(mes / 12)
      const mm = ((mes % 12) + 12) % 12
      return iso(anio, mm, Math.min(d, diasDelMes(anio, mm)))
    }
    case 'anio':
      return iso(y + delta, m - 1, Math.min(d, diasDelMes(y + delta, m - 1)))
  }
}

/** Título del periodo: '30 jul 2026', '27 jul – 2 ago', 'Julio 2026', '2026'. */
export function etiquetaPeriodo(ancla: string, p: Periodo): string {
  const loc = localeActual()
  const { desde, hasta } = rangoPeriodo(ancla, p)
  switch (p) {
    case 'dia':
      return deIso(ancla).toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' })
    case 'semana': {
      const a = deIso(desde).toLocaleDateString(loc, { day: 'numeric', month: 'short' })
      const b = deIso(hasta).toLocaleDateString(loc, { day: 'numeric', month: 'short' })
      return `${a} – ${b}`
    }
    case 'mes': {
      const n = deIso(desde).toLocaleDateString(loc, { month: 'long', year: 'numeric' })
      return n.charAt(0).toUpperCase() + n.slice(1)
    }
    case 'anio':
      return ancla.slice(0, 4)
  }
}

/** Etiqueta corta para el eje de la gráfica de tendencia. */
export function etiquetaCorta(ancla: string, p: Periodo): string {
  const loc = localeActual()
  switch (p) {
    case 'dia':
      return deIso(ancla).toLocaleDateString(loc, { day: 'numeric', month: 'short' })
    case 'semana':
      return deIso(rangoPeriodo(ancla, 'semana').desde).toLocaleDateString(loc, { day: 'numeric', month: 'short' })
    case 'mes':
      return mesCorto(ancla.slice(0, 7))
    case 'anio':
      return ancla.slice(0, 4)
  }
}

/**
 * Cuántas veces cae un movimiento dentro de [desde, hasta].
 *
 * Un movimiento único cuenta 0 o 1 vez. Uno fijo cuenta una vez por cada
 * vencimiento desde su fecha de arranque, y por defecto NUNCA a futuro: el
 * balance de un periodo que aún no termina solo suma lo que ya se venció.
 * `proyectar` levanta ese tope y es lo que usa el simulador anual.
 */
export function ocurrencias(mov: Transaccion, desde: string, hasta: string, proyectar = false): number {
  const p: PeriodoMovimiento = mov.periodo ?? 'unico'
  if (p === 'unico') return mov.fecha >= desde && mov.fecha <= hasta ? 1 : 0

  const hoy = hoyISO()
  const fin = proyectar || hasta < hoy ? hasta : hoy
  if (fin < desde || fin < mov.fecha) return 0

  if (p === 'dia' || p === 'semana') {
    const paso = (p === 'dia' ? 1 : 7) * DIA_MS
    const t0 = deIso(mov.fecha).getTime()
    const tDesde = deIso(desde).getTime()
    const tFin = deIso(fin).getTime()
    const saltos = Math.max(0, Math.ceil((tDesde - t0) / paso))
    const primera = t0 + saltos * paso
    return primera > tFin ? 0 : Math.floor((tFin - primera) / paso) + 1
  }

  // Mensual/anual: se vence el mismo día de cada mes o año (recortado al último
  // día del mes cuando no existe: un cargo del 31 cae el 28 en febrero).
  const [y0, m0, d0] = mov.fecha.split('-').map(Number)
  const [yD, mD] = desde.split('-').map(Number)
  const paso = p === 'mes' ? 1 : 12
  const distancia = (yD - y0) * 12 + (mD - m0)
  let n = 0
  for (let i = Math.max(0, Math.floor(distancia / paso) - 1); ; i++) {
    const total = m0 - 1 + i * paso
    const y = y0 + Math.floor(total / 12)
    const m = ((total % 12) + 12) % 12
    const f = iso(y, m, Math.min(d0, diasDelMes(y, m)))
    if (f > fin) break
    if (f >= desde && f >= mov.fecha) n++
  }
  return n
}

/** ¿Este movimiento se repite? (las filas viejas, sin `periodo`, no). */
export const esFijo = (mov: Transaccion): boolean => (mov.periodo ?? 'unico') !== 'unico'

/**
 * Suma de un tipo dentro del rango, contando los vencimientos que caen ahí.
 * `solo` acota a los fijos o a los variables (para desglosar el balance).
 */
export function totalEnRango(
  movs: Transaccion[],
  tipo: 'ingreso' | 'gasto',
  desde: string,
  hasta: string,
  opciones: { solo?: 'fijos' | 'variables'; proyectar?: boolean } = {},
): number {
  let total = 0
  for (const m of movs) {
    if (m.tipo !== tipo) continue
    if (opciones.solo === 'fijos' && !esFijo(m)) continue
    if (opciones.solo === 'variables' && esFijo(m)) continue
    total += m.monto * ocurrencias(m, desde, hasta, opciones.proyectar)
  }
  return total
}

/** Lo que lleva acumulado un fijo desde que arrancó hasta hoy. */
export function acumulado(mov: Transaccion): number {
  return mov.monto * ocurrencias(mov, mov.fecha, hoyISO())
}

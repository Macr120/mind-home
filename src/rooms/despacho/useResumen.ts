import type { Transaccion } from '../../core/data/db'
import { VACIO, finanzasRepo } from '../../core/data/repository'
import { esFijo, hoyISO, rangoPeriodo, sumarPeriodo, totalEnRango, type Periodo } from './mes'

export interface ResumenPeriodo {
  ingresos: number
  gastos: number
  /** Lo que sobra en el periodo. Negativo = se gastó más de lo que entró. */
  disponible: number
}

/**
 * Lo que entró, lo que salió y lo que sobra en un periodo. Es el mismo cálculo
 * que la pestaña Balance; vive aquí para que Metas, las calculadoras y el
 * planificador de IA no lo repitan cada uno a su manera.
 */
export function resumenDe(
  movimientos: Transaccion[],
  periodo: Periodo = 'mes',
  ancla: string = hoyISO(),
): ResumenPeriodo {
  const { desde, hasta } = rangoPeriodo(ancla, periodo)
  const ingresos = totalEnRango(movimientos, 'ingreso', desde, hasta)
  const gastos = totalEnRango(movimientos, 'gasto', desde, hasta)
  return { ingresos, gastos, disponible: ingresos - gastos }
}

/** El resumen del periodo, reactivo a lo que se vaya registrando. */
export function useResumenReal(periodo: Periodo = 'mes', ancla: string = hoyISO()): ResumenPeriodo {
  return resumenDe(finanzasRepo.useAll() ?? VACIO, periodo, ancla)
}

/**
 * Efectivo acumulado: todo lo que entró menos todo lo que salió desde el primer
 * movimiento registrado (las repeticiones cuentan sus vencimientos, y nunca a
 * futuro — de eso se encarga `totalEnRango`).
 *
 * A diferencia del balance de un periodo esto es un SALDO: no cambia al mirar el
 * mes o el año. Por eso es lo único que puede sumarse al patrimonio sin volverlo
 * un número que baila con el selector de fechas.
 */
export function efectivoAcumulado(movimientos: Transaccion[]): number {
  return efectivoHasta(movimientos, hoyISO())
}

/**
 * El mismo saldo, pero congelado en una fecha del pasado: es lo que dibuja el
 * tramo ya vivido de la gráfica de patrimonio. Nunca proyecta — `totalEnRango`
 * sin `proyectar` corta los fijos en su último vencimiento real.
 */
export function efectivoHasta(movimientos: Transaccion[], hasta: string): number {
  if (movimientos.length === 0) return 0
  const primera = movimientos.reduce((min, m) => (m.fecha < min ? m.fecha : min), movimientos[0].fecha)
  if (hasta < primera) return 0
  return (
    totalEnRango(movimientos, 'ingreso', primera, hasta) - totalEnRango(movimientos, 'gasto', primera, hasta)
  )
}

/**
 * Promedio mensual de lo VARIABLE de un tipo, medido sobre lo ya registrado.
 *
 * La ventana va del primer movimiento suelto (o de hace 12 meses, lo que sea
 * más reciente) hasta hoy. Sin historial no hay promedio: devuelve 0 y quien
 * proyecte se queda solo con los fijos.
 */
export function promedioMensual(movs: Transaccion[], tipo: 'ingreso' | 'gasto', hoy: string): number {
  const sueltos = movs.filter((m) => m.tipo === tipo && !esFijo(m))
  if (sueltos.length === 0) return 0

  const primera = sueltos.reduce((a, m) => (m.fecha < a ? m.fecha : a), sueltos[0].fecha)
  const haceUnAnio = sumarPeriodo(hoy, 'anio', -1)
  const desde = primera > haceUnAnio ? primera : haceUnAnio

  const total = totalEnRango(movs, tipo, desde, hoy, { solo: 'variables' })
  const [yD, mD] = desde.split('-').map(Number)
  const [yH, mH] = hoy.split('-').map(Number)
  const meses = Math.max(1, (yH - yD) * 12 + (mH - mD) + 1)
  return total / meses
}

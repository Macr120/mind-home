/** Utilidades de mes para Finanzas. */

export const hoyISO = () => new Date().toISOString().slice(0, 10)

/** Clave de mes 'YYYY-MM' de hoy. */
export const mesActual = () => hoyISO().slice(0, 7)

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** '2026-06' → 'Junio 2026'. */
export function nombreMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return `${MESES[m - 1]} ${y}`
}

/** Suma/resta meses a una clave 'YYYY-MM'. */
export function sumarMeses(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Etiqueta corta 'Jun'. */
export function mesCorto(mes: string): string {
  return MESES[Number(mes.split('-')[1]) - 1].slice(0, 3)
}

export const money = (n: number) =>
  n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  })

export const money2 = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

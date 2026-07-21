/**
 * Fecha `yyyy-mm-dd` en horario LOCAL.
 *
 * `toISOString()` serializa en UTC: por la noche en husos negativos (México,
 * UTC-6) devuelve la fecha de MAÑANA, corriendo registros, rachas y planes al
 * día equivocado. Toda fecha "de hoy" o derivada de un Date local debe pasar
 * por aquí.
 */
export function fechaLocalISO(d: Date = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export const DIA_MS = 86_400_000

/** Día del año (0–365) de una fecha local yyyy-mm-dd; sirve para rotar catálogos. */
export function diaDelAnio(fecha: string): number {
  const [y, m, d] = fecha.split('-').map(Number)
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / DIA_MS)
}

/** Lunes de la semana de una fecha (la semana se muestra L→D). */
export function inicioSemana(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return new Date(x.getTime() - ((x.getDay() + 6) % 7) * DIA_MS)
}

export const addDias = (d: Date, n: number) => new Date(d.getTime() + n * DIA_MS)

/** Mediodía: esquiva los saltos de horario de verano al restar fechas. */
export const deIso = (iso: string) => new Date(iso + 'T12:00')

/** Corre una fecha ISO n días, sin pasar por Date en quien llama. */
export const isoMasDias = (iso: string, n: number) => fechaLocalISO(addDias(deIso(iso), n))

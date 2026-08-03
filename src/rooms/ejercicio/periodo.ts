import { hoyISO, inicioSemana } from './fecha'

/** Ventana de tiempo con la que se leen las estadísticas y las metas. */
export type Periodo = 'semana' | 'mes' | 'anio' | 'todo'

export const PERIODOS: { id: Periodo; labelEs: string }[] = [
  { id: 'semana', labelEs: 'Semana' },
  { id: 'mes', labelEs: 'Mes' },
  { id: 'anio', labelEs: 'Año' },
  { id: 'todo', labelEs: 'Todo' },
]

/** Primer día del periodo en curso; `null` en «todo». */
export function inicioPeriodo(p: Periodo, ref = hoyISO()): string | null {
  if (p === 'semana') return inicioSemana(ref)
  if (p === 'mes') return `${ref.slice(0, 7)}-01`
  if (p === 'anio') return `${ref.slice(0, 4)}-01-01`
  return null
}

export function sesionesPeriodo<T extends { fecha: string }>(
  items: T[],
  p: Periodo,
  ref = hoyISO(),
): T[] {
  const desde = inicioPeriodo(p, ref)
  if (!desde) return items
  return items.filter((x) => x.fecha >= desde && x.fecha <= ref)
}

const DIA_MS = 86400000

/** Días ya transcurridos del periodo (hoy incluido); en «todo», desde el primer registro. */
export function diasTranscurridos(
  p: Periodo,
  items: { fecha: string }[],
  ref = hoyISO(),
): number {
  const desde =
    inicioPeriodo(p, ref) ?? items.reduce((min, x) => (x.fecha < min ? x.fecha : min), ref)
  const ms = new Date(`${ref}T12:00:00`).getTime() - new Date(`${desde}T12:00:00`).getTime()
  return Math.max(1, Math.round(ms / DIA_MS) + 1)
}

/**
 * Convierte una meta semanal en meta del periodo, prorrateada por los días que
 * ya pasaron: a mitad de mes la barra se compara contra media meta, no contra
 * el mes entero (si no, siempre se vería en rojo).
 */
export function metaDelPeriodo(
  metaSemanal: number,
  p: Periodo,
  items: { fecha: string }[],
  ref = hoyISO(),
): number {
  if (p === 'semana') return metaSemanal
  return Math.max(1, Math.round((metaSemanal * diasTranscurridos(p, items, ref)) / 7))
}

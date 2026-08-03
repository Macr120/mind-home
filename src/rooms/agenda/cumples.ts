import { deIso, DIA_MS, fechaLocalISO } from '../../core/fechaLocal'

/**
 * Cálculos de cumpleaños. El 29 de febrero se trata como 28 igual que en la
 * rutina que se proyecta al calendario (`calendario.ts`), para que el chip de
 * «faltan N días» y el aviso digan lo mismo.
 */

const mmdd = (cumple: string) => (cumple.slice(5) === '02-29' ? '02-28' : cumple.slice(5))

/** Próxima ocurrencia (yyyy-mm-dd); hoy cuenta como próxima. */
export function proximoCumple(cumple: string, hoy = fechaLocalISO()): string {
  const dia = mmdd(cumple)
  const anio = Number(hoy.slice(0, 4)) + (dia >= hoy.slice(5) ? 0 : 1)
  return `${anio}-${dia}`
}

/** Días que faltan para el próximo cumpleaños (0 = hoy). */
export function diasParaCumple(cumple: string, hoy = fechaLocalISO()): number {
  return Math.round((deIso(proximoCumple(cumple, hoy)).getTime() - deIso(hoy).getTime()) / DIA_MS)
}

/** Edad que cumple en su próxima vuelta; null si el año no es creíble. */
export function edadQueCumple(cumple: string, hoy = fechaLocalISO()): number | null {
  const nacimiento = Number(cumple.slice(0, 4))
  if (nacimiento < 1900) return null
  return Number(proximoCumple(cumple, hoy).slice(0, 4)) - nacimiento
}

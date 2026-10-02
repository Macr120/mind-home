import { tGlobal } from './useT'

/** «N min» en el idioma de la app, sin pasar a horas (sumas, tramos, opciones). */
export const textoMin = (n: number | string): string => tGlobal('ui.dur.min', '{n} min', { n })

/** Minutos legibles en el idioma de la app: «45 min», «2 h», «7 h 30 min». */
export function duracionMin(minutos: number): string {
  const total = Math.round(minutos)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return tGlobal('ui.dur.min', '{n} min', { n: m })
  return m ? tGlobal('ui.dur.hMin', '{h} h {m} min', { h, m }) : tGlobal('ui.dur.h', '{n} h', { n: h })
}

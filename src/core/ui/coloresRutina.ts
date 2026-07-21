import type { Rutina } from '../data/db'

/**
 * Color de los eventos y las metas. Vive aparte porque lo comparten el editor de
 * rutinas, el calendario y el cronograma: dejarlo en cualquiera de ellos obligaría
 * a los otros dos a importar de un módulo que ya los importa a ellos.
 */

/** Paleta de colores de evento (estilo Google Calendar, tema oscuro). */
export const COLORES_RUTINA = [
  '#10b981', '#3b82f6', '#a78bfa', '#f472b6',
  '#f59e0b', '#ef4444', '#14b8a6', '#64748b',
]

export function colorDe(r: Rutina): string {
  return r.color || COLORES_RUTINA[0]
}

/** Mezcla un hex con blanco un `factor` (0 = igual, 1 = blanco puro). */
function tintar(hex: string, factor: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const mezclar = (canal: number) => Math.round(canal + (255 - canal) * factor)
  const r = mezclar((num >> 16) & 255)
  const g = mezclar((num >> 8) & 255)
  const b = mezclar(num & 255)
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

/** Cuánto aclara cada nivel de profundidad; el tope evita llegar a blanco puro. */
const PASO_TINTE = 0.14
const TOPE_TINTE = 0.7

/**
 * Color de una sub-meta según su profundidad: el color PRINCIPAL de su rama (la
 * raíz que la encabeza, ver `raizDe` en metas.ts), cada vez más claro conforme
 * baja de nivel — así una sub-meta y su sub-sub-meta se leen de la misma familia
 * en vez de colores sueltos de la paleta sin relación entre sí.
 */
export function colorPorProfundidad(colorPrincipal: string, profundidad: number): string {
  return tintar(colorPrincipal, Math.min(TOPE_TINTE, profundidad * PASO_TINTE))
}

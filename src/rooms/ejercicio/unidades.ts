import type { SistemaUnidades } from '../../core/data/db'

/**
 * Conversión de unidades del cuarto de ejercicio.
 *
 * Regla dura: la base SIEMPRE guarda kg y km. Estas funciones solo traducen a
 * la entrada y la salida del formulario, así el histórico sigue siendo válido
 * aunque el usuario cambie de sistema a mitad del año.
 */

const LB_POR_KG = 2.20462
const MI_POR_KM = 0.621371

export const esIngles = (u: SistemaUnidades | undefined) => u === 'ingles'

export const unidadPeso = (u: SistemaUnidades | undefined) => (esIngles(u) ? 'lb' : 'kg')
export const unidadDistancia = (u: SistemaUnidades | undefined) => (esIngles(u) ? 'mi' : 'km')

/** kg guardados → número que se muestra. */
export const pesoDesdeKg = (kg: number, u: SistemaUnidades | undefined) =>
  esIngles(u) ? kg * LB_POR_KG : kg

/** Número escrito por el usuario → kg para guardar. */
export const pesoAKg = (valor: number, u: SistemaUnidades | undefined) =>
  esIngles(u) ? valor / LB_POR_KG : valor

export const distanciaDesdeKm = (km: number, u: SistemaUnidades | undefined) =>
  esIngles(u) ? km * MI_POR_KM : km

export const distanciaAKm = (valor: number, u: SistemaUnidades | undefined) =>
  esIngles(u) ? valor / MI_POR_KM : valor

/** Redondeo «de gimnasio»: medio kilo / media libra, sin decimales de más. */
const limpio = (n: number, decimales: number) => +n.toFixed(decimales)

/** Peso listo para pintar: «80 kg» / «176.4 lb». */
export const fmtPeso = (kg: number, u: SistemaUnidades | undefined, decimales = 1) =>
  `${limpio(pesoDesdeKg(kg, u), decimales)} ${unidadPeso(u)}`

/** Valor suelto de peso (sin unidad), para inputs y textos compuestos. */
export const numPeso = (kg: number, u: SistemaUnidades | undefined, decimales = 1) =>
  limpio(pesoDesdeKg(kg, u), decimales)

export const fmtDistancia = (km: number, u: SistemaUnidades | undefined, decimales = 1) =>
  `${limpio(distanciaDesdeKm(km, u), decimales)} ${unidadDistancia(u)}`

export const numDistancia = (km: number, u: SistemaUnidades | undefined, decimales = 2) =>
  limpio(distanciaDesdeKm(km, u), decimales)

/** Volumen total de una sesión, con separador de miles. */
export const fmtVolumen = (kg: number, u: SistemaUnidades | undefined) =>
  `${Math.round(pesoDesdeKg(kg, u)).toLocaleString()} ${unidadPeso(u)}`

/** Ritmo m:ss por km o por milla, según el sistema. */
export function fmtRitmo(
  duracionMin: number,
  km: number,
  u: SistemaUnidades | undefined,
): string {
  const dist = distanciaDesdeKm(km, u)
  if (dist <= 0) return '—'
  const ritmo = duracionMin / dist
  const min = Math.floor(ritmo)
  const seg = Math.round((ritmo - min) * 60)
  return `${min}:${String(seg).padStart(2, '0')} /${unidadDistancia(u)}`
}

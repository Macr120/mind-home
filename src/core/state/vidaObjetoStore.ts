import { useDiseño } from './disenoStore'
import type { ObjetoCuarto } from '../data/db'

/**
 * Necesidades de un objeto con el preset «Dale vida»: hambre y ánimo. Todo se
 * DERIVA de dos marcas de tiempo al pintar (molde: `granjaStore`), así el paseo
 * no escribe a la base de datos en ningún frame — solo lo hacen los botones.
 *
 * A diferencia de la granja NO hay enfermedad ni muerte: es decoración de la
 * casa, y que se te muera un mueble por no darle de comer sería hostil. Tampoco
 * gasta nada de la cesta del huerto: obligaría a tener huerto para poder cuidar
 * una lámpara.
 */

const H = 3_600_000

/** Horas sin comer tras las que se planta con cara de hambre. */
export const HORAS_HAMBRE_VIDA = 8
/** Horas sin mimos tras las que se aburre y anda a media marcha. */
export const HORAS_ANIMO_VIDA = 6

/** Nivel 0–1 que decae desde una marca a lo largo de `horas`. */
function nivel(desde: number | undefined, horas: number, ahora: number): number {
  if (desde == null) return 1
  return Math.max(0, Math.min(1, 1 - (ahora - desde) / (horas * H)))
}

export const barraComidaVida = (o: ObjetoCuarto, ahora: number): number =>
  nivel(o.vidaComidaEn, HORAS_HAMBRE_VIDA, ahora)

export const barraAnimoVida = (o: ObjetoCuarto, ahora: number): number =>
  nivel(o.vidaMimoEn, HORAS_ANIMO_VIDA, ahora)

export const tieneHambreVida = (o: ObjetoCuarto, ahora: number): boolean =>
  barraComidaVida(o, ahora) <= 0

export const estaAburridoVida = (o: ObjetoCuarto, ahora: number): boolean =>
  barraAnimoVida(o, ahora) <= 0

export const alimentarObjeto = (id: number): Promise<void> =>
  useDiseño.getState().setObjetoVida(id, { vidaComidaEn: Date.now() })

export const mimarObjeto = (id: number): Promise<void> =>
  useDiseño.getState().setObjetoVida(id, { vidaMimoEn: Date.now() })

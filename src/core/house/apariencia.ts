/**
 * Apariencia compartida de los personajes (el principal y los agentes):
 * tamaño (escala) y ropa. Cada personaje tiene sus propias `AnclasRopa` para que
 * la ropa calce sobre su cuerpo (el avatar es más alto y con piernas separadas;
 * los agentes son más bajos y con cuerpo único).
 */

import type { MascotaId } from '../chat/mascotas'

/** Prendas que puede llevar un personaje. */
export type PrendaId = 'sombrero' | 'lentes' | 'chamarra' | 'playera' | 'pantalon' | 'tenis'

/** Una prenda puesta: por ahora solo guarda su color. */
interface Prenda {
  color: string
}

/** Ropa de un personaje: qué prendas lleva y de qué color. */
export type Ropa = Partial<Record<PrendaId, Prenda>>

/** Tamaño por defecto (1 = normal) y límites del control. */
export const ESCALA_DEFAULT = 1
export const ESCALA_MIN = 0.5
export const ESCALA_MAX = 2

/** Metadatos de cada prenda para la interfaz del editor (orden de arriba a abajo). */
export const PRENDAS: { id: PrendaId; nombre: string; emoji: string; color: string }[] = [
  { id: 'sombrero', nombre: 'Sombrero', emoji: '🎩', color: '#3b3b4f' },
  { id: 'lentes', nombre: 'Lentes', emoji: '🕶️', color: '#1c1c22' },
  { id: 'chamarra', nombre: 'Chamarra', emoji: '🧥', color: '#7a4a2b' },
  { id: 'playera', nombre: 'Playera', emoji: '👕', color: '#3b82f6' },
  { id: 'pantalon', nombre: 'Pantalón', emoji: '👖', color: '#334155' },
  { id: 'tenis', nombre: 'Tenis', emoji: '👟', color: '#e5e7eb' },
]

/** Color por defecto de cada prenda (al ponérsela). */
export const PRENDA_COLOR_DEFAULT = Object.fromEntries(
  PRENDAS.map((p) => [p.id, p.color]),
) as Record<PrendaId, string>

/** Serializa la ropa a JSON para guardar en IndexedDB (vacío = sin ropa). */
export function serializarRopa(ropa: Ropa | undefined): string {
  return ropa && Object.keys(ropa).length ? JSON.stringify(ropa) : ''
}

/** Reconstruye la ropa desde el JSON guardado (vacío/ inválido = sin ropa). */
export function parseRopa(raw: string | undefined): Ropa {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Ropa
  } catch {
    return {}
  }
}

/**
 * Puntos de anclaje del cuerpo donde se coloca cada prenda. Varían por personaje
 * para que la ropa calce: la cabeza (sombrero/lentes), el torso (playera/chamarra)
 * y las piernas/pies (pantalón/tenis).
 */
export interface AnclasRopa {
  /** Centro vertical de la cara (lentes). */
  cabezaY: number
  /** Parte superior de la cabeza (base del sombrero). */
  cabezaTop: number
  /** Medio-ancho de la cabeza (ala del sombrero y separación de lentes). */
  cabezaR: number
  /** Frente de la cara (z de los lentes). */
  caraZ: number
  /** Torso (playera/chamarra). */
  torsoY: number
  torsoW: number
  torsoH: number
  torsoD: number
  /** x de las mangas. */
  brazoX: number
  /** Posiciones x de las piernas/pies (2 = avatar, 1 = agentes con cuerpo único). */
  piernasX: number[]
  piernasY: number
  piernaW: number
  piernaH: number
  piernaD: number
  /** y de los pies (tenis). */
  piesY: number
  /**
   * Tamaño/posición propios del cuerpo de la chamarra (override). Para cuerpos
   * redondos y anchos (búho) que deben quedar "metidos" en una prenda grande, con
   * la cabeza asomando. Si falta, la chamarra se deriva del torso como siempre.
   */
  chamarra?: { w: number; h: number; d: number; y: number }
}

/** Anclas del personaje principal (box-man de `AvatarModelo`). */
export const ANCLAS_AVATAR: AnclasRopa = {
  cabezaY: 1.52, cabezaTop: 1.72, cabezaR: 0.22, caraZ: 0.23,
  torsoY: 0.92, torsoW: 0.6, torsoH: 0.62, torsoD: 0.3, brazoX: 0.42,
  piernasX: [-0.14, 0.14], piernasY: 0.34, piernaW: 0.3, piernaH: 0.56, piernaD: 0.32, piesY: 0.07,
}

/**
 * Anclas por forma de asistente (mago/gato/perro/búho/robot). Son más bajos que el
 * avatar y con la cabeza más grande respecto al cuerpo, así que la ropa se baja y
 * se ensancha, y el pantalón/tenis usan una sola pieza centrada.
 */
export const ANCLAS_FORMA: Record<MascotaId, AnclasRopa> = {
  mago: {
    cabezaY: 1.1, cabezaTop: 1.34, cabezaR: 0.24, caraZ: 0.22,
    torsoY: 0.55, torsoW: 0.5, torsoH: 0.66, torsoD: 0.44, brazoX: 0.3,
    piernasX: [0], piernasY: 0.26, piernaW: 0.52, piernaH: 0.42, piernaD: 0.44, piesY: 0.12,
  },
  gato: {
    cabezaY: 1.06, cabezaTop: 1.3, cabezaR: 0.23, caraZ: 0.22,
    torsoY: 0.58, torsoW: 0.5, torsoH: 0.6, torsoD: 0.42, brazoX: 0.3,
    piernasX: [0], piernasY: 0.34, piernaW: 0.48, piernaH: 0.36, piernaD: 0.42, piesY: 0.16,
  },
  perro: {
    cabezaY: 1.06, cabezaTop: 1.3, cabezaR: 0.24, caraZ: 0.24,
    torsoY: 0.58, torsoW: 0.54, torsoH: 0.6, torsoD: 0.46, brazoX: 0.31,
    piernasX: [0], piernasY: 0.34, piernaW: 0.52, piernaH: 0.36, piernaD: 0.46, piesY: 0.16,
  },
  buho: {
    // Ojos grandes salientes: los lentes van bien al frente (caraZ alto) para no
    // meterse en los ojos. La ropa baja para quedar debajo del pico (y≈0.78).
    cabezaY: 0.92, cabezaTop: 1.22, cabezaR: 0.3, caraZ: 0.52,
    torsoY: 0.44, torsoW: 0.62, torsoH: 0.46, torsoD: 0.5, brazoX: 0.34,
    piernasX: [0], piernasY: 0.3, piernaW: 0.5, piernaH: 0.32, piernaD: 0.5, piesY: 0.16,
    // Chamarra grande que envuelve el cuerpo redondo (más ancha que el búho, ~0.84):
    // la cabeza (ojos y pico, y≈0.78–0.92) asoma por arriba.
    chamarra: { w: 0.96, h: 0.66, d: 0.88, y: 0.45 },
  },
  robot: {
    cabezaY: 1.04, cabezaTop: 1.26, cabezaR: 0.22, caraZ: 0.19,
    torsoY: 0.55, torsoW: 0.5, torsoH: 0.6, torsoD: 0.36, brazoX: 0.3,
    piernasX: [0], piernasY: 0.3, piernaW: 0.48, piernaH: 0.36, piernaD: 0.36, piesY: 0.1,
  },
}

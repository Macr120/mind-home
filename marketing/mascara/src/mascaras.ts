import type { Pieza3D } from '../../../src/core/chat/mascotas'
import { CUERPOS_PRESET } from '../../../src/core/house/cuerpos'

/**
 * Catálogo de máscaras: la cabeza Base (el cubo de piel con rostro y peinado
 * editables) más la cabeza de cada cuerpo prediseñado de la app (Astronauta,
 * Androide, Ninja, Alien, Osito, Princesa). Los presets son cuerpos enteros, así
 * que aquí se les recorta la cabeza y se recentra en el origen para poder
 * posarla sobre la cara con la matriz de MediaPipe.
 */

/** Y a partir de la cual una pieza del preset es cabeza (los torsos rematan en 1.23). */
const Y_CABEZA = 1.25
/** Centro de la cabeza en los cuerpos de la app (ANCLAS_AVATAR.cabezaY). */
const CABEZA_Y = 1.5
/** Ancho de la cabeza Base: todas las máscaras se normalizan a él para que calcen igual en la cara. */
const CABEZA_ANCHO = 0.44

export interface Mascara {
  id: string
  /** Nombre en español (la app lo traduce con `editor.pers.cuerpo.<id>`). */
  nombre: string
  emoji: string
  /** Piezas ya recentradas en el origen; `null` = la cabeza Base. */
  piezas: Pieza3D[] | null
  /** Factor para que la cabeza mida lo mismo que la Base. */
  escala: number
  /** Admite el rostro del editor (Base y Princesa; el resto trae ojos propios). */
  conRostro: boolean
}

/** Ancho de la pieza principal de la cabeza (en los presets es una caja o una esfera). */
function anchoDe(p: Pieza3D): number {
  return p.tipo === 'esfera' ? (p.tam[0] ?? CABEZA_ANCHO / 2) * 2 : (p.tam[0] ?? CABEZA_ANCHO)
}

export const MASCARAS: Mascara[] = [
  { id: 'base', nombre: 'Humano', emoji: '🧍', piezas: null, escala: 1, conRostro: true },
  ...CUERPOS_PRESET.map((c): Mascara => {
    // La primera pieza por encima del cuello es siempre la cabeza/casco; el
    // resto (orejas, tiara, antena, ojos) cuelga de ella.
    const cabeza = c.piezas().filter((p) => p.pos[1] >= Y_CABEZA)
    return {
      id: c.id,
      nombre: c.nombre,
      emoji: c.emoji,
      piezas: cabeza.map((p) => ({ ...p, pos: [p.pos[0], p.pos[1] - CABEZA_Y, p.pos[2]] })),
      escala: CABEZA_ANCHO / anchoDe(cabeza[0]),
      // La Princesa lleva la cabeza lisa a propósito: el rostro se dibuja encima.
      conRostro: c.id === 'princesa',
    }
  }),
]

/** La máscara elegida (cae a la Base si el id guardado ya no existe). */
export function mascaraDe(id: string): Mascara {
  return MASCARAS.find((m) => m.id === id) ?? MASCARAS[0]
}

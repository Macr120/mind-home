import type { Pieza3D } from '../chat/mascotas'
import type { AnclasRopa, PrendaId } from './apariencia'

/**
 * Traduce una prenda de fábrica (la geometría de `Prendas.tsx`) a la lista de
 * primitivas equivalente, para poder editarla con el editor de piezas.
 *
 * Es una COPIA CONGELADA con las medidas del cuerpo que se le pase: deja de
 * adaptarse a otros personajes y las mangas/perneras pierden el balanceo al
 * caminar (los `<PivoteMarcha>` se aplanan a posición absoluta). Por eso el
 * horneado es bajo demanda y crea una copia: el original sigue siendo mejor
 * mientras no lo edites.
 */

/** Prendas cuyo horneado pierde el balanceo al caminar (mangas o perneras). */
export const PIERDE_MARCHA: ReadonlySet<PrendaId> = new Set<PrendaId>([
  'tenis', 'pantalon', 'playera', 'chamarra', 'camisa', 'shorts', 'botas', 'guantes',
])

const caja = (
  pos: [number, number, number],
  tam: [number, number, number],
  color: string,
): Pieza3D => ({ tipo: 'caja', pos, tam, color })

/** Cilindro de `Pieza3D`: `tam` = [radio arriba, radio abajo, alto]. */
const cilindro = (
  pos: [number, number, number],
  tam: [number, number, number],
  color: string,
): Pieza3D => ({ tipo: 'cilindro', pos, tam, color })

/**
 * Esfera de `Pieza3D`: con 3 valores es un elipsoide, pero `escalaPieza` NO
 * escala la X (toma `tam[0]` como radio base). Para un elipsoide achatado hay
 * que dar el radio mayor en X/Z y el aplastado en Y.
 */
const esfera = (
  pos: [number, number, number],
  tam: number[],
  color: string,
): Pieza3D => ({ tipo: 'esfera', pos, tam, color })

export function hornearPrenda(id: PrendaId, a: AnclasRopa, color: string): Pieza3D[] {
  // Mismos derivados que `Prendas.tsx`, para que la copia calce con el original.
  const k = a.cabezaR / 0.22
  const cinturaW = Math.max(...a.piernasX) - Math.min(...a.piernasX) + a.piernaW + 0.06
  const caderaY = a.piernasY + a.piernaH / 2
  const hombroY = a.torsoY + a.torsoH / 2
  const frenteZ = a.torsoD / 2
  const faldaH = a.piernaH * 1.15
  const brazos = [-a.brazoX, a.brazoX]

  switch (id) {
    case 'sombrero':
      return [
        cilindro([0, a.cabezaTop + 0.02, 0], [a.cabezaR + 0.14, a.cabezaR + 0.14, 0.05], color),
        cilindro([0, a.cabezaTop + 0.18, 0], [a.cabezaR - 0.01, a.cabezaR, 0.28], color),
      ]

    case 'gorroChef': {
      // Copete: esfera de radio `r` con scale [1.15, 0.8, 1.15]. Como la X no se
      // escala, el radio base pasa a ser r*1.15 y la Y se aplasta a r*0.8.
      const r = a.cabezaR + 0.2
      return [
        cilindro([0, a.cabezaTop + 0.07, 0], [a.cabezaR + 0.02, a.cabezaR + 0.02, 0.1], color),
        esfera([0, a.cabezaTop + 0.29, 0], [r * 1.15, r * 0.8, r * 1.15], color),
      ]
    }

    case 'gorra':
      return [
        // La cúpula original es MEDIA esfera; aquí sale entera y la mitad de
        // abajo queda dentro de la cabeza.
        esfera([0, a.cabezaTop - 0.04, 0], [a.cabezaR + 0.05], color),
        caja(
          [0, a.cabezaTop - 0.03, a.cabezaR + 0.12],
          [(a.cabezaR + 0.05) * 1.3, 0.05, 0.22],
          color,
        ),
      ]

    case 'lentes':
      return [
        ...[-a.cabezaR * 0.5, a.cabezaR * 0.5].map((x) =>
          caja([x, a.cabezaY, a.caraZ], [0.15 * k, 0.12 * k, 0.04], color),
        ),
        caja([0, a.cabezaY, a.caraZ], [0.1 * k, 0.03, 0.03], color),
      ]

    case 'bufanda':
      return [
        cilindro([0, hombroY + 0.05, 0], [a.torsoW * 0.42, a.torsoW * 0.42, 0.16], color),
        caja([0.06, hombroY - 0.16, frenteZ + 0.02], [0.13, 0.4, 0.06], color),
      ]

    case 'corbata':
      return [
        caja([0, hombroY - 0.02, frenteZ + 0.02], [0.1, 0.1, 0.04], color),
        caja([0, a.torsoY - 0.02, frenteZ + 0.02], [0.12, a.torsoH * 0.6, 0.03], color),
      ]

    case 'camisa':
      return [
        caja([0, a.torsoY, 0], [a.torsoW + 0.06, a.torsoH + 0.04, a.torsoD + 0.06], color),
        ...brazos.map((x) => caja([x, a.torsoY, 0], [0.26, a.torsoH + 0.02, a.torsoD + 0.02], color)),
      ]

    case 'playera':
      return [
        caja([0, a.torsoY, 0], [a.torsoW + 0.06, a.torsoH + 0.04, a.torsoD + 0.06], color),
        ...brazos.map((x) => caja([x, hombroY - 0.13, 0], [0.26, 0.3, a.torsoD + 0.02], color)),
      ]

    case 'chamarra':
      // Cuerpos redondos y anchos (el búho) llevan una prenda grande de una pieza.
      if (a.chamarra) {
        return [caja([0, a.chamarra.y, 0], [a.chamarra.w, a.chamarra.h, a.chamarra.d], color)]
      }
      return [
        caja([0, a.torsoY - 0.02, 0], [a.torsoW + 0.12, a.torsoH + 0.1, a.torsoD + 0.14], color),
        ...brazos.map((x) => caja([x, a.torsoY, 0], [0.3, a.torsoH + 0.02, a.torsoD + 0.04], color)),
        caja([0, a.torsoY + a.torsoH * 0.58, 0], [a.torsoW * 0.83, 0.16, a.torsoD + 0.1], color),
      ]

    case 'capa':
      // El original es de doble cara; horneado solo se ve por delante.
      return [
        caja(
          [0, a.torsoY - 0.08, -(a.torsoD / 2 + 0.04)],
          [a.torsoW + 0.14, a.torsoH + 0.34, 0.04],
          color,
        ),
      ]

    case 'vestido':
      return [
        caja([0, a.torsoY, 0], [a.torsoW + 0.06, a.torsoH + 0.04, a.torsoD + 0.06], color),
        // La campana original es hueca y de doble cara: horneada sale maciza.
        cilindro([0, caderaY - faldaH / 2 + 0.05, 0], [cinturaW * 0.55, cinturaW, faldaH], color),
      ]

    case 'falda':
      return [
        cilindro([0, caderaY, 0], [cinturaW * 0.5, cinturaW * 0.5, 0.14], color),
        cilindro([0, caderaY - faldaH / 2 + 0.02, 0], [cinturaW * 0.52, cinturaW, faldaH], color),
      ]

    case 'pantalon':
      return [
        ...a.piernasX.map((x) => caja([x, a.piernasY, 0], [a.piernaW, a.piernaH, a.piernaD], color)),
        caja([0, a.piernasY + a.piernaH * 0.5, 0], [cinturaW, 0.2, a.piernaD + 0.02], color),
      ]

    case 'shorts':
      return [
        ...a.piernasX.map((x) =>
          caja(
            [x, a.piernasY + a.piernaH * 0.25, 0],
            [a.piernaW + 0.04, a.piernaH * 0.5, a.piernaD + 0.04],
            color,
          ),
        ),
        caja([0, caderaY, 0], [cinturaW, 0.2, a.piernaD + 0.02], color),
      ]

    case 'botas':
      return a.piernasX.flatMap((x) => [
        caja(
          [x, a.piesY + a.piernaH * 0.22, 0],
          [a.piernaW + 0.05, a.piernaH * 0.5, a.piernaD + 0.05],
          color,
        ),
        caja([x, a.piesY, 0.05], [a.piernaW + 0.05, 0.18, a.piernaD * 1.3], color),
      ])

    case 'tenis':
      return a.piernasX.map((x) =>
        caja([x, a.piesY, 0.04], [a.piernaW, 0.2, a.piernaD * 1.25], color),
      )

    case 'guantes':
      return brazos.map((x) =>
        caja([x, hombroY - (a.torsoH * 0.95 + 0.05), 0], [0.16, 0.16, a.torsoD + 0.02], color),
      )

    case 'mochila':
      return [
        caja(
          [0, a.torsoY + 0.02, -(a.torsoD / 2 + 0.12)],
          [a.torsoW * 0.8, a.torsoH * 0.85, 0.22],
          color,
        ),
        ...[-a.torsoW * 0.28, a.torsoW * 0.28].map((x) =>
          caja([x, a.torsoY + 0.05, frenteZ], [0.07, a.torsoH * 0.8, 0.05], color),
        ),
      ]
  }
}
